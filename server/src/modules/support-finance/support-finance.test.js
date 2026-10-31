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
import { Repository } from './repository.js';
import { WarrantyAdapter } from './warranty.adapter.js';
import { SupportFinanceController } from './controller.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import routes from './routes.js';
import { ENV } from '../../config/env.js';

// ====================================================================
// SECTION A: BASELINE FUNCTIONALITY & WORKFLOW TESTS (MOCKED / ISOLATED)
// ====================================================================

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

test('2. Case Creation & Deterministic P1 Safety Pinning (§9.3, T-36)', async () => {
  const newCase = await CasesService.createCase({
    customer_id: 'cus-test-01',
    customer_name: 'Test Customer',
    description: 'There is a strong burning smell and small fire sparks near the inverter.',
    project_id: 'prj-101'
  });

  assert.equal(newCase.priority, 'P1');
  assert.equal(newCase.safety_flag, true);
  assert.equal(newCase.status, 'Escalated to Support');

  // Verify emergency message was added to case
  const detail = await CasesService.getCaseDetail(newCase.id, 'Admin');
  assert.ok(detail.messages.some(m => m.body === FIXED_SAFETY_NOTICE));
});

test('3. Pre-Billing Warranty Guard: Blocking Charges While Coverage is PENDING (§7.6, T-18)', async () => {
  const ticket = await TicketsService.createTicket({
    case_id: 'case-test-warranty-01',
    serial_item_id: 'INV-SN-887123'
  });
  assert.equal(ticket.coverage_decision, 'PENDING');

  // Attempt to add charge while coverage is PENDING -> MUST FAIL with 422 COVERAGE_PENDING
  await assert.rejects(async () => {
    await TicketsService.addCharge(ticket.ticket_code, {
      description: 'Emergency isolation inspection',
      amount_paise: 250000
    });
  }, (err) => {
    assert.equal(err.code, 'COVERAGE_PENDING');
    assert.equal(err.status, 422);
    return true;
  });

  // Now set coverage to NOT_COVERED_PAID and verify adding charge succeeds
  const updatedTicket = await TicketsService.setCoverageDecision(ticket.ticket_code, {
    decision: 'NOT_COVERED_PAID',
    reason: 'Damage caused by external grid surge exceeding surge protection',
    approver_role: 'Admin'
  });

  assert.equal(updatedTicket.coverage_decision, 'NOT_COVERED_PAID');

  const chargedItem = await TicketsService.addCharge(ticket.ticket_code, {
    description: 'Field diagnostic fee',
    amount_paise: 250000
  });

  assert.equal(Number(chargedItem.amount_paise), 250000);
});

test('4. 7-Stage Support Chain: Strict Customer Confirmation Guard Before Closure (§9.2, §9.5, AC-6)', async () => {
  // 1. Customer reports issue
  const testCase = await CasesService.createCase({
    customer_id: 'cus-chain-01',
    customer_name: 'Chain Demo Client',
    description: 'Inverter error code E-04 displayed on LCD panel.',
    project_id: 'prj-101'
  });

  // 2. Support confirms classification
  await CasesService.updateClassification(testCase.id, {
    category: 'Major',
    priority: 'P2',
    reason: 'Inverter grid synchronisation error verified'
  });

  // 3. Admin assigns technician
  await CasesService.adminDecision(testCase.id, {
    decision: 'Approve',
    assigned_technician_id: 'tech-001',
    scheduled_visit_at: new Date().toISOString(),
    reason: 'Approved for field repair'
  });

  // 4. Technician completes field work (Never closes case alone per §9.2)
  await CasesService.technicianComplete(testCase.id, {
    technician_notes: 'Loose AC breaker wire retorqued.',
    technician_resolved: true,
    parts_used: ['15A Fuse']
  });

  // 5. Support reviews evidence & requests customer confirmation
  await CasesService.supportReview(testCase.id, {
    accepted: true,
    notes: 'Field evidence verified. Ready for customer sign-off.'
  });

  // 6. Attempt to close case BEFORE customer confirmation -> MUST FAIL
  await assert.rejects(async () => {
    await CasesService.closeCase(testCase.id, {
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
  await CasesService.customerConfirmation(testCase.id, {
    confirmed: true
  });

  // 8. Now closure succeeds
  const closedCase = await CasesService.closeCase(testCase.id, {
    closure_notes: 'Customer verified power generation is normal. Case resolved.',
    actorRole: 'Support'
  });

  assert.equal(closedCase.status, 'Closed');
});

test('5. Customer Dispute Reopens Case & Increments Repeat Count (§9.5, T-45)', async () => {
  const disputeCase = await CasesService.createCase({
    customer_id: 'cus-disp-01',
    customer_name: 'Disputing Customer',
    description: 'Generation drop inquiry on rooftop system.',
    project_id: 'prj-101'
  });

  // Initial priority P3
  assert.equal(disputeCase.priority, 'P3');

  // Customer disputes
  const disputed = await CasesService.customerConfirmation(disputeCase.id, {
    confirmed: false,
    dispute_notes: 'Issue still persists! Inverter shut down again after 20 minutes.'
  });

  assert.equal(disputed.status, 'Reopened');
  assert.equal(disputed.customer_confirmed, false);
  assert.equal(disputed.repeat_count, 1);
  assert.equal(disputed.priority, 'P2'); // Priority raised
});

test('6. Internal Notes Visibility Scoping: Customer Never Sees Internal Notes (§9.6, T-47)', async () => {
  const c = await CasesService.createCase({
    customer_id: 'cus-private-01',
    customer_name: 'Privacy Test Customer',
    description: 'General system status query',
    project_id: 'prj-101'
  });

  // Add customer visible message
  await CasesService.addMessage(c.id, {
    author_id: 'usr-support',
    author_name: 'Support Team',
    author_type: 'SUPPORT',
    body: 'Hello, our team has reviewed your inquiry.',
    visibility: 'CUSTOMER'
  });

  // Add internal team note
  await CasesService.addMessage(c.id, {
    author_id: 'usr-admin',
    author_name: 'Finance Admin',
    author_type: 'ADMIN',
    body: 'INTERNAL NOTE: Check customer balance on invoice INV-2026-001 before dispatching.',
    visibility: 'INTERNAL'
  });

  // Query as Customer
  const customerView = await CasesService.getCaseDetail(c.id, 'Customer');
  assert.ok(customerView.messages.every(m => m.visibility !== 'INTERNAL'), 'Customer must never see internal team notes');

  // Query as Admin
  const adminView = await CasesService.getCaseDetail(c.id, 'Admin');
  assert.ok(adminView.messages.some(m => m.visibility === 'INTERNAL'), 'Admin must see internal notes');
});

test('7. Razorpay Order Creation & HMAC-SHA256 Signature Verification (§17.1, §17.3, T-28)', async () => {
  const idempotencyKey = 'idem-test-key-' + Date.now();
  const orderRes = await PaymentsService.createPaymentRequest({
    order_id: 'ord-101',
    purpose: 'ADVANCE',
    idempotency_key: idempotencyKey
  });

  assert.equal(orderRes.isDuplicate, false);
  assert.ok(orderRes.paymentRequest.razorpay_order_id.startsWith('order_test_'));
  assert.equal(Number(orderRes.paymentRequest.amount_paise), 6000000); // 20% of 300,000 INR

  // Idempotency: Repeating with same key returns duplicate
  const repeatRes = await PaymentsService.createPaymentRequest({
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
  const verified = await PaymentsService.verifyCallbackSignature({
    payment_request_id: orderRes.paymentRequest.id,
    razorpay_order_id: orderRes.paymentRequest.razorpay_order_id,
    razorpay_payment_id: testPaymentId,
    razorpay_signature: validSignature
  });

  assert.equal(verified.success, true);
  assert.equal(verified.status, 'VERIFIED');
  assert.equal(Number(verified.payment.amount_paise), 6000000);

  // Verify invalid signature is REJECTED
  await assert.rejects(async () => {
    await PaymentsService.verifyCallbackSignature({
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

test('8. Webhook Idempotency: Duplicate Delivery Protection (§17.4, T-29, T-30)', async () => {
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
  const firstResult = await PaymentsService.processWebhook({
    rawBody,
    signatureHeader: webhookSignature,
    eventPayload
  });
  assert.equal(firstResult.status, 'PROCESSED');

  // Duplicate webhook delivery with identical event id
  const duplicateResult = await PaymentsService.processWebhook({
    rawBody,
    signatureHeader: webhookSignature,
    eventPayload
  });
  assert.equal(duplicateResult.status, 'DUPLICATE');
  assert.ok(duplicateResult.message.includes('idempotent no-op'));
});

test('9. Authoritative Reconciliation Widget: Discrepancy Must Strictly Equal Zero (§13.1, §20.1 T-24)', async () => {
  const reconciliation = await DashboardsService.getPaymentReconciliation();
  
  assert.equal(typeof reconciliation.dashboard_reported_paise, 'number');
  assert.equal(typeof reconciliation.sum_verified_ledger_paise, 'number');
  assert.equal(reconciliation.dashboard_reported_paise, reconciliation.sum_verified_ledger_paise);
  assert.equal(reconciliation.discrepancy_paise, 0);
  assert.equal(reconciliation.status, 'RECONCILED_EXACT');
});

test('10. Project Profitability Math: Revenue - (Material + Labor + Direct + Service) (§7.7, §20.2 AC-12)', async () => {
  const pl = await FinanceService.getProjectProfitability('prj-101');

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

test('11. AI Assistance: Grounded Summaries & Dual-Panel Plain Language Warranty (§8, §16.10, T-35, T-38)', async () => {
  // Grounded Summary
  const summary = await AIService.summarizeEntity({ entityType: 'case', entityId: 'case-001', callerRole: 'Admin' });
  assert.ok(summary.content.includes('Inverter') || summary.content.includes('Customer'));
  assert.ok(summary.sources.length > 0);
  assert.equal(summary.label, 'Demo AI output (rule-based template)');

  // Dual-Panel Warranty
  const warranty = await AIService.explainWarranty({ serialNumber: 'INV-SN-887123', callerRole: 'Customer' });
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
  const triage = await AIService.triageIssue({ description: 'My inverter is making a clicking sound' });
  assert.equal(triage.safety_flag, false);
  assert.ok(triage.sources.length > 0);

  // Hazardous Triage Interceptor
  const hazardTriage = await AIService.triageIssue({ description: 'I see smoke and flame coming from battery' });
  assert.equal(hazardTriage.safety_flag, true);
  assert.equal(hazardTriage.priority, 'P1');
  assert.equal(hazardTriage.bypass_ai, true);
});

test('12. Database Repository Layer & Connectivity Probe (§7.6, §103_support_finance.sql)', async () => {
  const probe = await Repository.checkDatabaseHealth();
  assert.equal(typeof probe.isLive, 'boolean');

  // Verify Repository methods execute without throwing in test mode
  const cases = await Repository.listCases({ role: 'Admin' });
  assert.ok(Array.isArray(cases));

  const invoices = await Repository.listInvoices();
  assert.ok(Array.isArray(invoices));
  assert.ok(invoices.every(inv => typeof inv.total_paise === 'number'));

  const payments = await Repository.listVerifiedPayments();
  assert.ok(Array.isArray(payments));
});

test('13. Operations Warranty Adapter Contract Interface (§7.5, §20.1 T-19)', async () => {
  const res = await WarrantyAdapter.checkEligibility('INV-SN-887123');
  assert.equal(res.status, 'WITHIN_PERIOD');
  assert.ok(res.remainingDays > 0);
  assert.ok(res.record);
  assert.equal(res.record.duration_months, 24);

  // Invalid serial lookup returns NO_RECORD
  const missingRes = await WarrantyAdapter.checkEligibility('NON_EXISTENT_SERIAL_99999');
  assert.equal(missingRes.status, 'NO_RECORD');
});

test('14. Route Harmonization: Verify Router Exports All Bound Endpoints', () => {
  assert.ok(routes);
  assert.equal(typeof routes, 'function'); // Express Router function
  assert.ok(routes.stack.length >= 25, 'Harmonized router must export all bound endpoints');
});

// ====================================================================
// SECTION B: SECURITY HARDENING & INTEGRATION READINESS TESTS (AUDIT PHASE 8)
// ====================================================================

test('15. Security: Production Mode Prohibits Silent In-Memory DB Fallback', async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';

    // In production mode, attempting to write without a live PostgreSQL connection MUST fail loudly
    await assert.rejects(async () => {
      await Repository.createCase({
        id: `case-prod-fail-${Date.now()}`,
        case_code: 'CAS-PROD-999',
        customer_id: 'cus-prod',
        description: 'Testing strict fail-fast in production'
      });
    }, (err) => {
      assert.equal(err.code, 'DATABASE_PERSISTENCE_ERROR');
      assert.equal(err.statusCode, 500);
      assert.ok(err.message.includes('In-memory fallback is strictly prohibited in production mode'));
      return true;
    });
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('16. Security: Production Mode Prohibits In-Memory Warranty Fallback', async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';

    // In production mode, if Operations DB is offline, it must return UNAVAILABLE rather than mock fixture
    const res = await WarrantyAdapter.checkEligibility('INV-SN-887123');
    assert.equal(res.status, 'UNAVAILABLE');
    assert.equal(res.isAuthoritativeDB, false);
    assert.ok(res.message.includes('Live Operations database connection required'));
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('17. Security: Payment Tampering & Cryptographic Rejection', async () => {
  // Test 1: Webhook with forged/tampered signature is rejected
  const payload = { event: 'payment.captured', id: 'evt-tamper-1' };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const forgedSig = crypto.createHmac('sha256', 'wrong-attacker-secret').update(rawBody).digest('hex');

  await assert.rejects(async () => {
    await PaymentsService.processWebhook({
      rawBody,
      signatureHeader: forgedSig,
      eventPayload: payload
    });
  }, (err) => {
    assert.equal(err.code, 'INVALID_WEBHOOK_SIGNATURE');
    assert.equal(err.status, 400);
    return true;
  });

  // Test 2: Webhook with missing signature is rejected
  await assert.rejects(async () => {
    await PaymentsService.processWebhook({
      rawBody,
      signatureHeader: null,
      eventPayload: payload
    });
  }, (err) => {
    assert.equal(err.code, 'INVALID_WEBHOOK_SIGNATURE');
    assert.equal(err.status, 400);
    return true;
  });

  // Test 3: Missing parameters on callback verification
  await assert.rejects(async () => {
    await PaymentsService.verifyCallbackSignature({
      payment_request_id: 'pr-any',
      razorpay_order_id: 'ord-any',
      razorpay_payment_id: null,
      razorpay_signature: null
    });
  }, (err) => {
    assert.equal(err.code, 'INVALID_PAYMENT_SIGNATURE');
    assert.equal(err.status, 400);
    return true;
  });
});

test('18. Security: Webhook Requires Valid Signature Header', async () => {
  // Test controller rejection when x-razorpay-signature is missing
  const fakeReq = {
    headers: {},
    body: { id: 'evt-test-missing-sig' }
  };
  let capturedStatus = null;
  let capturedBody = null;
  const fakeRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(data) {
      capturedBody = data;
      return this;
    }
  };

  await SupportFinanceController.handleWebhook(fakeReq, fakeRes, () => {});
  assert.equal(capturedStatus, 400);
  assert.equal(capturedBody?.error?.code, 'INVALID_WEBHOOK_SIGNATURE');
});

test('19. Security: RBAC Enforcement with requireRole Middleware', () => {
  const adminGuard = requireRole(['Admin']);

  // Case 1: Unauthorized user (no req.user)
  const reqUnauth = {};
  let status1 = null;
  const res1 = {
    status(c) { status1 = c; return this; },
    json() { return this; }
  };
  adminGuard(reqUnauth, res1, () => {});
  assert.equal(status1, 401);

  // Case 2: Forbidden role (Customer trying to access Admin action)
  const reqCustomer = { user: { id: 'c-01', role: 'Customer' } };
  let status2 = null;
  const res2 = {
    status(c) { status2 = c; return this; },
    json() { return this; }
  };
  adminGuard(reqCustomer, res2, () => {});
  assert.equal(status2, 403);

  // Case 3: Authorized Admin
  const reqAdmin = { user: { id: 'a-01', role: 'Admin' } };
  let nextCalled = false;
  adminGuard(reqAdmin, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('20. Security: AI Safety Non-Commitment and Mutation Barrier', async () => {
  // Verify AIService exposes zero mutation methods
  assert.equal(typeof AIService.approvePayment, 'undefined');
  assert.equal(typeof AIService.changeStock, 'undefined');
  assert.equal(typeof AIService.decideWarrantyCoverage, 'undefined');
  assert.equal(typeof AIService.closeCase, 'undefined');

  // Verify Warranty Explanation strictly defers final coverage to human technical staff
  const explanation = await AIService.explainWarranty({ serialNumber: 'INV-SN-887123' });
  assert.ok(explanation.explanation.includes('final coverage is confirmed upon technical review by Support'));
});

test('21. Cross-Module RBAC: Member 1 "Admin/Owner" Role Interoperability', async () => {
  // Test 1: Admin/Owner passes requireRole for Admin endpoints
  const adminOwnerGuard = requireRole(['Admin', 'Admin/Owner']);
  const reqAdminOwner = { user: { id: 'usr-admin-owner-01', role: 'Admin/Owner' } };
  let authorized = false;
  adminOwnerGuard(reqAdminOwner, {}, () => { authorized = true; });
  assert.equal(authorized, true, 'Admin/Owner role must be recognized across administrative guards');

  // Test 2: Goodwill waiver authorized by Admin/Owner
  const ticket = await TicketsService.createTicket({
    case_id: 'case-test-admin-owner',
    serial_item_id: 'INV-SN-887123'
  });
  const goodwillResult = await TicketsService.setCoverageDecision(ticket.ticket_code, {
    decision: 'GOODWILL',
    reason: 'Executive goodwill concession',
    approver_role: 'Admin/Owner'
  });
  assert.equal(goodwillResult.coverage_decision, 'GOODWILL');
});

test('22. Cross-Module Contract: Operations Warranty Adapter Schema Alignment (docs/contracts/operations.md)', async () => {
  const result = await WarrantyAdapter.checkEligibility('INV-SN-887123');

  // Verify Member 3 Operations Contract properties (§10.3)
  assert.ok(result.record, 'Warranty record must be populated');
  assert.equal(result.status, 'WITHIN_PERIOD');
  assert.equal(typeof result.remainingDays, 'number');
  assert.equal(typeof result.remainingMonths, 'number');
  assert.equal(result.record.serialNumber, 'INV-SN-887123');
  assert.equal(result.record.productName, 'SunGrow 3.3 kW String Inverter');
  assert.equal(result.record.durationMonths, 24);
  assert.ok(result.record.startDate);
  assert.ok(result.record.endDate);
  assert.equal(typeof result.isAuthoritativeDB, 'boolean');

  assert.equal(result.record.serial_number, 'INV-SN-887123');
  assert.equal(result.record.product_name, 'SunGrow 3.3 kW String Inverter');
  assert.equal(result.record.duration_months, 24);
});

test('23. RBAC & Unauthorized Access: Enforcement of Approved Roles and Rejection of Unauthorized/Invented Roles', async () => {
  const adminOwnerGuard = requireRole(['Admin/Owner', 'Admin']);

  // Case 1: Unauthenticated request (no req.user) must receive 401
  const reqUnauth = {};
  let statusCode = null;
  let errorPayload = null;
  const resUnauth = {
    status(code) { statusCode = code; return this; },
    json(data) { errorPayload = data; }
  };
  adminOwnerGuard(reqUnauth, resUnauth, () => { assert.fail('Should not call next for unauthenticated request'); });
  assert.equal(statusCode, 401);
  assert.equal(errorPayload?.error?.code, 'UNAUTHORIZED');

  // Case 2: Unauthorized internal roles (Technician, Support, Sales) must receive 403 for Admin/Owner actions
  const unauthorizedRoles = ['Technician', 'Support', 'Sales', 'Finance', 'Customer'];
  for (const role of unauthorizedRoles) {
    let forbiddenCode = null;
    let forbiddenPayload = null;
    const reqRole = { user: { id: `usr-${role}`, role } };
    const resRole = {
      status(code) { forbiddenCode = code; return this; },
      json(data) { forbiddenPayload = data; }
    };
    adminOwnerGuard(reqRole, resRole, () => { assert.fail(`Should not call next for unauthorized role: ${role}`); });
    assert.equal(forbiddenCode, 403, `Role ${role} must be rejected with 403 Forbidden on Admin/Owner endpoints`);
    assert.equal(forbiddenPayload?.error?.code, 'FORBIDDEN');
  }

  // Case 3: Approved Admin/Owner role must be permitted
  let nextCalled = false;
  const reqApproved = { user: { id: 'usr-admin-1', role: 'Admin/Owner' } };
  adminOwnerGuard(reqApproved, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true, 'Admin/Owner role must be allowed');
});

test('24. Warranty Integration: Sole Authoritative Table serial_items & Missing DB Table Handling', async () => {
  // Authoritative table verification:
  // In production mode (or when DB tables are absent), WarrantyAdapter must never fabricate coverage
  const origNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    
    // Look up a serial that is not in any live DB (or when DB connection fails/tables missing)
    const result = await WarrantyAdapter.checkEligibility('NONEXISTENT-OR-OFFLINE-SERIAL-999');
    
    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.isAuthoritativeDB, false);
    assert.equal(result.record, null);
    assert.ok(result.message.includes('Authoritative warranty record'));
    assert.ok(result.message.includes('unavailable'));
  } finally {
    process.env.NODE_ENV = origNodeEnv;
  }
});

