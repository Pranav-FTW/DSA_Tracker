const express = require('express');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Progress = require('../models/Progress');
const NoteImage = require('../models/NoteImage');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// All questions merged with the logged-in user's progress and notes.
router.get('/', async (req, res, next) => {
  try {
    const [questions, progress, imageCounts] = await Promise.all([
      Question.find().sort({ number: 1 }).lean(),
      Progress.find({ user: req.user._id }).lean(),
      NoteImage.aggregate([{ $match: { user: req.user._id } }, { $group: { _id: '$question', n: { $sum: 1 } } }]),
    ]);
    const byQ = new Map(progress.map((p) => [String(p.question), p]));
    const imgByQ = new Map(imageCounts.map((c) => [String(c._id), c.n]));

    res.json({
      questions: questions.map((q) => {
        const p = byQ.get(String(q._id));
        return { ...q, done: !!p?.done, completedAt: p?.completedAt || null, note: p?.note || '', imageCount: imgByQ.get(String(q._id)) || 0};
      }),
    });
  } catch (err) {
    next(err);
  }
});

// Mark done/undone and/or save a note. Body: { done?: boolean, note?: string }
router.patch('/:questionId', async (req, res, next) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.isValidObjectId(questionId)) return res.status(400).json({ message: 'Invalid question id.' });
    if (!(await Question.exists({ _id: questionId }))) return res.status(404).json({ message: 'Question not found.' });

    const set = {};
    if (typeof req.body.done === 'boolean') {
      set.done = req.body.done;
      set.completedAt = req.body.done ? new Date() : null;
    }
    if (typeof req.body.note === 'string') {
      if (req.body.note.length > 2000) return res.status(400).json({ message: 'Notes are limited to 2000 characters.' });
      set.note = req.body.note.trim();
    }
    if (!Object.keys(set).length) return res.status(400).json({ message: 'Nothing to update.' });

    const p = await Progress.findOneAndUpdate(
      { user: req.user._id, question: questionId },
      { $set: set },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ questionId, done: p.done, completedAt: p.completedAt, note: p.note });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
