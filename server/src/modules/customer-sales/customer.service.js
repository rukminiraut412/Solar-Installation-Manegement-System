/**
 * Customer Profile & Timeline Management Service
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §3) & docs/contracts/customer-sales.md
 */

import { CustomerSalesRepository } from './customer-sales.repository.js';
import { AppError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';

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
      const isSalesAuthorized = user.role === 'Sales' && (customer.assigned_seller_id === user.id || customer.created_by === user.id);
      const isTechAuthorized = user.role === 'Technician' && customer.assigned_technician_id === user.id;
      const isWarehouseAuthorized = user.role === 'Warehouse' && customer.assigned_warehouse_id === user.id;
      const isSupportAuthorized = user.role === 'Support' && customer.assigned_support_id === user.id;

      if (!isSalesAuthorized && !isTechAuthorized && !isWarehouseAuthorized && !isSupportAuthorized) {
        throw new ForbiddenError('Data Privacy Restriction: You are not authorized to access this customer record.');
      }
    }

    const timeline = await CustomerSalesRepository.getTimelineByCustomerId(id);
    const assignments = await CustomerSalesRepository.getCustomerAssignmentHistory(id);
    const enquiries = await CustomerSalesRepository.listEnquiries({ search: customer.phone });
    const quotations = await CustomerSalesRepository.listQuotations({ customer_id: id });
    const orders = await CustomerSalesRepository.listOrders({ customer_id: id });

    return {
      customer,
      timeline,
      assignments,
      enquiries,
      quotations,
      orders,
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
};

