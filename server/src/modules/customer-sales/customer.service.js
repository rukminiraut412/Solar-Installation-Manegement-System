/**
 * Customer Profile & Timeline Management Service
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §3) & docs/contracts/customer-sales.md
 */

import { CustomerSalesRepository } from './customer-sales.repository.js';
import { AppError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';
import { pool } from '../../db/index.js';
import { WarehouseQuotationService } from '../operations/warehouse-quotation.service.js';

export const CustomerService = {
  /**
   * Register a new customer profile (Phase 1)
   */
  async registerCustomer(data, userId = null) {
    // Check if customer with same phone already exists
    const existing = await CustomerSalesRepository.getCustomerByPhone(data.phone);
    if (existing) {
      throw new AppError(
        `Customer with mobile number ${data.phone} already exists in the system (Customer Code: ${existing.customer_code})`,
        409,
        'CUSTOMER_ALREADY_EXISTS',
        { existingCustomer: existing }
      );
    }

    const customer = await CustomerSalesRepository.createCustomer({
      full_name: data.fullName,
      phone: data.phone,
      email: data.email || null,
      address_street: data.addressStreet || null,
      address_city: data.addressCity || 'Ahmedabad',
      address_state: data.addressState || 'Gujarat',
      address_pincode: data.addressPincode || null,
      electricity_consumer_number: data.electricityConsumerNumber || null,
      sanctioned_load_kw: data.sanctionedLoadKw || null,
      installation_location: data.installationLocation || data.addressStreet || null,
      solar_requirement: data.solarRequirement || 'On-Grid Solar System',
      required_capacity_kw: data.requiredCapacityKw || data.sanctionedLoadKw || 3.0,
      additional_notes: data.additionalNotes || data.notes || null,
      created_by: userId,
    });

    // Record timeline event
    await CustomerSalesRepository.addTimelineEvent({
      customer_id: customer.id,
      event_type: 'CUSTOMER_CREATED',
      title: 'Customer Profile Created',
      description: `Customer ${customer.full_name} (${customer.customer_code}) registered. Solar Requirement: ${customer.required_capacity_kw || 3.0} kW ${customer.solar_requirement || ''}. Status: PENDING ASSIGNMENT.`,
      metadata: {
        phone: customer.phone,
        city: customer.address_city,
        capacity: customer.required_capacity_kw,
        system: customer.solar_requirement,
      },
      created_by: userId,
    });

    return customer;
  },

  /**
   * Get 360 customer profile with timeline and role authorization
   */
  async getCustomerDossier(id, user = null) {
    const customer = await CustomerSalesRepository.getCustomerById(id);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // STRICT RBAC & DATA PRIVACY GUARD (PHASE 4)
    if (user && user.role !== 'Admin/Owner') {
      const isSalesAuthorized = user.role === 'Sales' && (
        customer.assigned_seller_id === user.id ||
        customer.created_by === user.id ||
        (!customer.assigned_seller_id && !customer.created_by) ||
        customer.assignment_status === 'PENDING_ASSIGNMENT'
      );
      const isTechAuthorized = user.role === 'Technician' && customer.assigned_technician_id === user.id;
      const isWarehouseAuthorized = user.role === 'Warehouse' && customer.assigned_warehouse_id === user.id;
      const isSupportAuthorized = user.role === 'Support' && customer.assigned_support_id === user.id;

      if (!isSalesAuthorized && !isTechAuthorized && !isWarehouseAuthorized && !isSupportAuthorized) {
        throw new ForbiddenError('Data Privacy Restriction: You are not authorized to access this customer record.');
      }
    }

    const timeline = await CustomerSalesRepository.getTimelineByCustomerId(id);
    const assignments = await CustomerSalesRepository.getCustomerAssignmentHistory(id);
    const requirements = await CustomerSalesRepository.getInstallationRequirementsByCustomerId(id);

    return {
      customer,
      timeline,
      assignments,
      requirements,
    };
  },

  /**
   * Assign Team to Customer (Phase 2 - Admin Only)
   */
  async assignCustomer(id, data, adminId = null) {
    const customer = await CustomerSalesRepository.getCustomerById(id);
    if (!customer) {
      throw new NotFoundError('Customer record not found');
    }

    const updated = await CustomerSalesRepository.assignCustomer(id, data, adminId);
    return updated;
  },

  /**
   * Retrieve dynamic eligible active employees for assignment dropdowns
   */
  async getEligibleAssignees() {
    return CustomerSalesRepository.getEligibleAssignees();
  },

  /**
   * Get customer assignment history
   */
  async getCustomerAssignmentHistory(customerId) {
    return CustomerSalesRepository.getCustomerAssignmentHistory(customerId);
  },

  /**
   * Get customer-safe public view (Phase 3.E)
   */
  async getCustomerPublicView(customerId) {
    const view = await CustomerSalesRepository.getCustomerPublicView(customerId);
    if (!view) {
      throw new NotFoundError('Customer not found');
    }
    return view;
  },

  /**
   * Update customer profile
   */
  async updateCustomer(id, data, userId = null) {
    const customer = await CustomerSalesRepository.getCustomerById(id);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const updates = {};
    if (data.fullName !== undefined) updates.full_name = data.fullName;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.email !== undefined) updates.email = data.email;
    if (data.addressStreet !== undefined) updates.address_street = data.addressStreet;
    if (data.addressCity !== undefined) updates.address_city = data.addressCity;
    if (data.addressState !== undefined) updates.address_state = data.addressState;
    if (data.addressPincode !== undefined) updates.address_pincode = data.addressPincode;
    if (data.electricityConsumerNumber !== undefined) updates.electricity_consumer_number = data.electricityConsumerNumber;
    if (data.sanctionedLoadKw !== undefined) updates.sanctioned_load_kw = data.sanctionedLoadKw;
    if (data.installationLocation !== undefined) updates.installation_location = data.installationLocation;
    if (data.solarRequirement !== undefined) updates.solar_requirement = data.solarRequirement;
    if (data.requiredCapacityKw !== undefined) updates.required_capacity_kw = data.requiredCapacityKw;
    if (data.additionalNotes !== undefined) updates.additional_notes = data.additionalNotes;

    const updated = await CustomerSalesRepository.updateCustomer(id, updates);

    await CustomerSalesRepository.addTimelineEvent({
      customer_id: id,
      event_type: 'CUSTOMER_UPDATED',
      title: 'Customer Profile Updated',
      description: 'Contact and requirement details updated.',
      metadata: updates,
      created_by: userId,
    });

    return updated;
  },

  /**
   * Search and filter customers with automatic role-based scoping (Phase 4)
   */
  async listCustomers(query = {}, user = null) {
    const role = user?.role || 'Admin/Owner';
    const userId = user?.id || null;

    return CustomerSalesRepository.listCustomers({
      ...query,
      role,
      userId,
    });
  },

  /**
   * Get chronological timeline
   */
  async getCustomerTimeline(customerId) {
    return CustomerSalesRepository.getTimelineByCustomerId(customerId);
  },

  /**
   * Save / Submit detailed installation requirements
   */
  async saveRequirements(data, user) {
    let customerId = data.customerId;
    if (user?.role === 'Customer' || !customerId) {
      // Find customer linked to current user
      const existingReq = await CustomerSalesRepository.getInstallationRequirementsByUserId(user.id);
      if (existingReq) {
        customerId = existingReq.customer_id;
      } else {
        const custList = await CustomerSalesRepository.listCustomers({ search: user.email });
        if (custList.length > 0) {
          customerId = custList[0].id;
        } else {
          throw new NotFoundError('Customer record not found for authenticated user');
        }
      }
    }

    const saved = await CustomerSalesRepository.saveInstallationRequirements(customerId, data, user?.id);

    // Automatically trigger visibility in assigned Warehouse Portal & generate Draft Quotation
    await this.processRequirementsSubmission(saved, customerId, user);

    return saved;
  },

  /**
   * Automatically process requirements submission:
   * 1. Ensure customer is assigned to active Warehouse
   * 2. Generate Project ID & Order ID using existing process
   * 3. Automatically generate itemized BOM draft quotation in assigned Warehouse Portal
   */
  async processRequirementsSubmission(savedReq, customerId, user) {
    try {
      // 1. Ensure customer is assigned to a warehouse
      const custRes = await pool.query('SELECT * FROM customers WHERE id = $1;', [customerId]);
      if (custRes.rows.length === 0) return;
      const customer = custRes.rows[0];

      let warehouseId = customer.assigned_warehouse_id;
      if (!warehouseId) {
        const whRes = await pool.query(
          "SELECT id FROM users WHERE role = 'Warehouse' AND is_active = true ORDER BY created_at ASC LIMIT 1;"
        );
        if (whRes.rows.length > 0) {
          warehouseId = whRes.rows[0].id;
          await pool.query(
            "UPDATE customers SET assigned_warehouse_id = $1, assignment_status = 'ASSIGNED', assigned_at = CURRENT_TIMESTAMP WHERE id = $2;",
            [warehouseId, customerId]
          );
          await pool.query(
            "INSERT INTO customer_assignments (customer_id, assigned_by, warehouse_id, assignment_notes) VALUES ($1, $2, $3, 'Auto-assigned to Warehouse on Requirements Submission');",
            [customerId, user?.id || null, warehouseId]
          );
        }
      }

      // 2. Generate Project ID & Order ID using existing process if not yet created
      let project = null;
      let order = null;

      const existingProjRes = await pool.query(
        `SELECT p.*, o.order_number 
         FROM projects p 
         LEFT JOIN orders o ON p.order_id = o.id 
         WHERE p.customer_id = $1 OR p.requirements_id = $2 
         LIMIT 1;`,
        [customerId, savedReq.id]
      );

      if (existingProjRes.rows.length > 0) {
        project = existingProjRes.rows[0];
        if (project.order_id) {
          const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1;', [project.order_id]);
          order = orderRes.rows[0] || null;
        }
      } else {
        // Generate unique Order ID (ORD-YYYY-XXXX)
        const orderCode = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        const contractVal = (Number(savedReq.required_capacity_kw) || 3.0) * 55000;
        const advanceAmt = contractVal * 0.25;

        const orderRes = await pool.query(
          `INSERT INTO orders (
            order_number, customer_id, order_status, payment_status,
            total_contract_value, advance_required_percent, advance_required_amount,
            advance_paid_amount, requirements_id
          ) VALUES ($1, $2, 'CONFIRMED', 'PENDING_ADVANCE', $3, 25.0, $4, 0, $5)
          RETURNING *;`,
          [orderCode, customerId, contractVal, advanceAmt, savedReq.id]
        );
        order = orderRes.rows[0];

        // Generate unique Project ID (PRJ-YYYY-XXXX)
        const projectCode = 'PRJ-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        const projectRes = await pool.query(
          `INSERT INTO projects (
            project_code, project_number, order_id, customer_id, capacity_kw, grid_type,
            current_stage, workflow_stage, requirements_id
          ) VALUES ($1, $1, $2, $3, $4, $5, 'QUOTATION_PENDING', 'REQUIREMENTS_SUBMITTED', $6)
          RETURNING *;`,
          [
            projectCode,
            order.id,
            customerId,
            Number(savedReq.required_capacity_kw) || 3.0,
            savedReq.preferred_system_type || 'On-Grid',
            savedReq.id
          ]
        );
        project = projectRes.rows[0];
        project.order_number = orderCode;
      }

      // 3. Auto-generate draft quotation in assigned Warehouse Portal
      await WarehouseQuotationService.autoGenerateDraftQuotation({
        requirement: savedReq,
        customerId,
        projectId: project.id,
        orderId: order?.id || null,
        warehouseId,
        userId: user?.id || null
      });
    } catch (procErr) {
      console.error('[Requirements Processing Error]', procErr);
    }
  },

  /**
   * Get installation requirements for current logged-in customer
   */
  async getMyRequirements(user) {
    const req = await CustomerSalesRepository.getInstallationRequirementsByUserId(user.id);
    if (!req) {
      // Check if customer exists without requirements yet
      const custList = await CustomerSalesRepository.listCustomers({ search: user.email });
      if (custList.length > 0) {
        const cust = custList[0];
        return {
          customer_id: cust.id,
          customer_name: cust.full_name,
          customer_code: cust.customer_code,
          full_installation_address: cust.address_street || '',
          required_capacity_kw: cust.required_capacity_kw || 3.0,
          status: 'DRAFT',
        };
      }
    }
    return req;
  },

  /**
   * Get installation requirements for a specific customer
   */
  async getCustomerRequirements(customerId) {
    return CustomerSalesRepository.getInstallationRequirementsByCustomerId(customerId);
  },

  /**
   * List requirements for Admin / Warehouse review
   */
  async listRequirements(filter = {}) {
    return CustomerSalesRepository.listInstallationRequirements(filter);
  },

  /**
   * Admin Review of Installation Requirements (Approve / Reject / Changes Requested)
   */
  async reviewRequirements(requirementsId, { status, adminNotes }, adminUser) {
    const req = await CustomerSalesRepository.reviewInstallationRequirements(requirementsId, { status, adminNotes }, adminUser.id);
    if (!req) {
      throw new NotFoundError('Requirements record not found');
    }
    return req;
  },
};

