require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const seedQuestions = require('./seedQuestions');

(async () => {
  await connectDB();
  await seedQuestions(); // force a full upsert
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
