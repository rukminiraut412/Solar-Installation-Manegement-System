/**
 * Support, Finance & AI Router
 * Base Path: /api/v1/support-finance
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§16.5, §16.9, §16.10, §17)
 */

import { Router } from 'express';
import { SupportFinanceController } from './controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    module: 'support-finance',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ====================================================================
// 1. SUPPORT CASES & 33-TRANSITION ESCALATION CHAIN
// ====================================================================
router.post('/cases', authenticate, SupportFinanceController.createCase);
router.get('/cases', authenticate, SupportFinanceController.listCases);
router.get('/cases/:id', authenticate, SupportFinanceController.getCaseDetail);
router.post('/cases/:id/messages', authenticate, SupportFinanceController.addMessage);
router.post('/cases/:id/classification', authenticate, SupportFinanceController.updateClassification);
router.post('/cases/:id/admin-decision', authenticate, SupportFinanceController.adminDecision);
router.post('/cases/:id/technician-complete', authenticate, SupportFinanceController.technicianComplete);
router.post('/cases/:id/support-review', authenticate, SupportFinanceController.supportReview);
router.post('/cases/:id/customer-confirmation', authenticate, SupportFinanceController.customerConfirmation);
router.post('/cases/:id/close', authenticate, SupportFinanceController.closeCase);

// ====================================================================
// 2. SERVICE TICKETS & PRE-BILLING WARRANTY CHECK
// ====================================================================
router.get('/warranties/eligibility/:serial', authenticate, SupportFinanceController.checkWarrantyEligibility);
router.post('/service-tickets', authenticate, SupportFinanceController.createServiceTicket);
router.patch('/service-tickets/:id/coverage', authenticate, SupportFinanceController.setCoverageDecision);
router.post('/service-tickets/:id/charges', authenticate, SupportFinanceController.addServiceCharge);

// ====================================================================
// 3. RAZORPAY TEST PAYMENTS & WEBHOOKS
// ====================================================================
router.post('/payments/create-order', authenticate, SupportFinanceController.createPaymentRequest);
router.post('/payments/verify-signature', authenticate, SupportFinanceController.verifyPaymentSignature);
router.post('/payments/webhook', SupportFinanceController.handleWebhook); // Raw body signature verification
router.get('/payments/ledger', authenticate, SupportFinanceController.getPaymentsLedger);
router.post('/payments/manual', authenticate, SupportFinanceController.recordManualPayment);

// ====================================================================
// 4. INVOICES, EXPENSES, TIMESHEETS, SUBSIDY & P/L
// ====================================================================
router.get('/invoices', authenticate, SupportFinanceController.listInvoices);
router.get('/expenses', authenticate, SupportFinanceController.listExpenses);
router.post('/expenses', authenticate, SupportFinanceController.createExpense);
router.post('/expenses/:id/approve', authenticate, SupportFinanceController.approveExpense);
router.get('/technician-pay', authenticate, SupportFinanceController.listTechnicianPay);
router.get('/subsidy/:projectId', authenticate, SupportFinanceController.getSubsidyStatus);
router.patch('/subsidy/:projectId', authenticate, SupportFinanceController.updateSubsidy);
router.get('/profitability/:projectId', authenticate, SupportFinanceController.getProjectProfitability);

// ====================================================================
// 5. ROLE-AWARE DASHBOARDS & RECONCILIATION
// ====================================================================
router.get('/dashboards/reconciliation', authenticate, SupportFinanceController.getReconciliation);
router.get('/dashboards/:role', authenticate, SupportFinanceController.getDashboard);

// ====================================================================
// 6. SANDBOXED AI ASSISTANT (MOCK DEFAULT)
// ====================================================================
router.post('/ai/summarize', authenticate, SupportFinanceController.summarizeEntity);
router.post('/ai/missing-info', authenticate, SupportFinanceController.detectMissingInfo);
router.post('/ai/warranty-explain', authenticate, SupportFinanceController.explainWarranty);
router.post('/ai/triage', authenticate, SupportFinanceController.triageIssue);

export default router;
