/**
 * Customer Profile & Timeline Management Service
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §3) & docs/contracts/customer-sales.md
 */

import { CustomerSalesRepository } from './customer-sales.repository.js';
import { AppError, NotFoundError } from '../../shared/errors/AppError.js';

export const CustomerService = {
  /**
   * Register a new customer profile
   */
  async registerCustomer(data, userId = null) {
    // Check if customer with same phone already exists
    const existing = await CustomerSalesRepository.getCustomerByPhone(data.phone);
    if (existing) {
      throw new AppError(
        `Customer with phone ${data.phone} already exists (ID: ${existing.customer_code})`,
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
      created_by: userId,
    });

    // Record timeline event
    await CustomerSalesRepository.addTimelineEvent({
      customer_id: customer.id,
      event_type: 'CUSTOMER_CREATED',
      title: 'Customer Profile Created',
      description: `Customer ${customer.full_name} (${customer.customer_code}) registered.`,
      metadata: { phone: customer.phone, city: customer.address_city },
      created_by: userId,
    });

    return customer;
  },

  /**
   * Get 360 customer profile with timeline
   */
  async getCustomerDossier(id) {
    const customer = await CustomerSalesRepository.getCustomerById(id);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const timeline = await CustomerSalesRepository.getTimelineByCustomerId(id);
    const enquiries = await CustomerSalesRepository.listEnquiries({ search: customer.phone });
    const quotations = await CustomerSalesRepository.listQuotations({ customer_id: id });
    const orders = await CustomerSalesRepository.listOrders({ customer_id: id });

    return {
      customer,
      timeline,
      enquiries,
      quotations,
      orders,
    };
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

    const updated = await CustomerSalesRepository.updateCustomer(id, updates);

    await CustomerSalesRepository.addTimelineEvent({
      customer_id: id,
      event_type: 'CUSTOMER_UPDATED',
      title: 'Customer Profile Updated',
      description: 'Contact and address information modified.',
      metadata: updates,
      created_by: userId,
    });

    return updated;
  },

  /**
   * Search and filter customers
   */
  async listCustomers(query = {}) {
    return CustomerSalesRepository.listCustomers(query);
  },

  /**
   * Get chronological timeline
   */
  async getCustomerTimeline(customerId) {
    return CustomerSalesRepository.getTimelineByCustomerId(customerId);
  },
};
