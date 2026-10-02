const mongoose = require('mongoose');

// One document per (user, question). Created the first time the user ticks or annotates a question.
const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    note: { type: String, default: '', maxlength: 2000 },
    // Spaced repetition: a solved question can be flagged for revision.
    revisit: { type: Boolean, default: false },
    revisitStep: { type: Number, default: 0, min: 0, max: 3 }, // reviews completed so far (0-2 while active)
    nextReviewAt: { type: Date, default: null },
    lastReviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

progressSchema.index({ user: 1, question: 1 }, { unique: true });
progressSchema.index({ user: 1, done: 1 });
progressSchema.index({ user: 1, done: 1, completedAt: -1 }); // activity feed
progressSchema.index({ user: 1, revisit: 1, nextReviewAt: 1 }); // revise list

module.exports = mongoose.model('Progress', progressSchema);
