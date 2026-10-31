import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[Database Pool Error] Unexpected idle client error:', err.message);
});

/**
 * Execute a parameterized query against the database pool
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    console.log(`[SQL Query] (${duration}ms):`, text.trim().slice(0, 100));
  }
  return res;
}

/**
 * Acquire a dedicated client from the pool (for multi-statement transactions)
 */
export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;

  // Set timeout on acquired client to avoid connection leaks
  const timeout = setTimeout(() => {
    console.error('[Database Leak Warning] Client checked out for more than 10 seconds.');
  }, 10000);

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };

  return client;
}

/**
 * Check database connection liveness
 */
export async function checkDbConnection() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() as current_time, current_database() as database;');
    return {
      connected: true,
      time: res.rows[0].current_time,
      database: res.rows[0].database,
    };
  } finally {
    client.release();
  }
}

export const db = {
  pool,
  query,
  getClient,
  checkDbConnection,
};

export default db;
