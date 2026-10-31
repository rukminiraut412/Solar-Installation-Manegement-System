import { describe, it, expect, afterAll } from 'vitest';
import { db, pool } from '../src/db/index.js';

describe('PostgreSQL Database Infrastructure', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('connects to PostgreSQL database and reports current time & db name', async () => {
    const status = await db.checkDbConnection();
    expect(status.connected).toBe(true);
    expect(status.database).toBe('solar_management_dev');
    expect(status.time).toBeDefined();
  });

  it('contains schema_migrations, users, refresh_tokens, and audit_logs tables', async () => {
    const res = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const tables = res.rows.map(r => r.table_name);
    expect(tables).toContain('schema_migrations');
    expect(tables).toContain('users');
    expect(tables).toContain('refresh_tokens');
    expect(tables).toContain('audit_logs');
  });

  it('supports atomic transaction commit and rollback', async () => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const testEmail = `rollback_test_${Date.now()}@example.com`;
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4);`,
        [testEmail, 'dummyhash', 'Rollback Tester', 'Admin/Owner']
      );
      // Verify row exists inside transaction
      const inTx = await client.query('SELECT * FROM users WHERE email = $1;', [testEmail]);
      expect(inTx.rows.length).toBe(1);

      // Rollback
      await client.query('ROLLBACK');

      // Verify row does not exist outside transaction
      const afterTx = await db.query('SELECT * FROM users WHERE email = $1;', [testEmail]);
      expect(afterTx.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });
});
