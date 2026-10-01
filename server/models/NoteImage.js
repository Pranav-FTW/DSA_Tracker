const mongoose = require('mongoose');

// A photo of handwritten notes attached to one question. The image itself lives on Cloudinary;
// only its id and version are stored here. Private to its owner.
const noteImageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    publicId: { type: String, required: true, unique: true },
    version: { type: Number, required: true },
  },
  { timestamps: true }
);

noteImageSchema.index({ user: 1, question: 1, createdAt: 1 });

module.exports = mongoose.model('NoteImage', noteImageSchema);
