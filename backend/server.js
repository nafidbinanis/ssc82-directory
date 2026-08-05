require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initSchema } = require('./db');
const { authenticate } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const statsRoutes = require('./routes/stats');
const activityRoutes = require('./routes/activity');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(authenticate);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ssc82-directory-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/activity', activityRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  // Ensures tables exist even if `npm run seed` was never run (e.g. first
  // deploy against a brand-new empty database).
  await initSchema();
  app.listen(PORT, () => {
    console.log(`SSC 1982 Directory API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
