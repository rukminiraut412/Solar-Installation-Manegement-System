/**
 * Sandboxed AI Assistance Service (Mock Default Implementation)
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§8, §9.2, §16.10, §20.1 T-35, T-36, T-37, T-38, T-39)
 */

import { evaluateSafety, FIXED_SAFETY_NOTICE } from './safety.js';
import { TicketsService } from './tickets.service.js';
import { Repository } from './repository.js';

export const AIService = {
  // 1. AI Enquiry/Case Summarization (AI-A1, AI-D1 §8.2)
  async summarizeEntity({ entityType = 'case', entityId = 'case-001', callerRole = 'Admin' }) {
    const startTime = Date.now();
    let entity = null;

    if (entityType === 'case') {
      entity = await Repository.getCaseById(entityId);
    } else {
      const invoices = await Repository.listInvoices();
      entity = invoices.find(i => i.id === entityId);
    }

    if (!entity) {
      const err = new Error(`${entityType} with ID ${entityId} not found`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Role-based scoping check (§8.3, §20.1 T-37)
    if (callerRole === 'Technician' && entity.assigned_technician_id && entity.assigned_technician_id !== 'tech-001') {
      const err = new Error('You do not have permission to view or summarize this record');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }

    const messages = await Repository.getMessagesByCaseId(entity.id, callerRole === 'Customer');
    
    // Deterministic grounded summary from authoritative records
    const summaryText = 
      `Customer ${entity.customer_name || 'Customer'} reported an issue regarding ${entity.product_name || 'Solar Equipment'} (Serial: ${entity.serial_item_id || 'N/A'}). ` +
      `Current case status is '${entity.status}' with priority '${entity.priority}'. ` +
      `Total messages exchanged: ${messages.length}. ` +
      (entity.safety_flag ? 'CRITICAL: Safety hazard flag is ACTIVE.' : 'No active fire/shock hazards detected.') +
      (entity.support_review_notes ? ` Support note: "${entity.support_review_notes}"` : '');

    const sources = [
      { type: 'support_cases', id: entity.id, code: entity.case_code },
      { type: 'customers', id: entity.customer_id, name: entity.customer_name },
      { type: 'serial_items', id: entity.serial_item_id }
    ];

    const proposedActions = [];
    if (entity.status === 'Support Review') {
      proposedActions.push({ label: 'Escalate to Admin for Tech Assignment', endpoint: `/api/v1/support-finance/cases/${entity.id}/escalate-admin` });
    } else if (entity.status === 'Awaiting Customer Confirmation') {
      proposedActions.push({ label: 'Request Customer Confirmation', endpoint: `/api/v1/support-finance/cases/${entity.id}/support-review` });
    }

    await this.logTelemetry({
      feature: 'ENTITY_SUMMARY',
      entityRefs: sources,
      status: 'SUCCESS',
      latencyMs: Date.now() - startTime
    });

    return {
      label: 'Demo AI output (rule-based template)',
      content: summaryText,
      sources,
      missing: [],
      proposed_actions: proposedActions,
      fallbackUsed: false,
      timestamp: new Date().toISOString()
    };
  },

  // 2. Deterministic Missing Information Detector (AI-A2 §8.2)
  detectMissingInfo({ entityType = 'enquiry', fields = {} }) {
    const missing = [];

    if (!fields.roof_area_sqm && !fields.roof_info) {
      missing.push({ field: 'roof_info', description: 'Rooftop area or structural details are unpopulated' });
    }
    if (!fields.monthly_bill && !fields.monthly_bill_amount) {
      missing.push({ field: 'monthly_bill', description: 'Monthly electricity bill amount is missing' });
    }
    if (!fields.address && !fields.pincode) {
      missing.push({ field: 'address', description: 'Customer site street address and PIN code are missing' });
    }
    if (!fields.phone) {
      missing.push({ field: 'phone', description: 'Primary contact telephone number is missing' });
    }

    const narrative = missing.length > 0
      ? `Audit identified ${missing.length} missing required field(s) preventing automated survey qualification: ${missing.map(m => m.field).join(', ')}.`
      : 'All prerequisite technical and contact parameters are complete.';

    return {
      label: 'Deterministic System Check (Rule Engine)',
      content: narrative,
      missing,
      sources: [{ type: 'required_field_schema', version: '1.0' }],
      fallbackUsed: false,
      timestamp: new Date().toISOString()
    };
  },

  // 3. Plain-Language Warranty Explanation (AI-E1 §8.2, §20.1 T-20)
  async explainWarranty({ serialNumber = 'INV-SN-887123', claimDate = new Date().toISOString().split('T')[0] }) {
    const startTime = Date.now();
    // Authoritative backend system result via WarrantyAdapter
    const sysResult = await TicketsService.checkWarrantyEligibility(serialNumber, claimDate);

    let explanationText = '';
    if (sysResult.status === 'WITHIN_PERIOD') {
      explanationText = 
        `Your ${sysResult.record.product_name} is currently COVERED within its ${sysResult.record.duration_months}-month manufacturer warranty. ` +
        `The warranty commenced on ${sysResult.record.start_date} and is valid until ${sysResult.record.end_date}. ` +
        `You have approximately ${sysResult.remainingMonths} months (${sysResult.remainingDays} days) of coverage remaining. ` +
        `Standard component defects are repaired or replaced free of charge under terms; final coverage is confirmed upon technical review by Support.`;
    } else if (sysResult.status === 'EXPIRED') {
      explanationText = 
        `The manufacturer warranty for this item expired on ${sysResult.record.end_date} (approximately ${sysResult.expiredDays} days ago). ` +
        `Service repairs for this unit will follow our standard paid service rate card. Our support team can provide an itemized repair estimate before any work begins.`;
    } else {
      explanationText = sysResult.message;
    }

    await this.logTelemetry({
      feature: 'WARRANTY_EXPLAIN',
      entityRefs: [{ serial: serialNumber, status: sysResult.status }],
      status: 'SUCCESS',
      latencyMs: Date.now() - startTime
    });

    return {
      label: 'Demo AI output (rule-based template)',
      system_result: sysResult, // Authoritative panel
      explanation: explanationText, // Plain-language AI panel
      sources: [
        { type: 'warranty_records', serial: serialNumber, duration_months: sysResult.record?.duration_months },
        { type: 'warranty_terms', party: sysResult.record?.party || 'MANUFACTURER' }
      ],
      timestamp: new Date().toISOString()
    };
  },

  // 4. Customer Support Guided Triage (AI-G1 §8.2, §9.2)
  async triageIssue({ description = '', equipment_type = 'Inverter' }) {
    const startTime = Date.now();

    // STEP 1: Safety screening first (§9.3)
    const safety = evaluateSafety(description);
    if (safety.isHazard) {
      return {
        label: 'Safety Alert System',
        classification: 'Safety-related',
        priority: 'P1',
        safety_flag: true,
        guidance: FIXED_SAFETY_NOTICE,
        matched_articles: [],
        sources: [{ rule: 'PRE_MODEL_SAFETY_INTERCEPTOR_V1' }],
        bypass_ai: true,
        timestamp: new Date().toISOString()
      };
    }

    // STEP 2: Grounded guidance derived strictly from approved articles (§9.2, §16.10)
    const helpArticles = await Repository.listApprovedHelpArticles();
    const matchedArticles = helpArticles.filter(art => {
      const kw = art.category.toLowerCase();
      return description.toLowerCase().includes(kw) || kw === equipment_type.toLowerCase();
    });

    let guidance = '';
    if (matchedArticles.length > 0) {
      guidance = 
        `Based on our approved technical guidance for ${matchedArticles[0].category}: "${matchedArticles[0].title}". ` +
        `${matchedArticles[0].body} ` +
        `If the symptom persists or generation is interrupted, our Support Lead can dispatch an authorized technician.`;
    } else {
      guidance = 
        'We have registered your issue details. Since this requires field inspection or electrical diagnostics, ' +
        'we have routed your case to our Senior Support Lead for review. You may request immediate support assistance at any time.';
    }

    await this.logTelemetry({
      feature: 'SUPPORT_TRIAGE',
      entityRefs: matchedArticles.map(a => ({ type: 'help_articles', id: a.id })),
      status: 'SUCCESS',
      latencyMs: Date.now() - startTime
    });

    return {
      label: 'Demo AI output (rule-based template)',
      classification: description.toLowerCase().includes('error') ? 'Major' : 'Basic',
      priority: description.toLowerCase().includes('error') ? 'P2' : 'P3',
      safety_flag: false,
      guidance,
      matched_articles: matchedArticles,
      sources: matchedArticles.map(a => ({ type: 'help_articles', id: a.id, title: a.title })),
      bypass_ai: false,
      timestamp: new Date().toISOString()
    };
  },

  // Telemetry helper (No raw customer prompts stored §15.4)
  async logTelemetry({ feature, entityRefs, status, latencyMs }) {
    return Repository.recordAIRequest({
      id: `ai-req-${Date.now()}`,
      feature,
      entity_refs: entityRefs,
      provider_mode: 'mock',
      status,
      latency_ms: latencyMs,
      created_at: new Date().toISOString()
    });
  }
};
