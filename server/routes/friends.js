const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Progress = require('../models/Progress');
const Friendship = require('../models/Friendship');
const auth = require('../middleware/auth');
const buildStats = require('../utils/stats');

const router = express.Router();
router.use(auth);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const otherId = (f, me) => (String(f.requester) === String(me) ? f.recipient : f.requester);

async function findFriendship(a, b) {
  return Friendship.findOne({
    $or: [
      { requester: a, recipient: b },
      { requester: b, recipient: a },
    ],
  });
}

// Search users by username prefix. Returns relationship status so the UI can show the right button.
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q.length < 2) return res.json({ users: [] });

    const users = await User.find({ username: new RegExp('^' + escapeRegex(q)), _id: { $ne: req.user._id } })
      .select('username')
      .sort({ username: 1 })
      .limit(8)
      .lean();

    const ids = users.map((u) => u._id);
    const links = await Friendship.find({
      $or: [
        { requester: req.user._id, recipient: { $in: ids } },
        { recipient: req.user._id, requester: { $in: ids } },
      ],
    }).lean();
    const linkByUser = new Map(links.map((f) => [String(otherId(f, req.user._id)), f]));

    res.json({
      users: users.map((u) => {
        const f = linkByUser.get(String(u._id));
        let relation = 'none';
        if (f) relation = f.status === 'accepted' ? 'friends' : String(f.requester) === String(req.user._id) ? 'sent' : 'received';
        return { id: u._id, username: u.username, relation, friendshipId: f?._id || null };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// Friends (with progress summary), plus incoming and outgoing requests.
router.get('/', async (req, res, next) => {
  try {
    const me = req.user._id;
    const all = await Friendship.find({ $or: [{ requester: me }, { recipient: me }] })
      .populate('requester recipient', 'username')
      .lean();

    const accepted = all.filter((f) => f.status === 'accepted');
    const friendUserIds = accepted.map((f) => otherId({ requester: f.requester._id, recipient: f.recipient._id }, me));

    const [total, agg] = await Promise.all([
      Question.countDocuments(),
      Progress.aggregate([
        { $match: { user: { $in: [...friendUserIds, me] }, done: true } },
        { $group: { _id: '$user', completed: { $sum: 1 }, lastSolvedAt: { $max: '$completedAt' } } },
      ]),
    ]);
    const aggBy = new Map(agg.map((a) => [String(a._id), a]));
    const summary = (uid) => ({
      completed: aggBy.get(String(uid))?.completed || 0,
      lastSolvedAt: aggBy.get(String(uid))?.lastSolvedAt || null,
      total,
    });

    const friends = accepted
      .map((f) => {
        const other = String(f.requester._id) === String(me) ? f.recipient : f.requester;
        return { friendshipId: f._id, id: other._id, username: other.username, since: f.updatedAt, ...summary(other._id) };
      })
      .sort((a, b) => b.completed - a.completed || a.username.localeCompare(b.username));

    const incoming = all
      .filter((f) => f.status === 'pending' && String(f.recipient._id) === String(me))
      .map((f) => ({ friendshipId: f._id, id: f.requester._id, username: f.requester.username, createdAt: f.createdAt }));
    const outgoing = all
      .filter((f) => f.status === 'pending' && String(f.requester._id) === String(me))
      .map((f) => ({ friendshipId: f._id, id: f.recipient._id, username: f.recipient.username, createdAt: f.createdAt }));

    res.json({ me: { username: req.user.username, ...summary(me) }, friends, incoming, outgoing });
  } catch (err) {
    next(err);
  }
});

// Send a friend request by exact username (auto-accepts if they already requested you).
router.post('/request', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const target = await User.findOne({ username });
    if (!target) return res.status(404).json({ message: `No user named "${username}".` });
    if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: "You can't add yourself." });

    const existing = await findFriendship(req.user._id, target._id);
    if (existing) {
      if (existing.status === 'accepted') return res.status(409).json({ message: `You and ${username} are already friends.` });
      if (String(existing.requester) === String(req.user._id))
        return res.status(409).json({ message: `Request to ${username} is already pending.` });
      existing.status = 'accepted';
      await existing.save();
      return res.json({ message: `You and ${username} are now friends.`, status: 'accepted' });
    }

    await Friendship.create({ requester: req.user._id, recipient: target._id });
    res.status(201).json({ message: `Request sent to ${username}.`, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/accept', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid request id.' });
    const f = await Friendship.findOne({ _id: req.params.id, recipient: req.user._id, status: 'pending' });
    if (!f) return res.status(404).json({ message: 'Request not found.' });
    f.status = 'accepted';
    await f.save();
    res.json({ message: 'Friend added.' });
  } catch (err) {
    next(err);
  }
});

// Decline an incoming request, cancel an outgoing one, or remove a friend.
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id.' });
    const f = await Friendship.findOneAndDelete({
      _id: req.params.id,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });
    if (!f) return res.status(404).json({ message: 'Not found.' });
    res.json({ message: 'Removed.' });
  } catch (err) {
    next(err);
  }
});

// A friend's progress. Only accepted friends can see it, and notes are never included.
router.get('/:username/progress', async (req, res, next) => {
  try {
    const friend = await User.findOne({ username: String(req.params.username).toLowerCase() }).select('username createdAt');
    if (!friend) return res.status(404).json({ message: 'User not found.' });

    const f = await findFriendship(req.user._id, friend._id);
    if (!f || f.status !== 'accepted') return res.status(403).json({ message: 'You can only view progress of your friends.' });

    const [questions, progress] = await Promise.all([
      Question.find().sort({ number: 1 }).select('number pattern title source').lean(),
      Progress.find({ user: friend._id, done: true }).select('question completedAt').lean(),
    ]);
    const doneMap = new Map(progress.map((p) => [String(p.question), p.completedAt]));
    const stats = buildStats(questions, new Set(doneMap.keys()));

    res.json({
      user: { username: friend.username, friendshipId: f._id, since: f.updatedAt },
      stats,
      questions: questions.map((q) => ({ ...q, done: doneMap.has(String(q._id)), completedAt: doneMap.get(String(q._id)) || null })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
