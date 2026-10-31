import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Router } from 'express';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { authenticate } from '../src/middleware/auth.middleware.js';
import { authorize, requireAdmin, sanitizeFinancialResponse } from '../src/middleware/rbac.middleware.js';
import { validate } from '../src/middleware/validate.middleware.js';
import { successResponse } from '../src/shared/utils/response.js';
import { z } from 'zod';

describe('Phase 5: Platform Integration Readiness & Central Mounting', () => {
  let adminToken;
  let salesToken;
  let techToken;

  beforeAll(async () => {
    await AuthService.seedDefaultUsers();

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sunpower.com', password: 'Admin@12345' });
    adminToken = adminLogin.body.data.accessToken;

    const salesLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@sunpower.com', password: 'Sales@12345' });
    salesToken = salesLogin.body.data.accessToken;

    const techLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'technician@sunpower.com', password: 'Technician@12345' });
    techToken = techLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('1. Central Router Mounting & Route Verification', () => {
    it('verifies core platform routes are mounted', async () => {
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);

      const apiHealthRes = await request(app).get('/api/v1/health');
      expect(apiHealthRes.status).toBe(200);

      const mediaRes = await request(app)
        .post('/api/v1/media/sign-upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ folder: 'surveys' });
      expect(mediaRes.status).toBe(200);
    });

    it('verifies standardized 404 for unmounted routes', async () => {
      const res = await request(app).get('/api/v1/non-existent-module');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('2. Member Feature Router Interoperability Harness', () => {
    it('seamlessly integrates a Member 2 (Customer & Sales) mock router with shared middlewares', async () => {
      const m2Router = Router();
      const mockLeadSchema = z.object({
        customerName: z.string().min(2),
        phone: z.string(),
      });

      m2Router.post(
        '/leads',
        authenticate,
        authorize('Admin/Owner', 'Sales'),
        validate(mockLeadSchema),
        (req, res) => {
          return successResponse(res, { leadId: 'lead-123', creator: req.user.fullName }, 'Lead created', 201);
        }
      );

      // Mount on a test express instance using central middlewares
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/v1/customer-sales', m2Router);

      // Sales user can access
      const salesRes = await request(testApp)
        .post('/api/v1/customer-sales/leads')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ customerName: 'Rajesh Gupta', phone: '9876543210' });
      expect(salesRes.status).toBe(201);
      expect(salesRes.body.data.leadId).toBe('lead-123');

      // Technician is blocked (403 Forbidden)
      const techRes = await request(testApp)
        .post('/api/v1/customer-sales/leads')
        .set('Authorization', `Bearer ${techToken}`)
        .send({ customerName: 'Rajesh Gupta', phone: '9876543210' });
      expect(techRes.status).toBe(403);
    });

    it('seamlessly integrates a Member 3 (Operations) mock router with shared middlewares', async () => {
      const m3Router = Router();

      m3Router.get(
        '/inventory',
        authenticate,
        authorize('Admin/Owner', 'Warehouse', 'Sales'),
        (req, res) => {
          return successResponse(res, [{ sku: 'INV-3KW', onHand: 15 }], 'Inventory list', 200);
        }
      );

      const testApp = express();
      testApp.use('/api/v1/operations', m3Router);

      // Sales can view inventory
      const salesRes = await request(testApp)
        .get('/api/v1/operations/inventory')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(salesRes.status).toBe(200);

      // Technician cannot manage inventory
      const techRes = await request(testApp)
        .get('/api/v1/operations/inventory')
        .set('Authorization', `Bearer ${techToken}`);
      expect(techRes.status).toBe(403);
    });

    it('seamlessly integrates a Member 4 (Finance) router with confidential financial filtering', async () => {
      const m4Router = Router();

      m4Router.get(
        '/project-margin/:id',
        authenticate,
        sanitizeFinancialResponse,
        (req, res) => {
          return successResponse(
            res,
            {
              projectId: req.params.id,
              totalBilled: 150000,
              profitMargin: 45000,
              costPrice: 105000,
            },
            'Margin details'
          );
        }
      );

      const testApp = express();
      testApp.use('/api/v1/support-finance', m4Router);

      // Admin views complete financial figures
      const adminRes = await request(testApp)
        .get('/api/v1/support-finance/project-margin/proj-1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.profitMargin).toBe(45000);
      expect(adminRes.body.data.costPrice).toBe(105000);

      // Sales views sanitized response (profit margins stripped!)
      const salesRes = await request(testApp)
        .get('/api/v1/support-finance/project-margin/proj-1')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(salesRes.status).toBe(200);
      expect(salesRes.body.data.totalBilled).toBe(150000);
      expect(salesRes.body.data.profitMargin).toBeUndefined();
      expect(salesRes.body.data.costPrice).toBeUndefined();
    });
  });
});
