const mongoose = require('mongoose');
const Question = require('../models/Question');
const seedQuestions = require('../scripts/seedQuestions');
const questions = require('../data/questions.json');

// The connection is cached on `global` so serverless invocations (Vercel) reuse it
// instead of opening a new one on every request.
let cached = global.__mongo || (global.__mongo = { promise: null, ready: false });

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Add it to your environment variables.');
  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 5 })
      .then(() => console.log(`MongoDB connected: ${mongoose.connection.host}`))
      .catch((err) => {
        cached.promise = null; // allow a retry on the next request
        throw err;
      });
  }
  await cached.promise;

  // Load the question list the first time (or when new questions were added to questions.json).
  if (!cached.ready) {
    const count = await Question.estimatedDocumentCount();
    if (count < questions.length) await seedQuestions();
    cached.ready = true;
  }
}

module.exports = connect;
