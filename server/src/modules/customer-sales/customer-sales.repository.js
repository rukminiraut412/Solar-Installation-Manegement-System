/**
 * Customer & Sales Repository Layer
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & docs/contracts/customer-sales.md
 *
 * Implements full PostgreSQL persistence with an in-memory transactional fallback
 * for seamless operation during test/dev execution when PostgreSQL is disconnected.
 */

import crypto from 'crypto';
import { pool } from '../../db/index.js';

// Pre-seeded fallback data for offline tests and development
const fallbackStore = {
  customers: [
    {
      id: 'c101-0000-0000-0000-000000000001',
      customer_code: 'CUST-2026-0001',
      full_name: 'Rajesh Patel',
      email: 'rajesh.patel@example.com',
      phone: '9876543210',
      address_street: '42 Shanti Niketan Society, Satellite',
      address_city: 'Ahmedabad',
      address_state: 'Gujarat',
      address_pincode: '380015',
      electricity_consumer_number: 'UGVCL-8829104',
      sanctioned_load_kw: 5.0,
      created_by: null,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'c101-0000-0000-0000-000000000002',
      customer_code: 'CUST-2026-0002',
      full_name: 'Anita Desai',
      email: 'anita.desai@example.com',
      phone: '9825012345',
      address_street: '15 Surya Enclave, Bodakdev',
      address_city: 'Ahmedabad',
      address_state: 'Gujarat',
      address_pincode: '380054',
      electricity_consumer_number: 'TORRENT-9921029',
      sanctioned_load_kw: 3.0,
      created_by: null,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  timeline: [
    {
      id: 'tl-001',
      customer_id: 'c101-0000-0000-0000-000000000001',
      event_type: 'CUSTOMER_CREATED',
      title: 'Customer Registered',
      description: 'Customer profile established from qualified web enquiry.',
      metadata: {},
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
  ],
  enquiries: [
    {
      id: 'enq-0000-0000-0000-000000000001',
      enquiry_number: 'ENQ-2026-0001',
      customer_id: 'c101-0000-0000-0000-000000000001',
      full_name: 'Rajesh Patel',
      phone: '9876543210',
      email: 'rajesh.patel@example.com',
      source: 'WEB',
      status: 'QUALIFIED',
      priority: 'HIGH',
      assigned_to: null,
      estimated_monthly_bill: 4500,
      estimated_roof_area_sqft: 650,
      grid_type_preference: 'On-Grid',
      interested_capacity_kw: 3,
      notes: 'Wants PM Surya Ghar subsidy guidance.',
      duplicate_of_id: null,
      disqualification_reason: null,
      follow_up_date: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
    {
      id: 'enq-0000-0000-0000-000000000002',
      enquiry_number: 'ENQ-2026-0002',
      customer_id: null,
      full_name: 'Suresh Shah',
      phone: '9898011223',
      email: 'suresh.shah@example.com',
      source: 'WHATSAPP',
      status: 'NEW',
      priority: 'MEDIUM',
      assigned_to: null,
      estimated_monthly_bill: 2800,
      estimated_roof_area_sqft: 350,
      grid_type_preference: 'On-Grid',
      interested_capacity_kw: 2,
      notes: 'Initial inquiry via WhatsApp business account.',
      duplicate_of_id: null,
      disqualification_reason: null,
      follow_up_date: null,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
  followUps: [],
  surveys: [
    {
      id: 'srv-0000-0000-0000-000000000001',
      survey_number: 'SRV-2026-0001',
      enquiry_id: 'enq-0000-0000-0000-000000000001',
      customer_id: 'c101-0000-0000-0000-000000000001',
      assigned_technician_id: null,
      scheduled_date: '2026-11-02',
      time_slot: '10:00 AM - 12:00 PM',
      status: 'APPROVED',
      roof_area_sqft: 650,
      shadow_free_sqft: 520,
      roof_type: 'Flat RCC',
      azimuth_degrees: 180,
      tilt_angle_degrees: 23,
      cable_run_meters: 20,
      grid_phase: 'Single Phase',
      sanctioned_load_kw: 5.0,
      structural_condition: 'GOOD',
      feeder_code: 'SAT-F04',
      latitude: 23.0225,
      longitude: 72.5714,
      rework_reason: null,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  surveyPhotos: [
    {
      id: 'sp-001',
      survey_id: 'srv-0000-0000-0000-000000000001',
      photo_url: 'https://res.cloudinary.com/demo/image/upload/surveys/roof_panorama.jpg',
      category: 'PANORAMA',
      notes: 'Unshaded south-facing rooftop.',
      uploaded_at: new Date().toISOString(),
    },
    {
      id: 'sp-002',
      survey_id: 'srv-0000-0000-0000-000000000001',
      photo_url: 'https://res.cloudinary.com/demo/image/upload/surveys/meter_board.jpg',
      category: 'METER_BOARD',
      notes: 'Existing 5kW single phase electronic energy meter.',
      uploaded_at: new Date().toISOString(),
    },
  ],
  quotations: [],
  quotationItems: [],
  orders: [],
  projects: [],
  projectBomItems: [],
  installationRequirements: [],
};

function toValidUuidOrNull(val) {
  if (!val) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(val)) ? String(val) : null;
}

function toValidUuidOrRandom(val) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return val && uuidRegex.test(String(val)) ? String(val) : crypto.randomUUID();
}

// Helper: try real DB query, fallback to memory if DB is unavailable
async function executeDb(queryFn, fallbackFn) {
  try {
    return await queryFn();
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === '22P02' ||
      err.code === '23503' ||
      err.message?.includes('connect ECONNREFUSED') ||
      err.message?.includes('relation "') ||
      err.message?.includes('does not exist') ||
      err.message?.includes('invalid input syntax for type uuid') ||
      err.message?.includes('violates foreign key constraint')
    ) {
      return await fallbackFn();
    }
    throw err;
  }
}

export const CustomerSalesRepository = {
  // =========================================================================
  // 1. CUSTOMERS
  // =========================================================================
  async createCustomer(data) {
    const uniqueSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const customerCode = data.customer_code || `CUST-${new Date().getFullYear()}-${uniqueSuffix}`;

    const customer = {
      id: data.id || crypto.randomUUID(),
      customer_code: customerCode,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone,
      address_street: data.address_street || null,
      address_city: data.address_city || 'Ahmedabad',
      address_state: data.address_state || 'Gujarat',
      address_pincode: data.address_pincode || null,
      electricity_consumer_number: data.electricity_consumer_number || null,
      sanctioned_load_kw: data.sanctioned_load_kw ? Number(data.sanctioned_load_kw) : null,
      installation_location: data.installation_location || null,
      solar_requirement: data.solar_requirement || 'On-Grid Solar System',
      required_capacity_kw: data.required_capacity_kw ? Number(data.required_capacity_kw) : (data.sanctioned_load_kw ? Number(data.sanctioned_load_kw) : 3.0),
      additional_notes: data.additional_notes || null,
      assignment_status: 'PENDING_ASSIGNMENT',
      created_by: data.created_by || null,
      assigned_seller_id: data.created_by || null, // Auto-associate registering seller
      assigned_technician_id: null,
      assigned_warehouse_id: null,
      assigned_support_id: null,
      assigned_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return executeDb(
      async () => {
        const sql = `
          INSERT INTO customers (
            id, customer_code, full_name, email, phone, address_street,
            address_city, address_state, address_pincode, electricity_consumer_number,
            sanctioned_load_kw, installation_location, solar_requirement, required_capacity_kw,
            additional_notes, assignment_status, created_by, assigned_seller_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *;
        `;
        const res = await pool.query(sql, [
          toValidUuidOrRandom(customer.id), customer.customer_code, customer.full_name, customer.email, customer.phone,
          customer.address_street, customer.address_city, customer.address_state, customer.address_pincode,
          customer.electricity_consumer_number, customer.sanctioned_load_kw, customer.installation_location,
          customer.solar_requirement, customer.required_capacity_kw, customer.additional_notes,
          customer.assignment_status, toValidUuidOrNull(customer.created_by), toValidUuidOrNull(customer.assigned_seller_id),
          customer.created_at, customer.updated_at,
        ]);
        return res.rows[0];
      },
      async () => {
        fallbackStore.customers.unshift(customer);
        return customer;
      }
    );
  },

  async getCustomerById(id) {
    return executeDb(
      async () => {
        const sql = `
          SELECT 
            c.*,
            p.id AS project_id,
            COALESCE(p.project_code, p.project_number) AS project_code,
            p.project_number,
            o.id AS order_id,
            o.order_number,
            u_created.full_name AS creator_name,
            u_created.email AS creator_email,
            u_seller.full_name AS assigned_seller_name,
            u_seller.email AS assigned_seller_email,
            u_tech.full_name AS assigned_technician_name,
            u_tech.email AS assigned_technician_email,
            u_wh.full_name AS assigned_warehouse_name,
            u_wh.email AS assigned_warehouse_email,
            u_sup.full_name AS assigned_support_name,
            u_sup.email AS assigned_support_email
          FROM customers c
          LEFT JOIN LATERAL (SELECT id, project_code, project_number FROM projects WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) p ON true
          LEFT JOIN LATERAL (SELECT id, order_number FROM orders WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) o ON true
          LEFT JOIN users u_created ON c.created_by = u_created.id
          LEFT JOIN users u_seller ON c.assigned_seller_id = u_seller.id
          LEFT JOIN users u_tech ON c.assigned_technician_id = u_tech.id
          LEFT JOIN users u_wh ON c.assigned_warehouse_id = u_wh.id
          LEFT JOIN users u_sup ON c.assigned_support_id = u_sup.id
          WHERE c.id = $1;
        `;
        const res = await pool.query(sql, [id]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.customers.find((c) => c.id === id) || null;
      }
    );
  },

  async getCustomerByPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return executeDb(
      async () => {
        const res = await pool.query(
          "SELECT * FROM customers WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = $1 LIMIT 1;",
          [cleanPhone]
        );
        return res.rows[0] || null;
      },
      async () => {
        return (
          fallbackStore.customers.find((c) => {
            const cPhone = c.phone.replace(/\D/g, '').slice(-10);
            return cPhone === cleanPhone;
          }) || null
        );
      }
    );
  },

  async listCustomers({ search, role, userId, assignmentStatus, limit = 100, offset = 0 } = {}) {
    return executeDb(
      async () => {
        let sql = `
          SELECT 
            c.*,
            p.id AS project_id,
            COALESCE(p.project_code, p.project_number) AS project_code,
            p.project_number,
            o.id AS order_id,
            o.order_number,
            u_created.full_name AS creator_name,
            u_created.email AS creator_email,
            u_seller.full_name AS assigned_seller_name,
            u_seller.email AS assigned_seller_email,
            u_tech.full_name AS assigned_technician_name,
            u_tech.email AS assigned_technician_email,
            u_wh.full_name AS assigned_warehouse_name,
            u_wh.email AS assigned_warehouse_email,
            u_sup.full_name AS assigned_support_name,
            u_sup.email AS assigned_support_email
          FROM customers c
          LEFT JOIN LATERAL (SELECT id, project_code, project_number FROM projects WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) p ON true
          LEFT JOIN LATERAL (SELECT id, order_number FROM orders WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) o ON true
          LEFT JOIN users u_created ON c.created_by = u_created.id
          LEFT JOIN users u_seller ON c.assigned_seller_id = u_seller.id
          LEFT JOIN users u_tech ON c.assigned_technician_id = u_tech.id
          LEFT JOIN users u_wh ON c.assigned_warehouse_id = u_wh.id
          LEFT JOIN users u_sup ON c.assigned_support_id = u_sup.id
          WHERE 1=1
        `;
        const params = [];

        // STRICT RBAC & DATA PRIVACY SCOPING (PHASE 4)
        if (role === 'Sales' && userId) {
          params.push(userId);
          sql += ` AND (c.assigned_seller_id = $${params.length} OR c.created_by = $${params.length})`;
        } else if (role === 'Technician' && userId) {
          params.push(userId);
          sql += ` AND (c.assigned_technician_id = $${params.length})`;
        } else if (role === 'Warehouse' && userId) {
          params.push(userId);
          sql += ` AND (c.assigned_warehouse_id = $${params.length})`;
        } else if (role === 'Support' && userId) {
          params.push(userId);
          sql += ` AND (c.assigned_support_id = $${params.length})`;
        }
        // Admin/Owner sees all records across the platform

        if (assignmentStatus) {
          params.push(assignmentStatus);
          sql += ` AND c.assignment_status = $${params.length}`;
        }

        if (search) {
          params.push(`%${search}%`);
          sql += ` AND (c.full_name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.customer_code ILIKE $${params.length})`;
        }

        sql += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
        params.push(limit, offset);

        const res = await pool.query(sql, params);
        return res.rows;
      },
      async () => {
        let list = [...fallbackStore.customers];

        // Scoping for in-memory fallback
        if (role === 'Sales' && userId) {
          list = list.filter((c) => c.assigned_seller_id === userId || c.created_by === userId);
        } else if (role === 'Technician' && userId) {
          list = list.filter((c) => c.assigned_technician_id === userId);
        } else if (role === 'Warehouse' && userId) {
          list = list.filter((c) => c.assigned_warehouse_id === userId);
        } else if (role === 'Support' && userId) {
          list = list.filter((c) => c.assigned_support_id === userId);
        }

        if (assignmentStatus) {
          list = list.filter((c) => c.assignment_status === assignmentStatus);
        }

        if (search) {
          const s = search.toLowerCase();
          list = list.filter(
            (c) =>
              c.full_name?.toLowerCase().includes(s) ||
              c.phone?.includes(s) ||
              (c.email && c.email.toLowerCase().includes(s)) ||
              c.customer_code?.toLowerCase().includes(s)
          );
        }
        return list.slice(offset, offset + limit);
      }
    );
  },

  async assignCustomer(customerId, { sellerId = null, technicianId = null, warehouseId = null, supportId = null, notes = null } = {}, adminId = null) {
    const cleanAdmin = toValidUuidOrNull(adminId);
    const cleanSeller = toValidUuidOrNull(sellerId);
    const cleanTech = toValidUuidOrNull(technicianId);
    const cleanWh = toValidUuidOrNull(warehouseId);
    const cleanSup = toValidUuidOrNull(supportId);

    // A customer is fully assigned when Technician, Warehouse Member and Support Person are assigned
    const isFullyAssigned = !!(cleanTech && cleanWh && cleanSup);
    const isPartiallyAssigned = !!(cleanTech || cleanWh || cleanSup || cleanSeller);
    const status = isFullyAssigned ? 'ASSIGNED' : (isPartiallyAssigned ? 'PARTIALLY_ASSIGNED' : 'PENDING_ASSIGNMENT');

    return executeDb(
      async () => {
        // 1. Update customers table
        const updateRes = await pool.query(
          `UPDATE customers 
           SET assigned_seller_id = $1,
               assigned_technician_id = $2,
               assigned_warehouse_id = $3,
               assigned_support_id = $4,
               assignment_status = $5,
               assigned_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $6
           RETURNING *;`,
          [cleanSeller, cleanTech, cleanWh, cleanSup, status, customerId]
        );

        if (updateRes.rows.length === 0) return null;
        const updatedCust = updateRes.rows[0];

        // 2. Insert into customer_assignments history table
        await pool.query(
          `INSERT INTO customer_assignments (
             customer_id, assigned_by, seller_id, technician_id, warehouse_id, support_id, assignment_notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [customerId, cleanAdmin, cleanSeller, cleanTech, cleanWh, cleanSup, notes || null]
        );

        // 3. Record timeline event
        await pool.query(
          `INSERT INTO customer_timeline (
             customer_id, event_type, title, description, metadata, created_by
           ) VALUES ($1, 'TEAM_ASSIGNED', 'Operational Team Assigned', $2, $3, $4);`,
          [
            customerId,
            `Admin updated team assignment. Status: ${status}.`,
            JSON.stringify({ sellerId: cleanSeller, technicianId: cleanTech, warehouseId: cleanWh, supportId: cleanSup, status, notes }),
            cleanAdmin,
          ]
        );

        return updatedCust;
      },
      async () => {
        const cust = fallbackStore.customers.find((c) => c.id === customerId);
        if (!cust) return null;
        cust.assigned_seller_id = cleanSeller;
        cust.assigned_technician_id = cleanTech;
        cust.assigned_warehouse_id = cleanWh;
        cust.assigned_support_id = cleanSup;
        cust.assignment_status = status;
        cust.assigned_at = new Date().toISOString();
        cust.updated_at = new Date().toISOString();

        if (!fallbackStore.customer_assignments) fallbackStore.customer_assignments = [];
        fallbackStore.customer_assignments.unshift({
          id: crypto.randomUUID(),
          customer_id: customerId,
          assigned_by: adminId,
          seller_id: cleanSeller,
          technician_id: cleanTech,
          warehouse_id: cleanWh,
          support_id: cleanSup,
          assignment_notes: notes || null,
          assigned_at: new Date().toISOString(),
        });

        fallbackStore.timeline.unshift({
          id: crypto.randomUUID(),
          customer_id: customerId,
          event_type: 'TEAM_ASSIGNED',
          title: 'Operational Team Assigned',
          description: `Admin updated team assignment. Status: ${status}.`,
          metadata: { sellerId: cleanSeller, technicianId: cleanTech, warehouseId: cleanWh, supportId: cleanSup, status, notes },
          created_by: adminId,
          created_at: new Date().toISOString(),
        });

        return cust;
      }
    );
  },

  async getEligibleAssignees() {
    return executeDb(
      async () => {
        const res = await pool.query(
          `SELECT id, full_name, email, role, phone 
           FROM users 
           WHERE is_active = true 
           ORDER BY role ASC, full_name ASC;`
        );
        return res.rows.map((r) => ({
          id: r.id,
          fullName: r.full_name,
          email: r.email,
          role: r.role,
          phone: r.phone,
        }));
      },
      async () => {
        return [
          { id: 'u-sales-01', fullName: 'Priya Verma', email: 'sales@sunpower.com', role: 'Sales', phone: '+91 98765 00002' },
          { id: 'u-tech-01', fullName: 'Vikram Singh', email: 'technician@sunpower.com', role: 'Technician', phone: '+91 98765 00004' },
          { id: 'u-wh-01', fullName: 'Amit Patel', email: 'warehouse@sunpower.com', role: 'Warehouse', phone: '+91 98765 00003' },
          { id: 'u-sup-01', fullName: 'Sneha Kulkarni', email: 'support@sunpower.com', role: 'Support', phone: '+91 98765 00005' },
        ];
      }
    );
  },

  async getCustomerAssignmentHistory(customerId) {
    return executeDb(
      async () => {
        const sql = `
          SELECT 
            ca.*,
            u_admin.full_name AS assigned_by_name,
            u_seller.full_name AS seller_name,
            u_tech.full_name AS technician_name,
            u_wh.full_name AS warehouse_name,
            u_sup.full_name AS support_name
          FROM customer_assignments ca
          LEFT JOIN users u_admin ON ca.assigned_by = u_admin.id
          LEFT JOIN users u_seller ON ca.seller_id = u_seller.id
          LEFT JOIN users u_tech ON ca.technician_id = u_tech.id
          LEFT JOIN users u_wh ON ca.warehouse_id = u_wh.id
          LEFT JOIN users u_sup ON ca.support_id = u_sup.id
          WHERE ca.customer_id = $1
          ORDER BY ca.assigned_at DESC;
        `;
        const res = await pool.query(sql, [customerId]);
        return res.rows;
      },
      async () => {
        return (fallbackStore.customer_assignments || []).filter((a) => a.customer_id === customerId);
      }
    );
  },

  async getCustomerPublicView(customerId) {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return null;

    return {
      customerCode: customer.customer_code,
      fullName: customer.full_name,
      solarRequirement: customer.solar_requirement || 'On-Grid Solar System',
      requiredCapacityKw: customer.required_capacity_kw || 3.0,
      addressCity: customer.address_city,
      addressState: customer.address_state,
      installationLocation: customer.installation_location,
      assignmentStatus: customer.assignment_status || 'PENDING_ASSIGNMENT',
      assignedTeam: {
        salesRepresentative: customer.assigned_seller_name
          ? { name: customer.assigned_seller_name, email: customer.assigned_seller_email, role: 'Sales Partner' }
          : null,
        leadTechnician: customer.assigned_technician_name
          ? { name: customer.assigned_technician_name, email: customer.assigned_technician_email, role: 'Lead Field Technician' }
          : null,
        warehouseManager: customer.assigned_warehouse_name
          ? { name: customer.assigned_warehouse_name, email: customer.assigned_warehouse_email, role: 'Operations & Dispatch' }
          : null,
        customerSupportOfficer: customer.assigned_support_name
          ? { name: customer.assigned_support_name, email: customer.assigned_support_email, role: 'Customer Support Executive' }
          : null,
      },
      registrationDate: customer.created_at,
    };
  },

  async updateCustomer(id, updates) {
    return executeDb(
      async () => {
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, val] of Object.entries(updates)) {
          fields.push(`${key} = $${idx++}`);
          values.push(val);
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const sql = `UPDATE customers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`;
        const res = await pool.query(sql, values);
        const row = res.rows[0];
        if (row) {
          if (row.sanctioned_load_kw != null) row.sanctioned_load_kw = Number(row.sanctioned_load_kw);
          if (row.required_capacity_kw != null) row.required_capacity_kw = Number(row.required_capacity_kw);
        }
        return row;
      },
      async () => {
        const cust = fallbackStore.customers.find((c) => c.id === id);
        if (!cust) return null;
        Object.assign(cust, updates, { updated_at: new Date().toISOString() });
        return cust;
      }
    );
  },

  // =========================================================================
  // 2. TIMELINE
  // =========================================================================
  async addTimelineEvent({ customer_id, event_type, title, description, metadata = {}, created_by = null }) {
    const item = {
      id: crypto.randomUUID(),
      customer_id,
      event_type,
      title,
      description,
      metadata,
      created_by,
      created_at: new Date().toISOString(),
    };

    return executeDb(
      async () => {
        const sql = `
          INSERT INTO customer_timeline (id, customer_id, event_type, title, description, metadata, created_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const res = await pool.query(sql, [
          toValidUuidOrRandom(item.id), item.customer_id, item.event_type, item.title,
          item.description, JSON.stringify(item.metadata), toValidUuidOrNull(item.created_by), item.created_at,
        ]);
        return res.rows[0];
      },
      async () => {
        fallbackStore.timeline.unshift(item);
        return item;
      }
    );
  },

  async getTimelineByCustomerId(customerId) {
    return executeDb(
      async () => {
        const res = await pool.query(
          'SELECT * FROM customer_timeline WHERE customer_id = $1 ORDER BY created_at DESC;',
          [customerId]
        );
        return res.rows;
      },
      async () => {
        return fallbackStore.timeline.filter((t) => t.customer_id === customerId);
      }
    );
  },

  // =========================================================================
  // 3. ENQUIRIES
  // =========================================================================
  async createEnquiry(data) {
    const enquiry = {
      id: data.id || crypto.randomUUID(),
      enquiry_number: data.enquiry_number || `ENQ-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      customer_id: data.customer_id || null,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      source: data.source || 'WEB',
      status: data.status || 'NEW',
      priority: data.priority || 'MEDIUM',
      assigned_to: data.assigned_to || null,
      estimated_monthly_bill: data.estimated_monthly_bill ? Number(data.estimated_monthly_bill) : null,
      estimated_roof_area_sqft: data.estimated_roof_area_sqft ? Number(data.estimated_roof_area_sqft) : null,
      grid_type_preference: data.grid_type_preference || 'On-Grid',
      interested_capacity_kw: data.interested_capacity_kw ? Number(data.interested_capacity_kw) : null,
      notes: data.notes || null,
      duplicate_of_id: data.duplicate_of_id || null,
      disqualification_reason: data.disqualification_reason || null,
      follow_up_date: data.follow_up_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return executeDb(
      async () => {
        const sql = `
          INSERT INTO enquiries (
            id, enquiry_number, customer_id, full_name, phone, email, source, status,
            priority, assigned_to, estimated_monthly_bill, estimated_roof_area_sqft,
            grid_type_preference, interested_capacity_kw, notes, duplicate_of_id,
            disqualification_reason, follow_up_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *;
        `;
        const res = await pool.query(sql, [
          toValidUuidOrRandom(enquiry.id), enquiry.enquiry_number, toValidUuidOrNull(enquiry.customer_id), enquiry.full_name, enquiry.phone,
          enquiry.email, enquiry.source, enquiry.status, enquiry.priority, toValidUuidOrNull(enquiry.assigned_to),
          enquiry.estimated_monthly_bill, enquiry.estimated_roof_area_sqft, enquiry.grid_type_preference,
          enquiry.interested_capacity_kw, enquiry.notes, toValidUuidOrNull(enquiry.duplicate_of_id),
          enquiry.disqualification_reason, enquiry.follow_up_date, enquiry.created_at, enquiry.updated_at,
        ]);
        return res.rows[0];
      },
      async () => {
        fallbackStore.enquiries.unshift(enquiry);
        return enquiry;
      }
    );
  },

  async getEnquiryById(id) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM enquiries WHERE id = $1;', [id]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.enquiries.find((e) => e.id === id) || null;
      }
    );
  },

  async findDuplicateEnquiry(phone, email) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return executeDb(
      async () => {
        let sql = "SELECT * FROM enquiries WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = $1";
        const params = [cleanPhone];
        if (email) {
          sql += ' OR (email IS NOT NULL AND LOWER(email) = LOWER($2))';
          params.push(email);
        }
        sql += ' ORDER BY created_at ASC LIMIT 1;';
        const res = await pool.query(sql, params);
        return res.rows[0] || null;
      },
      async () => {
        return (
          fallbackStore.enquiries.find((e) => {
            const ePhone = e.phone.replace(/\D/g, '').slice(-10);
            if (ePhone === cleanPhone) return true;
            if (email && e.email && e.email.toLowerCase() === email.toLowerCase()) return true;
            return false;
          }) || null
        );
      }
    );
  },

  async listEnquiries({ status, source, assigned_to, search, limit = 50, offset = 0 } = {}) {
    return executeDb(
      async () => {
        let sql = 'SELECT * FROM enquiries WHERE 1=1';
        const params = [];
        if (status) {
          params.push(status);
          sql += ` AND status = $${params.length}`;
        }
        if (source) {
          params.push(source);
          sql += ` AND source = $${params.length}`;
        }
        if (assigned_to) {
          params.push(assigned_to);
          sql += ` AND assigned_to = $${params.length}`;
        }
        if (search) {
          params.push(`%${search}%`);
          sql += ` AND (full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR enquiry_number ILIKE $${params.length})`;
        }
        sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        const res = await pool.query(sql, params);
        return res.rows;
      },
      async () => {
        let list = [...fallbackStore.enquiries];
        if (status) list = list.filter((e) => e.status === status);
        if (source) list = list.filter((e) => e.source === source);
        if (assigned_to) list = list.filter((e) => e.assigned_to === assigned_to);
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(
            (e) =>
              e.full_name.toLowerCase().includes(s) ||
              e.phone.includes(s) ||
              e.enquiry_number.toLowerCase().includes(s)
          );
        }
        return list.slice(offset, offset + limit);
      }
    );
  },

  async updateEnquiry(id, updates) {
    return executeDb(
      async () => {
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, val] of Object.entries(updates)) {
          fields.push(`${key} = $${idx++}`);
          values.push(val);
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const sql = `UPDATE enquiries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`;
        const res = await pool.query(sql, values);
        return res.rows[0];
      },
      async () => {
        const enq = fallbackStore.enquiries.find((e) => e.id === id);
        if (!enq) return null;
        Object.assign(enq, updates, { updated_at: new Date().toISOString() });
        return enq;
      }
    );
  },

  async addEnquiryFollowUp({ enquiry_id, call_summary, outcome, next_follow_up, created_by }) {
    const item = {
      id: crypto.randomUUID(),
      enquiry_id,
      call_summary,
      outcome,
      next_follow_up: next_follow_up || null,
      created_by: created_by || null,
      created_at: new Date().toISOString(),
    };

    return executeDb(
      async () => {
        const sql = `
          INSERT INTO enquiry_follow_ups (id, enquiry_id, call_summary, outcome, next_follow_up, created_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const res = await pool.query(sql, [
          item.id, item.enquiry_id, item.call_summary, item.outcome, item.next_follow_up, item.created_by, item.created_at,
        ]);
        return res.rows[0];
      },
      async () => {
        fallbackStore.followUps.unshift(item);
        return item;
      }
    );
  },

  async getEnquiryFollowUps(enquiryId) {
    return executeDb(
      async () => {
        const res = await pool.query(
          'SELECT * FROM enquiry_follow_ups WHERE enquiry_id = $1 ORDER BY created_at DESC;',
          [enquiryId]
        );
        return res.rows;
      },
      async () => {
        return fallbackStore.followUps.filter((f) => f.enquiry_id === enquiryId);
      }
    );
  },

  // =========================================================================
  // 4. SITE SURVEYS
  // =========================================================================
  async createSurvey(data) {
    const survey = {
      id: data.id || crypto.randomUUID(),
      survey_number: data.survey_number || `SRV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      enquiry_id: data.enquiry_id,
      customer_id: data.customer_id,
      assigned_technician_id: data.assigned_technician_id || null,
      scheduled_date: data.scheduled_date,
      time_slot: data.time_slot,
      status: data.status || 'SCHEDULED',
      roof_area_sqft: data.roof_area_sqft || null,
      shadow_free_sqft: data.shadow_free_sqft || null,
      roof_type: data.roof_type || null,
      azimuth_degrees: data.azimuth_degrees || null,
      tilt_angle_degrees: data.tilt_angle_degrees || null,
      cable_run_meters: data.cable_run_meters || null,
      grid_phase: data.grid_phase || null,
      sanctioned_load_kw: data.sanctioned_load_kw || null,
      structural_condition: data.structural_condition || null,
      feeder_code: data.feeder_code || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      rework_reason: null,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return executeDb(
      async () => {
        const sql = `
          INSERT INTO site_surveys (
            id, survey_number, enquiry_id, customer_id, assigned_technician_id,
            scheduled_date, time_slot, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;
        `;
        const res = await pool.query(sql, [
          survey.id, survey.survey_number, survey.enquiry_id, survey.customer_id,
          survey.assigned_technician_id, survey.scheduled_date, survey.time_slot,
          survey.status, survey.created_at, survey.updated_at,
        ]);
        return res.rows[0];
      },
      async () => {
        fallbackStore.surveys.unshift(survey);
        return survey;
      }
    );
  },

  async getSurveyById(id) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM site_surveys WHERE id = $1;', [id]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.surveys.find((s) => s.id === id) || null;
      }
    );
  },

  async getSurveyByEnquiryId(enquiryId) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM site_surveys WHERE enquiry_id = $1 ORDER BY created_at DESC LIMIT 1;', [enquiryId]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.surveys.find((s) => s.enquiry_id === enquiryId) || null;
      }
    );
  },

  async listSurveys({ status, technician_id, limit = 50, offset = 0 } = {}) {
    return executeDb(
      async () => {
        let sql = 'SELECT * FROM site_surveys WHERE 1=1';
        const params = [];
        if (status) {
          params.push(status);
          sql += ` AND status = $${params.length}`;
        }
        if (technician_id) {
          params.push(technician_id);
          sql += ` AND assigned_technician_id = $${params.length}`;
        }
        sql += ' ORDER BY scheduled_date DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        const res = await pool.query(sql, params);
        return res.rows;
      },
      async () => {
        let list = [...fallbackStore.surveys];
        if (status) list = list.filter((s) => s.status === status);
        if (technician_id) list = list.filter((s) => s.assigned_technician_id === technician_id);
        return list.slice(offset, offset + limit);
      }
    );
  },

  async updateSurvey(id, updates) {
    return executeDb(
      async () => {
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, val] of Object.entries(updates)) {
          fields.push(`${key} = $${idx++}`);
          const cleanVal = (key === 'reviewed_by' || key.endsWith('_id') || key.endsWith('_by')) ? toValidUuidOrNull(val) : val;
          values.push(cleanVal);
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const sql = `UPDATE site_surveys SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`;
        const res = await pool.query(sql, values);
        const row = res.rows[0];
        if (row) {
          if (row.cable_run_meters != null) row.cable_run_meters = Number(row.cable_run_meters);
          if (row.roof_area_sqft != null) row.roof_area_sqft = Number(row.roof_area_sqft);
          if (row.shadow_free_sqft != null) row.shadow_free_sqft = Number(row.shadow_free_sqft);
          if (row.azimuth_degrees != null) row.azimuth_degrees = Number(row.azimuth_degrees);
          if (row.tilt_angle_degrees != null) row.tilt_angle_degrees = Number(row.tilt_angle_degrees);
          if (row.sanctioned_load_kw != null) row.sanctioned_load_kw = Number(row.sanctioned_load_kw);
        }
        return row;
      },
      async () => {
        const survey = fallbackStore.surveys.find((s) => s.id === id);
        if (!survey) return null;
        Object.assign(survey, updates, { updated_at: new Date().toISOString() });
        return survey;
      }
    );
  },

  async addSurveyPhoto({ survey_id, photo_url, category, notes }) {
    const photo = {
      id: crypto.randomUUID(),
      survey_id,
      photo_url,
      category,
      notes: notes || null,
      uploaded_at: new Date().toISOString(),
    };

    return executeDb(
      async () => {
        const sql = `
          INSERT INTO survey_photos (id, survey_id, photo_url, category, notes, uploaded_at)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const res = await pool.query(sql, [photo.id, photo.survey_id, photo.photo_url, photo.category, photo.notes, photo.uploaded_at]);
        return res.rows[0];
      },
      async () => {
        fallbackStore.surveyPhotos.push(photo);
        return photo;
      }
    );
  },

  async getSurveyPhotos(surveyId) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM survey_photos WHERE survey_id = $1 ORDER BY uploaded_at ASC;', [surveyId]);
        return res.rows;
      },
      async () => {
        return fallbackStore.surveyPhotos.filter((p) => p.survey_id === surveyId);
      }
    );
  },

  // =========================================================================
  // 5. PACKAGES
  // =========================================================================
  async listPackages() {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM packages WHERE is_active = true ORDER BY capacity_kw ASC;');
        if (res.rows.length === 0) {
          // Seed standard catalog if empty
          for (const pkg of SOLAR_PACKAGES) {
            await pool.query(
              `INSERT INTO packages (code, name, capacity_kw, grid_type, base_price, description)
               VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO NOTHING;`,
              [pkg.code, pkg.name, pkg.capacity_kw, pkg.grid_type, pkg.base_price, pkg.description]
            );
          }
          const seededRes = await pool.query('SELECT * FROM packages WHERE is_active = true ORDER BY capacity_kw ASC;');
          const rows = seededRes.rows.length > 0 ? seededRes.rows : SOLAR_PACKAGES;
          return rows.map((r) => ({
            ...r,
            capacity_kw: Number(r.capacity_kw),
            base_price: Number(r.base_price),
          }));
        }
        return res.rows.map((r) => ({
          ...r,
          capacity_kw: Number(r.capacity_kw),
          base_price: Number(r.base_price),
        }));
      },
      async () => {
        return SOLAR_PACKAGES;
      }
    );
  },

  async getPackageById(id) {
    const list = await this.listPackages();
    return list.find((p) => p.id === id || p.code === id) || null;
  },

  // =========================================================================
  // 6. QUOTATIONS & QUOTATION ITEMS
  // =========================================================================
  async createQuotation(data, items = []) {
    const quote = {
      id: data.id || crypto.randomUUID(),
      quotation_number: data.quotation_number || `QTE-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      version: data.version || 1,
      survey_id: data.survey_id || null,
      requirements_id: data.requirements_id || null,
      customer_id: data.customer_id,
      package_id: data.package_id || null,
      capacity_kw: Number(data.capacity_kw),
      grid_type: data.grid_type,
      status: data.status || 'DRAFT',
      hardware_subtotal: Number(data.hardware_subtotal),
      installation_labor_cost: Number(data.installation_labor_cost || 0),
      discount_amount: Number(data.discount_amount || 0),
      tax_amount: Number(data.tax_amount),
      tax_percent: Number(data.tax_percent || 12.0),
      total_amount: Number(data.total_amount),
      subsidy_estimated_amount: Number(data.subsidy_estimated_amount || 0),
      valid_until: data.valid_until,
      proposal_token: data.proposal_token || crypto.randomBytes(24).toString('hex'),
      customer_notes: data.customer_notes || null,
      digital_signature_url: null,
      accepted_at: null,
      declined_reason: null,
      created_by: data.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const quoteItems = items.map((it) => ({
      id: crypto.randomUUID(),
      quotation_id: quote.id,
      product_id: it.product_id || null,
      category: it.category,
      sku: it.sku,
      name: it.name,
      quantity: Number(it.quantity),
      unit: it.unit,
      unit_cost: Number(it.unit_cost),
      unit_price: Number(it.unit_price),
      total_price: Number(it.total_price),
      is_serialized: Boolean(it.is_serialized),
    }));

    return executeDb(
      async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const sqlQuote = `
            INSERT INTO quotations (
              id, quotation_number, version, survey_id, requirements_id, customer_id, package_id,
              capacity_kw, grid_type, status, hardware_subtotal, installation_labor_cost,
              discount_amount, tax_amount, tax_percent, total_amount, subsidy_estimated_amount,
              valid_until, proposal_token, customer_notes, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING *;
          `;
          const resQuote = await client.query(sqlQuote, [
            toValidUuidOrRandom(quote.id), quote.quotation_number, quote.version, toValidUuidOrNull(quote.survey_id), toValidUuidOrNull(quote.requirements_id), toValidUuidOrNull(quote.customer_id),
            toValidUuidOrNull(quote.package_id), quote.capacity_kw, quote.grid_type, quote.status, quote.hardware_subtotal,
            quote.installation_labor_cost, quote.discount_amount, quote.tax_amount, quote.tax_percent,
            quote.total_amount, quote.subsidy_estimated_amount, quote.valid_until, quote.proposal_token,
            quote.customer_notes, toValidUuidOrNull(quote.created_by), quote.created_at, quote.updated_at,
          ]);

          for (const it of quoteItems) {
            await client.query(
              `INSERT INTO quotation_items (
                id, quotation_id, product_id, category, sku, name, quantity, unit,
                unit_cost, unit_price, total_price, is_serialized
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
              [toValidUuidOrRandom(it.id), toValidUuidOrRandom(it.quotation_id), toValidUuidOrNull(it.product_id), it.category, it.sku, it.name, it.quantity, it.unit, it.unit_cost, it.unit_price, it.total_price, it.is_serialized]
            );
          }
          await client.query('COMMIT');
          return {
            ...resQuote.rows[0],
            capacity_kw: Number(resQuote.rows[0].capacity_kw),
            total_amount: Number(resQuote.rows[0].total_amount),
            tax_percent: Number(resQuote.rows[0].tax_percent),
            items: quoteItems,
          };
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
      async () => {
        fallbackStore.quotations.unshift(quote);
        fallbackStore.quotationItems.push(...quoteItems);
        return { ...quote, items: quoteItems };
      }
    );
  },

  async getQuotationById(id) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM quotations WHERE id = $1;', [id]);
        if (!res.rows[0]) {
          const q = fallbackStore.quotations.find((item) => item.id === id);
          if (!q) return null;
          const items = fallbackStore.quotationItems.filter((it) => it.quotation_id === id);
          return { ...q, items };
        }
        const itemsRes = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1;', [id]);
        return {
          ...res.rows[0],
          capacity_kw: Number(res.rows[0].capacity_kw),
          total_amount: Number(res.rows[0].total_amount),
          tax_percent: Number(res.rows[0].tax_percent),
          items: itemsRes.rows.map((it) => ({
            ...it,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            total_price: Number(it.total_price),
          })),
        };
      },
      async () => {
        const q = fallbackStore.quotations.find((item) => item.id === id);
        if (!q) return null;
        const items = fallbackStore.quotationItems.filter((it) => it.quotation_id === id);
        return { ...q, items };
      }
    );
  },

  async getQuotationByToken(token) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM quotations WHERE proposal_token = $1;', [token]);
        if (!res.rows[0]) {
          const q = fallbackStore.quotations.find((item) => item.proposal_token === token);
          if (!q) return null;
          const items = fallbackStore.quotationItems.filter((it) => it.quotation_id === q.id);
          return { ...q, items };
        }
        const itemsRes = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1;', [res.rows[0].id]);
        return {
          ...res.rows[0],
          capacity_kw: Number(res.rows[0].capacity_kw),
          total_amount: Number(res.rows[0].total_amount),
          tax_percent: Number(res.rows[0].tax_percent),
          items: itemsRes.rows.map((it) => ({
            ...it,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            total_price: Number(it.total_price),
          })),
        };
      },
      async () => {
        const q = fallbackStore.quotations.find((item) => item.proposal_token === token);
        if (!q) return null;
        const items = fallbackStore.quotationItems.filter((it) => it.quotation_id === q.id);
        return { ...q, items };
      }
    );
  },

  async listQuotations({ customer_id, status, limit = 50, offset = 0 } = {}) {
    return executeDb(
      async () => {
        let sql = 'SELECT * FROM quotations WHERE 1=1';
        const params = [];
        if (customer_id) {
          params.push(customer_id);
          sql += ` AND customer_id = $${params.length}`;
        }
        if (status) {
          params.push(status);
          sql += ` AND status = $${params.length}`;
        }
        sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        const res = await pool.query(sql, params);
        return res.rows;
      },
      async () => {
        let list = [...fallbackStore.quotations];
        if (customer_id) list = list.filter((q) => q.customer_id === customer_id);
        if (status) list = list.filter((q) => q.status === status);
        return list.slice(offset, offset + limit);
      }
    );
  },

  async updateQuotation(id, updates) {
    return executeDb(
      async () => {
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, val] of Object.entries(updates)) {
          fields.push(`${key} = $${idx++}`);
          values.push(val);
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const sql = `UPDATE quotations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`;
        const res = await pool.query(sql, values);
        if (!res.rows[0]) {
          const q = fallbackStore.quotations.find((item) => item.id === id);
          if (!q) return null;
          Object.assign(q, updates, { updated_at: new Date().toISOString() });
          const items = fallbackStore.quotationItems.filter((it) => it.quotation_id === id);
          return { ...q, items };
        }
        const itemsRes = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1;', [res.rows[0].id]);
        return {
          ...res.rows[0],
          capacity_kw: Number(res.rows[0].capacity_kw),
          total_amount: Number(res.rows[0].total_amount),
          tax_percent: Number(res.rows[0].tax_percent),
          items: itemsRes.rows.map((it) => ({
            ...it,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            total_price: Number(it.total_price),
          })),
        };
      },
      async () => {
        const q = fallbackStore.quotations.find((item) => item.id === id);
        if (!q) return null;
        Object.assign(q, updates, { updated_at: new Date().toISOString() });
        const items = fallbackStore.quotationItems.filter((it) => it.quotation_id === id);
        return { ...q, items };
      }
    );
  },

  // =========================================================================
  // 7. ORDERS, PROJECTS & FROZEN BOM ITEMS
  // =========================================================================
  async createOrderAndProject({ quotation, advanceRequiredPercent = 25.0, createdBy = null }) {
    const advancePercent = Number(advanceRequiredPercent);
    const totalContractValue = Number(quotation.total_amount);
    const advanceRequiredAmount = Number(((totalContractValue * advancePercent) / 100).toFixed(2));

    const order = {
      id: crypto.randomUUID(),
      order_number: `ORD-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      quotation_id: quotation.id,
      customer_id: quotation.customer_id,
      order_status: 'CONFIRMED',
      payment_status: 'PENDING_ADVANCE',
      total_contract_value: totalContractValue,
      advance_required_percent: advancePercent,
      advance_required_amount: advanceRequiredAmount,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const project = {
      id: crypto.randomUUID(),
      project_number: `PRJ-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      order_id: order.id,
      customer_id: quotation.customer_id,
      capacity_kw: Number(quotation.capacity_kw),
      grid_type: quotation.grid_type,
      current_stage: 'STOCK_RESERVATION',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Frozen commercial project_bom_items snapshot
    const bomItems = (quotation.items || []).map((it) => ({
      id: crypto.randomUUID(),
      project_id: project.id,
      order_id: order.id,
      product_id: it.product_id || null,
      category: it.category,
      sku: it.sku,
      name: it.name,
      quantity: Number(it.quantity),
      unit: it.unit,
      unit_cost: Number(it.unit_cost),
      unit_price: Number(it.unit_price),
      total_price: Number(it.total_price),
      is_serialized: Boolean(it.is_serialized),
      created_at: new Date().toISOString(),
    }));

    return executeDb(
      async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // 1. Insert order
          const sqlOrder = `
            INSERT INTO orders (
              id, order_number, quotation_id, customer_id, order_status,
              payment_status, total_contract_value, advance_required_percent,
              advance_required_amount, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
          `;
          const resOrder = await client.query(sqlOrder, [
            toValidUuidOrRandom(order.id), order.order_number, toValidUuidOrNull(order.quotation_id), toValidUuidOrNull(order.customer_id), order.order_status,
            order.payment_status, order.total_contract_value, order.advance_required_percent,
            order.advance_required_amount, toValidUuidOrNull(order.created_by), order.created_at, order.updated_at,
          ]);

          // 2. Insert project
          const sqlProj = `
            INSERT INTO projects (
              id, project_number, order_id, customer_id, capacity_kw,
              grid_type, current_stage, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
          `;
          const resProj = await client.query(sqlProj, [
            toValidUuidOrRandom(project.id), project.project_number, toValidUuidOrNull(project.order_id), toValidUuidOrNull(project.customer_id),
            project.capacity_kw, project.grid_type, project.current_stage,
            project.created_at, project.updated_at,
          ]);

          // 3. Insert frozen BOM items
          for (const item of bomItems) {
            await client.query(
              `INSERT INTO project_bom_items (
                id, project_id, order_id, product_id, category, sku, name,
                quantity, unit, unit_cost, unit_price, total_price, is_serialized, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
              [
                toValidUuidOrRandom(item.id), toValidUuidOrNull(item.project_id), toValidUuidOrNull(item.order_id), toValidUuidOrNull(item.product_id), item.category,
                item.sku, item.name, item.quantity, item.unit, item.unit_cost, item.unit_price,
                item.total_price, item.is_serialized, item.created_at,
              ]
            );
          }

          await client.query('COMMIT');
          return {
            order: {
              ...resOrder.rows[0],
              total_contract_value: Number(resOrder.rows[0].total_contract_value),
              advance_required_percent: Number(resOrder.rows[0].advance_required_percent),
              advance_required_amount: Number(resOrder.rows[0].advance_required_amount),
            },
            project: {
              ...resProj.rows[0],
              capacity_kw: Number(resProj.rows[0].capacity_kw),
            },
            bomItems: bomItems.map(b => ({
              ...b,
              quantity: Number(b.quantity),
              unit_price: Number(b.unit_price),
              total_price: Number(b.total_price),
            })),
          };
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
      async () => {
        fallbackStore.orders.unshift(order);
        fallbackStore.projects.unshift(project);
        fallbackStore.projectBomItems.push(...bomItems);
        return { order, project, bomItems };
      }
    );
  },

  async getOrderById(id) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM orders WHERE id = $1;', [id]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.orders.find((o) => o.id === id) || null;
      }
    );
  },

  async getOrderByQuotationId(quotationId) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM orders WHERE quotation_id = $1 LIMIT 1;', [quotationId]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.orders.find((o) => o.quotation_id === quotationId) || null;
      }
    );
  },

  async listOrders({ customer_id, order_status, payment_status, limit = 50, offset = 0 } = {}) {
    return executeDb(
      async () => {
        let sql = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        if (customer_id) {
          params.push(customer_id);
          sql += ` AND customer_id = $${params.length}`;
        }
        if (order_status) {
          params.push(order_status);
          sql += ` AND order_status = $${params.length}`;
        }
        if (payment_status) {
          params.push(payment_status);
          sql += ` AND payment_status = $${params.length}`;
        }
        sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        const res = await pool.query(sql, params);
        return res.rows;
      },
      async () => {
        let list = [...fallbackStore.orders];
        if (customer_id) list = list.filter((o) => o.customer_id === customer_id);
        if (order_status) list = list.filter((o) => o.order_status === order_status);
        if (payment_status) list = list.filter((o) => o.payment_status === payment_status);
        return list.slice(offset, offset + limit);
      }
    );
  },

  async getProjectByOrderId(orderId) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM projects WHERE order_id = $1 LIMIT 1;', [orderId]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.projects.find((p) => p.order_id === orderId) || null;
      }
    );
  },

  async getProjectById(projectId) {
    return executeDb(
      async () => {
        const res = await pool.query('SELECT * FROM projects WHERE id = $1;', [projectId]);
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.projects.find((p) => p.id === projectId) || null;
      }
    );
  },

  async getProjectBomItems(projectId) {
    return executeDb(
      async () => {
        const res = await pool.query(
          'SELECT * FROM project_bom_items WHERE project_id = $1 ORDER BY created_at ASC;',
          [projectId]
        );
        return res.rows.map((b) => ({
          ...b,
          quantity: Number(b.quantity),
          unit_cost: Number(b.unit_cost),
          unit_price: Number(b.unit_price),
          total_price: Number(b.total_price),
        }));
      },
      async () => {
        return fallbackStore.projectBomItems.filter((b) => b.project_id === projectId);
      }
    );
  },

  async saveInstallationRequirements(customerId, data, userId = null) {
    const cleanUserId = toValidUuidOrNull(userId);
    return executeDb(
      async () => {
        const checkRes = await pool.query(
          'SELECT id FROM customer_installation_requirements WHERE customer_id = $1 LIMIT 1;',
          [customerId]
        );

        let resultRow;
        if (checkRes.rows.length > 0) {
          const reqId = checkRes.rows[0].id;
          const updateRes = await pool.query(
            `UPDATE customer_installation_requirements
             SET property_type = COALESCE($1, property_type),
                 ownership_status = COALESCE($2, ownership_status),
                 installation_location = COALESCE($3, installation_location),
                 roof_type = COALESCE($4, roof_type),
                 roof_area_sqft = COALESCE($5, roof_area_sqft),
                 floors_count = COALESCE($6, floors_count),
                 roof_restrictions = $7,
                 electricity_consumer_number = COALESCE($8, electricity_consumer_number),
                 discom_name = $9,
                 avg_monthly_bill = $10,
                 monthly_units = $11,
                 connection_type = COALESCE($12, connection_type),
                 existing_meter_details = $13,
                 preferred_system_type = COALESCE($14, preferred_system_type),
                 required_capacity_kw = COALESCE($15, required_capacity_kw),
                 installation_purpose = $16,
                 preferred_timeline = COALESCE($17, preferred_timeline),
                 battery_required = COALESCE($18, battery_required),
                 full_installation_address = COALESCE($19, full_installation_address),
                 parking_access = $20,
                 roof_accessibility = $21,
                 nearby_obstacles = $22,
                 special_requirements = $23,
                 documents_json = COALESCE($24, documents_json),
                 status = 'SUBMITTED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $25
             RETURNING *;`,
            [
              data.propertyType,
              data.ownershipStatus,
              data.installationLocation,
              data.roofType,
              data.roofAreaSqft ? parseFloat(data.roofAreaSqft) : null,
              data.floorsCount ? parseInt(data.floorsCount, 10) : 1,
              data.roofRestrictions || null,
              data.electricityConsumerNumber || null,
              data.discomName || null,
              data.avgMonthlyBill ? parseFloat(data.avgMonthlyBill) : null,
              data.monthlyUnits ? parseFloat(data.monthlyUnits) : null,
              data.connectionType || 'Single Phase',
              data.existingMeterDetails || null,
              data.preferredSystemType || 'On-Grid',
              data.requiredCapacityKw ? parseFloat(data.requiredCapacityKw) : 3.0,
              data.installationPurpose || null,
              data.preferredTimeline || 'Immediate (Within 1 Month)',
              data.batteryRequired || 'No',
              data.fullInstallationAddress,
              data.parkingAccess || null,
              data.roofAccessibility || null,
              data.nearbyObstacles || null,
              data.specialRequirements || null,
              data.documentsJson ? JSON.stringify(data.documentsJson) : null,
              reqId,
            ]
          );
          resultRow = updateRes.rows[0];
        } else {
          const insertRes = await pool.query(
            `INSERT INTO customer_installation_requirements (
               customer_id, user_id, property_type, ownership_status, installation_location,
               roof_type, roof_area_sqft, floors_count, roof_restrictions,
               electricity_consumer_number, discom_name, avg_monthly_bill, monthly_units,
               connection_type, existing_meter_details, preferred_system_type,
               required_capacity_kw, installation_purpose, preferred_timeline, battery_required,
               full_installation_address, parking_access, roof_accessibility,
               nearby_obstacles, special_requirements, documents_json, status
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
               $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'SUBMITTED'
             ) RETURNING *;`,
            [
              customerId,
              cleanUserId,
              data.propertyType || 'Residential',
              data.ownershipStatus || 'Owned',
              data.installationLocation || 'Rooftop',
              data.roofType || 'RCC Flat',
              data.roofAreaSqft ? parseFloat(data.roofAreaSqft) : null,
              data.floorsCount ? parseInt(data.floorsCount, 10) : 1,
              data.roofRestrictions || null,
              data.electricityConsumerNumber || null,
              data.discomName || null,
              data.avgMonthlyBill ? parseFloat(data.avgMonthlyBill) : null,
              data.monthlyUnits ? parseFloat(data.monthlyUnits) : null,
              data.connectionType || 'Single Phase',
              data.existingMeterDetails || null,
              data.preferredSystemType || 'On-Grid',
              data.requiredCapacityKw ? parseFloat(data.requiredCapacityKw) : 3.0,
              data.installationPurpose || null,
              data.preferredTimeline || 'Immediate (Within 1 Month)',
              data.batteryRequired || 'No',
              data.fullInstallationAddress,
              data.parkingAccess || null,
              data.roofAccessibility || null,
              data.nearbyObstacles || null,
              data.specialRequirements || null,
              JSON.stringify(data.documentsJson || {}),
            ]
          );
          resultRow = insertRes.rows[0];
        }

        // Also update customer profile with key fields
        await pool.query(
          `UPDATE customers
           SET installation_location = COALESCE($1, installation_location),
               required_capacity_kw = COALESCE($2, required_capacity_kw),
               electricity_consumer_number = COALESCE($3, electricity_consumer_number),
               sanctioned_load_kw = COALESCE($4, sanctioned_load_kw),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5;`,
          [
            data.installationLocation,
            data.requiredCapacityKw ? parseFloat(data.requiredCapacityKw) : null,
            data.electricityConsumerNumber,
            data.requiredCapacityKw ? parseFloat(data.requiredCapacityKw) : null,
            customerId,
          ]
        );

        // Timeline entry
        await pool.query(
          `INSERT INTO customer_timeline (
             customer_id, event_type, title, description, metadata, created_by
           ) VALUES ($1, 'REQUIREMENTS_SUBMITTED', 'Installation Requirements Submitted', $2, $3, $4);`,
          [
            customerId,
            `Customer submitted comprehensive solar installation details for ${data.requiredCapacityKw || 3} kW system.`,
            JSON.stringify({ propertyType: data.propertyType, capacity: data.requiredCapacityKw, status: 'SUBMITTED' }),
            cleanUserId,
          ]
        );

        return resultRow;
      },
      async () => {
        let req = fallbackStore.installationRequirements.find((r) => r.customer_id === customerId);
        if (!req) {
          req = {
            id: `req-${Date.now()}`,
            customer_id: customerId,
            user_id: userId,
            created_at: new Date().toISOString(),
          };
          fallbackStore.installationRequirements.push(req);
        }
        Object.assign(req, data, { status: 'SUBMITTED', updated_at: new Date().toISOString() });
        return req;
      }
    );
  },

  async getInstallationRequirementsByCustomerId(customerId) {
    return executeDb(
      async () => {
        const res = await pool.query(
          `SELECT r.*, c.full_name as customer_name, c.customer_code, c.phone, c.email,
                  p.id AS project_id, p.project_code, p.workflow_stage, p.current_stage,
                  o.id AS order_id, o.order_number, o.order_status, o.payment_status
           FROM customer_installation_requirements r
           JOIN customers c ON c.id = r.customer_id
           LEFT JOIN projects p ON p.customer_id = c.id
           LEFT JOIN orders o ON o.customer_id = c.id
           WHERE r.customer_id = $1
           ORDER BY r.created_at DESC LIMIT 1;`,
          [customerId]
        );
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.installationRequirements.find((r) => r.customer_id === customerId) || null;
      }
    );
  },

  async getInstallationRequirementsByUserId(userId) {
    return executeDb(
      async () => {
        const res = await pool.query(
          `SELECT r.*, c.full_name as customer_name, c.customer_code, c.phone, c.email,
                  c.assigned_technician_id, c.assigned_warehouse_id, c.assigned_support_id,
                  p.id AS project_id, p.project_code, p.workflow_stage, p.current_stage,
                  o.id AS order_id, o.order_number, o.order_status, o.payment_status
           FROM customer_installation_requirements r
           JOIN customers c ON c.id = r.customer_id
           LEFT JOIN projects p ON p.customer_id = c.id
           LEFT JOIN orders o ON o.customer_id = c.id
           WHERE r.user_id = $1 OR c.user_id = $1
           ORDER BY r.created_at DESC LIMIT 1;`,
          [userId]
        );
        return res.rows[0] || null;
      },
      async () => {
        return fallbackStore.installationRequirements.find((r) => r.user_id === userId) || null;
      }
    );
  },

  async listInstallationRequirements({ status = null, customerId = null } = {}) {
    return executeDb(
      async () => {
        const conditions = [];
        const params = [];

        if (status) {
          params.push(status);
          conditions.push(`r.status = $${params.length}`);
        }
        if (customerId) {
          params.push(customerId);
          conditions.push(`r.customer_id = $${params.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const res = await pool.query(
          `SELECT r.*, c.full_name as customer_name, c.customer_code, c.phone, c.email,
                  c.assigned_technician_id, c.assigned_warehouse_id, c.assigned_support_id,
                  p.id AS project_id, p.project_code, p.workflow_stage, p.current_stage,
                  o.id AS order_id, o.order_number
           FROM customer_installation_requirements r
           JOIN customers c ON c.id = r.customer_id
           LEFT JOIN projects p ON p.customer_id = c.id
           LEFT JOIN orders o ON o.customer_id = c.id
           ${whereClause}
           ORDER BY r.created_at DESC;`,
          params
        );
        return res.rows;
      },
      async () => {
        let list = [...fallbackStore.installationRequirements];
        if (status) list = list.filter((r) => r.status === status);
        if (customerId) list = list.filter((r) => r.customer_id === customerId);
        return list;
      }
    );
  },

  async reviewInstallationRequirements(requirementsId, reviewDataOrStatus, maybeAdminNotes = null, adminUserId = null) {
    let status;
    let adminNotes = null;
    let adminId = adminUserId;

    if (typeof reviewDataOrStatus === 'object' && reviewDataOrStatus !== null) {
      status = reviewDataOrStatus.status;
      adminNotes = reviewDataOrStatus.adminNotes || null;
    } else {
      status = reviewDataOrStatus;
      adminNotes = maybeAdminNotes;
    }

    const cleanAdmin = toValidUuidOrNull(adminId);
    return executeDb(
      async () => {
        const updateRes = await pool.query(
          `UPDATE customer_installation_requirements
           SET status = $1,
               admin_notes = $2,
               reviewed_by = $3,
               reviewed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4 OR customer_id = $4
           RETURNING *;`,
          [status, adminNotes, cleanAdmin, requirementsId]
        );

        if (updateRes.rows.length === 0) return null;
        const req = updateRes.rows[0];

        // 2. AUTOMATIC PROJECT ID AND ORDER ID GENERATION ON APPROVAL
        let project = null;
        let order = null;

        if (status === 'APPROVED') {
          // Check if project already exists for this customer or requirement
          const existingProjRes = await pool.query(
            `SELECT p.*, o.order_number 
             FROM projects p 
             LEFT JOIN orders o ON p.order_id = o.id 
             WHERE p.customer_id = $1 OR p.requirements_id = $2 
             LIMIT 1;`,
            [req.customer_id, req.id]
          );

          if (existingProjRes.rows.length > 0) {
            project = existingProjRes.rows[0];
          } else {
            // Generate unique Order ID (ORD-YYYY-XXXX)
            const orderCode = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
            const contractVal = (Number(req.required_capacity_kw) || 3.0) * 55000;
            const advanceAmt = contractVal * 0.25;

            const orderRes = await pool.query(
              `INSERT INTO orders (
                order_number, customer_id, order_status, payment_status,
                total_contract_value, advance_required_percent, advance_required_amount,
                advance_paid_amount, requirements_id
              ) VALUES ($1, $2, 'CONFIRMED', 'PENDING_ADVANCE', $3, 25.0, $4, 0, $5)
              RETURNING *;`,
              [orderCode, req.customer_id, contractVal, advanceAmt, req.id]
            );
            order = orderRes.rows[0];

            // Generate unique Project ID (PRJ-YYYY-XXXX)
            const projectCode = 'PRJ-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
            const projectRes = await pool.query(
              `INSERT INTO projects (
                project_code, project_number, order_id, customer_id, capacity_kw, grid_type,
                current_stage, workflow_stage, requirements_id
              ) VALUES ($1, $1, $2, $3, $4, $5, 'QUOTATION_PENDING', 'REQUIREMENTS_VERIFIED', $6)
              RETURNING *;`,
              [
                projectCode,
                order.id,
                req.customer_id,
                Number(req.required_capacity_kw) || 3.0,
                req.preferred_system_type || 'On-Grid',
                req.id
              ]
            );
            project = projectRes.rows[0];
            project.order_number = orderCode;
          }

          // Trigger database-backed notifications
          if (req.user_id) {
            await pool.query(
              `INSERT INTO notifications (user_id, role, title, message, type, link)
               VALUES ($1, 'Customer', 'Solar Requirements Approved!', $2, 'SUCCESS', 'dashboard');`,
              [
                req.user_id,
                `Requirements approved! Project ID: ${project.project_code}, Order ID: ${project.order_number}. Warehouse is preparing your custom quotation.`
              ]
            );
          }

          await pool.query(
            `INSERT INTO notifications (role, title, message, type, link)
             VALUES ('Warehouse', 'New Project Assigned for Quotation', $1, 'INFO', 'inventory');`,
            [
              `Project ${project.project_code} (${req.required_capacity_kw || 3} kW) approved. Please prepare itemized BOM quotation.`
            ]
          );
        }

        // Record customer timeline event
        const eventTitle = status === 'APPROVED' ? 'Requirements Approved & IDs Assigned'
          : (status === 'CHANGES_REQUESTED' ? 'Requirements Changes Requested' : 'Requirements Rejected');

        const eventDesc = status === 'APPROVED'
          ? `Solar installation requirements approved. Project ID: ${project?.project_code || 'PRJ-NEW'}, Order ID: ${project?.order_number || 'ORD-NEW'}. Forwarded to Warehouse for Quotation Preparation. ${adminNotes ? 'Admin Note: ' + adminNotes : ''}`
          : `Admin review status: ${status}. ${adminNotes ? 'Note: ' + adminNotes : ''}`;

        await pool.query(
          `INSERT INTO customer_timeline (
             customer_id, event_type, title, description, metadata, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6);`,
          [
            req.customer_id,
            `REQUIREMENTS_${status}`,
            eventTitle,
            eventDesc,
            JSON.stringify({ 
              status, 
              adminNotes, 
              requirementsId, 
              projectId: project?.id, 
              projectCode: project?.project_code, 
              orderNumber: project?.order_number 
            }),
            cleanAdmin,
          ]
        );

        req.project_code = project?.project_code;
        req.order_number = project?.order_number;
        req.project_id = project?.id;
        return req;
      },
      async () => {
        const req = fallbackStore.installationRequirements.find((r) => r.id === requirementsId || r.customer_id === requirementsId);
        if (req) {
          req.status = status;
          req.admin_notes = adminNotes;
          req.reviewed_by = cleanAdmin;
          req.reviewed_at = new Date().toISOString();
        }
        return req;
      }
    );
  },
};
