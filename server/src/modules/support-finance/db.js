/**
 * Database & Configuration Compatibility Bridge for Member 4
 * Harmonizes imports across Platform Foundation variations:
 * - server/src/db/index.js (Member 1 standard on main)
 * - server/src/db/connection.js (Legacy foundation)
 * - server/src/config/env.js (env or ENV)
 */

import * as envModule from '../../config/env.js';

const baseEnv = envModule.ENV || envModule.env || process.env || {};

export const ENV = {
  RAZORPAY_KEY_ID: 'rzp_test_mock_key',
  RAZORPAY_KEY_SECRET: 'test_secret_key_mock_fallback',
  RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret_mock',
  ...baseEnv
};

let poolInstance = null;
let queryFn = null;

try {
  const dbModule = await import('../../db/index.js');
  poolInstance = dbModule.pool || dbModule.default?.pool || dbModule.db?.pool;
  queryFn = dbModule.query || dbModule.default?.query || dbModule.db?.query;
} catch {
  try {
    const connModule = await import('../../db/connection.js');
    poolInstance = connModule.pool;
    queryFn = connModule.query;
  } catch {
    // Isolated / mock mode fallback
  }
}

export const pool = poolInstance || {
  connect: async () => {
    throw new Error('Database pool offline in current environment');
  }
};

export const query = queryFn || (async () => {
  throw new Error('Database query handler offline in current environment');
});
