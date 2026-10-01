const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
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
