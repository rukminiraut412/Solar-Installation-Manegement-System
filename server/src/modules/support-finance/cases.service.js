/**
 * Support Cases & 33-Transition Service Escalation FSM
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.6, §9.2, §9.3, §9.5, §9.6, §15.8, §20.1 T-36, T-44, T-45, T-46, T-47, §20.2 AC-6, AC-8)
 */

import { evaluateSafety, FIXED_SAFETY_NOTICE } from './safety.js';
import { Repository } from './repository.js';

// FSM Transition Table (§9.5)
const VALID_TRANSITIONS = new Map([
  ['New', ['AI Triage', 'Support Review', 'Cancelled']],
  ['AI Triage', ['Support Review', 'Escalated to Support', 'Cancelled']],
  ['Support Review', ['Awaiting Admin Approval', 'Approved for Technician', 'Investigating', 'Awaiting Customer Confirmation', 'Resolved', 'Cancelled', 'Closed']],
  ['Escalated to Support', ['Support Review', 'Awaiting Admin Approval', 'Cancelled']],
  ['Awaiting Admin Approval', ['Approved for Technician', 'Rejected', 'Support Review', 'Cancelled']],
  ['Approved for Technician', ['Assigned', 'Cancelled']],
  ['Assigned', ['Technician Dispatched', 'Cancelled']],
  ['Technician Dispatched', ['Technician On Site', 'Cancelled']],
  ['Technician On Site', ['Technician Work Complete', 'Escalated to Support', 'Investigating']],
  ['Technician Work Complete', ['Awaiting Support Review']],
  ['Awaiting Support Review', ['Support Review', 'Awaiting Customer Confirmation', 'Awaiting Admin Approval']],
  ['Awaiting Customer Confirmation', ['Resolved', 'Reopened', 'Closed']],
  ['Investigating', ['Support Review', 'Awaiting Admin Approval', 'Resolved', 'Closed']],
  ['Resolved', ['Closed', 'Reopened']],
  ['Reopened', ['Support Review', 'Escalated to Support']],
  ['Rejected', ['Support Review', 'Closed']],
  ['Closed', ['Reopened']],
  ['Cancelled', []]
]);

export const CasesService = {
  // 1. Report an issue with deterministic pre-model safety screen
  async createCase({ customer_id = 'cus-001', customer_name, project_id, product_id, serial_item_id, description, source = 'Portal' }) {
    if (!description || description.trim().length === 0) {
      const err = new Error('Description is required');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    // Deterministic pre-model safety screen (§9.3)
    const safetyResult = evaluateSafety(description);
    const caseId = `case-${Date.now()}`;
    const caseCode = `CASE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const newCase = {
      id: caseId,
      case_code: caseCode,
      customer_id,
      customer_name: customer_name || 'Valued Customer',
      customer_phone: '+91 98765 43210',
      project_id: project_id || 'prj-101',
      product_id: product_id || 'prod-inv-01',
      serial_item_id: serial_item_id || 'INV-SN-887123',
      product_name: 'Solar System Equipment',
      source,
      description,
      category_ai: safetyResult.isHazard ? 'Safety-related' : 'Basic',
      category_confirmed: safetyResult.isHazard ? 'Safety-related' : null,
      priority: safetyResult.recommendedPriority || 'P3',
      safety_flag: safetyResult.isHazard,
      status: safetyResult.isHazard ? 'Escalated to Support' : 'AI Triage',
      assigned_technician_id: null,
      scheduled_visit_at: null,
      technician_notes: null,
      technician_resolved: null,
      support_review_notes: safetyResult.isHazard ? 'CRITICAL SAFETY HAZARD intercepted: Support and Admin alerted.' : null,
      customer_confirmed: null,
      dispute_notes: null,
      repeat_count: 0,
      closure_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await Repository.createCase(newCase);

    // Initial customer message
    await Repository.createMessage({
      id: `msg-${Date.now()}-1`,
      case_id: caseId,
      author_id: customer_id,
      author_name: customer_name || 'Customer',
      author_type: 'CUSTOMER',
      body: description,
      visibility: 'CUSTOMER',
      ai_generated: false,
      created_at: new Date().toISOString()
    });

    // Immediate automated safety or triage response
    if (safetyResult.isHazard) {
      await Repository.createMessage({
        id: `msg-${Date.now()}-2`,
        case_id: caseId,
        author_id: 'system-safety',
        author_name: 'Emergency Safety Alert',
        author_type: 'SYSTEM',
        body: FIXED_SAFETY_NOTICE,
        visibility: 'CUSTOMER',
        ai_generated: false,
        created_at: new Date(Date.now() + 500).toISOString()
      });
    } else {
      await Repository.createMessage({
        id: `msg-${Date.now()}-2`,
        case_id: caseId,
        author_id: 'system-ai',
        author_name: 'AI Support Assistant',
        author_type: 'AI',
        body: `Thank you for contacting SunPower Support. Your case reference is ${caseCode}. Our system is analyzing your equipment information and will provide guided recommendations shortly.`,
        visibility: 'CUSTOMER',
        ai_generated: true,
        created_at: new Date(Date.now() + 500).toISOString()
      });
    }

    return newCase;
  },

  // 2. List cases with role scoping and P1 priority pinning
  async listCases({ role = 'Admin', customer_id, status, priority }) {
    return Repository.listCases({ role, customer_id, status, priority });
  },

  // 3. Get case detail with strict exclusion of internal notes for customers (§9.6, §16.9)
  async getCaseDetail(caseId, role = 'Admin') {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const isCustomer = role === 'Customer';
    const messages = await Repository.getMessagesByCaseId(c.id, isCustomer);
    const ticket = await Repository.getServiceTicketByCaseId(c.id);
    let charges = [];
    if (ticket) {
      charges = await Repository.getServiceCharges(ticket.ticket_code);
    }

    return {
      ...c,
      messages,
      ticket,
      charges
    };
  },

  // 4. Add message (Customer vs Internal)
  async addMessage(caseId, { author_id = 'usr-01', author_name = 'Staff', author_type = 'SUPPORT', body, visibility = 'CUSTOMER' }) {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (!body || body.trim().length === 0) {
      const err = new Error('Message body is required');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    const message = {
      id: `msg-${Date.now()}`,
      case_id: c.id,
      author_id,
      author_name,
      author_type,
      body,
      visibility: visibility === 'INTERNAL' ? 'INTERNAL' : 'CUSTOMER',
      ai_generated: false,
      created_at: new Date().toISOString()
    };

    await Repository.createMessage(message);
    await Repository.updateCase(c.id, { updated_at: new Date().toISOString() });

    return message;
  },

  // 5. State Machine Transition with validation per §9.5
  async transition(caseId, targetStatus, actorRole = 'Admin', reason = '') {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const currentStatus = c.status;
    const allowed = VALID_TRANSITIONS.get(currentStatus) || [];

    if (!allowed.includes(targetStatus)) {
      const err = new Error(`Invalid case transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`);
      err.code = 'CASE_TRANSITION_NOT_ALLOWED';
      err.status = 422;
      throw err;
    }

    return Repository.updateCase(c.id, { status: targetStatus });
  },

  // 6. Support confirms or overrides AI classification
  async updateClassification(caseId, { category, priority, reason }) {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // AI and non-admins cannot downgrade P1 (§9.3)
    if (c.priority === 'P1' && priority !== 'P1' && !['Admin', 'Support'].includes(c.role)) {
      const err = new Error('P1 Critical Safety priority cannot be downgraded without Admin/Support justification');
      err.code = 'P1_DOWNGRADE_FORBIDDEN';
      err.status = 403;
      throw err;
    }

    const updates = {
      category_confirmed: category || c.category_ai
    };
    if (priority) updates.priority = priority;
    if (category === 'Major' && c.status === 'Support Review') {
      updates.status = 'Awaiting Admin Approval';
    }

    const updated = await Repository.updateCase(c.id, updates);

    await this.addMessage(c.id, {
      author_id: 'usr-support',
      author_name: 'Support Reviewer',
      author_type: 'SUPPORT',
      body: `Support updated classification: Category = ${updated.category_confirmed}, Priority = ${updated.priority}. Reason: ${reason || 'Assessment verified.'}`,
      visibility: 'INTERNAL'
    });

    return updated;
  },

  // 7. Admin Decision & Technician Assignment
  async adminDecision(caseId, { decision, assigned_technician_id, scheduled_visit_at, reason }) {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updates = {};
    if (decision === 'Approve') {
      updates.status = 'Approved for Technician';
      if (assigned_technician_id) {
        updates.assigned_technician_id = assigned_technician_id;
        updates.scheduled_visit_at = scheduled_visit_at || new Date(Date.now() + 86400000).toISOString();
        updates.status = 'Assigned';
      }
    } else if (decision === 'Reject') {
      updates.status = 'Rejected';
    } else {
      updates.status = 'Support Review';
    }

    const updated = await Repository.updateCase(c.id, updates);

    await this.addMessage(c.id, {
      author_id: 'usr-admin',
      author_name: 'Operations Admin',
      author_type: 'ADMIN',
      body: `Admin decision: ${decision}. Technician: ${assigned_technician_id || 'Pending'}. Reason: ${reason || 'Approved for site execution.'}`,
      visibility: 'INTERNAL'
    });

    return updated;
  },

  // 8. Technician Field Work Completion Submission (Never closes case alone per §9.2)
  async technicianComplete(caseId, { technician_notes, technician_resolved = true, parts_used = [] }) {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updates = {
      technician_notes,
      technician_resolved
    };

    if (technician_resolved) {
      updates.status = 'Awaiting Support Review';
    } else {
      updates.status = 'Escalated to Support';
    }

    const updated = await Repository.updateCase(c.id, updates);

    await this.addMessage(c.id, {
      author_id: c.assigned_technician_id || 'tech-001',
      author_name: 'Assigned Field Technician',
      author_type: 'TECHNICIAN',
      body: `Field Work Report: ${technician_notes || 'Service inspection completed.'} Resolved: ${technician_resolved ? 'YES' : 'NO - Unresolved'}. Parts: ${parts_used.length > 0 ? parts_used.join(', ') : 'None'}`,
      visibility: 'CUSTOMER'
    });

    return updated;
  },

  // 9. Support Evidence Review & Confirmation Request
  async supportReview(caseId, { accepted = true, notes }) {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updates = { support_review_notes: notes };

    if (accepted) {
      updates.status = 'Awaiting Customer Confirmation';
      await Repository.updateCase(c.id, updates);
      await this.addMessage(c.id, {
        author_id: 'usr-support',
        author_name: 'SunPower Support Team',
        author_type: 'SUPPORT',
        body: 'Our technician has completed the field service work. Please review the repair report and click "Confirm Issue Resolved" in your portal to finalize case closure.',
        visibility: 'CUSTOMER'
      });
    } else {
      updates.status = 'Awaiting Admin Approval';
      await Repository.updateCase(c.id, updates);
    }

    return Repository.getCaseById(c.id);
  },

  // 10. Customer Confirmation or Dispute (§9.2, §20.1 T-45)
  async customerConfirmation(caseId, { confirmed, dispute_notes }) {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const isConfirmed = Boolean(confirmed);
    const updates = { customer_confirmed: isConfirmed };

    if (isConfirmed) {
      updates.status = 'Resolved';
      const updated = await Repository.updateCase(c.id, updates);
      await this.addMessage(c.id, {
        author_id: c.customer_id,
        author_name: c.customer_name,
        author_type: 'CUSTOMER',
        body: 'Customer Confirmation: I confirm the issue is fully resolved and system generation is normal.',
        visibility: 'CUSTOMER'
      });
      return updated;
    } else {
      // Customer disputes: status moves to Reopened, priority increments
      updates.status = 'Reopened';
      updates.dispute_notes = dispute_notes || 'Issue persists after technician visit.';
      updates.repeat_count = (c.repeat_count || 0) + 1;
      if (c.priority === 'P3') updates.priority = 'P2';
      else if (c.priority === 'P4') updates.priority = 'P3';

      const updated = await Repository.updateCase(c.id, updates);
      await this.addMessage(c.id, {
        author_id: c.customer_id,
        author_name: c.customer_name,
        author_type: 'CUSTOMER',
        body: `Customer Dispute: Issue is NOT resolved. ${updates.dispute_notes}`,
        visibility: 'CUSTOMER'
      });
      return updated;
    }
  },

  // 11. Final Case Closure Guard (§9.5, §20.2 AC-6)
  async closeCase(caseId, { closure_notes, actorRole = 'Support' }) {
    const c = await Repository.getCaseById(caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const unmetChecks = [];

    // Closure Guard Criteria (§9.5):
    // 1. Customer confirmation recorded
    if (!c.customer_confirmed && c.status !== 'Resolved') {
      unmetChecks.push('Customer resolution confirmation has not been recorded.');
    }

    // 2. Support review recorded
    if (!c.support_review_notes) {
      unmetChecks.push('Support evidence review notes are missing.');
    }

    // 3. Paid repair charges finalized/paid if applicable
    const ticket = await Repository.getServiceTicketByCaseId(c.id);
    if (ticket && ticket.coverage_decision === 'NOT_COVERED_PAID') {
      const charges = await Repository.getServiceCharges(ticket.ticket_code);
      if (charges.length === 0) {
        unmetChecks.push('Paid repair ticket must have finalized service charges.');
      }
    }

    if (unmetChecks.length > 0) {
      const err = new Error(`Case closure blocked by unmet criteria: ${unmetChecks.join('; ')}`);
      err.code = 'CLOSURE_CHECKS_FAILED';
      err.status = 422;
      err.details = unmetChecks;
      throw err;
    }

    const updated = await Repository.updateCase(c.id, {
      status: 'Closed',
      closure_notes: closure_notes || 'All checks passed and customer confirmed.'
    });

    await this.addMessage(c.id, {
      author_id: 'usr-support-lead',
      author_name: 'Support Team',
      author_type: 'SUPPORT',
      body: `Case formally CLOSED. ${closure_notes || 'All criteria verified.'}`,
      visibility: 'CUSTOMER'
    });

    return updated;
  }
};
