/**
 * Operations & Fulfilment Comprehensive End-to-End Test Suite
 * Author: Member 3 (Operations & Fulfilment Lead)
 * Authority: docs/contracts/operations.md & SOLAR_MANAGEMENT_SYSTEM.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from './operations.app.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import { ROLES } from '../../shared/constants/roles.js';
import { OperationsDb } from './db.adapter.js';

// Helper to generate auth tokens for testing RBAC
function getAuthHeader(role = ROLES.ADMIN, sub = 'u1-admin-001') {
  const token = signAccessToken({
    id: sub,
    email: `${role.toLowerCase().replace(/[^a-z]/g, '')}@sunpower.test`,
    role,
    full_name: `Test ${role}`
  });
  return `Bearer ${token}`;
}

describe('Operations & Fulfilment Module E2E Test Suite', () => {
  beforeEach(() => {
    // Reset in-memory state before each test
    OperationsDb.resetStore();
  });

  // ==========================================
  // Phase 1: Products & Inventory Balance Invariants
  // ==========================================
  describe('Phase 1: Products & Inventory', () => {
    it('GET /api/v1/operations/products returns product catalog', async () => {
      const res = await request(app)
        .get('/api/v1/operations/products')
        .set('Authorization', getAuthHeader(ROLES.SALES));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);
    });

    it('GET /api/v1/operations/inventory enforces available = on_hand - reserved balance invariant', async () => {
      const res = await request(app)
        .get('/api/v1/operations/inventory')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data;
      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        expect(item.availableQuantity).toBe(item.onHandQuantity - item.reservedQuantity);
        expect(item.availableQuantity).toBeGreaterThanOrEqual(0);
      }
    });

    it('POST /api/v1/operations/inventory/grn updates stock balance and appends to ledger', async () => {
      const grnPayload = {
        supplierName: 'Waaree Solar Tech Ltd',
        invoiceNumber: 'INV-WAR-2026-908',
        poNumber: 'PO-SUN-1002',
        warehouseLocation: 'Main Central Warehouse',
        items: [
          { sku: 'PNL-MONO-540W', quantity: 20, unitCost: 11500.00 }
        ]
      };

      const res = await request(app)
        .post('/api/v1/operations/inventory/grn')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send(grnPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items[0].newOnHand).toBe(70); // 50 seed + 20
    });

    it('POST /api/v1/operations/inventory/adjust requires ADMIN approval for large variance', async () => {
      const adjustPayload = {
        sku: 'INV-GROW-3K-26',
        adjustmentQuantity: -2, // 2 inverters * 24500 = 49000 > 2000 threshold
        reason: 'Physical count audit deficit',
        isApprovedByAdmin: false
      };

      // Warehouse user attempting without admin approval
      const failRes = await request(app)
        .post('/api/v1/operations/inventory/adjust')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send(adjustPayload);

      expect(failRes.status).toBe(403);
      expect(failRes.body.error.code).toBe('ADMIN_APPROVAL_REQUIRED');

      // Admin user approved
      const successRes = await request(app)
        .post('/api/v1/operations/inventory/adjust')
        .set('Authorization', getAuthHeader(ROLES.ADMIN))
        .send({ ...adjustPayload, isApprovedByAdmin: true });

      expect(successRes.status).toBe(200);
      expect(successRes.body.success).toBe(true);
    });
  });

  // ==========================================
  // Phase 2: Stock Reservation & Shortages
  // ==========================================
  describe('Phase 2: Stock Reservation & Shortage Handling', () => {
    it('POST /api/v1/operations/projects/handover rejects unmapped SKUs with 422', async () => {
      const invalidHandover = {
        projectId: 'proj-bad-sku-001',
        orderId: 'ord-1001',
        bomItems: [
          { sku: 'NON-EXISTENT-SKU-XYZ', quantity: 5 }
        ]
      };

      const res = await request(app)
        .post('/api/v1/operations/projects/handover')
        .set('Authorization', getAuthHeader(ROLES.SALES))
        .send(invalidHandover);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('UNMAPPED_BOM_SKU');
    });

    it('POST /api/v1/operations/projects/handover ingests BOM and is idempotent', async () => {
      const validHandover = {
        projectId: 'proj-solar-3kw-01',
        orderId: 'ord-solar-3kw-PAID',
        bomItems: [
          { sku: 'PNL-MONO-540W', quantity: 6 },
          { sku: 'INV-GROW-3K-26', quantity: 1 }
        ]
      };

      // First call -> 201 Created
      const res1 = await request(app)
        .post('/api/v1/operations/projects/handover')
        .set('Authorization', getAuthHeader(ROLES.SALES))
        .send(validHandover);

      expect(res1.status).toBe(201);
      expect(res1.body.data.status).toBe('INITIALIZED');

      // Repeated call -> 200 OK (idempotent)
      const res2 = await request(app)
        .post('/api/v1/operations/projects/handover')
        .set('Authorization', getAuthHeader(ROLES.SALES))
        .send(validHandover);

      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('ALREADY_INITIALIZED');
    });

    it('POST /api/v1/operations/projects/:projectId/reserve-stock reserves stock and flags shortage if unavailable', async () => {
      const projectId = 'proj-shortage-test';
      // Handover with massive quantity causing shortage
      await request(app)
        .post('/api/v1/operations/projects/handover')
        .set('Authorization', getAuthHeader(ROLES.SALES))
        .send({
          projectId,
          orderId: 'ord-shortage',
          bomItems: [
            { sku: 'PNL-MONO-540W', quantity: 9999 } // far exceeds 50 on-hand
          ]
        });

      const res = await request(app)
        .post(`/api/v1/operations/projects/${projectId}/reserve-stock`)
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SHORTAGE_FLAGGED');
      expect(res.body.data.shortages.length).toBe(1);
      expect(res.body.data.shortages[0].deficit).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // Phase 3: Serial Number Tracking
  // ==========================================
  describe('Phase 3: Serial Number Tracking & Registry', () => {
    it('POST /api/v1/operations/serials/batch registers serials and rejects duplicates', async () => {
      const newSerials = ['INV-GROW-3K-26-TEST901', 'INV-GROW-3K-26-TEST902'];

      // First registration -> 201
      const res1 = await request(app)
        .post('/api/v1/operations/serials/batch')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({
          sku: 'INV-GROW-3K-26',
          serialNumbers: newSerials,
          grnNumber: 'GRN-TEST-100'
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.count).toBe(2);

      // Duplicate registration attempt -> 409 Conflict
      const res2 = await request(app)
        .post('/api/v1/operations/serials/batch')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({
          sku: 'INV-GROW-3K-26',
          serialNumbers: ['INV-GROW-3K-26-TEST901']
        });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('DUPLICATE_SERIAL_NUMBER');
    });

    it('GET /api/v1/operations/serials/:serialNumber/trace provides 360-degree lifecycle history', async () => {
      const res = await request(app)
        .get('/api/v1/operations/serials/INV-GROW-3K-26-00101/trace')
        .set('Authorization', getAuthHeader(ROLES.TECHNICIAN));

      expect(res.status).toBe(200);
      expect(res.body.data.serialItem.serialNumber).toBe('INV-GROW-3K-26-00101');
      expect(res.body.data.serialItem.status).toBe('IN_WAREHOUSE');
    });

    it('POST /api/v1/operations/serials/:serialNumber/quarantine marks item as quarantined', async () => {
      const res = await request(app)
        .post('/api/v1/operations/serials/INV-GROW-3K-26-00102/quarantine')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({
          reason: 'Casing cracked during unloading',
          newStatus: 'RETURNED_DEFECTIVE'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RETURNED_DEFECTIVE');
    });
  });

  // ==========================================
  // Phase 2 (Cont.): Dispatch, Payment Gate & Delivery Challan
  // ==========================================
  describe('Phase 2 (Cont.): Dispatch & Delivery Challan', () => {
    const projectId = 'proj-disp-test-01';
    const paidOrderId = 'ord-paid-7788';

    beforeEach(async () => {
      // Ingest BOM and reserve stock
      await request(app)
        .post('/api/v1/operations/projects/handover')
        .set('Authorization', getAuthHeader(ROLES.SALES))
        .send({
          projectId,
          orderId: paidOrderId,
          bomItems: [
            { sku: 'INV-GROW-3K-26', quantity: 1 },
            { sku: 'STR-RAIL-ALUM-3KW', quantity: 1 }
          ]
        });

      await request(app)
        .post(`/api/v1/operations/projects/${projectId}/reserve-stock`)
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({});
    });

    it('POST /api/v1/operations/dispatch enforces advance payment gate and permits admin override', async () => {
      // Attempt dispatch on unpaid project without admin override
      const unpaidProjectId = 'proj-unpaid-99';
      await request(app)
        .post('/api/v1/operations/projects/handover')
        .set('Authorization', getAuthHeader(ROLES.SALES))
        .send({
          projectId: unpaidProjectId,
          orderId: 'ord-unpaid-11',
          bomItems: [{ sku: 'STR-RAIL-ALUM-3KW', quantity: 1 }]
        });
      await request(app)
        .post(`/api/v1/operations/projects/${unpaidProjectId}/reserve-stock`)
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({});

      const failRes = await request(app)
        .post('/api/v1/operations/dispatch')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({ projectId: unpaidProjectId });

      expect(failRes.status).toBe(403);
      expect(failRes.body.error.code).toBe('ADVANCE_PAYMENT_REQUIRED');

      // Admin override with reason
      const overrideRes = await request(app)
        .post('/api/v1/operations/dispatch')
        .set('Authorization', getAuthHeader(ROLES.ADMIN))
        .send({
          projectId: unpaidProjectId,
          overrideAdvancePayment: true,
          overrideReason: 'Managing Director approved credit for institutional customer.'
        });

      expect(overrideRes.status).toBe(201);
      expect(overrideRes.body.data.status).toBe('PACKING');
    });

    it('POST /api/v1/operations/dispatch/:id/confirm enforces 100% serial scanning gate', async () => {
      // Create dispatch order for paid project
      const dispRes = await request(app)
        .post('/api/v1/operations/dispatch')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({ projectId, orderId: paidOrderId });

      const dispatchOrderId = dispRes.body.data.id;

      // Attempt confirm dispatch before scanning inverter serial -> Fails 400
      const failConfirm = await request(app)
        .post(`/api/v1/operations/dispatch/${dispatchOrderId}/confirm`)
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({});

      expect(failConfirm.status).toBe(400);
      expect(failConfirm.body.error.code).toBe('SERIAL_VERIFICATION_INCOMPLETE');

      // Scan required serial
      const scanRes = await request(app)
        .post(`/api/v1/operations/dispatch/${dispatchOrderId}/verify-serial`)
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({ serialNumber: 'INV-GROW-3K-26-00101' });

      expect(scanRes.status).toBe(200);
      expect(scanRes.body.data.verified).toBe(true);

      // Now confirm dispatch -> Succeeds 200, generates delivery challan
      const confirmRes = await request(app)
        .post(`/api/v1/operations/dispatch/${dispatchOrderId}/confirm`)
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({});

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.status).toBe('DISPATCHED');
      expect(confirmRes.body.data.deliveryChallan).toBeDefined();
    });
  });

  // ==========================================
  // Phase 4: Technician Availability & Scheduling
  // ==========================================
  describe('Phase 4: Technician Scheduling', () => {
    it('GET /api/v1/operations/technicians/availability returns availability', async () => {
      const res = await request(app)
        .get('/api/v1/operations/technicians/availability?date=2026-11-15&slot=MORNING&skill=ELECTRICAL_LEAD')
        .set('Authorization', getAuthHeader(ROLES.SALES));

      expect(res.status).toBe(200);
      expect(res.body.data.date).toBe('2026-11-15');
      expect(res.body.data.slot).toBe('MORNING');
      expect(res.body.data.availableCount).toBeGreaterThan(0);
      for (const tech of res.body.data.technicians) {
        expect(tech.skills).toContain('ELECTRICAL_LEAD');
      }
    });

    it('POST /api/v1/operations/installations/schedule validates crew size (2-3) and mandatory ELECTRICAL_LEAD', async () => {
      const projectId = 'proj-sched-test';

      // Attempt with crew size 1 -> Fails 400
      const invalidSize = await request(app)
        .post('/api/v1/operations/installations/schedule')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({
          projectId,
          date: '2026-11-20',
          technicianIds: ['tech-01']
        });

      expect(invalidSize.status).toBe(400);
      expect(invalidSize.body.error.code).toBe('INVALID_CREW_SIZE');

      // Attempt with crew size 2 but NO electrical lead (tech-02 structural, tech-04 helper) -> Fails 422
      const missingLead = await request(app)
        .post('/api/v1/operations/installations/schedule')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({
          projectId,
          date: '2026-11-20',
          technicianIds: ['tech-02', 'tech-04']
        });

      expect(missingLead.status).toBe(422);
      expect(missingLead.body.error.code).toBe('ELECTRICAL_LEAD_REQUIRED');

      // Valid crew: tech-01 (ELECTRICAL_LEAD) + tech-02 (STRUCTURAL_MOUNT) -> 201 Created
      const validCrew = await request(app)
        .post('/api/v1/operations/installations/schedule')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({
          projectId,
          date: '2026-11-20',
          technicianIds: ['tech-01', 'tech-02']
        });

      expect(validCrew.status).toBe(201);
      expect(validCrew.body.data.crew.length).toBe(2);

      // Attempt double-booking tech-01 on same date -> Fails 409 Conflict
      const conflictRes = await request(app)
        .post('/api/v1/operations/installations/schedule')
        .set('Authorization', getAuthHeader(ROLES.WAREHOUSE))
        .send({
          projectId: 'proj-conflict-test',
          date: '2026-11-20',
          technicianIds: ['tech-01', 'tech-03']
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe('CREW_SCHEDULE_CONFLICT');
    });
  });

  // ==========================================
  // Phase 5: Installation Job Cards & Safety Testing
  // ==========================================
  describe('Phase 5: Rooftop Installation & Safety Testing', () => {
    const jobId = 'inst-job-test-01';

    it('POST /api/v1/operations/installations/:id/testing enforces earthing <= 5.0 Ohm and generation > 0 kW', async () => {
      // Failing test: Earthing 8.2 Ohms (> 5.0 Ohm threshold) -> REWORK_REQUIRED
      const failEarthing = await request(app)
        .post(`/api/v1/operations/installations/${jobId}/testing`)
        .set('Authorization', getAuthHeader(ROLES.TECHNICIAN))
        .send({
          earthingResistanceOhms: 8.2,
          generationPowerKw: 3.1
        });

      expect(failEarthing.status).toBe(200);
      expect(failEarthing.body.data.overallPassed).toBe(false);
      expect(failEarthing.body.data.jobStatus).toBe('REWORK_REQUIRED');

      // Passing test: Earthing 2.4 Ohms (<= 5.0 Ohm) and generation 3.2 kW (> 0 kW) -> PASS
      const passTest = await request(app)
        .post(`/api/v1/operations/installations/${jobId}/testing`)
        .set('Authorization', getAuthHeader(ROLES.TECHNICIAN))
        .send({
          earthingResistanceOhms: 2.4,
          generationPowerKw: 3.2
        });

      expect(passTest.status).toBe(200);
      expect(passTest.body.data.overallPassed).toBe(true);
      expect(passTest.body.data.jobStatus).toBe('IN_PROGRESS');
    });

    it('POST /api/v1/operations/installations/:id/sign-handover completes job and issues certificate', async () => {
      // Ensure passing tests first
      await request(app)
        .post(`/api/v1/operations/installations/${jobId}/testing`)
        .set('Authorization', getAuthHeader(ROLES.TECHNICIAN))
        .send({ earthingResistanceOhms: 1.8, generationPowerKw: 3.3 });

      // Upload required 4 photos [NC-30]
      const angles = ['ROOF_STRUCTURE', 'PANEL_ARRAY', 'INVERTER_WIRING', 'EARTHING_PIT'];
      for (const angle of angles) {
        await request(app)
          .post(`/api/v1/operations/installations/${jobId}/photos`)
          .set('Authorization', getAuthHeader(ROLES.TECHNICIAN))
          .send({
            angle,
            imageUrl: `https://res.cloudinary.com/sunpower/installations/${angle.toLowerCase()}.jpg`
          });
      }

      // Customer touch handover signature
      const signRes = await request(app)
        .post(`/api/v1/operations/installations/${jobId}/sign-handover`)
        .set('Authorization', getAuthHeader(ROLES.TECHNICIAN))
        .send({
          customerName: 'Anand Deshmukh',
          signatureDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
          customerRating: 5,
          customerFeedback: 'Outstanding installation! Rooftop looks great.'
        });

      expect(signRes.status).toBe(200);
      expect(signRes.body.data.certificate).toBeDefined();
      expect(signRes.body.data.certificate.certificateNumber).toContain('HOC-2026');
    });
  });

  // ==========================================
  // Phase 6: Warranty Management & Member 4 Integration
  // ==========================================
  describe('Phase 6: Warranty Management & Support Lookup', () => {
    it('GET /api/v1/operations/warranties/:serialNumber returns normalized status for Member 4', async () => {
      const serialNumber = 'INV-GROW-3K-26-00101';

      // 1. Initially in warehouse -> NOT_ACTIVE
      const res1 = await request(app)
        .get(`/api/v1/operations/warranties/${serialNumber}`)
        .set('Authorization', getAuthHeader(ROLES.SUPPORT));

      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('NOT_ACTIVE');
      expect(res1.body.data.serviceBilling.isPartsCovered).toBe(false);

      // 2. Activate warranty for 24 months
      await request(app)
        .post(`/api/v1/operations/warranties/${serialNumber}/activate`)
        .set('Authorization', getAuthHeader(ROLES.ADMIN))
        .send({
          termsMonths: 24,
          event: 'DELIVERY'
        });

      // 3. Query again -> WITHIN_PERIOD (isPartsCovered: true)
      const res2 = await request(app)
        .get(`/api/v1/operations/warranties/${serialNumber}`)
        .set('Authorization', getAuthHeader(ROLES.SUPPORT));

      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('WITHIN_PERIOD');
      expect(res2.body.data.serviceBilling.isPartsCovered).toBe(true);
    });

    it('POST /api/v1/operations/warranties/claims logs warranty claims', async () => {
      const serialNumber = 'INV-GROW-3K-26-00101';

      const claimRes = await request(app)
        .post('/api/v1/operations/warranties/claims')
        .set('Authorization', getAuthHeader(ROLES.SUPPORT))
        .send({
          serialNumber,
          issueDescription: 'Inverter error code 204: Grid frequency out of range',
          claimType: 'REPAIR'
        });

      expect(claimRes.status).toBe(201);
      expect(claimRes.body.data.id).toContain('CLM-2026');
      expect(claimRes.body.data.status).toBe('OPEN');
    });
  });

  // ==========================================
  // Security & RBAC Enforcement
  // ==========================================
  describe('Security & RBAC Enforcement', () => {
    it('Rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/operations/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Rejects unauthorized role access with 403', async () => {
      // Sales user attempting to adjust warehouse inventory stock
      const res = await request(app)
        .post('/api/v1/operations/inventory/adjust')
        .set('Authorization', getAuthHeader(ROLES.SALES))
        .send({ sku: 'PNL-MONO-540W', adjustmentQuantity: 5 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
