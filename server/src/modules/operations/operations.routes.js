/**
 * Operations & Fulfilment Central Express Router
 * Base Path: /api/v1/operations
 * Authority: docs/contracts/operations.md
 */

import { Router } from 'express';
import { OperationsController } from './operations.controller.js';
import { WarehouseQuotationController } from './warehouse-quotation.controller.js';
import { operationsAuthenticate } from './operations.auth.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

// ==========================================
// Phase 1: Products & Inventory Catalog
// ==========================================
router.get(
  '/products',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN, ROLES.SALES),
  OperationsController.getProducts
);
router.get(
  '/products/categories',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN, ROLES.SALES),
  OperationsController.getCategories
);
router.get(
  '/products/:id',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN, ROLES.SALES),
  OperationsController.getProductById
);
router.post(
  '/products',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.createProduct
);

router.get(
  '/inventory',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.getInventorySummary
);
router.get(
  '/inventory/ledger',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.getLedgerHistory
);
router.post(
  '/inventory/grn',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.receiveGoods
);
router.post(
  '/inventory/adjust',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.adjustStock
);

// ==========================================
// Phase 2: Stock Reservations & Shortages
// ==========================================
router.post(
  '/projects/handover',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SALES),
  OperationsController.ingestProjectBom
);

router.get(
  '/projects/:projectId/bom',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN),
  OperationsController.getProjectBom
);

router.post(
  '/projects/:projectId/reserve-stock',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.reserveStock
);

router.post(
  '/projects/:projectId/release-stock',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.releaseReservation
);

router.get(
  '/shortages',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.getShortagesSummary
);

// ==========================================
// Phase 3: Serial Number Tracking & Registry
// ==========================================
router.post(
  '/serials/batch',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.registerSerials
);
router.get(
  '/serials',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.listSerials
);
router.get(
  '/serials/:serialNumber/trace',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN),
  OperationsController.getSerialTraceability
);
router.post(
  '/dispatch/:dispatchOrderId/verify-serial',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN),
  OperationsController.verifySerialForDispatch
);
router.post(
  '/serials/:serialNumber/quarantine',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN),
  OperationsController.quarantineSerial
);

// ==========================================
// Phase 2 (Cont.): Dispatch & Delivery Challan
// ==========================================
router.post(
  '/dispatch',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.createDispatchOrder
);
router.get(
  '/dispatch',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN),
  OperationsController.listDispatchOrders
);
router.post(
  '/dispatch/:id/confirm',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.confirmDispatch
);
router.post(
  '/dispatch/:id/deliver',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN),
  OperationsController.confirmDelivery
);
router.get(
  '/dispatch/:id/challan',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.getDeliveryChallan
);

// ==========================================
// Phase 4: Technician Scheduling
// ==========================================
router.get(
  '/technicians/roster',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.getTechnicianRoster
);
router.get(
  '/technicians/availability',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SALES),
  OperationsController.getTechnicianAvailability
);
router.post(
  '/installations/schedule',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SALES),
  OperationsController.scheduleCrew
);

// ==========================================
// Phase 5: Installation Job Cards & Handover
// ==========================================
router.get(
  '/installations/:id',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.TECHNICIAN),
  OperationsController.getJobCard
);
router.post(
  '/installations/:id/checkpoints',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.TECHNICIAN),
  OperationsController.updateCheckpoint
);
router.post(
  '/installations/:id/testing',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.TECHNICIAN),
  OperationsController.recordSafetyTests
);
router.post(
  '/installations/:id/photos',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.TECHNICIAN),
  OperationsController.uploadPhoto
);
router.post(
  '/installations/:id/sign-handover',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.TECHNICIAN),
  OperationsController.signCustomerHandover
);

// ==========================================
// Phase 6: Warranty Management & Support Lookup
// ==========================================
// Authoritative endpoint consumed by Member 4
router.get(
  '/warranties/:serialNumber',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SUPPORT, ROLES.TECHNICIAN),
  OperationsController.getWarrantyBySerialNumber
);
router.post(
  '/warranties/:serialNumber/activate',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SUPPORT),
  OperationsController.activateWarranty
);
router.post(
  '/warranties/claims',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.SUPPORT, ROLES.WAREHOUSE, ROLES.CUSTOMER),
  OperationsController.createClaim
);
router.get(
  '/warranties/claims',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.SUPPORT, ROLES.WAREHOUSE),
  OperationsController.listClaims
);

// ==========================================
// Phase 7: Warehouse & Admin Quotations Flow
// ==========================================
router.get(
  '/warehouse-quotations',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  WarehouseQuotationController.listQuotations
);

router.get(
  '/warehouse-quotations/projects-needing-quotes',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  WarehouseQuotationController.getProjectsNeedingQuotes
);

router.get(
  '/warehouse-quotations/suggested-bom',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  WarehouseQuotationController.getSuggestedBom
);

router.get(
  '/warehouse-quotations/customer/:customerId',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.CUSTOMER),
  WarehouseQuotationController.getCustomerQuotation
);

router.get(
  '/warehouse-quotations/:id',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.CUSTOMER),
  WarehouseQuotationController.getQuotationById
);

router.post(
  '/warehouse-quotations/draft',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  WarehouseQuotationController.saveDraft
);

router.post(
  '/warehouse-quotations/:id/submit-admin',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  WarehouseQuotationController.submitToAdmin
);

router.post(
  '/warehouse-quotations/:id/admin-review',
  operationsAuthenticate,
  authorize(ROLES.ADMIN),
  WarehouseQuotationController.adminReview
);

router.post(
  '/warehouse-quotations/:id/customer-action',
  operationsAuthenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  WarehouseQuotationController.customerAction
);

export default router;
