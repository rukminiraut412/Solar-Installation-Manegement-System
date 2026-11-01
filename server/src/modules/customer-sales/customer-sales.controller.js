/**
 * Customer Management Controller
 * Scope: Independent Customer Management & Solar Installation Requirements Workflow
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & System Contracts
 */

import { CustomerService } from './customer.service.js';
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
  // 2. CUSTOMER INSTALLATION REQUIREMENTS & WORKFLOW
  // =========================================================================
  async saveRequirements(req, res, next) {
    try {
      const result = await CustomerService.saveRequirements(req.body, req.user);
      return successResponse(res, result, 'Installation requirements submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async getMyRequirements(req, res, next) {
    try {
      const result = await CustomerService.getMyRequirements(req.user);
      return successResponse(res, result, 'Customer installation requirements retrieved');
    } catch (err) {
      next(err);
    }
  },

  async getCustomerRequirements(req, res, next) {
    try {
      const result = await CustomerService.getCustomerRequirements(req.params.id);
      return successResponse(res, result, 'Customer installation requirements retrieved');
    } catch (err) {
      next(err);
    }
  },

  async listRequirements(req, res, next) {
    try {
      const results = await CustomerService.listRequirements(req.query);
      return successResponse(res, results, 'Installation requirements retrieved');
    } catch (err) {
      next(err);
    }
  },

  async reviewRequirements(req, res, next) {
    try {
      const result = await CustomerService.reviewRequirements(req.params.id, req.body, req.user);
      return successResponse(res, result, `Requirements ${req.body.status.toLowerCase()} successfully`);
    } catch (err) {
      next(err);
    }
  },
};
