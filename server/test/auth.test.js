import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { db, pool } from '../src/db/index.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { ROLES, PERMISSIONS, hasPermission } from '../src/shared/constants/roles.js';
import { getRowScope, filterConfidentialData, filterCustomerFacingData } from '../src/shared/utils/rowScope.js';
import { signAccessToken } from '../src/shared/utils/jwt.js';

describe('Phase 3: Authentication and 5-Role RBAC', () => {
  beforeAll(async () => {
    // Ensure default users are seeded
    await AuthService.seedDefaultUsers();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('1. Authentication Endpoints', () => {
    it('successfully logs in with valid Admin credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@sunpower.com', password: 'Admin@12345' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@sunpower.com');
      expect(res.body.data.user.role).toBe(ROLES.ADMIN);
      expect(res.body.data.user.password_hash).toBeUndefined(); // Password hash never exposed!
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Check cookie headers
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('accessToken'))).toBe(true);
      expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);
    });

    it('rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@sunpower.com', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('rejects login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@sunpower.com', password: 'Password@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects login with invalid email schema', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'short' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retrieves user profile via GET /api/v1/auth/me with Bearer token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sales@sunpower.com', password: 'Sales@12345' });

      const token = loginRes.body.data.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.email).toBe('sales@sunpower.com');
      expect(meRes.body.data.role).toBe(ROLES.SALES);
      expect(meRes.body.data.password_hash).toBeUndefined();
    });

    it('rejects GET /api/v1/auth/me without authentication token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects GET /api/v1/auth/me with invalid / forged token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer forged.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('supports refresh token rotation via POST /api/v1/auth/refresh', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'warehouse@sunpower.com', password: 'Warehouse@12345' });

      const originalRefreshToken = loginRes.body.data.refreshToken;

      // Refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: originalRefreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).not.toBe(originalRefreshToken); // Rotated!

      // Attempting to reuse old refresh token should be rejected (reuse protection)
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: originalRefreshToken });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.message).toContain('Revoked refresh token detected');
    });

    it('logs out and revokes refresh token via POST /api/v1/auth/logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'technician@sunpower.com', password: 'Technician@12345' });

      const refreshToken = loginRes.body.data.refreshToken;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Attempting to refresh with revoked token fails
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('2. Five-Role RBAC & Permissions', () => {
    it('verifies all 5 standard project roles are recognized', () => {
      expect(ROLES.ADMIN).toBe('Admin/Owner');
      expect(ROLES.SALES).toBe('Sales');
      expect(ROLES.WAREHOUSE).toBe('Warehouse');
      expect(ROLES.TECHNICIAN).toBe('Technician');
      expect(ROLES.SUPPORT).toBe('Support');
    });

    it('grants Admin/Owner all permissions', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.FINANCE_VIEW_PROFIT_MARGINS)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USERS_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.LEADS_DELETE)).toBe(true);
    });

    it('restricts confidential financial and payroll permissions from non-admin roles', () => {
      expect(hasPermission(ROLES.SALES, PERMISSIONS.FINANCE_VIEW_PROFIT_MARGINS)).toBe(false);
      expect(hasPermission(ROLES.WAREHOUSE, PERMISSIONS.FINANCE_VIEW_PROFIT_MARGINS)).toBe(false);
      expect(hasPermission(ROLES.TECHNICIAN, PERMISSIONS.FINANCE_VIEW_PROFIT_MARGINS)).toBe(false);
      expect(hasPermission(ROLES.SUPPORT, PERMISSIONS.FINANCE_VIEW_PROFIT_MARGINS)).toBe(false);

      expect(hasPermission(ROLES.SALES, PERMISSIONS.FINANCE_VIEW_TECH_PAYROLL)).toBe(false);
      expect(hasPermission(ROLES.TECHNICIAN, PERMISSIONS.FINANCE_VIEW_TECH_PAYROLL)).toBe(false);
    });

    it('verifies Sales permissions match specification', () => {
      expect(hasPermission(ROLES.SALES, PERMISSIONS.LEADS_CREATE)).toBe(true);
      expect(hasPermission(ROLES.SALES, PERMISSIONS.QUOTES_CREATE)).toBe(true);
      expect(hasPermission(ROLES.SALES, PERMISSIONS.INVENTORY_DISPATCH)).toBe(false);
      expect(hasPermission(ROLES.SALES, PERMISSIONS.TICKETS_MANAGE)).toBe(false);
    });

    it('verifies Warehouse permissions match specification', () => {
      expect(hasPermission(ROLES.WAREHOUSE, PERMISSIONS.INVENTORY_DISPATCH)).toBe(true);
      expect(hasPermission(ROLES.WAREHOUSE, PERMISSIONS.SERIAL_SCAN)).toBe(true);
      expect(hasPermission(ROLES.WAREHOUSE, PERMISSIONS.LEADS_CREATE)).toBe(false);
    });

    it('verifies Technician permissions match specification', () => {
      expect(hasPermission(ROLES.TECHNICIAN, PERMISSIONS.JOBS_EXECUTE)).toBe(true);
      expect(hasPermission(ROLES.TECHNICIAN, PERMISSIONS.JOBS_SIGN_OFF)).toBe(true);
      expect(hasPermission(ROLES.TECHNICIAN, PERMISSIONS.QUOTES_CREATE)).toBe(false);
    });

    it('verifies Support permissions match specification', () => {
      expect(hasPermission(ROLES.SUPPORT, PERMISSIONS.TICKETS_VIEW)).toBe(true);
      expect(hasPermission(ROLES.SUPPORT, PERMISSIONS.TICKETS_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.SUPPORT, PERMISSIONS.INVENTORY_DISPATCH)).toBe(false);
    });
  });

  describe('3. Row-Level Scope Enforcement & Data Sanitization', () => {
    it('Admin/Owner receives unrestricted row scope', () => {
      const scope = getRowScope({ id: 'uuid-1', role: ROLES.ADMIN }, 'leads');
      expect(scope.clause).toBe('1=1');
      expect(scope.params).toHaveLength(0);
    });

    it('Sales role is scoped to assigned leads', () => {
      const scope = getRowScope({ id: 'sales-uuid-1', role: ROLES.SALES }, 'leads');
      expect(scope.clause).toContain('assigned_sales_id');
      expect(scope.params).toContain('sales-uuid-1');
    });

    it('Technician role is scoped to their jobs/crew', () => {
      const scope = getRowScope({ id: 'tech-uuid-1', role: ROLES.TECHNICIAN }, 'jobs');
      expect(scope.clause).toContain('technician_id');
      expect(scope.params).toContain('tech-uuid-1');
    });

    it('filters confidential financial figures for non-admin users', () => {
      const sensitiveRecord = {
        id: 'job-101',
        customerName: 'Ramesh Patel',
        totalPrice: 150000,
        profitMargin: 35000,
        technicianCost: 8000,
        costPrice: 107000,
      };

      const adminView = filterConfidentialData(sensitiveRecord, ROLES.ADMIN);
      expect(adminView.profitMargin).toBe(35000);
      expect(adminView.technicianCost).toBe(8000);

      const salesView = filterConfidentialData(sensitiveRecord, ROLES.SALES);
      expect(salesView.customerName).toBe('Ramesh Patel');
      expect(salesView.totalPrice).toBe(150000);
      expect(salesView.profitMargin).toBeUndefined();
      expect(salesView.technicianCost).toBeUndefined();
      expect(salesView.costPrice).toBeUndefined();
    });

    it('filters internal notes and cost figures for customer-facing views', () => {
      const customerRecord = {
        proposalId: 'PROP-2026-001',
        systemSize: '5 kW On-Grid',
        quotedPrice: 220000,
        internalNotes: 'Customer requested 5% discount, approved due to prompt advance',
        profitMargin: 42000,
      };

      const cleaned = filterCustomerFacingData(customerRecord);
      expect(cleaned.proposalId).toBe('PROP-2026-001');
      expect(cleaned.systemSize).toBe('5 kW On-Grid');
      expect(cleaned.quotedPrice).toBe(220000);
      expect(cleaned.internalNotes).toBeUndefined();
      expect(cleaned.profitMargin).toBeUndefined();
    });
  });

  describe('4. Audit Logging & Database Integrity', () => {
    it('persists audit logs in database upon login and logout events', async () => {
      const res = await db.query(
        `SELECT action, entity, user_id, created_at 
         FROM audit_logs 
         WHERE action IN ('LOGIN_SUCCESS', 'LOGOUT', 'TOKEN_REFRESH')
         ORDER BY created_at DESC 
         LIMIT 5;`
      );

      expect(res.rows.length).toBeGreaterThan(0);
      expect(['LOGIN_SUCCESS', 'LOGOUT', 'TOKEN_REFRESH']).toContain(res.rows[0].action);
    });

    it('persists refresh tokens in PostgreSQL with user relation', async () => {
      const res = await db.query(
        `SELECT r.id, r.user_id, r.token_hash, u.email 
         FROM refresh_tokens r
         JOIN users u ON r.user_id = u.id
         LIMIT 1;`
      );

      expect(res.rows.length).toBe(1);
      expect(res.rows[0].token_hash).toBeDefined();
      expect(res.rows[0].email).toBeDefined();
    });
  });
});
