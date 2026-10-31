/**
 * Customer & Sales Module Comprehensive Test Suite
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & docs/contracts/customer-sales.md
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { db, pool } from '../../db/index.js';
import { signAccessToken } from '../../shared/utils/jwt.js';

const MOCK_USERS = {
  'u-admin-1': {
    id: 'u-admin-1',
    email: 'admin@sunpower.com',
    full_name: 'System Admin',
    role: 'Admin/Owner',
    phone: '9999999991',
    is_active: true,
  },
  'u-sales-1': {
    id: 'u-sales-1',
    email: 'sales@sunpower.com',
    full_name: 'Sales Rep',
    role: 'Sales',
    phone: '9999999992',
    is_active: true,
  },
  'u-tech-1': {
    id: 'u-tech-1',
    email: 'technician@sunpower.com',
    full_name: 'Field Technician',
    role: 'Technician',
    phone: '9999999993',
    is_active: true,
  },
};

describe('Customer & Sales Module (Member 2 End-to-End Suite)', () => {
  let adminToken;
  let salesToken;
  let techToken;

  beforeAll(async () => {
    // Mock user lookup in db for offline and disconnected-test resilience
    vi.spyOn(db, 'query').mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
        const user = MOCK_USERS[params[0]];
        return { rows: user ? [user] : [] };
      }
      return pool.query(sql, params);
    });

    adminToken = signAccessToken(MOCK_USERS['u-admin-1']);
    salesToken = signAccessToken(MOCK_USERS['u-sales-1']);
    techToken = signAccessToken(MOCK_USERS['u-tech-1']);
  });

  // =========================================================================
  // SUB-SUITE A: CUSTOMER MANAGEMENT
  // =========================================================================
  describe('A. Customer Registration & Profile Management', () => {
    let createdCustomerId;
    const testPhone = `9825${Math.floor(100000 + Math.random() * 900000)}`;

    it('creates a new customer profile with address & consumer details', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          fullName: 'Vikram Mehta',
          phone: testPhone,
          email: 'vikram.mehta@example.com',
          addressStreet: '104 Navrangpura Garden',
          addressCity: 'Ahmedabad',
          addressState: 'Gujarat',
          addressPincode: '380009',
          electricityConsumerNumber: 'UGVCL-554433',
          sanctionedLoadKw: 4.5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.full_name).toBe('Vikram Mehta');
      expect(res.body.data.customer_code).toMatch(/^CUST-\d{4}-\d{4}$/);
      createdCustomerId = res.body.data.id;
    });

    it('rejects duplicate customer registration with same phone', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          fullName: 'Vikram Mehta Duplicate',
          phone: testPhone,
          addressCity: 'Ahmedabad',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CUSTOMER_ALREADY_EXISTS');
    });

    it('retrieves customer dossier and verifies timeline event creation', async () => {
      const res = await request(app)
        .get(`/api/v1/customer-sales/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customer.id).toBe(createdCustomerId);
      expect(res.body.data.timeline.length).toBeGreaterThan(0);
      expect(res.body.data.timeline[0].event_type).toBe('CUSTOMER_CREATED');
    });

    it('updates customer contact details and logs timeline event', async () => {
      const res = await request(app)
        .put(`/api/v1/customer-sales/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          addressStreet: '105 Updated Garden Avenue',
          sanctionedLoadKw: 5.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.address_street).toBe('105 Updated Garden Avenue');
      expect(res.body.data.sanctioned_load_kw).toBe(5.0);
    });
  });

  // =========================================================================
  // SUB-SUITE B: ENQUIRY INGESTION & SCREENING
  // =========================================================================
  describe('B. Enquiry Ingestion, Duplicate Detection & Qualification', () => {
    let leadEnquiryId;
    const leadPhone = `9898${Math.floor(100000 + Math.random() * 900000)}`;

    it('allows public website visitors to submit an enquiry without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/public/enquiries')
        .send({
          fullName: 'Sunita Sharma',
          phone: leadPhone,
          email: 'sunita.sharma@example.com',
          estimatedMonthlyBill: 3500,
          estimatedRoofAreaSqft: 450,
          gridTypePreference: 'On-Grid',
          notes: 'Interested in PM Surya Ghar rooftop scheme.',
          addressCity: 'Ahmedabad',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enquiry_number).toMatch(/^ENQ-\d{4}-\d{4}$/);
      expect(res.body.data.source).toBe('WEB');
      expect(res.body.data.status).toBe('NEW');
      leadEnquiryId = res.body.data.id;
    });

    it('detects duplicate enquiry when same phone submits again', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/enquiries')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          fullName: 'Sunita Sharma Second Request',
          phone: leadPhone,
          source: 'WHATSAPP',
          notes: 'Followed up via WhatsApp.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDuplicate).toBe(true);
      expect(res.body.data.enquiry.duplicate_of_id).toBe(leadEnquiryId);
    });

    it('records a phone call follow-up and advances status from NEW to CONTACTED', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/enquiries/${leadEnquiryId}/follow-ups`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          callSummary: 'Called homeowner; confirmed shadow-free RCC roof space and electricity bill.',
          outcome: 'Interested in 3 kW system',
          nextFollowUp: new Date(Date.now() + 86400000 * 2).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.outcome).toBe('Interested in 3 kW system');

      // Verify enquiry status is now CONTACTED
      const enqRes = await request(app)
        .get(`/api/v1/customer-sales/enquiries/${leadEnquiryId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(enqRes.body.data.enquiry.status).toBe('CONTACTED');
    });

    it('qualifies lead based on preliminary screening and creates customer profile', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/enquiries/${leadEnquiryId}/qualify`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          estimatedRoofAreaSqft: 450, // >= 100 sqft [NC-013]
          estimatedMonthlyBill: 3500, // >= ₹1500 [NC-014]
          sanctionedLoadKw: 4.0,
          addressStreet: 'Plot 12, Swastik Cross Road',
          addressCity: 'Ahmedabad',
          addressPincode: '380009',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.enquiry.status).toBe('QUALIFIED');
      expect(res.body.data.customer).toBeDefined();
      expect(res.body.data.customer.full_name).toBe('Sunita Sharma');
    });
  });

  // =========================================================================
  // SUB-SUITE C: SITE SURVEY WORKFLOW & ENGINEERING GATE
  // =========================================================================
  describe('C. Site Survey Scheduling, Execution & Engineering Approval Gate', () => {
    let surveyId;
    let qualifiedEnquiryId;

    beforeAll(async () => {
      // Create and qualify an enquiry for survey scheduling
      const enqRes = await request(app)
        .post('/api/v1/customer-sales/public/enquiries')
        .send({
          fullName: 'Bhavin Shah',
          phone: `9879${Math.floor(100000 + Math.random() * 900000)}`,
          estimatedMonthlyBill: 4500,
          estimatedRoofAreaSqft: 600,
        });
      qualifiedEnquiryId = enqRes.body.data.id;

      await request(app)
        .post(`/api/v1/customer-sales/enquiries/${qualifiedEnquiryId}/qualify`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          estimatedRoofAreaSqft: 600,
          estimatedMonthlyBill: 4500,
          addressStreet: '12 Sunrise Park, Vastrapur',
          addressCity: 'Ahmedabad',
        });
    });

    it('queries technician availability for scheduling', async () => {
      const res = await request(app)
        .get('/api/v1/customer-sales/surveys/technicians/availability?date=2026-11-05&slot=10:00 AM - 12:00 PM')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('schedules a site survey visit for the qualified lead', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/surveys/request')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          enquiryId: qualifiedEnquiryId,
          scheduledDate: '2026-11-05',
          timeSlot: '10:00 AM - 12:00 PM',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.survey_number).toMatch(/^SRV-\d{4}-\d{4}$/);
      expect(res.body.data.status).toBe('SCHEDULED');
      surveyId = res.body.data.id;
    });

    it('blocks survey execution if less than 2 mandatory photo proofs provided [NC-016]', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/surveys/${surveyId}/execute`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          roofAreaSqft: 600,
          shadowFreeSqft: 500,
          roofType: 'Flat RCC',
          azimuthDegrees: 180,
          tiltAngleDegrees: 24,
          cableRunMeters: 20,
          gridPhase: 'Single Phase',
          photos: [
            {
              photoUrl: 'https://res.cloudinary.com/demo/image/upload/surveys/photo1.jpg',
              category: 'PANORAMA',
            },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('completes on-site survey execution with measurements and photos', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/surveys/${surveyId}/execute`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          roofAreaSqft: 600,
          shadowFreeSqft: 500,
          roofType: 'Flat RCC',
          azimuthDegrees: 180,
          tiltAngleDegrees: 24, // Recommended range [NC-015]
          cableRunMeters: 22,
          gridPhase: 'Single Phase',
          sanctionedLoadKw: 5.0,
          structuralCondition: 'GOOD',
          latitude: 23.0338,
          longitude: 72.585,
          photos: [
            {
              photoUrl: 'https://res.cloudinary.com/demo/image/upload/surveys/panorama.jpg',
              category: 'PANORAMA',
              notes: 'Full south-facing rooftop panorama.',
            },
            {
              photoUrl: 'https://res.cloudinary.com/demo/image/upload/surveys/meter.jpg',
              category: 'METER_BOARD',
              notes: 'Existing 5kW single-phase electronic meter.',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.cable_run_meters).toBe(22);
    });

    it('blocks quotation creation while survey status is COMPLETED (Invariant BR-SRV-002)', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/quotations')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          surveyId,
          capacityKw: 3,
          gridType: 'On-Grid',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SURVEY_NOT_APPROVED');
    });

    it('engineering lead approves site survey, unlocking quotation builder', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/surveys/${surveyId}/review`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          decision: 'APPROVE',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  // =========================================================================
  // SUB-SUITE D: PACKAGES, BOM & QUOTATION ACCEPTANCE
  // =========================================================================
  describe('D. Solar Packages, Automated BOM & Customer Digital Sign-Off', () => {
    let approvedSurveyId;
    let quoteToken;
    let quotationId;

    beforeAll(async () => {
      // Find or create an approved survey
      const listRes = await request(app)
        .get('/api/v1/customer-sales/surveys?status=APPROVED')
        .set('Authorization', `Bearer ${salesToken}`);
      if (listRes.body.data?.length > 0) {
        approvedSurveyId = listRes.body.data[0].id;
      }
    });

    it('retrieves the 10 standard 1 kW to 5 kW solar ready packages catalog', async () => {
      const res = await request(app)
        .get('/api/v1/customer-sales/packages')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(10);
      const pkg3kwOnGrid = res.body.data.find((p) => p.code === 'PKG-3KW-ONGRID');
      expect(pkg3kwOnGrid).toBeDefined();
      expect(pkg3kwOnGrid.capacity_kw).toBe(3);
    });

    it('previews BOM derivation and pricing for 3 kW On-Grid system', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/quotations/preview-bom')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          capacityKw: 3,
          gridType: 'On-Grid',
          surveyId: approvedSurveyId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(5);

      // Verify serialized inverter is present
      const inverterItem = res.body.data.items.find((i) => i.category === 'Inverter');
      expect(inverterItem).toBeDefined();
      expect(inverterItem.is_serialized).toBe(true);

      // Verify 540W panel count: Math.ceil(3000/540) = 6 panels
      const panelItem = res.body.data.items.find((i) => i.category === 'Solar Panels');
      expect(panelItem.quantity).toBe(6);

      // Verify PM Surya Ghar subsidy estimate is ₹78,000 for 3kW [NC-007]
      expect(res.body.data.totals.subsidyEstimatedAmount).toBe(78000);
    });

    it('creates formal quotation with 12% GST and valid proposal token', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/quotations')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          surveyId: approvedSurveyId,
          capacityKw: 3,
          gridType: 'On-Grid',
          laborCost: 15000,
          discountAmount: 5000, // < 10% limit [NC-012]
          validityDays: 15, // [NC-011]
          customerNotes: 'Includes net metering liaison service.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.quotation_number).toMatch(/^QTE-\d{4}-\d{4}$/);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.proposal_token).toBeDefined();
      expect(res.body.data.tax_percent).toBe(12.0); // [NC-006]

      quotationId = res.body.data.id;
      quoteToken = res.body.data.proposal_token;
    });

    it('customer accesses branded proposal portal using token without login', async () => {
      const res = await request(app).get(`/api/v1/customer-sales/public/quotations/${quoteToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quote.capacity_kw).toBe(3);
      expect(res.body.data.quote.items.length).toBeGreaterThan(0);
      expect(res.body.data.isExpired).toBe(false);
    });

    it('customer digitally signs and accepts quotation, advancing order creation (BR-QTE-002)', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/public/quotations/${quoteToken}/accept`)
        .send({
          signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
          customerNotes: 'Approved terms. Looking forward to installation.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quotation.status).toBe('ACCEPTED');

      // Verify order and project were automatically established
      expect(res.body.data.order).toBeDefined();
      expect(res.body.data.order.order_number).toMatch(/^ORD-\d{4}-\d{4}$/);
      expect(res.body.data.order.payment_status).toBe('PENDING_ADVANCE');
      expect(res.body.data.order.advance_required_percent).toBe(25.0); // [NC-001]

      // Verify frozen project_bom_items snapshot was created
      expect(res.body.data.bomItems.length).toBeGreaterThan(0);
      expect(res.body.data.project.project_number).toMatch(/^PRJ-\d{4}-\d{4}$/);
    });
  });

  // =========================================================================
  // SUB-SUITE E: CROSS-MODULE OPERATIONS HANDOVER & API CONTRACT
  // =========================================================================
  describe('E. Operations Handover API & BOM Integrity', () => {
    let testOrderId;

    beforeAll(async () => {
      const ordersRes = await request(app)
        .get('/api/v1/customer-sales/orders')
        .set('Authorization', `Bearer ${salesToken}`);
      if (ordersRes.body.data?.length > 0) {
        testOrderId = ordersRes.body.data[0].id;
      }
    });

    it('exposes agreed handover payload to Member 3 (Operations)', async () => {
      if (!testOrderId) return;

      const res = await request(app)
        .get(`/api/v1/customer-sales/handover/${testOrderId}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderId).toBe(testOrderId);
      expect(res.body.data.customer).toBeDefined();
      expect(res.body.data.project).toBeDefined();
      expect(res.body.data.commercialTerms).toBeDefined();
      expect(res.body.data.commercialTerms.advanceRequiredPercent).toBe(25.0);
      expect(Array.isArray(res.body.data.frozenBOM)).toBe(true);
      expect(res.body.data.frozenBOM.length).toBeGreaterThan(0);

      // Verify frozen BOM items match Member 3 required fields
      const firstItem = res.body.data.frozenBOM[0];
      expect(firstItem.sku).toBeDefined();
      expect(firstItem.quantity).toBeGreaterThan(0);
      expect(firstItem.unit_cost).toBeDefined();
      expect(typeof firstItem.is_serialized).toBe('boolean');
    });
  });
});
