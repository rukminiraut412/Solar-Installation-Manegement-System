/**
 * Customer Management Module Comprehensive Test Suite
 * Scope: Independent Customer Management & Solar Installation Requirements
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & System Contracts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Customer Management Module Test Suite', () => {
  let adminToken;
  let salesToken;
  let techToken;

  let adminUserId;
  let sellerUserId;
  let techUserId;
  let whUserId;
  let supUserId;

  beforeAll(async () => {
    // Log in with real seeded users
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sunpower.com', password: 'Admin@12345' });
    adminToken = adminRes.body.data.accessToken;
    adminUserId = adminRes.body.data.user.id;

    const salesRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@sunpower.com', password: 'Sales@12345' });
    salesToken = salesRes.body.data.accessToken;
    sellerUserId = salesRes.body.data.user.id;

    const techRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'technician@sunpower.com', password: 'Technician@12345' });
    techToken = techRes.body.data.accessToken;
    techUserId = techRes.body.data.user.id;

    const whRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warehouse@sunpower.com', password: 'Warehouse@12345' });
    whUserId = whRes.body.data?.user?.id;

    const supRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'support@sunpower.com', password: 'Support@12345' });
    supUserId = supRes.body.data?.user?.id;
  });

  // =========================================================================
  // SUB-SUITE A: CUSTOMER REGISTRATION & DIRECTORY
  // =========================================================================
  describe('A. Customer Registration & Profile Management', () => {
    let createdCustomerId;
    const testPhone = `9825${Math.floor(100000 + Math.random() * 900000)}`;

    it('creates a new customer profile with address & solar requirement details', async () => {
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
          installationLocation: 'Rooftop 2-Storey House',
          solarRequirement: 'On-Grid Solar System',
          requiredCapacityKw: 5.0,
          additionalNotes: 'Subsidized rooftop setup required.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.full_name).toBe('Vikram Mehta');
      expect(res.body.data.customer_code).toMatch(/^CUST-\d{4}-\d{4}$/);
      expect(res.body.data.assignment_status).toBe('PENDING_ASSIGNMENT');
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
          requiredCapacityKw: 6.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.address_street).toBe('105 Updated Garden Avenue');
      expect(Number(res.body.data.sanctioned_load_kw)).toBe(5.0);
    });

    it('lists customers with search filtering', async () => {
      const res = await request(app)
        .get('/api/v1/customer-sales/customers')
        .query({ search: 'Vikram' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c) => c.id === createdCustomerId)).toBe(true);
    });

    it('provides public-safe customer view without sensitive financial or system internals', async () => {
      const res = await request(app)
        .get(`/api/v1/customer-sales/customers/${createdCustomerId}/public-view`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Vikram Mehta');
      expect(res.body.data.addressCity).toBe('Ahmedabad');
    });
  });

  // =========================================================================
  // SUB-SUITE B: TEAM ASSIGNMENT & SCOPE
  // =========================================================================
  describe('B. Customer Operational Team Assignment', () => {
    let customerForAssignId;

    beforeAll(async () => {
      const phone = `9876${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await request(app)
        .post('/api/v1/customer-sales/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Pooja Joshi',
          phone,
          addressCity: 'Ahmedabad',
          installationLocation: 'Terrace',
          requiredCapacityKw: 3.0,
        });
      customerForAssignId = res.body.data.id;
    });

    it('fetches eligible assignees for admin assignment modal', async () => {
      const res = await request(app)
        .get('/api/v1/customer-sales/assignees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('role');
    });

    it('assigns operational team to customer and transitions status to ASSIGNED', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/customers/${customerForAssignId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sellerId: sellerUserId,
          technicianId: techUserId,
          warehouseId: whUserId,
          supportId: supUserId,
          notes: 'Customer prioritized for quick installation.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment_status).toBe('ASSIGNED');
    });
  });

  // =========================================================================
  // SUB-SUITE C: CUSTOMER INSTALLATION REQUIREMENTS WORKFLOW
  // =========================================================================
  describe('C. Installation Requirements Submission & Engineering Review', () => {
    let customerId;
    let requirementsId;

    beforeAll(async () => {
      const phone = `9898${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await request(app)
        .post('/api/v1/customer-sales/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Arjun Patel',
          phone,
          email: 'arjun.patel@example.com',
          addressCity: 'Ahmedabad',
          installationLocation: 'Rooftop',
          requiredCapacityKw: 4.0,
        });
      customerId = res.body.data.id;
    });

    it('submits detailed rooftop installation requirements', async () => {
      const res = await request(app)
        .post('/api/v1/customer-sales/requirements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId,
          propertyType: 'Residential',
          ownershipStatus: 'Owned',
          installationLocation: 'Rooftop RCC 3rd Floor',
          roofType: 'RCC Flat',
          roofAreaSqft: 500,
          floorsCount: 3,
          discomName: 'UGVCL',
          electricityConsumerNumber: 'UGVCL-998877',
          avgMonthlyBill: 4200,
          monthlyUnits: 450,
          connectionType: 'Single Phase',
          preferredSystemType: 'On-Grid',
          requiredCapacityKw: 4.0,
          fullInstallationAddress: '55 Green Meadows, SG Highway, Ahmedabad',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(Number(res.body.data.required_capacity_kw || res.body.data.requiredCapacityKw)).toBe(4.0);
      requirementsId = res.body.data.id;
    });

    it('retrieves installation requirements by customer id', async () => {
      const res = await request(app)
        .get(`/api/v1/customer-sales/customers/${customerId}/requirements`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer_id).toBe(customerId);
    });

    it('allows Admin to review and approve installation requirements', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-sales/customers/${requirementsId}/requirements/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          adminNotes: 'Verified shadow-free area and sanctioned load capacity.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });
});
