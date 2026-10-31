/**
 * Solar Quotation & Package Management Service
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §3, §7.3) & docs/contracts/customer-sales.md
 */

import crypto from 'crypto';
import { CustomerSalesRepository } from './customer-sales.repository.js';
import { generateBOM, calculateQuotationTotals, SOLAR_PACKAGES } from './bom-generator.js';
import { OrderService } from './order.service.js';
import { AppError, NotFoundError } from '../../shared/errors/AppError.js';

export const QuotationService = {
  /**
   * List standard solar packages catalog
   */
  async getPackages() {
    return CustomerSalesRepository.listPackages();
  },

  /**
   * Preview BOM derivation without persisting
   */
  async previewBOM({ capacityKw, gridType, surveyId = null, cableRunMeters = 15 }) {
    let measuredCableRun = cableRunMeters;
    if (surveyId) {
      const survey = await CustomerSalesRepository.getSurveyById(surveyId);
      if (survey && survey.cable_run_meters) {
        measuredCableRun = survey.cable_run_meters;
      }
    }

    const items = generateBOM({
      capacityKw,
      gridType,
      survey: { cable_run_meters: measuredCableRun },
    });

    const totals = calculateQuotationTotals({
      bomItems: items,
      capacityKw,
    });

    return {
      capacityKw,
      gridType,
      cableRunMeters: measuredCableRun,
      items,
      totals,
    };
  },

  /**
   * Generate formal quotation (Strict Spec Invariant BR-SRV-002: Survey must be APPROVED)
   */
  async createQuotation(data, userId = null) {
    const survey = await CustomerSalesRepository.getSurveyById(data.surveyId);
    if (!survey) {
      throw new NotFoundError('Site survey not found');
    }

    // MANDATORY GATE: Check survey engineering approval
    if (survey.status !== 'APPROVED') {
      throw new AppError(
        `Quotation cannot be generated for survey in status '${survey.status}'. Survey must be strictly APPROVED by engineering before quoting.`,
        422,
        'SURVEY_NOT_APPROVED'
      );
    }

    const capacityKw = Number(data.capacityKw);
    const gridType = data.gridType || 'On-Grid';
    const cableRun = survey.cable_run_meters || 15;

    // 1. Derive authoritative itemized BOM
    const bomItems = generateBOM({
      capacityKw,
      gridType,
      survey: { cable_run_meters: cableRun },
    });

    // 2. Calculate commercial totals with discount limit guard [NC-012]
    const hardwareSubtotal = bomItems.reduce((sum, it) => sum + Number(it.total_price), 0);
    const maxDiscountAllowed = (hardwareSubtotal + Number(data.laborCost || 15000)) * 0.1; // 10% max demo discount
    if (Number(data.discountAmount || 0) > maxDiscountAllowed) {
      throw new AppError(
        `Discount ₹${data.discountAmount} exceeds the maximum authorized limit of ₹${Math.round(maxDiscountAllowed)} (10%). Requires Director approval.`,
        422,
        'DISCOUNT_LIMIT_EXCEEDED'
      );
    }

    const totals = calculateQuotationTotals({
      bomItems,
      laborCost: data.laborCost || 15000,
      discountAmount: data.discountAmount || 0,
      taxPercent: 12.0, // [NC-006]
      capacityKw,
    });

    // 3. Set validity window [NC-011]
    const validityDays = data.validityDays || 15;
    const validUntil = new Date(Date.now() + validityDays * 86400000).toISOString();

    // 4. Secure cryptographic proposal token for customer portal
    const proposalToken = crypto.randomBytes(24).toString('hex');

    // 5. Persist quotation & items
    const quote = await CustomerSalesRepository.createQuotation(
      {
        survey_id: survey.id,
        customer_id: survey.customer_id,
        package_id: data.packageId || null,
        capacity_kw: capacityKw,
        grid_type: gridType,
        status: 'DRAFT',
        hardware_subtotal: totals.hardwareSubtotal,
        installation_labor_cost: totals.installationLaborCost,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        tax_percent: totals.taxPercent,
        total_amount: totals.totalAmount,
        subsidy_estimated_amount: totals.subsidyEstimatedAmount,
        valid_until: validUntil,
        proposal_token: proposalToken,
        customer_notes: data.customerNotes || null,
        created_by: userId,
      },
      bomItems
    );

    // 6. Record timeline event
    await CustomerSalesRepository.addTimelineEvent({
      customer_id: survey.customer_id,
      event_type: 'QUOTATION_GENERATED',
      title: `Quotation Prepared (${capacityKw} kW ${gridType})`,
      description: `Formal quote ${quote.quotation_number} generated for ₹${quote.total_amount}. Valid until ${new Date(validUntil).toLocaleDateString()}.`,
      metadata: { quotationId: quote.id, totalAmount: quote.totalAmount, token: proposalToken },
      created_by: userId,
    });

    return quote;
  },

  /**
   * Dispatch quotation to customer
   */
  async sendQuotation(quotationId, userId = null) {
    const quote = await CustomerSalesRepository.getQuotationById(quotationId);
    if (!quote) {
      const err = new Error('Quotation not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (quote.status !== 'DRAFT') {
      return quote;
    }

    const updated = await CustomerSalesRepository.updateQuotation(quotationId, {
      status: 'SENT',
    });

    await CustomerSalesRepository.addTimelineEvent({
      customer_id: quote.customer_id,
      event_type: 'QUOTATION_SENT',
      title: 'Quotation Dispatched to Customer',
      description: `Proposal link sent with proposal token.`,
      metadata: { quotationId: quote.id, proposalToken: quote.proposal_token },
      created_by: userId,
    });

    return updated;
  },

  /**
   * Retrieve proposal for public customer portal via secure token
   */
  async getQuotationByToken(token) {
    const quote = await CustomerSalesRepository.getQuotationByToken(token);
    if (!quote) {
      const err = new Error('Quotation not found or link has expired');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const customer = await CustomerSalesRepository.getCustomerById(quote.customer_id);
    const survey = await CustomerSalesRepository.getSurveyById(quote.survey_id);

    return {
      quote,
      customer: customer ? { full_name: customer.full_name, phone: customer.phone, city: customer.address_city } : null,
      survey: survey ? { shadow_free_sqft: survey.shadow_free_sqft, tilt_angle_degrees: survey.tilt_angle_degrees } : null,
      isExpired: new Date(quote.valid_until) < new Date(),
    };
  },

  /**
   * Customer Digital Sign-Off & Acceptance
   * Automatically advances order creation
   */
  async acceptQuotation(token, { signature, customerNotes }) {
    const quote = await CustomerSalesRepository.getQuotationByToken(token);
    if (!quote) {
      throw new NotFoundError('Proposal not found');
    }

    if (quote.status === 'ACCEPTED') {
      const existingOrder = await CustomerSalesRepository.getOrderByQuotationId(quote.id);
      return {
        success: true,
        message: 'Proposal has already been accepted',
        quotation: quote,
        order: existingOrder,
      };
    }

    // Check expiration [NC-011]
    if (new Date(quote.valid_until) < new Date()) {
      throw new AppError(
        'Proposal has expired. Please request a refreshed quote from our sales team.',
        410,
        'QUOTATION_EXPIRED'
      );
    }

    // 1. Advance quote status to ACCEPTED
    const updatedQuote = await CustomerSalesRepository.updateQuotation(quote.id, {
      status: 'ACCEPTED',
      accepted_at: new Date().toISOString(),
      digital_signature_url: signature,
      customer_notes: customerNotes || quote.customer_notes,
    });

    // 2. Record timeline event
    await CustomerSalesRepository.addTimelineEvent({
      customer_id: quote.customer_id,
      event_type: 'QUOTATION_ACCEPTED',
      title: 'Customer Digitally Accepted Quotation',
      description: `Homeowner digitally signed proposal for ${quote.capacity_kw} kW ${quote.grid_type} system. Total: ₹${quote.total_amount}.`,
      metadata: { quotationId: quote.id, signature },
      created_by: null,
    });

    // 3. Authoritatively advance to Order & Project creation
    const { order, project, bomItems } = await OrderService.createFromAcceptedQuote(updatedQuote);

    return {
      success: true,
      message: 'Proposal accepted successfully. Order and installation project established.',
      quotation: updatedQuote,
      order,
      project,
      bomItems,
    };
  },

  /**
   * Customer Decline Proposal
   */
  async declineQuotation(token, { reason }) {
    const quote = await CustomerSalesRepository.getQuotationByToken(token);
    if (!quote) {
      const err = new Error('Proposal not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await CustomerSalesRepository.updateQuotation(quote.id, {
      status: 'DECLINED',
      declined_reason: reason,
    });

    await CustomerSalesRepository.addTimelineEvent({
      customer_id: quote.customer_id,
      event_type: 'QUOTATION_DECLINED',
      title: 'Customer Declined Quotation',
      description: `Customer submitted feedback: ${reason}`,
      metadata: { quotationId: quote.id, reason },
      created_by: null,
    });

    return updated;
  },

  async listQuotations(filter = {}) {
    return CustomerSalesRepository.listQuotations(filter);
  },

  async getQuotationDossier(id) {
    const quote = await CustomerSalesRepository.getQuotationById(id);
    if (!quote) {
      const err = new Error('Quotation not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    const customer = await CustomerSalesRepository.getCustomerById(quote.customer_id);
    const survey = await CustomerSalesRepository.getSurveyById(quote.survey_id);
    const order = await CustomerSalesRepository.getOrderByQuotationId(id);

    return {
      quote,
      customer,
      survey,
      order,
    };
  },
};
