import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import { ROLES } from '../../shared/constants/roles.js';

describe('Customer Assignment & Data Privacy Suite', () => {
  let adminToken;
  let sellerToken;
  let techToken;
  let otherTechToken;
  let warehouseToken;
  let supportToken;

  let sellerUserId;
  let techUserId;
  let otherTechUserId;
  let warehouseUserId;
  let supportUserId;

  let testCustomerId;

  beforeAll(async () => {
    // 1. Fetch real seeded users
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sunpower.com', password: 'Admin@12345' });
    adminToken = adminRes.body.data.accessToken;

    const salesRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@sunpower.com', password: 'Sales@12345' });
    sellerToken = salesRes.body.data.accessToken;
    sellerUserId = salesRes.body.data.user.id;

    const techRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'technician@sunpower.com', password: 'Technician@12345' });
    techToken = techRes.body.data.accessToken;
    techUserId = techRes.body.data.user.id;

    const whRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warehouse@sunpower.com', password: 'Warehouse@12345' });
    warehouseToken = whRes.body.data.accessToken;
    warehouseUserId = whRes.body.data.user.id;

    const supRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'support@sunpower.com', password: 'Support@12345' });
    supportToken = supRes.body.data.accessToken;
    supportUserId = supRes.body.data.user.id;

    // Create a second technician to test strict data privacy isolation
    const tech2Email = `tech2_${Date.now()}@sunpower.com`;
    const tech2Res = await request(app)
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: tech2Email,
        password: 'Password@123',
        fullName: 'Harish Kumar (Field Tech 2)',
        role: 'Technician',
        phone: '+91 99999 55555',
      });
    otherTechUserId = tech2Res.body.data.id;

    const tech2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: tech2Email, password: 'Password@123' });
    otherTechToken = tech2Login.body.data.accessToken;
  });


  it('Phase 1: Seller registers customer -> sets PENDING_ASSIGNMENT and associates with seller', async () => {
    const uniquePhone = `9825${Math.floor(100000 + Math.random() * 900000)}`;
    const res = await request(app)
      .post('/api/v1/customer-sales/customers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        fullName: 'Kiran Sharma (Assignment Test)',
        phone: uniquePhone,
        email: 'kiran.sharma@example.com',
        addressStreet: '77 Galaxy Enclave, SG Highway',
        addressCity: 'Ahmedabad',
        addressState: 'Gujarat',
        addressPincode: '380054',
        installationLocation: 'Rooftop 3-Storey Terrace',
        solarRequirement: 'Hybrid Solar System',
        requiredCapacityKw: 5.0,
        additionalNotes: 'Urgent installation before monsoon subsidy deadline.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.full_name).toBe('Kiran Sharma (Assignment Test)');
    expect(res.body.data.assignment_status).toBe('PENDING_ASSIGNMENT');
    expect(res.body.data.created_by).toBe(sellerUserId);
    expect(res.body.data.assigned_seller_id).toBe(sellerUserId);
    expect(Number(res.body.data.required_capacity_kw)).toBe(5.0);

    testCustomerId = res.body.data.id;
  });

  it('Phase 2: Admin queries assignees and assigns Technician, Warehouse & Support', async () => {
    // 1. Admin gets eligible assignees
    const assigneesRes = await request(app)
      .get('/api/v1/customer-sales/assignees')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(assigneesRes.status).toBe(200);
    expect(Array.isArray(assigneesRes.body.data)).toBe(true);
    expect(assigneesRes.body.data.length).toBeGreaterThan(0);

    // 2. Admin assigns team
    const assignRes = await request(app)
      .post(`/api/v1/customer-sales/customers/${testCustomerId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sellerId: sellerUserId,
        technicianId: techUserId,
        warehouseId: warehouseUserId,
        supportId: supportUserId,
        notes: 'Priority high-capacity installation crew assigned by Director.',
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.assignment_status).toBe('ASSIGNED');
    expect(assignRes.body.data.assigned_technician_id).toBe(techUserId);
    expect(assignRes.body.data.assigned_warehouse_id).toBe(warehouseUserId);
    expect(assignRes.body.data.assigned_support_id).toBe(supportUserId);
    // Preserves original registering seller!
    expect(assignRes.body.data.created_by).toBe(sellerUserId);
  });

  it('Phase 3 & 4: Strict Data Privacy - Assigned Tech can see customer, Unassigned Tech cannot', async () => {
    // Assigned Technician can see the customer in their customer list
    const assignedTechRes = await request(app)
      .get('/api/v1/customer-sales/customers')
      .set('Authorization', `Bearer ${techToken}`);

    expect(assignedTechRes.status).toBe(200);
    const assignedCustomerCodes = assignedTechRes.body.data.map((c) => c.id);
    expect(assignedCustomerCodes).toContain(testCustomerId);

    // Unassigned Technician cannot see this customer
    const unassignedTechRes = await request(app)
      .get('/api/v1/customer-sales/customers')
      .set('Authorization', `Bearer ${otherTechToken}`);

    expect(unassignedTechRes.status).toBe(200);
    const unassignedCustomerCodes = unassignedTechRes.body.data.map((c) => c.id);
    expect(unassignedCustomerCodes).not.toContain(testCustomerId);
  });

  it('Phase 3.E: Authorized Customer View returns assigned team details without sensitive data', async () => {
    const res = await request(app)
      .get(`/api/v1/customer-sales/customers/${testCustomerId}/public-view`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('Kiran Sharma (Assignment Test)');
    expect(res.body.data.assignmentStatus).toBe('ASSIGNED');
    expect(res.body.data.assignedTeam).toBeDefined();
    expect(res.body.data.assignedTeam.leadTechnician).toBeDefined();
    expect(res.body.data.assignedTeam.leadTechnician.name).toBe('Vikram Singh (Lead Technician)');
  });
});
