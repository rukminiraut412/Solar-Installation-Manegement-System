/**
 * Support, Finance and AI Data Store
 * Provides transactional state management with seeded realistic case study data
 */

export const store = {
  // 1. Payment Requests
  paymentRequests: [
    {
      id: 'pr-001',
      order_id: 'ord-101',
      purpose: 'ADVANCE',
      amount_paise: 6000000, // 60,000 INR (20% of 300,000)
      currency: 'INR',
      status: 'Paid',
      razorpay_order_id: 'order_test_998124',
      idempotency_key: 'idem-adv-101',
      is_test: true,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'pr-002',
      order_id: 'ord-102',
      purpose: 'ADVANCE',
      amount_paise: 9600000, // 96,000 INR (20% of 480,000)
      currency: 'INR',
      status: 'Initiated',
      razorpay_order_id: 'order_test_998125',
      idempotency_key: 'idem-adv-102',
      is_test: true,
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],

  // 2. Payment Attempts
  paymentAttempts: [
    {
      id: 'pa-001',
      payment_request_id: 'pr-001',
      razorpay_payment_id: 'pay_test_001982',
      status: 'Captured',
      method_type: 'UPI',
      amount_paise: 6000000,
      signature_verified: true,
      verified_via: 'CALLBACK',
      verified_at: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ],

  // 3. Authoritative Verified Payments Ledger
  payments: [
    {
      id: 'pay-001',
      payment_code: 'PAY-000101',
      order_id: 'ord-101',
      invoice_id: 'inv-001',
      payment_request_id: 'pr-001',
      attempt_id: 'pa-001',
      source: 'RAZORPAY',
      amount_paise: 6000000,
      status: 'VERIFIED',
      received_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      reference: 'pay_test_001982',
      is_test: true,
      recorded_by: 'system'
    }
  ],

  // 4. Webhook Events (for deduplication)
  webhookEvents: new Map(),

  // 5. Invoices
  invoices: [
    {
      id: 'inv-001',
      invoice_code: 'INV-2026-0001',
      order_id: 'ord-101',
      customer_id: 'cus-001',
      customer_name: 'Sharma Industries (Small Factory)',
      total_paise: 30000000, // 300,000 INR
      status: 'Partially Paid',
      issued_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      items: [
        { description: '3 kW On-Grid Solar System Package', qty: 1, unit_price_paise: 30000000, total_paise: 30000000 }
      ]
    },
    {
      id: 'inv-002',
      invoice_code: 'INV-2026-0002',
      order_id: 'ord-102',
      customer_id: 'cus-002',
      customer_name: 'Anand Verma (Residential)',
      total_paise: 48000000, // 480,000 INR
      status: 'Issued',
      issued_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      items: [
        { description: '5 kW Off-Grid Solar System with Battery Bank', qty: 1, unit_price_paise: 48000000, total_paise: 48000000 }
      ]
    }
  ],

  // 6. Direct Project Expenses
  expenses: [
    {
      id: 'exp-001',
      project_id: 'prj-101',
      category: 'Transport',
      amount_paise: 350000, // 3,500 INR
      description: 'Truck transit for panels and mounting frame to site',
      status: 'Approved',
      approved_by: 'usr-admin-01',
      incurred_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'exp-002',
      project_id: 'prj-101',
      category: 'Permits',
      amount_paise: 250000, // 2,500 INR
      description: 'DISCOM net-metering application fee',
      status: 'Approved',
      approved_by: 'usr-admin-01',
      incurred_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'exp-003',
      project_id: 'prj-102',
      category: 'Consumables',
      amount_paise: 180000, // 1,800 INR
      description: 'Cable ties, conduit sealant and grounding lugs',
      status: 'Pending',
      approved_by: null,
      incurred_at: new Date().toISOString()
    }
  ],

  // 7. Technician Timesheet Pay Records
  technicianPayRecords: [
    {
      id: 'payrec-001',
      technician_id: 'tech-001',
      technician_name: 'Vikram Singh (Lead Tech)',
      period_start: '2026-10-15',
      period_end: '2026-10-31',
      approved_hours: 42.5,
      rate_paise: 60000, // 600 INR/hr
      gross_paise: 2550000, // 25,500 INR
      status: 'Approved',
      approved_by: 'usr-admin-01'
    },
    {
      id: 'payrec-002',
      technician_id: 'tech-002',
      technician_name: 'Ramesh Patel (Helper)',
      period_start: '2026-10-15',
      period_end: '2026-10-31',
      approved_hours: 38.0,
      rate_paise: 40000, // 400 INR/hr
      gross_paise: 1520000, // 15,200 INR
      status: 'Approved',
      approved_by: 'usr-admin-01'
    }
  ],

  // 8. Subsidy Applications
  subsidyApplications: [
    {
      id: 'sub-001',
      project_id: 'prj-101',
      customer_id: 'cus-001',
      receivable_paise: 7800000, // 78,000 INR
      status: 'Submitted',
      submitted_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      disbursed_at: null,
      notes: 'Submitted via National Solar Rooftop Portal. Application #DL-2026-8819.',
      checklist: {
        electricityBill: true,
        aadhaarCard: true,
        bankPassbook: true,
        rooftopPhoto: true
      }
    },
    {
      id: 'sub-002',
      project_id: 'prj-102',
      customer_id: 'cus-002',
      receivable_paise: 7800000,
      status: 'Documents Pending',
      submitted_at: null,
      disbursed_at: null,
      notes: 'Waiting for customer canceled cheque.',
      checklist: {
        electricityBill: true,
        aadhaarCard: true,
        bankPassbook: false,
        rooftopPhoto: true
      }
    }
  ],

  // 9. Warranties (Contractual lookup from Operations module)
  warranties: [
    {
      id: 'war-001',
      warranty_code: 'WAR-INV-2025-01',
      serial_number: 'INV-SN-887123',
      product_name: 'SunGrow 3.3 kW String Inverter',
      customer_id: 'cus-001',
      customer_name: 'Sharma Industries',
      project_id: 'prj-101',
      party: 'MANUFACTURER',
      scope: 'PARTS',
      duration_months: 24, // 2 years
      start_date: new Date(Date.now() - 86400000 * 540).toISOString().split('T')[0], // ~18 months ago (Active!)
      end_date: new Date(Date.now() + 86400000 * 180).toISOString().split('T')[0],   // ~6 months remaining
      status: 'Active'
    },
    {
      id: 'war-002',
      warranty_code: 'WAR-BAT-2023-09',
      serial_number: 'BAT-SN-110944',
      product_name: 'SolarPower 48V 150Ah Lithium Battery',
      customer_id: 'cus-002',
      customer_name: 'Anand Verma',
      project_id: 'prj-102',
      party: 'MANUFACTURER',
      scope: 'PARTS',
      duration_months: 24,
      start_date: '2023-01-10',
      end_date: '2025-01-10', // Expired!
      status: 'Expired'
    }
  ],

  // 10. Support Cases
  cases: [
    {
      id: 'case-001',
      case_code: 'CASE-2026-0001',
      customer_id: 'cus-001',
      customer_name: 'Sharma Industries',
      customer_phone: '+91 98765 43210',
      project_id: 'prj-101',
      serial_item_id: 'INV-SN-887123',
      product_name: 'SunGrow 3.3 kW String Inverter',
      source: 'Portal',
      description: 'Inverter error code E-04 displayed on status LCD. Generation halted since morning.',
      category_ai: 'Major',
      category_confirmed: 'Major',
      priority: 'P2',
      safety_flag: false,
      status: 'Support Review',
      assigned_technician_id: null,
      scheduled_visit_at: null,
      technician_notes: null,
      technician_resolved: null,
      support_review_notes: 'Verified inverter warranty: WITHIN_PERIOD (6 months remaining). Free covered repair path eligible.',
      customer_confirmed: null,
      dispute_notes: null,
      repeat_count: 0,
      closure_notes: null,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'case-002',
      case_code: 'CASE-2026-0002',
      customer_id: 'cus-002',
      customer_name: 'Anand Verma',
      customer_phone: '+91 91234 56789',
      project_id: 'prj-102',
      serial_item_id: 'BAT-SN-110944',
      product_name: 'SolarPower 48V 150Ah Lithium Battery',
      source: 'Portal',
      description: 'Battery enclosure is swelling up with burning odor and clicking sparks!',
      category_ai: 'Safety-related',
      category_confirmed: 'Safety-related',
      priority: 'P1',
      safety_flag: true,
      status: 'Escalated to Support',
      assigned_technician_id: null,
      scheduled_visit_at: null,
      technician_notes: null,
      technician_resolved: null,
      support_review_notes: 'CRITICAL SAFETY HAZARD intercepted: Fixed safety warning issued to customer. Immediate human alert to Admin & Lead Tech.',
      customer_confirmed: null,
      dispute_notes: null,
      repeat_count: 0,
      closure_notes: null,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString()
    }
  ],

  // 11. Case Messages
  caseMessages: [
    {
      id: 'msg-001',
      case_id: 'case-001',
      author_id: 'cus-001',
      author_name: 'Sharma Industries',
      author_type: 'CUSTOMER',
      body: 'Inverter error code E-04 displayed on status LCD. Generation halted since morning.',
      visibility: 'CUSTOMER',
      ai_generated: false,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'msg-002',
      case_id: 'case-001',
      author_id: 'system-ai',
      author_name: 'AI Support Assistant',
      author_type: 'AI',
      body: 'Thank you for reporting. Your case reference is CASE-2026-0001. We have detected a major inverter generation alert. Our support engineering team has been notified to check equipment telemetry and warranty coverage.',
      visibility: 'CUSTOMER',
      ai_generated: true,
      created_at: new Date(Date.now() - 3600000 * 5 + 2000).toISOString()
    },
    {
      id: 'msg-003',
      case_id: 'case-001',
      author_id: 'usr-support-01',
      author_name: 'SunPower Support Lead',
      author_type: 'SUPPORT',
      body: 'INTERNAL NOTE: Checked serial INV-SN-887123 in warranty ledger. 18 months elapsed of 24-month manufacturer warranty. Coverage decision = COVERED_WARRANTY. Pre-billing charges blocked.',
      visibility: 'INTERNAL',
      ai_generated: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'msg-004',
      case_id: 'case-002',
      author_id: 'cus-002',
      author_name: 'Anand Verma',
      author_type: 'CUSTOMER',
      body: 'Battery enclosure is swelling up with burning odor and clicking sparks!',
      visibility: 'CUSTOMER',
      ai_generated: false,
      created_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'msg-005',
      case_id: 'case-002',
      author_id: 'system-safety',
      author_name: 'Emergency Safety Alert',
      author_type: 'SYSTEM',
      body: 'EMERGENCY SAFETY NOTICE: Please keep completely away from the solar equipment. If there is active smoke, fire, or immediate risk of electrical shock, move to a safe location and contact local emergency services immediately. Our senior support engineering team and admin have been alerted with highest priority (P1 Critical). Do NOT attempt to touch, open, or service the equipment.',
      visibility: 'CUSTOMER',
      ai_generated: false,
      created_at: new Date(Date.now() - 1800000 + 1000).toISOString()
    }
  ],

  // 12. Service Tickets
  serviceTickets: [
    {
      id: 'tkt-001',
      ticket_code: 'TKT-2026-0001',
      case_id: 'case-001',
      serial_item_id: 'INV-SN-887123',
      coverage_decision: 'COVERED_WARRANTY',
      state: 'Open',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],

  // 13. Service Charges
  serviceCharges: [
    {
      id: 'sc-001',
      ticket_code: 'TKT-2026-0001',
      type: 'PART',
      description: 'IGBT Inverter Driver Board (Covered under Manufacturer Warranty)',
      amount_paise: 0,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],

  // 14. Approved Knowledge Base Help Articles (for safe AI guidance)
  helpArticles: [
    {
      id: 'art-001',
      title: 'How to read your Inverter LCD status and error codes',
      category: 'Inverter',
      body: 'Look at the front display of your inverter. Normal operation displays a solid green LED and generation numbers (kW/kWh). If an error code like E-01 (Grid Loss) or E-04 (Internal Fault) appears, note the code, take a clear photo, and report via customer portal. Do not touch AC/DC isolators.',
      status: 'Approved'
    },
    {
      id: 'art-002',
      title: 'Checking household power supply during solar outage',
      category: 'General',
      body: 'On-Grid solar inverters are required by electrical safety regulations to turn off automatically when the utility grid is disconnected (anti-islanding). If your solar system shows zero generation, verify whether neighboring buildings have utility grid power. Once grid power returns, your inverter will resume after 300 seconds.',
      status: 'Approved'
    },
    {
      id: 'art-003',
      title: 'Locating your product serial numbers',
      category: 'Equipment',
      body: 'Serial numbers are located on silver barcode stickers on the side or bottom panel of your inverter and battery unit. The inverter serial begins with INV-SN, panels with PAN-SN, and batteries with BAT-SN. You can also view them in your portal under My Warranties.',
      status: 'Approved'
    }
  ],

  // 15. AI Telemetry Log
  aiRequests: []
};
