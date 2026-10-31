/**
 * Operations & Fulfilment Central Express Router
 * Base Path: /api/v1/operations
 * Authority: docs/contracts/operations.md
 */

import { Router } from 'express';
import { OperationsController } from './operations.controller.js';
import { operationsAuthenticate } from './operations.auth.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

// ==========================================
// Phase 1: Products & Inventory Catalog
// ==========================================
router.get('/products', operationsAuthenticate, OperationsController.getProducts);
router.get('/products/categories', operationsAuthenticate, OperationsController.getCategories);
router.get('/products/:id', operationsAuthenticate, OperationsController.getProductById);
router.post(
  '/products',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE),
  OperationsController.createProduct
);

router.get(
  '/inventory',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN, ROLES.SALES),
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
// Handover from Member 2
router.post(
  '/projects/handover',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.SALES, ROLES.WAREHOUSE),
  OperationsController.ingestProjectBom
);

router.get(
  '/projects/:projectId/bom',
  operationsAuthenticate,
  OperationsController.getProjectBom
);

router.post(
  '/projects/:projectId/reserve-stock',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SALES),
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
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SALES),
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
  authorize(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN),
  OperationsController.listSerials
);
router.get(
  '/serials/:serialNumber/trace',
  operationsAuthenticate,
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
  OperationsController.getDeliveryChallan
);

// ==========================================
// Phase 4: Technician Scheduling
// ==========================================
router.get(
  '/technicians/roster',
  operationsAuthenticate,
  OperationsController.getTechnicianRoster
);
router.get(
  '/technicians/availability',
  operationsAuthenticate,
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
  OperationsController.createClaim
);
router.get(
  '/warranties/claims',
  operationsAuthenticate,
  authorize(ROLES.ADMIN, ROLES.SUPPORT, ROLES.WAREHOUSE),
  OperationsController.listClaims
);

export default router;
