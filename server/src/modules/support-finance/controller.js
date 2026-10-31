/**
 * Support, Finance & AI Request Controllers
 * Validates inputs and routes to domain services
 */

import { CasesService } from './cases.service.js';
import { TicketsService } from './tickets.service.js';
import { PaymentsService } from './payments.service.js';
import { FinanceService } from './finance.service.js';
import { DashboardsService } from './dashboards.service.js';
import { AIService } from './ai.service.js';

export const SupportFinanceController = {
  // --- CASES & WORKFLOW ---
  async createCase(req, res, next) {
    try {
      const result = CasesService.createCase(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async listCases(req, res, next) {
    try {
      const role = req.user?.role || req.headers['x-role'] || 'Admin';
      const cases = CasesService.listCases({
        role,
        customer_id: req.query.customer_id,
        status: req.query.status,
        priority: req.query.priority
      });
      res.json({ success: true, count: cases.length, data: cases });
    } catch (err) {
      next(err);
    }
  },

  async getCaseDetail(req, res, next) {
    try {
      const role = req.user?.role || req.headers['x-role'] || 'Admin';
      const caseDetail = CasesService.getCaseDetail(req.params.id, role);
      res.json({ success: true, data: caseDetail });
    } catch (err) {
      next(err);
    }
  },

  async addMessage(req, res, next) {
    try {
      const message = CasesService.addMessage(req.params.id, req.body);
      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  },

  async updateClassification(req, res, next) {
    try {
      const updated = CasesService.updateClassification(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async adminDecision(req, res, next) {
    try {
      const updated = CasesService.adminDecision(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async technicianComplete(req, res, next) {
    try {
      const updated = CasesService.technicianComplete(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async supportReview(req, res, next) {
    try {
      const updated = CasesService.supportReview(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async customerConfirmation(req, res, next) {
    try {
      const updated = CasesService.customerConfirmation(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async closeCase(req, res, next) {
    try {
      const updated = CasesService.closeCase(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  // --- TICKETS & WARRANTY ---
  async checkWarrantyEligibility(req, res, next) {
    try {
      const serial = req.params.serial || req.query.serial;
      const result = TicketsService.checkWarrantyEligibility(serial, req.query.claim_date);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async createServiceTicket(req, res, next) {
    try {
      const ticket = TicketsService.createTicket(req.body);
      res.status(201).json({ success: true, data: ticket });
    } catch (err) {
      next(err);
    }
  },

  async setCoverageDecision(req, res, next) {
    try {
      const ticket = TicketsService.setCoverageDecision(req.params.id, {
        decision: req.body.decision,
        reason: req.body.reason,
        approver_role: req.user?.role || req.headers['x-role'] || 'Support'
      });
      res.json({ success: true, data: ticket });
    } catch (err) {
      next(err);
    }
  },

  async addServiceCharge(req, res, next) {
    try {
      const charge = TicketsService.addCharge(req.params.id, req.body);
      res.status(201).json({ success: true, data: charge });
    } catch (err) {
      next(err);
    }
  },

  // --- PAYMENTS & RAZORPAY ---
  async createPaymentRequest(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key;
      const result = PaymentsService.createPaymentRequest({
        order_id: req.body.order_id,
        purpose: req.body.purpose,
        idempotency_key: idempotencyKey
      });
      res.status(result.isDuplicate ? 200 : 201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async verifyPaymentSignature(req, res, next) {
    try {
      const result = PaymentsService.verifyCallbackSignature(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async handleWebhook(req, res, next) {
    try {
      const signatureHeader = req.headers['x-razorpay-signature'];
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      const result = PaymentsService.processWebhook({
        rawBody,
        signatureHeader,
        eventPayload: req.body
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getPaymentsLedger(req, res, next) {
    try {
      const ledger = PaymentsService.getLedger();
      res.json({ success: true, count: ledger.length, data: ledger });
    } catch (err) {
      next(err);
    }
  },

  async recordManualPayment(req, res, next) {
    try {
      const payment = PaymentsService.recordManualPayment(req.body);
      res.status(201).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  },

  // --- FINANCE & PROFITABILITY ---
  async listInvoices(req, res, next) {
    try {
      const invoices = FinanceService.listInvoices();
      res.json({ success: true, count: invoices.length, data: invoices });
    } catch (err) {
      next(err);
    }
  },

  async listExpenses(req, res, next) {
    try {
      const expenses = FinanceService.listExpenses(req.query.project_id);
      res.json({ success: true, count: expenses.length, data: expenses });
    } catch (err) {
      next(err);
    }
  },

  async createExpense(req, res, next) {
    try {
      const expense = FinanceService.createExpense(req.body);
      res.status(201).json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  },

  async approveExpense(req, res, next) {
    try {
      const expense = FinanceService.approveExpense(req.params.id, req.user?.id || 'usr-admin-01');
      res.json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  },

  async listTechnicianPay(req, res, next) {
    try {
      const records = FinanceService.listTechnicianPay();
      res.json({ success: true, count: records.length, data: records });
    } catch (err) {
      next(err);
    }
  },

  async getSubsidyStatus(req, res, next) {
    try {
      const status = FinanceService.getSubsidyStatus(req.params.projectId);
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  },

  async updateSubsidy(req, res, next) {
    try {
      const status = FinanceService.updateSubsidyChecklist(req.params.projectId, req.body);
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  },

  async getProjectProfitability(req, res, next) {
    try {
      const pnl = FinanceService.getProjectProfitability(req.params.projectId);
      res.json({ success: true, data: pnl });
    } catch (err) {
      next(err);
    }
  },

  // --- DASHBOARDS ---
  async getDashboard(req, res, next) {
    try {
      const role = req.params.role || req.user?.role || req.headers['x-role'] || 'Admin';
      const data = DashboardsService.getDashboardByRole(role);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getReconciliation(req, res, next) {
    try {
      const data = DashboardsService.getPaymentReconciliation();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // --- AI ASSISTANT ---
  async summarizeEntity(req, res, next) {
    try {
      const callerRole = req.user?.role || req.headers['x-role'] || 'Admin';
      const result = AIService.summarizeEntity({ ...req.body, callerRole });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async detectMissingInfo(req, res, next) {
    try {
      const result = AIService.detectMissingInfo(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async explainWarranty(req, res, next) {
    try {
      const result = AIService.explainWarranty(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async triageIssue(req, res, next) {
    try {
      const result = AIService.triageIssue(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
};
