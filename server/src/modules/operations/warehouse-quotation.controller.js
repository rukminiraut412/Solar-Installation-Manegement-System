import { pool } from '../../db/index.js';
import { WarehouseQuotationService } from './warehouse-quotation.service.js';
import { successResponse } from '../../shared/utils/response.js';

export const WarehouseQuotationController = {
  /**
   * GET /api/v1/operations/warehouse-quotations
   */
  async listQuotations(req, res, next) {
    try {
      const { status, search } = req.query;
      const quotes = await WarehouseQuotationService.listQuotations({ status, search });
      return successResponse(res, quotes, 'Quotations retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/operations/warehouse-quotations/projects-needing-quotes
   */
  async getProjectsNeedingQuotes(req, res, next) {
    try {
      const warehouseUserId = req.user?.role === 'Warehouse' ? req.user.id : null;
      const projects = await WarehouseQuotationService.getProjectsNeedingQuotes(warehouseUserId);
      return successResponse(res, projects, 'Projects needing quotation retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/operations/warehouse-quotations/suggested-bom?capacityKw=3&gridType=On-Grid
   */
  async getSuggestedBom(req, res, next) {
    try {
      const { capacityKw = 3.0, gridType = 'On-Grid' } = req.query;
      const bom = await WarehouseQuotationService.getSuggestedBom(capacityKw, gridType);
      return successResponse(res, bom, 'Suggested BOM calculated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/operations/warehouse-quotations/:id
   */
  async getQuotationById(req, res, next) {
    try {
      const quote = await WarehouseQuotationService.getQuotationById(req.params.id);
      if (req.user?.role === 'Customer') {
        const custRes = await pool.query('SELECT id FROM customers WHERE user_id = $1 LIMIT 1;', [req.user.id]);
        const customerId = custRes.rows[0]?.id;
        if (!customerId || quote?.customer_id !== customerId) {
          return res.status(403).json({ success: false, message: 'Access forbidden: You cannot view another customer\'s quotation' });
        }
      }
      return successResponse(res, quote, 'Quotation retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/operations/warehouse-quotations/customer/:customerId
   */
  async getCustomerQuotation(req, res, next) {
    try {
      let customerId = req.params.customerId;
      if (req.user?.role === 'Customer' || customerId === 'me') {
        const custRes = await pool.query('SELECT id FROM customers WHERE user_id = $1 LIMIT 1;', [req.user.id]);
        if (custRes.rows.length > 0) {
          customerId = custRes.rows[0].id;
        } else {
          return res.status(403).json({ success: false, message: 'Access forbidden: Customer account not found' });
        }
      }
      const quote = await WarehouseQuotationService.getCustomerActiveQuotation(customerId);
      return successResponse(res, quote, 'Active quotation retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/operations/warehouse-quotations/draft
   */
  async saveDraft(req, res, next) {
    try {
      const quote = await WarehouseQuotationService.saveDraftQuotation(req.body, req.user);
      return successResponse(res, quote, 'Draft quotation saved successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/operations/warehouse-quotations/:id/submit-admin
   */
  async submitToAdmin(req, res, next) {
    try {
      const quote = await WarehouseQuotationService.submitToAdmin(req.params.id, req.user);
      return successResponse(res, quote, 'Quotation submitted for Admin Approval');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/operations/warehouse-quotations/:id/admin-review
   */
  async adminReview(req, res, next) {
    try {
      const quote = await WarehouseQuotationService.adminReview(req.params.id, req.body, req.user);
      return successResponse(res, quote, `Quotation ${req.body.decision} successfully processed`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/operations/warehouse-quotations/:id/customer-action
   */
  async customerAction(req, res, next) {
    try {
      if (req.user?.role === 'Customer') {
        const quote = await WarehouseQuotationService.getQuotationById(req.params.id);
        const custRes = await pool.query('SELECT id FROM customers WHERE user_id = $1 LIMIT 1;', [req.user.id]);
        const customerId = custRes.rows[0]?.id;
        if (!customerId || quote?.customer_id !== customerId) {
          return res.status(403).json({ success: false, message: 'Access forbidden: You cannot act on another customer\'s quotation' });
        }
      }
      const quote = await WarehouseQuotationService.customerAction(req.params.id, req.body, req.user);
      return successResponse(res, quote, `Quotation ${req.body.action} successfully processed`);
    } catch (err) {
      next(err);
    }
  }
};
