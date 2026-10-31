/**
 * Service Ticket & Pre-Billing Warranty Enforcement Service
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.5, §7.6, §20.1 T-18, T-19)
 */

import { Repository } from './repository.js';
import { WarrantyAdapter } from './warranty.adapter.js';

export const TicketsService = {
  // 1. Warranty Eligibility Lookup (Isolated Adapter for Operations Module)
  async checkWarrantyEligibility(serialNumber, claimDate = new Date().toISOString().split('T')[0]) {
    return WarrantyAdapter.checkEligibility(serialNumber, claimDate);
  },

  // 2. Create service ticket linked to case
  async createTicket({ case_id, serial_item_id }) {
    const existing = await Repository.getServiceTicketByCaseId(case_id);
    if (existing) return existing;

    const ticketCode = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const newTicket = {
      id: `tkt-${Date.now()}`,
      ticket_code: ticketCode,
      case_id,
      serial_item_id: serial_item_id || 'INV-SN-887123',
      coverage_decision: 'PENDING', // Default pending
      state: 'Open',
      created_at: new Date().toISOString()
    };

    return Repository.createServiceTicket(newTicket);
  },

  // 3. Set coverage decision (Support proposes, Admin approves goodwill)
  async setCoverageDecision(ticketCode, { decision, reason, approver_role = 'Support' }) {
    const ticket = await Repository.getServiceTicketByCodeOrId(ticketCode);
    if (!ticket) {
      const err = new Error(`Service ticket ${ticketCode} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Goodwill waiver requires Admin authorization (§7.6, §20.1 T-19)
    const isAdmin = approver_role === 'Admin' || approver_role === 'Admin/Owner';
    if (decision === 'GOODWILL' && !isAdmin) {
      const err = new Error('Goodwill free repair on expired/uncovered warranty requires Admin authorization');
      err.code = 'ADMIN_AUTHORIZATION_REQUIRED';
      err.status = 403;
      throw err;
    }

    return Repository.updateCoverageDecision(ticket.ticket_code, decision);
  },

  // 4. Add service charge (CRITICAL: Gated by coverage decision §7.6, §20.1 T-18)
  async addCharge(ticketCode, { type, description, amount_paise }) {
    const ticket = await Repository.getServiceTicketByCodeOrId(ticketCode);
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

    return Repository.createServiceCharge(charge);
  },

  // 5. Get charges for ticket
  async getCharges(ticketCode) {
    return Repository.getServiceCharges(ticketCode);
  }
};
