const express = require('express');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Progress = require('../models/Progress');
const NoteImage = require('../models/NoteImage');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Spaced repetition: review 1 is 3 days after flagging, review 2 is 7 days after review 1, review 3 is 30 days after review 2.
const INTERVAL_DAYS = [3, 7, 30];
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (d) => new Date(Date.now() + d * DAY_MS);
const CLEAR_REVISIT = { revisit: false, revisitStep: 0, nextReviewAt: null };

const shape = (questionId, p) => ({
  questionId,
  done: p.done,
  completedAt: p.completedAt,
  note: p.note,
  revisit: p.revisit,
  revisitStep: p.revisitStep,
  nextReviewAt: p.nextReviewAt,
});

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
        return {
          ...q,
          done: !!p?.done,
          completedAt: p?.completedAt || null,
          note: p?.note || '',
          imageCount: imgByQ.get(String(q._id)) || 0,
          revisit: !!p?.revisit,
          revisitStep: p?.revisitStep || 0,
          nextReviewAt: p?.nextReviewAt || null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// Mark done/undone, save a note, and/or flag for revision. Body: { done?: boolean, note?: string, revisit?: boolean }
router.patch('/:questionId', async (req, res, next) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.isValidObjectId(questionId)) return res.status(400).json({ message: 'Invalid question id.' });
    if (!(await Question.exists({ _id: questionId }))) return res.status(404).json({ message: 'Question not found.' });

    const set = {};
    if (typeof req.body.done === 'boolean') {
      set.done = req.body.done;
      set.completedAt = req.body.done ? new Date() : null;
      if (!req.body.done) Object.assign(set, CLEAR_REVISIT); // un-solving a question removes it from revision
    }
    if (typeof req.body.note === 'string') {
      if (req.body.note.length > 2000) return res.status(400).json({ message: 'Notes are limited to 2000 characters.' });
      set.note = req.body.note.trim();
    }
    if (typeof req.body.revisit === 'boolean') {
      if (req.body.revisit) {
        const willBeDone = typeof req.body.done === 'boolean' ? req.body.done : !!(await Progress.exists({ user: req.user._id, question: questionId, done: true }));
        if (!willBeDone) return res.status(400).json({ message: 'Solve this question before adding it to revision.' });
        Object.assign(set, { revisit: true, revisitStep: 0, nextReviewAt: daysFromNow(INTERVAL_DAYS[0]), lastReviewedAt: null });
      } else {
        Object.assign(set, CLEAR_REVISIT);
      }
    }
    if (!Object.keys(set).length) return res.status(400).json({ message: 'Nothing to update.' });

    const p = await Progress.findOneAndUpdate(
      { user: req.user._id, question: questionId },
      { $set: set },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json(shape(questionId, p));
  } catch (err) {
    next(err);
  }
});

// Finish a revision. Body: { result: 'remembered' | 'forgot' }
//  remembered -> moves to the next interval (3 -> 7 -> 30 days); after the 30-day review the question leaves the list.
//  forgot     -> starts over: due again in 3 days.
router.post('/:questionId/review', async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { result } = req.body || {};
    if (!mongoose.isValidObjectId(questionId)) return res.status(400).json({ message: 'Invalid question id.' });
    if (result !== 'remembered' && result !== 'forgot') return res.status(400).json({ message: 'Result must be "remembered" or "forgot".' });

    const p = await Progress.findOne({ user: req.user._id, question: questionId });
    if (!p || !p.done || !p.revisit) return res.status(400).json({ message: 'This question is not in your revision list.' });
    if (p.nextReviewAt && p.nextReviewAt.getTime() > Date.now() + DAY_MS) return res.status(400).json({ message: 'This question is not due for revision yet.' });

    const now = new Date();
    let update;
    let completed = false;
    if (result === 'forgot') {
      update = { revisitStep: 0, nextReviewAt: daysFromNow(INTERVAL_DAYS[0]), lastReviewedAt: now };
    } else {
      const step = p.revisitStep + 1;
      if (step >= INTERVAL_DAYS.length) {
        completed = true;
        update = { ...CLEAR_REVISIT, lastReviewedAt: now };
      } else {
        update = { revisitStep: step, nextReviewAt: daysFromNow(INTERVAL_DAYS[step]), lastReviewedAt: now };
      }
    }

    // Only applies if nothing changed in the meantime, so a double-tap can't advance two steps.
    const updated = await Progress.findOneAndUpdate(
      { _id: p._id, revisit: true, revisitStep: p.revisitStep, nextReviewAt: p.nextReviewAt },
      { $set: update },
      { new: true }
    ).lean();
    if (!updated) return res.status(409).json({ message: 'This question was already updated. Refresh and try again.' });

    res.json({ ...shape(questionId, updated), completed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
