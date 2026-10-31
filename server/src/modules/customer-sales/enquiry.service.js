/**
 * Enquiry Ingestion & Lead Lifecycle Management Service
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §3) & docs/contracts/customer-sales.md
 */

import { CustomerSalesRepository } from './customer-sales.repository.js';
import { CustomerService } from './customer.service.js';

export const EnquiryService = {
  /**
   * Ingest lead from any authorized source with automated duplicate detection
   */
  async createEnquiry(data, userId = null) {
    // 1. Automated Duplicate Detection
    const duplicate = await CustomerSalesRepository.findDuplicateEnquiry(data.phone, data.email);

    // 2. Check if customer already exists for this phone
    const existingCustomer = await CustomerSalesRepository.getCustomerByPhone(data.phone);

    const enquiry = await CustomerSalesRepository.createEnquiry({
      full_name: data.fullName,
      phone: data.phone,
      email: data.email || null,
      source: data.source || 'WEB',
      status: 'NEW',
      priority: data.priority || 'MEDIUM',
      assigned_to: userId,
      customer_id: existingCustomer ? existingCustomer.id : null,
      estimated_monthly_bill: data.estimatedMonthlyBill || null,
      estimated_roof_area_sqft: data.estimatedRoofAreaSqft || null,
      grid_type_preference: data.gridTypePreference || 'On-Grid',
      interested_capacity_kw: data.interestedCapacityKw || null,
      notes: data.notes || null,
      duplicate_of_id: duplicate ? duplicate.id : null,
    });

    if (existingCustomer) {
      await CustomerSalesRepository.addTimelineEvent({
        customer_id: existingCustomer.id,
        event_type: 'ENQUIRY_CREATED',
        title: 'New Solar Enquiry Logged',
        description: `Inbound enquiry ${enquiry.enquiry_number} from source ${enquiry.source}.`,
        metadata: { enquiryId: enquiry.id, source: enquiry.source },
        created_by: userId,
      });
    }

    return {
      enquiry,
      isDuplicate: Boolean(duplicate),
      duplicateRecord: duplicate || null,
    };
  },

  /**
   * Public Web Form Enquiry Submission (Unauthenticated)
   */
  async createPublicEnquiry(data) {
    return this.createEnquiry({
      ...data,
      source: 'WEB',
      priority: 'MEDIUM',
    });
  },

  /**
   * Assign enquiry to sales representative
   */
  async assignEnquiry(enquiryId, assignedToId, assignedBy = null) {
    const enquiry = await CustomerSalesRepository.getEnquiryById(enquiryId);
    if (!enquiry) {
      const err = new Error('Enquiry not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await CustomerSalesRepository.updateEnquiry(enquiryId, {
      assigned_to: assignedToId,
    });

    if (enquiry.customer_id) {
      await CustomerSalesRepository.addTimelineEvent({
        customer_id: enquiry.customer_id,
        event_type: 'ENQUIRY_ASSIGNED',
        title: 'Enquiry Assigned to Sales Representative',
        description: `Enquiry ${enquiry.enquiry_number} assigned to representative.`,
        metadata: { enquiryId, assignedTo: assignedToId },
        created_by: assignedBy,
      });
    }

    return updated;
  },

  /**
   * Record follow-up phone call or customer interaction
   */
  async recordFollowUp(enquiryId, { callSummary, outcome, nextFollowUp }, userId = null) {
    const enquiry = await CustomerSalesRepository.getEnquiryById(enquiryId);
    if (!enquiry) {
      const err = new Error('Enquiry not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const followUp = await CustomerSalesRepository.addEnquiryFollowUp({
      enquiry_id: enquiryId,
      call_summary: callSummary,
      outcome,
      next_follow_up: nextFollowUp || null,
      created_by: userId,
    });

    // Advance status to CONTACTED if still NEW
    const updates = {};
    if (enquiry.status === 'NEW') {
      updates.status = 'CONTACTED';
    }
    if (nextFollowUp) {
      updates.follow_up_date = nextFollowUp;
    }
    if (Object.keys(updates).length > 0) {
      await CustomerSalesRepository.updateEnquiry(enquiryId, updates);
    }

    if (enquiry.customer_id) {
      await CustomerSalesRepository.addTimelineEvent({
        customer_id: enquiry.customer_id,
        event_type: 'FOLLOW_UP_RECORDED',
        title: `Sales Call: ${outcome}`,
        description: callSummary,
        metadata: { enquiryId, outcome, nextFollowUp },
        created_by: userId,
      });
    }

    return followUp;
  },

  /**
   * Preliminary Lead Screening & Qualification (Verified against Spec §3)
   * Converts qualified lead into an authoritative customer profile
   */
  async qualifyEnquiry(enquiryId, qualificationData, userId = null) {
    const enquiry = await CustomerSalesRepository.getEnquiryById(enquiryId);
    if (!enquiry) {
      const err = new Error('Enquiry not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (enquiry.status === 'QUALIFIED') {
      return { enquiry, message: 'Enquiry is already qualified' };
    }

    // 1. Establish or link customer profile
    let customer = enquiry.customer_id ? await CustomerSalesRepository.getCustomerById(enquiry.customer_id) : null;
    if (!customer) {
      // Check by phone
      customer = await CustomerSalesRepository.getCustomerByPhone(enquiry.phone);
    }

    if (!customer) {
      customer = await CustomerSalesRepository.createCustomer({
        full_name: enquiry.full_name,
        phone: enquiry.phone,
        email: enquiry.email,
        address_street: qualificationData.addressStreet || null,
        address_city: qualificationData.addressCity || 'Ahmedabad',
        address_pincode: qualificationData.addressPincode || null,
        electricity_consumer_number: qualificationData.electricityConsumerNumber || null,
        sanctioned_load_kw: qualificationData.sanctionedLoadKw || null,
        created_by: userId,
      });
    }

    // 2. Advance enquiry status to QUALIFIED
    const updatedEnquiry = await CustomerSalesRepository.updateEnquiry(enquiryId, {
      status: 'QUALIFIED',
      customer_id: customer.id,
      estimated_roof_area_sqft: qualificationData.estimatedRoofAreaSqft,
      estimated_monthly_bill: qualificationData.estimatedMonthlyBill,
    });

    // 3. Record timeline event
    await CustomerSalesRepository.addTimelineEvent({
      customer_id: customer.id,
      event_type: 'LEAD_QUALIFIED',
      title: 'Lead Qualified for Site Survey',
      description: `Enquiry ${enquiry.enquiry_number} qualified: Roof space ${qualificationData.estimatedRoofAreaSqft} sq ft, Monthly bill ₹${qualificationData.estimatedMonthlyBill}.`,
      metadata: { enquiryId, qualificationData },
      created_by: userId,
    });

    return {
      enquiry: updatedEnquiry,
      customer,
    };
  },

  /**
   * Disqualify unfeasible enquiry
   */
  async disqualifyEnquiry(enquiryId, reason, userId = null) {
    const enquiry = await CustomerSalesRepository.getEnquiryById(enquiryId);
    if (!enquiry) {
      const err = new Error('Enquiry not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return CustomerSalesRepository.updateEnquiry(enquiryId, {
      status: 'DISQUALIFIED',
      disqualification_reason: reason,
    });
  },

  /**
   * Merge duplicate enquiry
   */
  async mergeEnquiry(enquiryId, { primaryEnquiryId, notes }, userId = null) {
    const secondary = await CustomerSalesRepository.getEnquiryById(enquiryId);
    const primary = await CustomerSalesRepository.getEnquiryById(primaryEnquiryId);

    if (!secondary || !primary) {
      const err = new Error('One or both enquiries not found');
      err.status = 404;
      throw err;
    }

    return CustomerSalesRepository.updateEnquiry(enquiryId, {
      status: 'MERGED',
      duplicate_of_id: primaryEnquiryId,
      notes: notes ? `${secondary.notes || ''} [Merged: ${notes}]` : secondary.notes,
    });
  },

  /**
   * List enquiries with filtering and follow-ups
   */
  async listEnquiries(filter = {}) {
    return CustomerSalesRepository.listEnquiries(filter);
  },

  async getEnquiryDossier(id) {
    const enquiry = await CustomerSalesRepository.getEnquiryById(id);
    if (!enquiry) {
      const err = new Error('Enquiry not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const followUps = await CustomerSalesRepository.getEnquiryFollowUps(id);
    const survey = await CustomerSalesRepository.getSurveyByEnquiryId(id);

    return {
      enquiry,
      followUps,
      survey,
    };
  },
};
