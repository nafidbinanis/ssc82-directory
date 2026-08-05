const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill in your Postgres connection string.'
  );
}

const pool = new Pool({
  connectionString,
  // Most free hosted Postgres providers (Supabase, Neon, Render) require SSL.
  // Disabling certificate verification is standard for these managed providers'
  // connection strings, which use short-lived certs.
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function initSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
}

module.exports = { pool, initSchema };
