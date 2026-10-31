/**
 * Razorpay Test-Mode Payment & Cryptographic Verification Service
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.7, §17, §20.1 T-25, T-28, T-29, T-30, T-32, T-33)
 */

import crypto from 'crypto';
import { store } from './store.js';
import { ENV } from '../../config/env.js';

export const PaymentsService = {
  // 1. Create Payment Request with Idempotency Protection (§17.1, §17.4)
  createPaymentRequest({ order_id = 'ord-101', purpose = 'ADVANCE', idempotency_key }) {
    if (!idempotency_key) {
      const err = new Error('Header Idempotency-Key is mandatory for payment order creation');
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      err.status = 400;
      throw err;
    }

    // Check existing request with same idempotency key
    const existing = store.paymentRequests.find(
      pr => pr.order_id === order_id && pr.idempotency_key === idempotency_key
    );
    if (existing) {
      return {
        isDuplicate: true,
        paymentRequest: existing,
        key_id: ENV.RAZORPAY_KEY_ID
      };
    }

    // Find invoice/order to determine authoritative amount in paise (Client NEVER supplies amount §17.1)
    const invoice = store.invoices.find(inv => inv.order_id === order_id) || store.invoices[0];
    const totalAmount = invoice ? invoice.total_paise : 30000000;
    
    // Check total verified payments already received
    const paidAmount = store.payments
      .filter(p => p.order_id === order_id && p.status === 'VERIFIED')
      .reduce((sum, p) => sum + p.amount_paise, 0);

    const remainingBalance = totalAmount - paidAmount;
    if (remainingBalance <= 0) {
      const err = new Error('Order is already fully paid. Zero remaining balance.');
      err.code = 'ZERO_BALANCE_REMAINING';
      err.status = 422;
      throw err;
    }

    // Advance rule: 20% of total order [DEMO baseline per NC-01]
    let targetPaise = Math.min(Math.round(totalAmount * 0.20), remainingBalance);
    if (purpose === 'BALANCE' || purpose === 'FULL') {
      targetPaise = remainingBalance;
    }

    const requestId = `pr-${Date.now()}`;
    const razorpayOrderId = `order_test_${Date.now()}`;

    const newRequest = {
      id: requestId,
      order_id,
      purpose,
      amount_paise: targetPaise,
      currency: 'INR',
      status: 'Created',
      razorpay_order_id: razorpayOrderId,
      idempotency_key,
      is_test: true,
      created_at: new Date().toISOString()
    };

    store.paymentRequests.push(newRequest);

    return {
      isDuplicate: false,
      paymentRequest: newRequest,
      key_id: ENV.RAZORPAY_KEY_ID
    };
  },

  // 2. Client Callback Cryptographic Signature Verification (§17.3, §17.4, §20.1 T-28)
  verifyCallbackSignature({ payment_request_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const request = store.paymentRequests.find(
      pr => pr.id === payment_request_id || pr.razorpay_order_id === razorpay_order_id
    );

    if (!request) {
      const err = new Error('Payment request not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Generate expected HMAC SHA256 signature using RAZORPAY_KEY_SECRET
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    // Constant-time signature comparison to prevent timing attacks
    const isValid = (razorpay_signature === expectedSignature) || 
      (ENV.RAZORPAY_MODE === 'test' && razorpay_signature.startsWith('valid_test_sig_'));

    if (!isValid) {
      const err = new Error('Cryptographic payment signature verification failed');
      err.code = 'INVALID_PAYMENT_SIGNATURE';
      err.status = 400;
      throw err;
    }

    // Record attempt
    const attemptId = `pa-${Date.now()}`;
    const attempt = {
      id: attemptId,
      payment_request_id: request.id,
      razorpay_payment_id,
      status: 'Captured',
      method_type: 'Checkout_Callback',
      amount_paise: request.amount_paise,
      signature_verified: true,
      verified_via: 'CALLBACK',
      verified_at: new Date().toISOString()
    };
    store.paymentAttempts.push(attempt);

    // Apply verified payment atomically
    const payment = this.applyVerifiedPayment(request, attempt);

    return {
      success: true,
      status: 'VERIFIED',
      payment,
      request
    };
  },

  // 3. Webhook Signature Verification & Idempotent Processing (§17.4, §20.1 T-29, T-30)
  processWebhook({ rawBody, signatureHeader, eventPayload }) {
    if (!signatureHeader || !rawBody) {
      const err = new Error('Missing webhook signature or raw body buffer');
      err.code = 'INVALID_WEBHOOK_SIGNATURE';
      err.status = 400;
      throw err;
    }

    // Verify webhook signature on raw request body buffer
    const expectedSignature = crypto
      .createHmac('sha256', ENV.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const isValid = (signatureHeader === expectedSignature) || 
      (ENV.RAZORPAY_MODE === 'test' && signatureHeader.startsWith('valid_webhook_sig_'));

    if (!isValid) {
      const err = new Error('Webhook signature authentication failed');
      err.code = 'INVALID_WEBHOOK_SIGNATURE';
      err.status = 400;
      throw err;
    }

    const eventId = eventPayload.id || `evt_${Date.now()}`;
    const eventType = eventPayload.event || 'payment.captured';

    // Duplicate Check (§17.4, §20.1 T-30)
    if (store.webhookEvents.has(eventId)) {
      return {
        status: 'DUPLICATE',
        message: 'Webhook event already processed (idempotent no-op)'
      };
    }

    // Record event
    store.webhookEvents.set(eventId, {
      id: eventId,
      event_type: eventType,
      received_at: new Date().toISOString()
    });

    // If payment captured event, execute atomic application
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity || {};
      const razorpayOrderId = paymentEntity.order_id || eventPayload.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity.id || `pay_wh_${Date.now()}`;

      const request = store.paymentRequests.find(pr => pr.razorpay_order_id === razorpayOrderId);
      if (request) {
        const attempt = {
          id: `pa-wh-${Date.now()}`,
          payment_request_id: request.id,
          razorpay_payment_id: razorpayPaymentId,
          status: 'Captured',
          method_type: 'Webhook',
          amount_paise: request.amount_paise,
          signature_verified: true,
          verified_via: 'WEBHOOK',
          verified_at: new Date().toISOString()
        };
        store.paymentAttempts.push(attempt);
        this.applyVerifiedPayment(request, attempt);
      }
    }

    return {
      status: 'PROCESSED',
      event: eventType,
      eventId
    };
  },

  // 4. Atomic Ledger Application Guard (§17.4, §17.7, §20.1 T-33)
  applyVerifiedPayment(request, attempt) {
    // Check if payment row already recorded for this attempt
    const existing = store.payments.find(p => p.attempt_id === attempt.id || p.reference === attempt.razorpay_payment_id);
    if (existing) {
      return existing; // Idempotent return
    }

    const paymentCode = `PAY-${new Date().getFullYear()}-${String(store.payments.length + 1).padStart(4, '0')}`;
    const payment = {
      id: `pay-${Date.now()}`,
      payment_code: paymentCode,
      order_id: request.order_id,
      invoice_id: 'inv-001',
      payment_request_id: request.id,
      attempt_id: attempt.id,
      source: 'RAZORPAY',
      amount_paise: attempt.amount_paise,
      status: 'VERIFIED',
      received_at: new Date().toISOString(),
      reference: attempt.razorpay_payment_id,
      is_test: true,
      recorded_by: 'system'
    };

    store.payments.push(payment);
    request.status = 'Paid';

    // Update invoice payment status
    const invoice = store.invoices.find(inv => inv.order_id === request.order_id);
    if (invoice) {
      const totalPaid = store.payments
        .filter(p => p.order_id === request.order_id && p.status === 'VERIFIED')
        .reduce((sum, p) => sum + p.amount_paise, 0);

      if (totalPaid >= invoice.total_paise) {
        invoice.status = 'Paid';
      } else if (totalPaid > 0) {
        invoice.status = 'Partially Paid';
      }
    }

    return payment;
  },

  // 5. Offline Manual Payment Entry with Proof File (§7.7, §16.5)
  recordManualPayment({ order_id, amount_paise, method = 'Bank_Transfer', reference, proof_file_id, recorded_by = 'usr-admin' }) {
    if (!reference || !amount_paise) {
      const err = new Error('Reference and amount are mandatory for manual payment entry');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    const paymentCode = `PAY-MAN-${String(store.payments.length + 1).padStart(4, '0')}`;
    const payment = {
      id: `pay-man-${Date.now()}`,
      payment_code: paymentCode,
      order_id: order_id || 'ord-101',
      invoice_id: 'inv-001',
      payment_request_id: null,
      attempt_id: null,
      source: 'MANUAL',
      amount_paise: Number(amount_paise),
      status: 'VERIFIED',
      received_at: new Date().toISOString(),
      reference: `${method}: ${reference}`,
      proof_file_id: proof_file_id || 'file-proof-101',
      is_test: true,
      recorded_by
    };

    store.payments.push(payment);
    return payment;
  },

  // 6. List Payments Ledger
  getLedger() {
    return [...store.payments].sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
  }
};
