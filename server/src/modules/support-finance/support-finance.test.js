import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { CasesService } from './cases.service.js';
import { TicketsService } from './tickets.service.js';
import { PaymentsService } from './payments.service.js';
import { FinanceService } from './finance.service.js';
import { DashboardsService } from './dashboards.service.js';
import { AIService } from './ai.service.js';
import { evaluateSafety, FIXED_SAFETY_NOTICE } from './safety.js';
import { ENV } from '../../config/env.js';

test('1. Safety Interceptor: Pre-Model Emergency Hazard Detection (§9.3, AC-8)', () => {
  // Test hazardous query
  const hazardInput = 'Urgent: I see smoke and bright sparks coming from the rooftop inverter junction box!';
  const scanResult = evaluateSafety(hazardInput);

  assert.equal(scanResult.isHazard, true);
  assert.equal(scanResult.recommendedPriority, 'P1');
  assert.ok(scanResult.matchedPatterns.includes('smoke'));
  assert.ok(scanResult.matchedPatterns.includes('spark'));

  // Test non-hazardous query
  const safeInput = 'Could you explain why production is lower during overcast days?';
  const safeScan = evaluateSafety(safeInput);
  assert.equal(safeScan.isHazard, false);
  assert.equal(safeScan.recommendedPriority, null);
});

test('2. Case Creation & Deterministic P1 Safety Pinning (§9.3, T-36)', () => {
  const newCase = CasesService.createCase({
    customer_id: 'cus-test-01',
    customer_name: 'Test Customer',
    description: 'There is a strong burning smell and small fire sparks near the inverter.',
    project_id: 'prj-101'
  });

  assert.equal(newCase.priority, 'P1');
  assert.equal(newCase.safety_flag, true);
  assert.equal(newCase.status, 'Escalated to Support');

  // Verify emergency message was added to case
  const detail = CasesService.getCaseDetail(newCase.id, 'Admin');
  assert.ok(detail.messages.some(m => m.body === FIXED_SAFETY_NOTICE));
});

test('3. Pre-Billing Warranty Guard: Blocking Charges While Coverage is PENDING (§7.6, T-18)', () => {
  const ticket = TicketsService.createTicket({
    case_id: 'case-test-warranty-01',
    serial_item_id: 'INV-SN-887123'
  });
  assert.equal(ticket.coverage_decision, 'PENDING');

  // Attempt to add charge while coverage is PENDING -> MUST FAIL with 422 COVERAGE_PENDING
  assert.throws(() => {
    TicketsService.addCharge(ticket.ticket_code, {
      description: 'Emergency isolation inspection',
      amount_paise: 250000
    });
  }, (err) => {
    assert.equal(err.code, 'COVERAGE_PENDING');
    assert.equal(err.status, 422);
    return true;
  });

  // Now set coverage to NOT_COVERED_PAID and verify adding charge succeeds
  const updatedTicket = TicketsService.setCoverageDecision(ticket.ticket_code, {
    decision: 'NOT_COVERED_PAID',
    reason: 'Damage caused by external grid surge exceeding surge protection',
    approver_role: 'Admin'
  });

  assert.equal(updatedTicket.coverage_decision, 'NOT_COVERED_PAID');

  const chargedItem = TicketsService.addCharge(ticket.ticket_code, {
    description: 'Field diagnostic fee',
    amount_paise: 250000
  });

  assert.equal(chargedItem.amount_paise, 250000);
});

test('4. 7-Stage Support Chain: Strict Customer Confirmation Guard Before Closure (§9.2, §9.5, AC-6)', () => {
  // 1. Customer reports issue
  const testCase = CasesService.createCase({
    customer_id: 'cus-chain-01',
    customer_name: 'Chain Demo Client',
    description: 'Inverter error code E-04 displayed on LCD panel.',
    project_id: 'prj-101'
  });

  // 2. Support confirms classification
  CasesService.updateClassification(testCase.id, {
    category: 'Major',
    priority: 'P2',
    reason: 'Inverter grid synchronisation error verified'
  });

  // 3. Admin assigns technician
  CasesService.adminDecision(testCase.id, {
    decision: 'Approve',
    assigned_technician_id: 'tech-001',
    scheduled_visit_at: new Date().toISOString(),
    reason: 'Approved for field repair'
  });

  // 4. Technician completes field work (Never closes case alone per §9.2)
  CasesService.technicianComplete(testCase.id, {
    technician_notes: 'Loose AC breaker wire retorqued.',
    technician_resolved: true,
    parts_used: ['15A Fuse']
  });

  // 5. Support reviews evidence & requests customer confirmation
  CasesService.supportReview(testCase.id, {
    accepted: true,
    notes: 'Field evidence verified. Ready for customer sign-off.'
  });

  // 6. Attempt to close case BEFORE customer confirmation -> MUST FAIL
  assert.throws(() => {
    CasesService.closeCase(testCase.id, {
      closure_notes: 'Staff attempting early closure without customer approval',
      actorRole: 'Support'
    });
  }, (err) => {
    assert.equal(err.code, 'CLOSURE_CHECKS_FAILED');
    assert.equal(err.status, 422);
    assert.ok(err.details.some(d => d.includes('Customer resolution confirmation')));
    return true;
  });

  // 7. Customer confirms resolution
  CasesService.customerConfirmation(testCase.id, {
    confirmed: true
  });

  // 8. Now closure succeeds
  const closedCase = CasesService.closeCase(testCase.id, {
    closure_notes: 'Customer verified power generation is normal. Case resolved.',
    actorRole: 'Support'
  });

  assert.equal(closedCase.status, 'Closed');
});

test('5. Customer Dispute Reopens Case & Increments Repeat Count (§9.5, T-45)', () => {
  const disputeCase = CasesService.createCase({
    customer_id: 'cus-disp-01',
    customer_name: 'Disputing Customer',
    description: 'Generation drop inquiry on rooftop system.',
    project_id: 'prj-101'
  });

  // Initial priority P3
  assert.equal(disputeCase.priority, 'P3');

  // Customer disputes
  const disputed = CasesService.customerConfirmation(disputeCase.id, {
    confirmed: false,
    dispute_notes: 'Issue still persists! Inverter shut down again after 20 minutes.'
  });

  assert.equal(disputed.status, 'Reopened');
  assert.equal(disputed.customer_confirmed, false);
  assert.equal(disputed.repeat_count, 1);
  assert.equal(disputed.priority, 'P2'); // Priority raised
});

test('6. Internal Notes Visibility Scoping: Customer Never Sees Internal Notes (§9.6, T-47)', () => {
  const c = CasesService.createCase({
    customer_id: 'cus-private-01',
    customer_name: 'Privacy Test Customer',
    description: 'General system status query',
    project_id: 'prj-101'
  });

  // Add customer visible message
  CasesService.addMessage(c.id, {
    author_id: 'usr-support',
    author_name: 'Support Team',
    author_type: 'SUPPORT',
    body: 'Hello, our team has reviewed your inquiry.',
    visibility: 'CUSTOMER'
  });

  // Add internal team note
  CasesService.addMessage(c.id, {
    author_id: 'usr-admin',
    author_name: 'Finance Admin',
    author_type: 'ADMIN',
    body: 'INTERNAL NOTE: Check customer balance on invoice INV-2026-001 before dispatching.',
    visibility: 'INTERNAL'
  });

  // Query as Customer
  const customerView = CasesService.getCaseDetail(c.id, 'Customer');
  assert.ok(customerView.messages.every(m => m.visibility !== 'INTERNAL'), 'Customer must never see internal team notes');

  // Query as Admin
  const adminView = CasesService.getCaseDetail(c.id, 'Admin');
  assert.ok(adminView.messages.some(m => m.visibility === 'INTERNAL'), 'Admin must see internal notes');
});

test('7. Razorpay Order Creation & HMAC-SHA256 Signature Verification (§17.1, §17.3, T-28)', () => {
  const idempotencyKey = 'idem-test-key-' + Date.now();
  const orderRes = PaymentsService.createPaymentRequest({
    order_id: 'ord-101',
    purpose: 'ADVANCE',
    idempotency_key: idempotencyKey
  });

  assert.equal(orderRes.isDuplicate, false);
  assert.ok(orderRes.paymentRequest.razorpay_order_id.startsWith('order_test_'));
  assert.equal(orderRes.paymentRequest.amount_paise, 6000000); // 20% of 300,000 INR

  // Idempotency: Repeating with same key returns duplicate
  const repeatRes = PaymentsService.createPaymentRequest({
    order_id: 'ord-101',
    purpose: 'ADVANCE',
    idempotency_key: idempotencyKey
  });
  assert.equal(repeatRes.isDuplicate, true);

  // Generate valid HMAC SHA256 signature
  const testPaymentId = 'pay_test_' + Date.now();
  const payloadToSign = `${orderRes.paymentRequest.razorpay_order_id}|${testPaymentId}`;
  const validSignature = crypto
    .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
    .update(payloadToSign)
    .digest('hex');

  // Verify valid signature
  const verified = PaymentsService.verifyCallbackSignature({
    payment_request_id: orderRes.paymentRequest.id,
    razorpay_order_id: orderRes.paymentRequest.razorpay_order_id,
    razorpay_payment_id: testPaymentId,
    razorpay_signature: validSignature
  });

  assert.equal(verified.success, true);
  assert.equal(verified.status, 'VERIFIED');
  assert.equal(verified.payment.amount_paise, 6000000);

  // Verify invalid signature is REJECTED
  assert.throws(() => {
    PaymentsService.verifyCallbackSignature({
      payment_request_id: orderRes.paymentRequest.id,
      razorpay_order_id: orderRes.paymentRequest.razorpay_order_id,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: 'TAMPERED_INVALID_SIGNATURE_HEX'
    });
  }, (err) => {
    assert.equal(err.code, 'INVALID_PAYMENT_SIGNATURE');
    assert.equal(err.status, 400);
    return true;
  });
});

test('8. Webhook Idempotency: Duplicate Delivery Protection (§17.4, T-29, T-30)', () => {
  const eventPayload = {
    id: 'evt_wh_unique_' + Date.now(),
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_wh_' + Date.now(),
          order_id: 'order_test_webhook',
          amount: 6000000,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  };

  const rawBody = Buffer.from(JSON.stringify(eventPayload));
  const webhookSignature = crypto
    .createHmac('sha256', ENV.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  // First webhook delivery
  const firstResult = PaymentsService.processWebhook({
    rawBody,
    signatureHeader: webhookSignature,
    eventPayload
  });
  assert.equal(firstResult.status, 'PROCESSED');

  // Duplicate webhook delivery with identical event id
  const duplicateResult = PaymentsService.processWebhook({
    rawBody,
    signatureHeader: webhookSignature,
    eventPayload
  });
  assert.equal(duplicateResult.status, 'DUPLICATE');
  assert.ok(duplicateResult.message.includes('idempotent no-op'));
});

test('9. Authoritative Reconciliation Widget: Discrepancy Must Strictly Equal Zero (§13.1, §20.1 T-24)', () => {
  const reconciliation = DashboardsService.getPaymentReconciliation();
  
  assert.equal(typeof reconciliation.dashboard_reported_paise, 'number');
  assert.equal(typeof reconciliation.sum_verified_ledger_paise, 'number');
  assert.equal(reconciliation.dashboard_reported_paise, reconciliation.sum_verified_ledger_paise);
  assert.equal(reconciliation.discrepancy_paise, 0);
  assert.equal(reconciliation.status, 'RECONCILED_EXACT');
});

test('10. Project Profitability Math: Revenue - (Material + Labor + Direct + Service) (§7.7, §20.2 AC-12)', () => {
  const pl = FinanceService.getProjectProfitability('prj-101');

  const expectedTotalCosts = 
    pl.costs.material.amount_paise + 
    pl.costs.labor.amount_paise + 
    pl.costs.other_direct.amount_paise + 
    pl.costs.service_warranty.amount_paise;

  const expectedProfit = pl.contract_revenue.amount_paise - expectedTotalCosts;

  assert.equal(pl.costs.total_costs_paise, expectedTotalCosts);
  assert.equal(pl.profitability.net_profit_paise, expectedProfit);

  // Must label costs as ACTUAL (§13.3)
  assert.equal(pl.contract_revenue.type, 'ACTUAL');
  assert.equal(pl.costs.material.type, 'ACTUAL');
  assert.equal(pl.costs.labor.type, 'ACTUAL');
  assert.equal(pl.costs.other_direct.type, 'ACTUAL');
  assert.equal(pl.costs.service_warranty.type, 'ACTUAL');
});

test('11. AI Assistance: Grounded Summaries & Dual-Panel Plain Language Warranty (§8, §16.10, T-35, T-38)', () => {
  // Grounded Summary
  const summary = AIService.summarizeEntity({ entityType: 'case', entityId: 'case-001', callerRole: 'Admin' });
  assert.ok(summary.content.includes('Inverter') || summary.content.includes('Customer'));
  assert.ok(summary.sources.length > 0);
  assert.equal(summary.label, 'Demo AI output (rule-based template)');

  // Dual-Panel Warranty
  const warranty = AIService.explainWarranty({ serialNumber: 'INV-SN-887123', callerRole: 'Customer' });
  assert.ok(warranty.system_result);
  assert.equal(warranty.system_result.status, 'WITHIN_PERIOD');
  assert.ok(warranty.explanation);
  assert.ok(warranty.explanation.includes('24-month manufacturer warranty'));
  assert.ok(warranty.sources.length > 0);

  // Missing Information Auditor
  const gaps = AIService.detectMissingInfo({ entityType: 'enquiry', fields: { phone: '+91 99999 11111' } });
  assert.ok(Array.isArray(gaps.missing));
  assert.ok(gaps.missing.some(item => item.field === 'roof_info'));

  // Safe Support Triage
  const triage = AIService.triageIssue({ description: 'My inverter is making a clicking sound' });
  assert.equal(triage.safety_flag, false);
  assert.ok(triage.sources.length > 0);

  // Hazardous Triage Interceptor
  const hazardTriage = AIService.triageIssue({ description: 'I see smoke and flame coming from battery' });
  assert.equal(hazardTriage.safety_flag, true);
  assert.equal(hazardTriage.priority, 'P1');
  assert.equal(hazardTriage.bypass_ai, true);
});
