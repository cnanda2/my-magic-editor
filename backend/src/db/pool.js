/**
 * PostgreSQL connection pool
 * Connects to the configured PostgreSQL database.
 *
 * Configure via environment variables (see backend/.env.example):
 *   DATABASE_URL  -> full connection string (takes priority if set)
 *   or PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'thestemeducator',
    });

pool.on('error', (err) => {
  // Log unexpected errors on idle clients; don't crash the server.
  // eslint-disable-next-line no-console
  console.error('[db] Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Run a parameterized query.
 * @param {string} text SQL with $1, $2 placeholders
 * @param {Array} params values
 */
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
