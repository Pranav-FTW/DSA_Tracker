const mongoose = require('mongoose');

// One document per (user, question). Created the first time the user ticks or annotates a question.
const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    note: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

progressSchema.index({ user: 1, question: 1 }, { unique: true });
progressSchema.index({ user: 1, done: 1 });
progressSchema.index({ user: 1, done: 1, completedAt: -1 }); // activity feed


module.exports = mongoose.model('Progress', progressSchema);
