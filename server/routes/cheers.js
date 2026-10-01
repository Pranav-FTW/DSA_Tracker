const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Friendship = require('../models/Friendship');
const Cheer = require('../models/Cheer');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Anti-spam: how long a sender must wait before sending the same type to the same friend again.
const COOLDOWN_MS = {
  cheer: 5 * 60 * 1000, // 5 minutes
  nudge: 12 * 60 * 60 * 1000, // 12 hours
};

const waitText = (ms) => {
  const mins = Math.ceil(ms / 60000);
  return mins >= 60 ? `${Math.ceil(mins / 60)} hr` : `${mins} min`;
};

// Send a cheer or a nudge to a friend.  Body: { type: 'cheer' | 'nudge', questionId?: string }
router.post('/send/:username', async (req, res, next) => {
  try {
    const { type, questionId } = req.body || {};
    if (!COOLDOWN_MS[type]) return res.status(400).json({ message: 'Type must be "cheer" or "nudge".' });

    if (questionId) {
      if (!mongoose.isValidObjectId(questionId)) return res.status(400).json({ message: 'Invalid question id.' });
      if (!(await Question.exists({ _id: questionId }))) return res.status(404).json({ message: 'Question not found.' });
    }

    const username = String(req.params.username || '').toLowerCase();
    const target = await User.findOne({ username }).select('_id username');
    if (!target) return res.status(404).json({ message: 'User not found.' });
    if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: "You can't send this to yourself." });

    const friends = await Friendship.exists({
      status: 'accepted',
      $or: [
        { requester: req.user._id, recipient: target._id },
        { requester: target._id, recipient: req.user._id },
      ],
    });
    if (!friends) return res.status(403).json({ message: 'You can only cheer or nudge your friends.' });

    const recent = await Cheer.findOne({
      from: req.user._id,
      to: target._id,
      type,
      createdAt: { $gte: new Date(Date.now() - COOLDOWN_MS[type]) },
    })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();
    if (recent) {
      const wait = recent.createdAt.getTime() + COOLDOWN_MS[type] - Date.now();
      return res.status(429).json({
        message: `You already ${type === 'cheer' ? 'cheered' : 'nudged'} @${target.username}. Try again in ${waitText(wait)}.`,
      });
    }

    await Cheer.create({ from: req.user._id, to: target._id, type, question: questionId || null });
    res.status(201).json({ message: type === 'cheer' ? `Cheer sent to @${target.username}!` : `Nudge sent to @${target.username}.` });
  } catch (err) {
    next(err);
  }
});

// Your notifications (cheers and nudges you received), newest first, plus the unread count.
router.get('/notifications', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);
    const [rows, unread] = await Promise.all([
      Cheer.find({ to: req.user._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('from', 'username')
        .populate('question', 'title')
        .lean(),
      Cheer.countDocuments({ to: req.user._id, readAt: null }),
    ]);

    res.json({
      unread,
      items: rows
        .filter((r) => r.from)
        .map((r) => ({
          id: r._id,
          type: r.type,
          from: r.from.username,
          questionTitle: r.question?.title || null,
          createdAt: r.createdAt,
          read: !!r.readAt,
        })),
    });
  } catch (err) {
    next(err);
  }
});

// Lightweight call for the badge in the sidebar.
router.get('/unread-count', async (req, res, next) => {
  try {
    res.json({ unread: await Cheer.countDocuments({ to: req.user._id, readAt: null }) });
  } catch (err) {
    next(err);
  }
});

// Mark everything as read.
router.post('/read', async (req, res, next) => {
  try {
    await Cheer.updateMany({ to: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ unread: 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
