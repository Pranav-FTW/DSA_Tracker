const express = require('express');
const Progress = require('../models/Progress');
const Friendship = require('../models/Friendship');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Activity feed: recent solves by the people you are friends with (accepted only).
// Your own solves and anyone who is not your friend never appear. Notes are never included.
// Query: ?limit=30 (max 50)  &before=<ISO date>  (pass the previous response's `next` to load older items)
router.get('/', async (req, res, next) => {
  try {
    const me = req.user._id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);

    let before = null;
    if (req.query.before) {
      before = new Date(String(req.query.before));
      if (Number.isNaN(before.getTime())) return res.status(400).json({ message: 'Invalid "before" date.' });
    }

    const links = await Friendship.find({ status: 'accepted', $or: [{ requester: me }, { recipient: me }] })
      .select('requester recipient')
      .lean();
    const friendIds = links.map((f) => (String(f.requester) === String(me) ? f.recipient : f.requester));
    if (!friendIds.length) return res.json({ items: [], hasMore: false, next: null });

    const rows = await Progress.find({
      user: { $in: friendIds },
      done: true,
      completedAt: before ? { $lt: before } : { $ne: null },
    })
      .sort({ completedAt: -1 })
      .limit(limit + 1)
      .populate('user', 'username')
      .populate('question', 'title pattern')
      .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    res.json({
      items: page
        .filter((r) => r.user && r.question)
        .map((r) => ({
          id: r._id,
          username: r.user.username,
          questionId: r.question._id,
          title: r.question.title,
          pattern: r.question.pattern,
          completedAt: r.completedAt,
        })),
      hasMore,
      next: page.length ? page[page.length - 1].completedAt : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
