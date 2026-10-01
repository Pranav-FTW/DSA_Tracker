const mongoose = require('mongoose');

// One document per cheer / nudge. Doubles as the notification the recipient sees.
const cheerSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['cheer', 'nudge'], required: true },
    // Set when the cheer is attached to a specific solved question (from the activity feed).
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

cheerSchema.index({ to: 1, createdAt: -1 });
cheerSchema.index({ to: 1, readAt: 1 });
cheerSchema.index({ from: 1, to: 1, type: 1, createdAt: -1 });
// Notifications clean themselves up after 30 days (keeps the free-tier database small).
cheerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Cheer', cheerSchema);
