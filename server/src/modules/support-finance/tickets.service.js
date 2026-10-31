/**
 * Service Ticket & Pre-Billing Warranty Enforcement Service
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.5, §7.6, §20.1 T-18, T-19)
 */

import { store } from './store.js';

export const TicketsService = {
  // 1. Warranty Eligibility Lookup (Contract with Operations Module)
  checkWarrantyEligibility(serialNumber, claimDate = new Date().toISOString().split('T')[0]) {
    const record = store.warranties.find(w => w.serial_number.toLowerCase() === (serialNumber || '').trim().toLowerCase());
    
    if (!record) {
      return {
        status: 'NO_RECORD',
        message: 'No warranty record found for this serial number.',
        record: null
      };
    }

    if (record.status === 'Void') {
      return {
        status: 'VOID',
        message: 'Warranty has been voided by administration.',
        record
      };
    }

    if (record.status === 'Pending Activation' || new Date(claimDate) < new Date(record.start_date)) {
      return {
        status: 'NOT_ACTIVE',
        message: 'Warranty is pending activation or start date is in the future.',
        record
      };
    }

    if (new Date(claimDate) > new Date(record.end_date)) {
      return {
        status: 'EXPIRED',
        message: `Warranty expired on ${record.end_date}.`,
        record,
        expiredDays: Math.floor((new Date(claimDate) - new Date(record.end_date)) / 86400000)
      };
    }

    // Active within period!
    const remainingDays = Math.floor((new Date(record.end_date) - new Date(claimDate)) / 86400000);
    const remainingMonths = (remainingDays / 30.4).toFixed(1);

    return {
      status: 'WITHIN_PERIOD',
      message: `Warranty is active with ~${remainingMonths} months (${remainingDays} days) remaining.`,
      record,
      remainingDays,
      remainingMonths: Number(remainingMonths)
    };
  },

  // 2. Create service ticket linked to case
  createTicket({ case_id, serial_item_id }) {
    const existing = store.serviceTickets.find(t => t.case_id === case_id);
    if (existing) return existing;

    const ticketCode = `TKT-${new Date().getFullYear()}-${String(store.serviceTickets.length + 1).padStart(4, '0')}`;
    const newTicket = {
      id: `tkt-${Date.now()}`,
      ticket_code: ticketCode,
      case_id,
      serial_item_id: serial_item_id || 'INV-SN-887123',
      coverage_decision: 'PENDING', // Default pending
      state: 'Open',
      created_at: new Date().toISOString()
    };

    store.serviceTickets.push(newTicket);
    return newTicket;
  },

  // 3. Set coverage decision (Support proposes, Admin approves goodwill)
  setCoverageDecision(ticketCode, { decision, reason, approver_role = 'Support' }) {
    const ticket = store.serviceTickets.find(t => t.ticket_code === ticketCode || t.id === ticketCode);
    if (!ticket) {
      const err = new Error(`Service ticket ${ticketCode} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Goodwill waiver requires Admin authorization (§7.6, §20.1 T-19)
    if (decision === 'GOODWILL' && approver_role !== 'Admin') {
      const err = new Error('Goodwill free repair on expired/uncovered warranty requires Admin authorization');
      err.code = 'ADMIN_AUTHORIZATION_REQUIRED';
      err.status = 403;
      throw err;
    }

    ticket.coverage_decision = decision; // COVERED_WARRANTY, NOT_COVERED_PAID, GOODWILL

    return ticket;
  },

  // 4. Add service charge (CRITICAL: Gated by coverage decision §7.6, §20.1 T-18)
  addCharge(ticketCode, { type, description, amount_paise }) {
    const ticket = store.serviceTickets.find(t => t.ticket_code === ticketCode || t.id === ticketCode);
    if (!ticket) {
      const err = new Error(`Service ticket ${ticketCode} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // PRE-BILLING WARRANTY GUARD:
    // Adding charges is strictly BLOCKED while coverage_decision === 'PENDING'
    if (ticket.coverage_decision === 'PENDING') {
      const err = new Error('Cannot add service charges: Warranty eligibility coverage decision is PENDING.');
      err.code = 'COVERAGE_PENDING';
      err.status = 422;
      throw err;
    }

    // Covered warranty repairs must be 0 paise to customer (§7.6)
    let finalAmount = Number(amount_paise) || 0;
    if (ticket.coverage_decision === 'COVERED_WARRANTY' || ticket.coverage_decision === 'GOODWILL') {
      finalAmount = 0; // Free covered repair
    }

    const charge = {
      id: `sc-${Date.now()}`,
      ticket_code: ticket.ticket_code,
      type: type || 'PART',
      description: description || 'Component repair service',
      amount_paise: finalAmount,
      created_at: new Date().toISOString()
    };

    store.serviceCharges.push(charge);
    return charge;
  },

  // 5. Get charges for ticket
  getCharges(ticketCode) {
    return store.serviceCharges.filter(sc => sc.ticket_code === ticketCode);
  }
};
