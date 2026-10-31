/**
 * Customer & Sales Controller
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & docs/contracts/customer-sales.md
 */

import { CustomerService } from './customer.service.js';
import { EnquiryService } from './enquiry.service.js';
import { SurveyService } from './survey.service.js';
import { QuotationService } from './quotation.service.js';
import { OrderService } from './order.service.js';
import { successResponse } from '../../shared/utils/response.js';

export const CustomerSalesController = {
  // =========================================================================
  // 1. CUSTOMERS
  // =========================================================================
  async createCustomer(req, res, next) {
    try {
      const customer = await CustomerService.registerCustomer(req.body, req.user?.id);
      return successResponse(res, customer, 'Customer profile created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async listCustomers(req, res, next) {
    try {
      const customers = await CustomerService.listCustomers(req.query, req.user);
      return successResponse(res, customers, 'Customers retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getCustomer(req, res, next) {
    try {
      const dossier = await CustomerService.getCustomerDossier(req.params.id, req.user);
      return successResponse(res, dossier, 'Customer dossier retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async assignCustomer(req, res, next) {
    try {
      const updated = await CustomerService.assignCustomer(req.params.id, req.body, req.user?.id);
      return successResponse(res, updated, 'Operational team assigned to customer successfully');
    } catch (err) {
      next(err);
    }
  },

  async getEligibleAssignees(req, res, next) {
    try {
      const assignees = await CustomerService.getEligibleAssignees();
      return successResponse(res, assignees, 'Eligible assignees retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getCustomerPublicView(req, res, next) {
    try {
      const view = await CustomerService.getCustomerPublicView(req.params.id);
      return successResponse(res, view, 'Customer view retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateCustomer(req, res, next) {
    try {
      const updated = await CustomerService.updateCustomer(req.params.id, req.body, req.user?.id);
      return successResponse(res, updated, 'Customer updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async getCustomerTimeline(req, res, next) {
    try {
      const timeline = await CustomerService.getCustomerTimeline(req.params.id);
      return successResponse(res, timeline, 'Customer timeline retrieved successfully');
    } catch (err) {
      next(err);
    }
  },


  // =========================================================================
  // 2. ENQUIRIES
  // =========================================================================
  async createEnquiry(req, res, next) {
    try {
      const result = await EnquiryService.createEnquiry(req.body, req.user?.id);
      return successResponse(
        res,
        result,
        result.isDuplicate ? 'Enquiry logged (Duplicate detected)' : 'Enquiry created successfully',
        201
      );
    } catch (err) {
      next(err);
    }
  },

  async createPublicEnquiry(req, res, next) {
    try {
      const result = await EnquiryService.createPublicEnquiry(req.body);
      return successResponse(res, result.enquiry, 'Thank you! Your solar enquiry has been received.', 201);
    } catch (err) {
      next(err);
    }
  },

  async listEnquiries(req, res, next) {
    try {
      const enquiries = await EnquiryService.listEnquiries(req.query);
      return successResponse(res, enquiries, 'Enquiries retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getEnquiry(req, res, next) {
    try {
      const dossier = await EnquiryService.getEnquiryDossier(req.params.id);
      return successResponse(res, dossier, 'Enquiry retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async assignEnquiry(req, res, next) {
    try {
      const updated = await EnquiryService.assignEnquiry(req.params.id, req.body.assignedTo, req.user?.id);
      return successResponse(res, updated, 'Enquiry assigned successfully');
    } catch (err) {
      next(err);
    }
  },

  async recordFollowUp(req, res, next) {
    try {
      const followUp = await EnquiryService.recordFollowUp(req.params.id, req.body, req.user?.id);
      return successResponse(res, followUp, 'Follow-up interaction recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async qualifyEnquiry(req, res, next) {
    try {
      const result = await EnquiryService.qualifyEnquiry(req.params.id, req.body, req.user?.id);
      return successResponse(res, result, 'Lead successfully qualified and customer profile established');
    } catch (err) {
      next(err);
    }
  },

  async disqualifyEnquiry(req, res, next) {
    try {
      const updated = await EnquiryService.disqualifyEnquiry(req.params.id, req.body.reason, req.user?.id);
      return successResponse(res, updated, 'Enquiry disqualified');
    } catch (err) {
      next(err);
    }
  },

  async mergeEnquiry(req, res, next) {
    try {
      const updated = await EnquiryService.mergeEnquiry(req.params.id, req.body, req.user?.id);
      return successResponse(res, updated, 'Duplicate enquiry merged into primary lead');
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // 3. SITE SURVEYS
  // =========================================================================
  async getAvailableTechnicians(req, res, next) {
    try {
      const { date, slot } = req.query;
      const technicians = await SurveyService.getAvailableTechnicians(date, slot);
      return successResponse(res, technicians, 'Available technicians retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async requestSurvey(req, res, next) {
    try {
      const survey = await SurveyService.requestSurvey(req.body, req.user?.id);
      return successResponse(res, survey, 'Site survey visit scheduled successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async executeSurvey(req, res, next) {
    try {
      const survey = await SurveyService.executeSurvey(req.params.id, req.body, req.user?.id);
      return successResponse(res, survey, 'Site survey executed and submitted for engineering review');
    } catch (err) {
      next(err);
    }
  },

  async reviewSurvey(req, res, next) {
    try {
      const survey = await SurveyService.reviewSurvey(req.params.id, req.body, req.user?.id);
      return successResponse(res, survey, `Site survey ${req.body.decision.toLowerCase()}ed successfully`);
    } catch (err) {
      next(err);
    }
  },

  async getSurvey(req, res, next) {
    try {
      const dossier = await SurveyService.getSurveyDossier(req.params.id);
      return successResponse(res, dossier, 'Site survey retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async listSurveys(req, res, next) {
    try {
      const surveys = await SurveyService.listSurveys(req.query);
      return successResponse(res, surveys, 'Site surveys retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // 4. PACKAGES & QUOTATIONS
  // =========================================================================
  async listPackages(req, res, next) {
    try {
      const packages = await QuotationService.getPackages();
      return successResponse(res, packages, 'Solar ready packages retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async previewBOM(req, res, next) {
    try {
      const preview = await QuotationService.previewBOM(req.body);
      return successResponse(res, preview, 'BOM derivation preview generated successfully');
    } catch (err) {
      next(err);
    }
  },

  async createQuotation(req, res, next) {
    try {
      const quote = await QuotationService.createQuotation(req.body, req.user?.id);
      return successResponse(res, quote, 'Formal solar quotation generated successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async sendQuotation(req, res, next) {
    try {
      const quote = await QuotationService.sendQuotation(req.params.id, req.user?.id);
      return successResponse(res, quote, 'Quotation dispatched to customer');
    } catch (err) {
      next(err);
    }
  },

  async getQuotation(req, res, next) {
    try {
      const dossier = await QuotationService.getQuotationDossier(req.params.id);
      return successResponse(res, dossier, 'Quotation retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async listQuotations(req, res, next) {
    try {
      const quotations = await QuotationService.listQuotations(req.query);
      return successResponse(res, quotations, 'Quotations retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getPublicQuotation(req, res, next) {
    try {
      const dossier = await QuotationService.getQuotationByToken(req.params.token);
      return successResponse(res, dossier, 'Proposal retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async acceptPublicQuotation(req, res, next) {
    try {
      const result = await QuotationService.acceptQuotation(req.params.token, req.body);
      return successResponse(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  },

  async declinePublicQuotation(req, res, next) {
    try {
      const quote = await QuotationService.declineQuotation(req.params.token, req.body);
      return successResponse(res, quote, 'Proposal decline noted. Thank you for your feedback.');
    } catch (err) {
      next(err);
    }
  },

  // =========================================================================
  // 5. ORDERS & HANDOVER
  // =========================================================================
  async createOrderFromQuote(req, res, next) {
    try {
      const quote = await QuotationService.getQuotationDossier(req.body.quotationId);
      const result = await OrderService.createFromAcceptedQuote(
        quote.quote,
        req.body.advanceRequiredPercent,
        req.user?.id
      );
      return successResponse(res, result, 'Order confirmed and project established', 201);
    } catch (err) {
      next(err);
    }
  },

  async getOrder(req, res, next) {
    try {
      const dossier = await OrderService.getOrderDossier(req.params.id);
      return successResponse(res, dossier, 'Order retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async listOrders(req, res, next) {
    try {
      const orders = await OrderService.listOrders(req.query);
      return successResponse(res, orders, 'Orders retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getHandoverPayload(req, res, next) {
    try {
      const payload = await OrderService.getHandoverPayload(req.params.orderId);
      return successResponse(res, payload, 'Operations handover payload retrieved');
    } catch (err) {
      next(err);
    }
  },
};
