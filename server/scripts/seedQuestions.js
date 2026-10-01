const Question = require('../models/Question');
const questions = require('../data/questions.json');

// Upserts by question number, so it is safe to run on every start and keeps user progress intact.
module.exports = async function seedQuestions() {
  const ops = questions.map((q) => ({
    updateOne: { filter: { number: q.number }, update: { $set: q }, upsert: true },
  }));
  const res = await Question.bulkWrite(ops);
  const added = res.upsertedCount || 0;
  console.log(`Questions ready: ${questions.length} total${added ? `, ${added} newly added` : ''}`);
};
