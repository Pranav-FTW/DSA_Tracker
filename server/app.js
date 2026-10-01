// Express app only (no listen). Used by server.js locally/Render and by api/index.js on Vercel.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

// CLIENT_URL may hold several comma-separated origins, with no trailing slash.
const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '50kb' }));

app.get('/', (_req, res) => res.json({ name: 'DSA Tracker API', ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const withDB = async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
};
app.use('/api/auth', withDB, require('./routes/auth'));
app.use('/api/tracker', withDB, require('./routes/tracker'));
app.use('/api/friends', withDB, require('./routes/friends'));
app.use('/api/note-images', withDB, require('./routes/noteImages'));
app.use('/api/activity', withDB, require('./routes/activity'));
app.use('/api/cheers', withDB, require('./routes/cheers'));
app.use('/api', (_req, res) => res.status(404).json({ message: 'Route not found.' }));

// Single-server hosting (e.g. Render): serve the built React app if it exists.
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'That already exists.' });
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

module.exports = app;
