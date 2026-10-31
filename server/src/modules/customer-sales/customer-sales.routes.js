/**
 * Customer & Sales Module Routes
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & docs/contracts/customer-sales.md
 */

import { Router } from 'express';
import { CustomerSalesController } from './customer-sales.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createEnquirySchema,
  publicEnquirySchema,
  qualifyEnquirySchema,
  assignEnquirySchema,
  enquiryFollowUpSchema,
  mergeEnquirySchema,
  requestSurveySchema,
  executeSurveySchema,
  surveyReviewSchema,
  createQuotationSchema,
  acceptQuoteSchema,
  declineQuoteSchema,
  createOrderSchema,
} from './customer-sales.validation.js';

const router = Router();

// =========================================================================
// 1. PUBLIC ENDPOINTS (No authentication required)
// =========================================================================
// Public Web Enquiry Form
router.post('/public/enquiries', validate(publicEnquirySchema), CustomerSalesController.createPublicEnquiry);

// Public Customer Quotation Viewing & Signing Portal (/portal/quotes/:token)
router.get('/public/quotations/:token', CustomerSalesController.getPublicQuotation);
router.post('/public/quotations/:token/accept', validate(acceptQuoteSchema), CustomerSalesController.acceptPublicQuotation);
router.post('/public/quotations/:token/decline', validate(declineQuoteSchema), CustomerSalesController.declinePublicQuotation);

// =========================================================================
// 2. CUSTOMER MANAGEMENT ENDPOINTS
// =========================================================================
router.post(
  '/customers',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(createCustomerSchema),
  CustomerSalesController.createCustomer
);

router.get(
  '/customers',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Support'),
  CustomerSalesController.listCustomers
);

router.get(
  '/customers/:id',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Support'),
  CustomerSalesController.getCustomer
);

router.put(
  '/customers/:id',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(updateCustomerSchema),
  CustomerSalesController.updateCustomer
);

router.get(
  '/customers/:id/timeline',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Support'),
  CustomerSalesController.getCustomerTimeline
);

// =========================================================================
// 3. ENQUIRY MANAGEMENT ENDPOINTS
// =========================================================================
router.post(
  '/enquiries',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(createEnquirySchema),
  CustomerSalesController.createEnquiry
);

router.get(
  '/enquiries',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  CustomerSalesController.listEnquiries
);

router.get(
  '/enquiries/:id',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  CustomerSalesController.getEnquiry
);

router.patch(
  '/enquiries/:id/assign',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(assignEnquirySchema),
  CustomerSalesController.assignEnquiry
);

router.post(
  '/enquiries/:id/follow-ups',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(enquiryFollowUpSchema),
  CustomerSalesController.recordFollowUp
);

router.post(
  '/enquiries/:id/qualify',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(qualifyEnquirySchema),
  CustomerSalesController.qualifyEnquiry
);

router.post(
  '/enquiries/:id/disqualify',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  CustomerSalesController.disqualifyEnquiry
);

router.post(
  '/enquiries/:id/merge',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(mergeEnquirySchema),
  CustomerSalesController.mergeEnquiry
);

// =========================================================================
// 4. SITE SURVEY MANAGEMENT ENDPOINTS
// =========================================================================
router.get(
  '/surveys/technicians/availability',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Technician'),
  CustomerSalesController.getAvailableTechnicians
);

router.post(
  '/surveys/request',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(requestSurveySchema),
  CustomerSalesController.requestSurvey
);

router.post(
  '/surveys/:id/execute',
  authenticate,
  authorize('Admin/Owner', 'Technician'),
  validate(executeSurveySchema),
  CustomerSalesController.executeSurvey
);

router.post(
  '/surveys/:id/review',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(surveyReviewSchema),
  CustomerSalesController.reviewSurvey
);

router.get(
  '/surveys/:id',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Technician'),
  CustomerSalesController.getSurvey
);

router.get(
  '/surveys',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Technician'),
  CustomerSalesController.listSurveys
);

// =========================================================================
// 5. PACKAGES & QUOTATIONS ENDPOINTS
// =========================================================================
router.get(
  '/packages',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Technician', 'Warehouse', 'Support'),
  CustomerSalesController.listPackages
);

router.post(
  '/quotations/preview-bom',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  CustomerSalesController.previewBOM
);

router.post(
  '/quotations',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(createQuotationSchema),
  CustomerSalesController.createQuotation
);

router.post(
  '/quotations/:id/send',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  CustomerSalesController.sendQuotation
);

router.get(
  '/quotations/:id',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Support'),
  CustomerSalesController.getQuotation
);

router.get(
  '/quotations',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Support'),
  CustomerSalesController.listQuotations
);

// =========================================================================
// 6. ORDERS & HANDOVER ENDPOINTS
// =========================================================================
router.post(
  '/orders/create-from-quote',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(createOrderSchema),
  CustomerSalesController.createOrderFromQuote
);

router.get(
  '/orders/:id',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Warehouse', 'Support'),
  CustomerSalesController.getOrder
);

router.get(
  '/orders',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Warehouse', 'Support'),
  CustomerSalesController.listOrders
);

router.get(
  '/handover/:orderId',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Warehouse'),
  CustomerSalesController.getHandoverPayload
);

export default router;
