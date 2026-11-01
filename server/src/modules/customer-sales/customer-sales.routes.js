/**
 * Customer Management Module Routes
 * Scope: Independent Customer Management & Solar Installation Requirements Workflow
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & System Contracts
 */

import { Router } from 'express';
import { CustomerSalesController } from './customer-sales.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  assignCustomerSchema,
  installationRequirementsSchema,
  reviewRequirementsSchema,
} from './customer-sales.validation.js';

const router = Router();

// =========================================================================
// 1. PUBLIC ENDPOINTS
// =========================================================================
// Public Customer Dossier View
router.get('/customers/:id/public-view', CustomerSalesController.getCustomerPublicView);

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
  authorize('Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'),
  CustomerSalesController.listCustomers
);

router.get(
  '/assignees',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  CustomerSalesController.getEligibleAssignees
);

router.get(
  '/customers/:id',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'),
  CustomerSalesController.getCustomer
);

router.post(
  '/customers/:id/assign',
  authenticate,
  authorize('Admin/Owner'),
  validate(assignCustomerSchema),
  CustomerSalesController.assignCustomer
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
  authorize('Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'),
  CustomerSalesController.getCustomerTimeline
);

// =========================================================================
// 3. CUSTOMER REQUIREMENTS & ENGINEERING WORKFLOW
// =========================================================================
router.post(
  '/requirements',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Customer'),
  validate(installationRequirementsSchema),
  CustomerSalesController.saveRequirements
);

router.get(
  '/requirements/me',
  authenticate,
  authorize('Customer', 'Admin/Owner'),
  CustomerSalesController.getMyRequirements
);

router.get(
  '/requirements',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Warehouse'),
  CustomerSalesController.listRequirements
);

router.get(
  '/customers/:id/requirements',
  authenticate,
  authorize('Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support', 'Customer'),
  CustomerSalesController.getCustomerRequirements
);

router.post(
  '/customers/:id/requirements/review',
  authenticate,
  authorize('Admin/Owner'),
  validate(reviewRequirementsSchema),
  CustomerSalesController.reviewRequirements
);

export default router;
