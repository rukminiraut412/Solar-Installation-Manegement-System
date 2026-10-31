/**
 * Support, Finance & AI Router
 * Base Path: /api/v1/support-finance
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§16.5, §16.9, §16.10, §17)
 *
 * Implements strict RBAC route guards using shared requireRole middleware.
 */

import { Router } from 'express';
import { SupportFinanceController } from './controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

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

// Classification
router.post('/cases/:id/classification', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.updateClassification);
router.patch('/cases/:id/classification', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.updateClassification);

// Admin Decision & Technician Assignment
router.post('/cases/:id/admin-decision', authenticate, requireRole(['Admin']), SupportFinanceController.adminDecision);
router.post('/cases/:id/assign', authenticate, requireRole(['Admin']), SupportFinanceController.assignTechnician);

// Technician Field Work Submission
router.post('/cases/:id/technician-complete', authenticate, requireRole(['Admin', 'Technician']), SupportFinanceController.technicianComplete);

// Support Review
router.post('/cases/:id/support-review', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.supportReview);

// Customer Confirmation / Dispute
router.post('/cases/:id/customer-confirmation', authenticate, requireRole(['Admin', 'Customer']), SupportFinanceController.customerConfirmation);

// Case Closure Gate
router.post('/cases/:id/close', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.closeCase);

// ====================================================================
// 2. SERVICE TICKETS & PRE-BILLING WARRANTY CHECK
// ====================================================================
router.get('/tickets/by-case/:caseId', authenticate, SupportFinanceController.getTicketByCaseId);
router.get('/service-tickets/case/:caseId', authenticate, SupportFinanceController.getTicketByCaseId);

router.get('/warranties/eligibility/:serial', authenticate, SupportFinanceController.checkWarrantyEligibility);
router.get('/tickets/:id/warranty-lookup', authenticate, SupportFinanceController.checkWarrantyEligibility);

router.post('/service-tickets', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.createServiceTicket);
router.patch('/service-tickets/:id/coverage', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.setCoverageDecision);
router.patch('/tickets/:id/coverage-decision', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.setCoverageDecision);

router.post('/service-tickets/:id/charges', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.addServiceCharge);
router.post('/tickets/:id/charges', authenticate, requireRole(['Admin', 'Support']), SupportFinanceController.addServiceCharge);

// ====================================================================
// 3. RAZORPAY TEST PAYMENTS & WEBHOOKS
// ====================================================================
router.get('/payments/requests', authenticate, SupportFinanceController.getPaymentRequests);

router.post('/payments/create-order', authenticate, SupportFinanceController.createPaymentRequest);
router.post('/payments/orders', authenticate, SupportFinanceController.createPaymentRequest);

router.post('/payments/verify-signature', authenticate, SupportFinanceController.verifyPaymentSignature);
router.post('/payments/verify', authenticate, SupportFinanceController.verifyPaymentSignature);

// Webhook endpoint (authenticated via cryptographic HMAC-SHA256 signature header, not JWT session)
router.post('/payments/webhook', SupportFinanceController.handleWebhook);
router.post('/payments/simulate-webhook', SupportFinanceController.handleWebhook);

router.get('/payments/ledger', authenticate, SupportFinanceController.getPaymentsLedger);
router.get('/payments', authenticate, SupportFinanceController.getPaymentsLedger);

router.post('/payments/manual', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.recordManualPayment);
router.post('/payments/offline', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.recordManualPayment);

// ====================================================================
// 4. INVOICES, EXPENSES, TIMESHEETS, SUBSIDY & P/L
// ====================================================================
router.get('/invoices', authenticate, SupportFinanceController.listInvoices);
router.get('/finance/invoices', authenticate, SupportFinanceController.listInvoices);

router.get('/expenses', authenticate, SupportFinanceController.listExpenses);
router.get('/finance/expenses', authenticate, SupportFinanceController.listExpenses);

router.post('/expenses', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.createExpense);
router.post('/finance/expenses', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.createExpense);

router.post('/expenses/:id/approve', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.approveExpense);
router.patch('/finance/expenses/:id/review', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.approveExpense);

router.get('/technician-pay', authenticate, SupportFinanceController.listTechnicianPay);
router.get('/finance/technician-pay', authenticate, SupportFinanceController.listTechnicianPay);

router.get('/subsidy/:projectId', authenticate, SupportFinanceController.getSubsidyStatus);
router.get('/finance/subsidies', authenticate, SupportFinanceController.getSubsidyStatus);

router.patch('/subsidy/:projectId', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.updateSubsidy);
router.patch('/finance/subsidies/:projectId/checklist', authenticate, requireRole(['Admin', 'Finance']), SupportFinanceController.updateSubsidy);

router.get('/profitability/:projectId', authenticate, SupportFinanceController.getProjectProfitability);
router.get('/finance/project-profitability/:projectId', authenticate, SupportFinanceController.getProjectProfitability);

// ====================================================================
// 5. ROLE-AWARE DASHBOARDS & RECONCILIATION
// ====================================================================
router.get('/dashboards/reconciliation', authenticate, SupportFinanceController.getReconciliation);
router.post('/dashboards/reconcile', authenticate, SupportFinanceController.getReconciliation);

router.get('/dashboards/metrics', authenticate, SupportFinanceController.getDashboard);
router.get('/dashboards/:role', authenticate, SupportFinanceController.getDashboard);

// ====================================================================
// 6. SANDBOXED AI ASSISTANT (MOCK DEFAULT)
// ====================================================================
router.post('/ai/summarize', authenticate, SupportFinanceController.summarizeEntity);
router.post('/ai/missing-info', authenticate, SupportFinanceController.detectMissingInfo);

router.post('/ai/warranty-explain', authenticate, SupportFinanceController.explainWarranty);
router.post('/ai/explain-warranty', authenticate, SupportFinanceController.explainWarranty);

router.post('/ai/triage', authenticate, SupportFinanceController.triageIssue);
router.get('/ai/logs', authenticate, SupportFinanceController.getAILogs);

export default router;
