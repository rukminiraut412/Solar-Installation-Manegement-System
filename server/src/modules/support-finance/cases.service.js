/**
 * Support Case Service & 33-Transition Finite State Machine
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.6, §9, §16.9, §20.2 AC-6, AC-7, AC-8)
 */

import { store } from './store.js';
import { evaluateSafety, FIXED_SAFETY_NOTICE } from './safety.js';

// Valid status transitions per §9.5
const VALID_TRANSITIONS = new Map([
  ['New', ['AI Triage', 'Escalated to Support', 'Cancelled']],
  ['AI Triage', ['Awaiting Customer Details', 'AI Guidance Provided', 'Escalated to Support']],
  ['Awaiting Customer Details', ['AI Triage', 'Escalated to Support']],
  ['AI Guidance Provided', ['Resolved', 'Escalated to Support']],
  ['Escalated to Support', ['Support Review']],
  ['Support Review', ['More Information Required', 'Awaiting Admin Approval', 'Awaiting Customer Confirmation', 'Cancelled', 'On Hold']],
  ['More Information Required', ['Support Review', 'AI Triage']],
  ['Awaiting Admin Approval', ['Approved for Technician', 'Rejected', 'More Information Required', 'Support Review']],
  ['Approved for Technician', ['Assigned']],
  ['Assigned', ['In Progress', 'Reassigned']],
  ['Reassigned', ['Assigned']],
  ['In Progress', ['Technician Work Complete', 'Escalated to Support']],
  ['Technician Work Complete', ['Awaiting Support Review']],
  ['Awaiting Support Review', ['Awaiting Customer Confirmation', 'In Progress', 'Awaiting Admin Approval']],
  ['Awaiting Customer Confirmation', ['Resolved', 'Reopened']],
  ['Resolved', ['Closed', 'Reopened']],
  ['Reopened', ['Support Review']],
  ['On Hold', ['Support Review', 'Awaiting Admin Approval', 'In Progress']],
  ['Rejected', ['Support Review', 'Closed']],
  ['Closed', ['Reopened']],
  ['Cancelled', []]
]);

export const CasesService = {
  // 1. Report an issue with deterministic pre-model safety screen
  createCase({ customer_id = 'cus-001', customer_name, project_id, product_id, serial_item_id, description, source = 'Portal' }) {
    if (!description || description.trim().length === 0) {
      const err = new Error('Description is required');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    // Deterministic pre-model safety screen (§9.3)
    const safetyResult = evaluateSafety(description);
    const caseId = `case-${Date.now()}`;
    const caseCode = `CASE-${new Date().getFullYear()}-${String(store.cases.length + 1).padStart(4, '0')}`;

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

    store.cases.unshift(newCase);

    // Initial customer message
    store.caseMessages.push({
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
      store.caseMessages.push({
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
      store.caseMessages.push({
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
  listCases({ role = 'Admin', customer_id, status, priority }) {
    let list = [...store.cases];

    // Customer sees only own cases
    if (role === 'Customer') {
      list = list.filter(c => c.customer_id === (customer_id || 'cus-001'));
    }

    if (status) {
      list = list.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }

    if (priority) {
      list = list.filter(c => c.priority === priority);
    }

    // Sort: P1 pinned at top, then newest
    return list.sort((a, b) => {
      if (a.priority === 'P1' && b.priority !== 'P1') return -1;
      if (b.priority === 'P1' && a.priority !== 'P1') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  },

  // 3. Get case detail with strict exclusion of internal notes for customers (§9.6, §16.9)
  getCaseDetail(caseId, role = 'Admin') {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    let messages = store.caseMessages.filter(m => m.case_id === c.id);
    if (role === 'Customer') {
      // Exclude internal notes from customer view
      messages = messages.filter(m => m.visibility === 'CUSTOMER');
    }

    const ticket = store.serviceTickets.find(t => t.case_id === c.id) || null;
    let charges = [];
    if (ticket) {
      charges = store.serviceCharges.filter(sc => sc.ticket_code === ticket.ticket_code);
    }

    return {
      ...c,
      messages,
      ticket,
      charges
    };
  },

  // 4. Add message (Customer vs Internal)
  addMessage(caseId, { author_id = 'usr-01', author_name = 'Staff', author_type = 'SUPPORT', body, visibility = 'CUSTOMER' }) {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
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

    store.caseMessages.push(message);
    c.updated_at = new Date().toISOString();

    return message;
  },

  // 5. State Machine Transition with validation per §9.5
  transition(caseId, targetStatus, actorRole = 'Admin', reason = '') {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
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

    c.status = targetStatus;
    c.updated_at = new Date().toISOString();

    return c;
  },

  // 6. Support confirms or overrides AI classification
  updateClassification(caseId, { category, priority, reason }) {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
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

    c.category_confirmed = category || c.category_ai;
    if (priority) c.priority = priority;
    if (category === 'Major' && c.status === 'Support Review') {
      c.status = 'Awaiting Admin Approval';
    }
    c.updated_at = new Date().toISOString();

    this.addMessage(c.id, {
      author_id: 'usr-support',
      author_name: 'Support Reviewer',
      author_type: 'SUPPORT',
      body: `Support updated classification: Category = ${c.category_confirmed}, Priority = ${c.priority}. Reason: ${reason || 'Assessment verified.'}`,
      visibility: 'INTERNAL'
    });

    return c;
  },

  // 7. Admin Decision & Technician Assignment
  adminDecision(caseId, { decision, assigned_technician_id, scheduled_visit_at, reason }) {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (decision === 'Approve') {
      c.status = 'Approved for Technician';
      if (assigned_technician_id) {
        c.assigned_technician_id = assigned_technician_id;
        c.scheduled_visit_at = scheduled_visit_at || new Date(Date.now() + 86400000).toISOString();
        c.status = 'Assigned';
      }
    } else if (decision === 'Reject') {
      c.status = 'Rejected';
    } else {
      c.status = 'Support Review';
    }

    c.updated_at = new Date().toISOString();

    this.addMessage(c.id, {
      author_id: 'usr-admin',
      author_name: 'Operations Admin',
      author_type: 'ADMIN',
      body: `Admin decision: ${decision}. Technician: ${assigned_technician_id || 'Pending'}. Reason: ${reason || 'Approved for site execution.'}`,
      visibility: 'INTERNAL'
    });

    return c;
  },

  // 8. Technician Field Work Completion Submission (Never closes case alone per §9.2)
  technicianComplete(caseId, { technician_notes, technician_resolved = true, parts_used = [] }) {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    c.technician_notes = technician_notes;
    c.technician_resolved = technician_resolved;

    if (technician_resolved) {
      // Moves to Awaiting Support Review, NEVER directly to Closed (§9.2, §20.1 T-44)
      c.status = 'Technician Work Complete';
      setTimeout(() => {
        c.status = 'Awaiting Support Review';
      }, 100);
    } else {
      // Unresolved repair returns to Support escalation queue (§9.2, §20.1 T-46)
      c.status = 'Escalated to Support';
    }

    c.updated_at = new Date().toISOString();

    this.addMessage(c.id, {
      author_id: c.assigned_technician_id || 'tech-001',
      author_name: 'Assigned Field Technician',
      author_type: 'TECHNICIAN',
      body: `Field Work Report: ${technician_notes || 'Service inspection completed.'} Resolved: ${technician_resolved ? 'YES' : 'NO - Unresolved'}. Parts: ${parts_used.length > 0 ? parts_used.join(', ') : 'None'}`,
      visibility: 'CUSTOMER'
    });

    return c;
  },

  // 9. Support Evidence Review & Confirmation Request
  supportReview(caseId, { accepted = true, notes }) {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    c.support_review_notes = notes;

    if (accepted) {
      c.status = 'Awaiting Customer Confirmation';
      this.addMessage(c.id, {
        author_id: 'usr-support',
        author_name: 'SunPower Support Team',
        author_type: 'SUPPORT',
        body: 'Our technician has completed the field service work. Please review the repair report and click "Confirm Issue Resolved" in your portal to finalize case closure.',
        visibility: 'CUSTOMER'
      });
    } else {
      c.status = 'Awaiting Admin Approval'; // Rework or revisit needed
    }

    c.updated_at = new Date().toISOString();
    return c;
  },

  // 10. Customer Confirmation or Dispute (§9.2, §20.1 T-45)
  customerConfirmation(caseId, { confirmed, dispute_notes }) {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
    if (!c) {
      const err = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    c.customer_confirmed = Boolean(confirmed);

    if (confirmed) {
      c.status = 'Resolved';
      this.addMessage(c.id, {
        author_id: c.customer_id,
        author_name: c.customer_name,
        author_type: 'CUSTOMER',
        body: 'Customer Confirmation: I confirm the issue is fully resolved and system generation is normal.',
        visibility: 'CUSTOMER'
      });
    } else {
      // Customer disputes: status moves to Reopened, priority increments, returns to Support Review (§9.5, §20.1 T-45)
      c.status = 'Reopened';
      c.dispute_notes = dispute_notes || 'Issue persists after technician visit.';
      c.repeat_count = (c.repeat_count || 0) + 1;
      if (c.priority === 'P3') c.priority = 'P2';
      else if (c.priority === 'P4') c.priority = 'P3';

      this.addMessage(c.id, {
        author_id: c.customer_id,
        author_name: c.customer_name,
        author_type: 'CUSTOMER',
        body: `Customer Dispute: Issue is NOT resolved. ${c.dispute_notes}`,
        visibility: 'CUSTOMER'
      });
    }

    c.updated_at = new Date().toISOString();
    return c;
  },

  // 11. Final Case Closure Guard (§9.5, §20.2 AC-6)
  closeCase(caseId, { closure_notes, actorRole = 'Support' }) {
    const c = store.cases.find(item => item.id === caseId || item.case_code === caseId);
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
    const ticket = store.serviceTickets.find(t => t.case_id === c.id);
    if (ticket && ticket.coverage_decision === 'NOT_COVERED_PAID') {
      // In production, verify payment. In demo, check charge existence.
      const charges = store.serviceCharges.filter(sc => sc.ticket_code === ticket.ticket_code);
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

    c.status = 'Closed';
    c.closure_notes = closure_notes || 'All checks passed and customer confirmed.';
    c.updated_at = new Date().toISOString();

    if (ticket) {
      ticket.state = 'Closed';
    }

    this.addMessage(c.id, {
      author_id: 'usr-support-lead',
      author_name: 'Support Team',
      author_type: 'SUPPORT',
      body: `Case formally CLOSED. ${c.closure_notes}`,
      visibility: 'CUSTOMER'
    });

    return c;
  }
};
