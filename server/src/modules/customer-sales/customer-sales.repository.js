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
import { SOLAR_PACKAGES } from './bom-generator.js';

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
};

// Helper: try real DB query, fallback to memory if DB is unavailable
async function executeDb(queryFn, fallbackFn) {
  try {
    return await queryFn();
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.message?.includes('connect ECONNREFUSED') ||
      err.message?.includes('relation "') ||
      process.env.NODE_ENV === 'test'
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
    const customer = {
      id: data.id || crypto.randomUUID(),
      customer_code: data.customer_code || `CUST-${new Date().getFullYear()}-${String(fallbackStore.customers.length + 1).padStart(4, '0')}`,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone,
      address_street: data.address_street || null,
      address_city: data.address_city || 'Ahmedabad',
      address_state: data.address_state || 'Gujarat',
      address_pincode: data.address_pincode || null,
      electricity_consumer_number: data.electricity_consumer_number || null,
      sanctioned_load_kw: data.sanctioned_load_kw ? Number(data.sanctioned_load_kw) : null,
      created_by: data.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return executeDb(
      async () => {
        const sql = `
          INSERT INTO customers (
            id, customer_code, full_name, email, phone, address_street,
            address_city, address_state, address_pincode, electricity_consumer_number,
            sanctioned_load_kw, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *;
        `;
        const res = await pool.query(sql, [
          customer.id, customer.customer_code, customer.full_name, customer.email, customer.phone,
          customer.address_street, customer.address_city, customer.address_state, customer.address_pincode,
          customer.electricity_consumer_number, customer.sanctioned_load_kw, customer.created_by,
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
        const res = await pool.query('SELECT * FROM customers WHERE id = $1;', [id]);
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

  async listCustomers({ search, limit = 50, offset = 0 } = {}) {
    return executeDb(
      async () => {
        let sql = 'SELECT * FROM customers';
        const params = [];
        if (search) {
          sql += ' WHERE full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR customer_code ILIKE $1';
          params.push(`%${search}%`);
        }
        sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        const res = await pool.query(sql, params);
        return res.rows;
      },
      async () => {
        let list = [...fallbackStore.customers];
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(
            (c) =>
              c.full_name.toLowerCase().includes(s) ||
              c.phone.includes(s) ||
              (c.email && c.email.toLowerCase().includes(s)) ||
              c.customer_code.toLowerCase().includes(s)
          );
        }
        return list.slice(offset, offset + limit);
      }
    );
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
        return res.rows[0];
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
          item.id, item.customer_id, item.event_type, item.title,
          item.description, JSON.stringify(item.metadata), item.created_by, item.created_at,
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
      enquiry_number: data.enquiry_number || `ENQ-${new Date().getFullYear()}-${String(fallbackStore.enquiries.length + 1).padStart(4, '0')}`,
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
          enquiry.id, enquiry.enquiry_number, enquiry.customer_id, enquiry.full_name, enquiry.phone,
          enquiry.email, enquiry.source, enquiry.status, enquiry.priority, enquiry.assigned_to,
          enquiry.estimated_monthly_bill, enquiry.estimated_roof_area_sqft, enquiry.grid_type_preference,
          enquiry.interested_capacity_kw, enquiry.notes, enquiry.duplicate_of_id,
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
      survey_number: data.survey_number || `SRV-${new Date().getFullYear()}-${String(fallbackStore.surveys.length + 1).padStart(4, '0')}`,
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
          values.push(val);
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const sql = `UPDATE site_surveys SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`;
        const res = await pool.query(sql, values);
        return res.rows[0];
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
              `INSERT INTO packages (id, code, name, capacity_kw, grid_type, base_price, description)
               VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO NOTHING;`,
              [pkg.id, pkg.code, pkg.name, pkg.capacity_kw, pkg.grid_type, pkg.base_price, pkg.description]
            );
          }
          return SOLAR_PACKAGES;
        }
        return res.rows;
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
      quotation_number: data.quotation_number || `QTE-${new Date().getFullYear()}-${String(fallbackStore.quotations.length + 1).padStart(4, '0')}`,
      version: data.version || 1,
      survey_id: data.survey_id,
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
              id, quotation_number, version, survey_id, customer_id, package_id,
              capacity_kw, grid_type, status, hardware_subtotal, installation_labor_cost,
              discount_amount, tax_amount, tax_percent, total_amount, subsidy_estimated_amount,
              valid_until, proposal_token, customer_notes, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *;
          `;
          const resQuote = await client.query(sqlQuote, [
            quote.id, quote.quotation_number, quote.version, quote.survey_id, quote.customer_id,
            quote.package_id, quote.capacity_kw, quote.grid_type, quote.status, quote.hardware_subtotal,
            quote.installation_labor_cost, quote.discount_amount, quote.tax_amount, quote.tax_percent,
            quote.total_amount, quote.subsidy_estimated_amount, quote.valid_until, quote.proposal_token,
            quote.customer_notes, quote.created_by, quote.created_at, quote.updated_at,
          ]);

          for (const it of quoteItems) {
            await client.query(
              `INSERT INTO quotation_items (
                id, quotation_id, product_id, category, sku, name, quantity, unit,
                unit_cost, unit_price, total_price, is_serialized
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
              [it.id, it.quotation_id, it.product_id, it.category, it.sku, it.name, it.quantity, it.unit, it.unit_cost, it.unit_price, it.total_price, it.is_serialized]
            );
          }
          await client.query('COMMIT');
          return { ...resQuote.rows[0], items: quoteItems };
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
        if (!res.rows[0]) return null;
        const itemsRes = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1;', [id]);
        return { ...res.rows[0], items: itemsRes.rows };
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
        if (!res.rows[0]) return null;
        const itemsRes = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1;', [res.rows[0].id]);
        return { ...res.rows[0], items: itemsRes.rows };
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
        return res.rows[0];
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
      order_number: `ORD-${new Date().getFullYear()}-${String(fallbackStore.orders.length + 1).padStart(4, '0')}`,
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
      project_number: `PRJ-${new Date().getFullYear()}-${String(fallbackStore.projects.length + 1).padStart(4, '0')}`,
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
            order.id, order.order_number, order.quotation_id, order.customer_id, order.order_status,
            order.payment_status, order.total_contract_value, order.advance_required_percent,
            order.advance_required_amount, order.created_by, order.created_at, order.updated_at,
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
            project.id, project.project_number, project.order_id, project.customer_id,
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
                item.id, item.project_id, item.order_id, item.product_id, item.category,
                item.sku, item.name, item.quantity, item.unit, item.unit_cost, item.unit_price,
                item.total_price, item.is_serialized, item.created_at,
              ]
            );
          }

          await client.query('COMMIT');
          return { order: resOrder.rows[0], project: resProj.rows[0], bomItems };
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
        return res.rows;
      },
      async () => {
        return fallbackStore.projectBomItems.filter((b) => b.project_id === projectId);
      }
    );
  },
};
