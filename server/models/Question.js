const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true }, // unique across ALL sheets
  sheet: { type: String, default: 'main', index: true }, // which sheet the question belongs to
  sheetNumber: Number, // the number shown to users inside its sheet
  difficulty: String,
  pattern: { type: String, required: true, index: true },
  title: { type: String, required: true },
  source: { type: String, enum: ['NeetCode', 'Striver', 'Both'], required: true },
  leetcode: String,
  neetcode: String,
  striver: String,
  youtube: String,
  info: String,
});

module.exports = mongoose.model('Question', questionSchema);
