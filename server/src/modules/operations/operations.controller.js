/**
 * Operations & Fulfilment Controller
 * Handles HTTP requests, parameter extraction, and standardized response generation
 * Authority: docs/contracts/operations.md
 */

import { ProductsService } from './products.service.js';
import { InventoryService } from './inventory.service.js';
import { ReservationsService } from './reservations.service.js';
import { SerialsService } from './serials.service.js';
import { DispatchService } from './dispatch.service.js';
import { TechniciansService } from './technicians.service.js';
import { InstallationsService } from './installations.service.js';
import { WarrantiesService } from './warranties.service.js';
import { successResponse, errorResponse } from '../../shared/utils/response.js';
import { AppError } from '../../shared/errors/AppError.js';

function handleControllerError(res, next, err) {
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.code, err.details);
  }
  const statusCode = err.statusCode || err.status;
  if (statusCode) {
    const defaultCode =
      statusCode === 404 ? 'NOT_FOUND' :
      statusCode === 403 ? 'FORBIDDEN' :
      statusCode === 409 ? 'CONFLICT' :
      statusCode === 422 ? 'VALIDATION_ERROR' : 'BAD_REQUEST';
    return errorResponse(
      res,
      err.message || 'Operation failed',
      statusCode,
      err.code || defaultCode,
      err.details || null
    );
  }
  next(err);
}

export const OperationsController = {
  // ==========================================
  // Phase 1: Products & Inventory
  // ==========================================
  async getProducts(req, res, next) {
    try {
      const products = await ProductsService.getAllProducts(req.query);
      return successResponse(res, products, 'Products retrieved successfully');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getProductById(req, res, next) {
    try {
      const product = await ProductsService.getProductById(req.params.id);
      if (!product) {
        return errorResponse(res, `Product not found: ${req.params.id}`, 404, 'NOT_FOUND');
      }
      return successResponse(res, product, 'Product details retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getCategories(req, res, next) {
    try {
      const categories = await ProductsService.getCategories();
      return successResponse(res, categories, 'Categories retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async createProduct(req, res, next) {
    try {
      const product = await ProductsService.createProduct({
        ...req.body,
        userId: req.user?.id || 'system'
      });
      return successResponse(res, product, 'Product created successfully', 201);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getInventorySummary(req, res, next) {
    try {
      const summary = await InventoryService.getInventorySummary();
      return successResponse(res, summary, 'Warehouse inventory summary retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getLedgerHistory(req, res, next) {
    try {
      const ledger = await InventoryService.getLedgerHistory(req.query);
      return successResponse(res, ledger, 'Inventory ledger history retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async receiveGoods(req, res, next) {
    try {
      const grn = await InventoryService.receiveGoods({
        ...req.body,
        userId: req.user?.id || 'system'
      });
      return successResponse(res, grn, 'Goods received and inventory balance updated', 201);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async adjustStock(req, res, next) {
    try {
      const result = await InventoryService.adjustStock({
        ...req.body,
        user: req.user
      });
      return successResponse(res, result, 'Inventory adjustment processed');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  // ==========================================
  // Phase 2: Stock Reservation & Shortages
  // ==========================================
  async ingestProjectBom(req, res, next) {
    try {
      const result = await ReservationsService.ingestProjectBom({
        ...req.body,
        userId: req.user?.id || 'system'
      });
      const statusCode = result.status === 'ALREADY_INITIALIZED' ? 200 : 201;
      return successResponse(res, result, result.message, statusCode);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getProjectBom(req, res, next) {
    try {
      const items = await ReservationsService.getProjectBom(req.params.projectId);
      return successResponse(res, items, 'Project BOM items retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async reserveStock(req, res, next) {
    try {
      const result = await ReservationsService.reserveStock({
        projectId: req.params.projectId || req.body.projectId,
        orderId: req.body.orderId,
        userId: req.user?.id || 'system'
      });
      return successResponse(res, result, result.message, 200);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async releaseReservation(req, res, next) {
    try {
      const result = await ReservationsService.releaseReservation({
        projectId: req.params.projectId,
        userId: req.user?.id || 'system'
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getShortagesSummary(req, res, next) {
    try {
      const shortages = await ReservationsService.getShortagesSummary();
      return successResponse(res, shortages, 'Unfulfilled BOM component shortages retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  // ==========================================
  // Phase 3: Serial Number Tracking
  // ==========================================
  async registerSerials(req, res, next) {
    try {
      const result = await SerialsService.registerSerials({
        ...req.body,
        userId: req.user?.id || 'system'
      });
      return successResponse(res, result, 'Serial numbers registered into registry', 201);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async listSerials(req, res, next) {
    try {
      const serials = await SerialsService.listSerials(req.query);
      return successResponse(res, serials, 'Serial items retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getSerialTraceability(req, res, next) {
    try {
      const dossier = await SerialsService.getSerialTraceability(req.params.serialNumber);
      return successResponse(res, dossier, '360-degree serial traceability dossier');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async verifySerialForDispatch(req, res, next) {
    try {
      const result = await SerialsService.verifySerialForDispatch({
        dispatchOrderId: req.params.dispatchOrderId || req.body.dispatchOrderId,
        serialNumber: req.body.serialNumber,
        userId: req.user?.id || 'system'
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async quarantineSerial(req, res, next) {
    try {
      const result = await SerialsService.quarantineSerial({
        serialNumber: req.params.serialNumber || req.body.serialNumber,
        reason: req.body.reason,
        newStatus: req.body.newStatus,
        userId: req.user?.id || 'system'
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  // ==========================================
  // Phase 2 (Cont.): Dispatch & Delivery
  // ==========================================
  async createDispatchOrder(req, res, next) {
    try {
      const dispatch = await DispatchService.createDispatchOrder({
        ...req.body,
        user: req.user
      });
      return successResponse(res, dispatch, 'Dispatch order created and ready for packing', 201);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async confirmDispatch(req, res, next) {
    try {
      const result = await DispatchService.confirmDispatch({
        dispatchOrderId: req.params.id,
        user: req.user
      });
      return successResponse(res, result, 'Dispatch verified and confirmed. Goods en route to site.');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async confirmDelivery(req, res, next) {
    try {
      const result = await DispatchService.confirmDelivery({
        dispatchOrderId: req.params.id,
        recipientName: req.body.recipientName,
        user: req.user
      });
      return successResponse(res, result, 'On-site delivery confirmed. Warranties auto-activated.');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getDeliveryChallan(req, res, next) {
    try {
      const challan = await DispatchService.generateDeliveryChallan(req.params.id);
      return successResponse(res, challan, 'Delivery challan generated');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async listDispatchOrders(req, res, next) {
    try {
      const orders = await DispatchService.listDispatchOrders(req.query);
      return successResponse(res, orders, 'Dispatch orders retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  // ==========================================
  // Phase 4: Technician Scheduling
  // ==========================================
  async getTechnicianRoster(req, res, next) {
    try {
      const roster = await TechniciansService.getRoster(req.query);
      return successResponse(res, roster, 'Technician roster retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async getTechnicianAvailability(req, res, next) {
    try {
      const availability = await TechniciansService.getAvailability({
        date: req.query.date,
        slot: req.query.slot,
        skill: req.query.skill
      });
      return successResponse(res, availability, 'Technician availability calculated');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async scheduleCrew(req, res, next) {
    try {
      const result = await TechniciansService.scheduleCrew({
        ...req.body,
        user: req.user
      });
      return successResponse(res, result, result.message, 201);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  // ==========================================
  // Phase 5: Installation Job Cards
  // ==========================================
  async getJobCard(req, res, next) {
    try {
      const jobCard = await InstallationsService.getJobCard(req.params.id);
      return successResponse(res, jobCard, 'Installation job card retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async updateCheckpoint(req, res, next) {
    try {
      const result = await InstallationsService.updateCheckpoint({
        jobId: req.params.id,
        milestoneName: req.body.milestoneName,
        notes: req.body.notes,
        user: req.user
      });
      return successResponse(res, result, 'Milestone checkpoint updated');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async recordSafetyTests(req, res, next) {
    try {
      const result = await InstallationsService.recordSafetyTests({
        jobId: req.params.id,
        ...req.body,
        user: req.user
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async uploadPhoto(req, res, next) {
    try {
      const result = await InstallationsService.uploadPhoto({
        jobId: req.params.id,
        ...req.body,
        user: req.user
      });
      return successResponse(res, result, 'Installation site photo recorded');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async signCustomerHandover(req, res, next) {
    try {
      const result = await InstallationsService.signCustomerHandover({
        jobId: req.params.id,
        ...req.body,
        user: req.user
      });
      return successResponse(res, result, result.message);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  // ==========================================
  // Phase 6: Warranty Management
  // ==========================================
  async getWarrantyBySerialNumber(req, res, next) {
    try {
      const warranty = await WarrantiesService.getWarrantyBySerialNumber(req.params.serialNumber);
      return successResponse(res, warranty, 'Warranty details retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async activateWarranty(req, res, next) {
    try {
      const record = await WarrantiesService.activateWarranty({
        ...req.body,
        serialNumber: req.params.serialNumber || req.body.serialNumber,
        user: req.user
      });
      return successResponse(res, record, 'Warranty record activated');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async createClaim(req, res, next) {
    try {
      const claim = await WarrantiesService.createClaim({
        ...req.body,
        user: req.user
      });
      return successResponse(res, claim, 'Warranty claim logged', 201);
    } catch (err) {
      handleControllerError(res, next, err);
    }
  },

  async listClaims(req, res, next) {
    try {
      const claims = await WarrantiesService.listClaims(req.query);
      return successResponse(res, claims, 'Warranty claims retrieved');
    } catch (err) {
      handleControllerError(res, next, err);
    }
  }
};
