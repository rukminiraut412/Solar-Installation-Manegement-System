import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient, pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const client = await getClient();
  const migrationsDir = path.join(__dirname, 'migrations');

  console.log('[Migration Runner] Checking schema_migrations table...');

  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch already applied migrations
    const appliedRes = await client.query('SELECT name FROM schema_migrations ORDER BY id ASC;');
    const appliedSet = new Set(appliedRes.rows.map(r => r.name));

    // 3. Read migration files sorted alphabetically
    if (!fs.existsSync(migrationsDir)) {
      console.log('[Migration Runner] No migrations directory found.');
      return [];
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const newlyApplied = [];

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migration Runner] Skipping already applied: ${file}`);
        continue;
      }

      console.log(`[Migration Runner] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1);', [file]);
        await client.query('COMMIT');
        console.log(`[Migration Runner] Successfully applied: ${file}`);
        newlyApplied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migration Runner] Failed to apply ${file}. Rolled back.`, err.message);
        throw err;
      }
    }

    console.log(`[Migration Runner] Migration completed. ${newlyApplied.length} new migration(s) applied.`);
    return newlyApplied;
  } finally {
    client.release();
  }
}

// Allow CLI execution: `node src/db/migrate.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Migration Runner Error]:', err);
      await pool.end();
      process.exit(1);
    });
}
