import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import { ROLES } from '../../shared/constants/roles.js';

function getAuthHeader(role = ROLES.ADMIN, sub = '00000000-0000-0000-0000-000000000001') {
  const token = signAccessToken({
    id: sub,
    email: `${role.toLowerCase().replace(/[^a-z]/g, '')}@sunpower.test`,
    role,
    full_name: `Test ${role}`,
  });
  return `Bearer ${token}`;
}

describe('Auth Module - Seller Registration & User Management', () => {
  const uniqueSuffix = Date.now();
  const testSellerEmail = `seller_${uniqueSuffix}@example.com`;

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a seller and enforces Sales role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test Seller Guy',
          email: testSellerEmail,
          phone: '+91 99999 88888',
          password: 'Password@123',
          businessName: 'SunTech Distributors',
          address: '42 Market Street, Mumbai',
          // Malicious attempt to self-assign Admin
          role: 'Admin/Owner',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testSellerEmail);
      // Strictly enforced to Sales
      expect(res.body.data.role).toBe(ROLES.SALES);
      expect(res.body.data.role).not.toBe('Admin/Owner');
      expect(res.body.data.isActive).toBe(true);
    });

    it('rejects registration with duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Duplicate Seller',
          email: testSellerEmail,
          phone: '+91 99999 77777',
          password: 'Password@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('rejects registration when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'No Email User',
          phone: '12345',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User Management (Admin Only)', () => {
    it('prohibits non-admin users from accessing GET /api/v1/auth/users', async () => {
      // Login as Sales
      const salesLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sales@sunpower.com', password: 'Sales@12345' });

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${salesLogin.body.data.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('allows Admin to retrieve the employee user list', async () => {
      // Login as Admin
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@sunpower.com', password: 'Admin@12345' });

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminLogin.body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
