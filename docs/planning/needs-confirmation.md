# Solar Installation Management System
## Needs Confirmation (NC) Register & Configuration Guidelines

**Document Version:** 1.0  
**Status:** Approved Architectural Baseline  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md` (§23 Open Questions and Needs Confirmation, §1.3 Principle P6)

---

## 1. Governance Principles for Unconfirmed Policy

Per Design Principle P6 (**Do not invent business policy**), the engineering team is strictly prohibited from hard-coding unconfirmed commercial, legal, statutory, or operational assumptions. 

Instead, every item designated as **[NC]** in the specification is managed as an entry in the dynamic `system_settings` repository or package/terms data tables. For the hackathon demonstration, well-calibrated baseline settings are seeded and prominently tagged as **[DEMO]**.

---

## 2. Comprehensive Needs Confirmation (NC) Register

### NC-01: Advance Payment Rule & Fulfillment Gates
- **Specification Section**: §7.3, §10.2 (Stage 10), §16.5, §17.1, §17.7, §23
- **Unconfirmed Business Policy**: 
  1. What is the standard advance payment requirement (fixed percentage, fixed amount, or zero)?
  2. What payment threshold is required before inventory can be reserved (`allocation_requires`)?
  3. What payment threshold is required before materials can be dispatched to site (`dispatch_requires`)?
- **Why It Cannot Be Hard-Coded**: Solar installation companies vary widely: some demand 20% advance before ordering parts and 70% before dispatch; others require 100% upfront financing. Hard-coding a static percentage would break flexibility.
- **Recommended Configurable Architecture**: Key-value settings in `system_settings` under group `payment_policy`:
  - `advance_rule_type`: `PERCENTAGE` | `FIXED_AMOUNT` | `NONE`
  - `advance_rule_value`: Number (e.g. 20 for 20%)
  - `allocation_requires`: `ORDER_CONFIRMED` | `ADVANCE_VERIFIED` | `FULL_PAYMENT` | `ADMIN_EXCEPTION`
  - `dispatch_requires`: `ADVANCE_VERIFIED` | `FULL_PAYMENT` | `ADMIN_EXCEPTION`
  - `allow_full_payment_upfront`: Boolean
- **Demo Baseline Value [DEMO]**:
  - `advance_rule_type`: `PERCENTAGE`
  - `advance_rule_value`: `20` (20% advance)
  - `allocation_requires`: `ADVANCE_VERIFIED`
  - `dispatch_requires`: `ADVANCE_VERIFIED`
  - `allow_full_payment_upfront`: `true`

---

### NC-02: Warranty Activation Event & Delivery Definition
- **Specification Section**: §7.3, §7.5, §10.2 (Stage 20), §16.8, §23
- **Unconfirmed Business Policy**:
  1. What exact business event triggers the start of the warranty timeline?
  2. Does "delivery" mean physical equipment arrival at customer site, or official commissioning handover?
- **Why It Cannot Be Hard-Coded**: The problem statement specifies that warranty "begins after delivery" [SRC]. In field operations, delivery of boxes may occur 3 to 10 days before the technician completes wiring and commissioning.
- **Recommended Configurable Architecture**: Setting in `system_settings` under `warranty_policy`:
  - `warranty_start_event`: `DELIVERY` | `INSTALLATION_COMPLETION` | `COMMISSIONING`
- **Demo Baseline Value [DEMO]**:
  - `warranty_start_event`: `DELIVERY` (Physical site delivery confirmation via dispatch note).

---

### NC-03: Product-Specific Warranty Durations
- **Specification Section**: §7.5, §15.2, §16.8, §23
- **Unconfirmed Business Policy**: What are the authoritative warranty durations for each serialized product category?
- **Why It Cannot Be Hard-Coded**: Manufacturer warranties depend on supplier vendor agreements. For example, microinverters may have 10-year warranties while string inverters have 2 years.
- **Recommended Configurable Architecture**: Seeded entries in `warranty_terms` table linked by product category or SKU.
- **Demo Baseline Value [DEMO]**:
  - Inverters: `24` months (2 years) [SRC example]
  - Batteries: `24` months (2 years) [SRC example]
  - Solar Panels: `240` months (20 years) [SRC example]
  - Workmanship (Installer): `12` months (1 year)

---

### NC-04: Manufacturer vs Installer Warranty Responsibility & Workmanship Scope
- **Specification Section**: §7.5, §7.6, §23
- **Unconfirmed Business Policy**: Who bears the labor and replacement cost for in-warranty failures? Does the installer cover labor while the manufacturer supplies replacement parts?
- **Why It Cannot Be Hard-Coded**: RMA contracts dictate whether manufacturers reimburse installer labor. Without signed commercial agreements, assumptions would corrupt project P/L.
- **Recommended Configurable Architecture**: Columns `party` (`MANUFACTURER` vs `INSTALLER`) and `coverage_scope` (`PARTS`, `LABOR`, `BOTH`) on `warranty_terms`.
- **Demo Baseline Value [DEMO]**:
  - Inverter / Battery / Panels: Party = `MANUFACTURER`, Scope = `PARTS`
  - Workmanship: Party = `INSTALLER`, Scope = `LABOR`

---

### NC-05: Pricing, Taxes (GST), Labor Rates & Discount Thresholds
- **Specification Section**: §7.2, §7.7, §16.4, §23
- **Unconfirmed Business Policy**:
  1. What are the specific sales tax/GST rates on solar equipment vs installation services?
  2. What is the standard hourly cost rate for technicians?
  3. At what discount percentage is Admin approval mandatory?
  4. What inventory costing method is utilized (FIFO vs Weighted Average)?
- **Why It Cannot Be Hard-Coded**: Tax codes and labor wage rates are statutory and corporate-specific.
- **Recommended Configurable Architecture**:
  - `system_settings` -> `tax_rate_percent`: 0 (or configured number)
  - `technicians.cost_rate_paise`: Integer paise per technician (Admin visible)
  - `system_settings` -> `max_sales_discount_percent`: Number
  - `system_settings` -> `inventory_costing_method`: `ACTUAL_SERIAL` for serialized, `WEIGHTED_AVERAGE` for bulk
- **Demo Baseline Value [DEMO]**:
  - `tax_rate_percent`: `0` (Tax calculation omitted from baseline per §4.3 X-03)
  - `technician_cost_rate`: `500000` paise (₹500 / hr)
  - `max_sales_discount_percent`: `5` (Discounts > 5% require Admin approval)
  - `inventory_costing_method`: `ACTUAL_SERIAL`

---

### NC-06: Government Subsidy Paperwork & Eligibility Rules
- **Specification Section**: §4.3 (X-03), §7.7, §11.4 (`S-93`), §23
- **Unconfirmed Business Policy**: What are the legal eligibility criteria, national portal documentation rules, and disbursement timelines for solar rooftop subsidies (e.g., PM Surya Ghar)?
- **Why It Cannot Be Hard-Coded**: Subsidy guidelines change frequently through ministry notifications. The specification explicitly declares statutory subsidy eligibility determination as OUT OF SCOPE (§4.3 X-03).
- **Recommended Configurable Architecture**: Document status tracker only:
  - Status progression: `Not Applicable → Documents Pending → Submitted → Under Review → Approved → Disbursed`
  - Document checklist configurable in `system_settings` -> `subsidy_document_checklist`
- **Demo Baseline Value [DEMO]**:
  - Tracker enabled with sample documents: Electricity Bill, Aadhaar Card, Bank Passbook, Rooftop Photo. Zero automatic eligibility computation.

---

### NC-07: Technician Payroll Compliance & Statutory Deductions
- **Specification Section**: §4.3 (X-03), §7.7, §11.4 (`S-92`), §23
- **Unconfirmed Business Policy**: What are the company's statutory payroll deduction rules (PF, ESI, TDS, professional tax)?
- **Why It Cannot Be Hard-Coded**: Formal payroll compliance is legally bound to regional labor regulations and explicitly declared out of scope (§4.3 X-03).
- **Recommended Configurable Architecture**: Simple working hours aggregation:
  - `gross_paise = approved_hours * cost_rate_paise`
- **Demo Baseline Value [DEMO]**:
  - Pay tracking shows Gross Pay based on logged clock-in/out hours. Statutory withholdings are labeled "Excluded - Out of Scope".

---

### NC-08: Partner Role Scope & Nationwide Network Requirements
- **Specification Section**: §3 (Problem 8), §4.2, §6.5, §11.4 (`S-110`), §23
- **Unconfirmed Business Policy**: Does SunPower Solutions operate a formal third-party dealer/partner installation network?
- **Why It Cannot Be Hard-Coded**: Master prompt mentions partner coordination as Problem 8, but notes the fictional company installs ~40 systems/month with 15 internal technicians. A full nationwide partner network is Out of Scope (§4.3 X-01).
- **Recommended Configurable Architecture**: Lightweight optional module:
  - `system_settings` -> `partner_module_enabled`: Boolean
  - Minimal `partners` and `partner_assignments` tables with restricted external partner role (§6.5).
- **Demo Baseline Value [DEMO]**:
  - `partner_module_enabled`: `true` (Configured with 1 demo partner to demonstrate capability, but isolated from core flows).

---

### NC-09: AI Provider, Model Selection & External Privacy Approval
- **Specification Section**: §4.3 (X-08), §8.1, §8.3, §14.8, §19, §23
- **Unconfirmed Business Policy**: Has the company executive leadership approved sending customer names, phone numbers, site addresses, or equipment telemetry to an external LLM provider (e.g., OpenAI, Anthropic, Google)?
- **Why It Cannot Be Hard-Coded**: Exporting proprietary business or customer PII to external third-party AI APIs without a documented Data Processing Agreement (DPA) violates basic privacy guardrails.
- **Recommended Configurable Architecture**: Multi-provider adapter pattern:
  - `AI_PROVIDER`: `mock` | `disabled` | `external`
  - `AI_EXTERNAL_ALLOWED`: Boolean flag (default `false`)
- **Demo Baseline Value [DEMO]**:
  - `AI_PROVIDER`: `mock` (Deterministic rule-based templates). All demo summaries and triage advice execute locally in Node.js without network calls or external data leakage.

---

### NC-10: Offline Field Operation Capabilities
- **Specification Section**: §4.2, §7.4, §23
- **Unconfirmed Business Policy**: Must technician and survey mobile workflows support full offline operation with local IndexedDB sync?
- **Why It Cannot Be Hard-Coded**: Rooftop sites occasionally experience poor cellular connectivity, but offline sync engines add significant architectural complexity.
- **Recommended Configurable Architecture**: Online-first responsive web application with a client-side photo upload retry queue and temporary canvas signature caching.
- **Demo Baseline Value [DEMO]**:
  - Online-first responsive web application with client-side retry handling. Full offline service-worker sync deferred to optional enhancements (§4.2).

---

### NC-11: Support Priorities, SLA Durations & Escalation Timers
- **Specification Section**: §9.3, §11.4 (`S-83`), §23
- **Unconfirmed Business Policy**: What are the binding contractual response times and resolution SLAs for P1, P2, P3, and P4 support cases?
- **Why It Cannot Be Hard-Coded**: Customer service level agreements depend on customer tier and warranty service package.
- **Recommended Configurable Architecture**: Configuration object in `system_settings` under `support_sla`:
  - `p1_response_hours`: Number
  - `p2_response_hours`: Number
  - `p3_response_hours`: Number
  - `p4_response_hours`: Number
- **Demo Baseline Value [DEMO]**:
  - P1 (Critical Safety): Response within `1` hour; alert immediately.
  - P2 (High / System Down): Response within `4` hours.
  - P3 (Normal / Performance): Response within `24` hours.
  - P4 (Low / How-To): Response within `48` hours.

---

### NC-12: Mandatory Admin Approval for Every Technician Assignment
- **Specification Section**: §9.2, §23
- **Unconfirmed Business Policy**: Is Admin authorization required for EVERY technician service job assignment, or only for major repairs exceeding a certain estimated cost?
- **Why It Cannot Be Hard-Coded**: Small operations may allow senior Support leads to dispatch technicians directly, while tightly managed firms require owner sign-off.
- **Recommended Configurable Architecture**: Setting in `system_settings`:
  - `require_admin_approval_for_assignment`: `ALWAYS` | `MAJOR_ONLY` | `NEVER`
- **Demo Baseline Value [DEMO]**:
  - `require_admin_approval_for_assignment`: `ALWAYS` (Demonstrates full human-in-the-loop escalation chain).

---

### NC-13: External Communication Delivery Channels
- **Specification Section**: §4.2, §18, §23
- **Unconfirmed Business Policy**: Are active production credentials for WhatsApp Business API, Twilio SMS, or SendGrid SMTP provisioned for this deployment?
- **Why It Cannot Be Hard-Coded**: External delivery gateways require paid accounts, sender phone numbers, and approved message templates.
- **Recommended Configurable Architecture**: Dual-layer notification engine:
  - In-app notification hub (always active).
  - Outbox journal table (`notification_outbox`) capturing simulated external dispatches.
- **Demo Baseline Value [DEMO]**:
  - In-app notifications enabled. External channels recorded in `notification_outbox` with status `Simulated - not sent` and displayed on screen `S-109`.

---

### NC-14: Site Survey Approval Authority & Surveyor Separation of Duties
- **Specification Section**: §6.2, §7.2, §23
- **Unconfirmed Business Policy**: Who is authorized to approve site surveys? Can Sales approve surveys under 3 kW? Must the approver be distinct from the person who performed the survey?
- **Why It Cannot Be Hard-Coded**: Segregation of duties prevents commercial bias (e.g. Sales approving an unsuitable shaded roof just to book a commission).
- **Recommended Configurable Architecture**: Configurable permission string:
  - Default permission: `survey.approve` assigned to Admin role.
  - Setting: `enforce_surveyor_approver_separation`: Boolean.
- **Demo Baseline Value [DEMO]**:
  - Approver: Admin role only.
  - `enforce_surveyor_approver_separation`: `true`.

---

### NC-15: Operational Service Area & Out-of-Band System Sizes
- **Specification Section**: §7.1, §23
- **Unconfirmed Business Policy**: What are the geographical boundaries of the company's service area (PIN codes)? How should enquiries requesting system sizes > 5 kW (e.g. 10 kW or 50 kW) be handled?
- **Why It Cannot Be Hard-Coded**: SunPower Solutions focuses on residential and small factory systems (1–5 kW) [SRC]. Out-of-area or large commercial leads might either be rejected or routed to an enterprise sales lead.
- **Recommended Configurable Architecture**:
  - `system_settings` -> `allowed_pin_prefixes`: Array of strings
  - Leads > 5 kW allowed with UI warning: "Capacity exceeds standard 5 kW band — Admin review required".
- **Demo Baseline Value [DEMO]**:
  - Open PIN code acceptance. Enquiries > 5 kW permitted with informational warning badge.

---

### NC-16: Repeat Enquiry & Case Reopen Time Windows
- **Specification Section**: §7.1, §9.5, §23
- **Unconfirmed Business Policy**: Within how many days does a new enquiry from an existing customer count as a "Repeat Lead"? Within how many days after closure can a customer reopen a service case without logging a fresh complaint?
- **Why It Cannot Be Hard-Coded**: Window parameters vary by CRM policy.
- **Recommended Configurable Architecture**:
  - `system_settings` -> `repeat_enquiry_window_days`: Number
  - `system_settings` -> `case_reopen_window_days`: Number
- **Demo Baseline Value [DEMO]**:
  - `repeat_enquiry_window_days`: `30` days
  - `case_reopen_window_days`: `14` days

---

### NC-17: Serialized Inventory Product Categories
- **Specification Section**: §7.3, §15.2, §23
- **Unconfirmed Business Policy**: Which exact product categories must be tracked by unique serial numbers, and which are tracked as bulk quantities?
- **Why It Cannot Be Hard-Coded**: Inverters and batteries are universally serialized; mounting rails, cables, and earthing rods are tracked by meters/units; solar panels can be tracked either by individual barcode or bulk pallet.
- **Recommended Configurable Architecture**: Boolean flag `is_serialized` on the `products` table and category templates.
- **Demo Baseline Value [DEMO]**:
  - Serialized (`is_serialized = true`): Inverters, Batteries, Solar Panels.
  - Bulk / Non-Serialized (`is_serialized = false`): Mounting Structure, Cables, Protection AC/DC DB, Earthing Kits.

---

### NC-18: Quotation Validity Period & Default Terms Template
- **Specification Section**: §7.2, §16.4, §23
- **Unconfirmed Business Policy**: For how many days is a formal price quotation valid before expiration? What are the standard payment terms printed on the quotation?
- **Why It Cannot Be Hard-Coded**: Equipment market prices (especially solar cells and lithium batteries) fluctuate with global commodity prices.
- **Recommended Configurable Architecture**:
  - `system_settings` -> `quotation_validity_days`: Number
  - `system_settings` -> `quotation_terms_template`: Markdown string
- **Demo Baseline Value [DEMO]**:
  - `quotation_validity_days`: `30` days
  - Terms: "20% advance upon order acceptance; 80% balance upon equipment dispatch / installation completion."

---

### NC-19: Proxy Customer Confirmation & Auto-Closure Policy
- **Specification Section**: §9.2, §9.5, §23
- **Unconfirmed Business Policy**: Can Support staff record customer resolution confirmation on behalf of an elderly or offline customer? Can a resolved case auto-close if the customer fails to respond after N days?
- **Why It Cannot Be Hard-Coded**: Mandatory customer confirmation protects customers from premature ticket closing. However, non-responsive customers could leave cases open indefinitely.
- **Recommended Configurable Architecture**:
  - `allow_staff_proxy_confirmation`: Boolean (requires uploaded proof)
  - `case_auto_close_days`: Number (0 = disabled)
- **Demo Baseline Value [DEMO]**:
  - `allow_staff_proxy_confirmation`: `false` (Customer must click button on portal).
  - `case_auto_close_days`: `0` (Disabled by default; explicit confirmation required).

---

### NC-20: Replacement Serial Warranty Terms Inheritance
- **Specification Section**: §7.5, §23
- **Unconfirmed Business Policy**: When an inverter is replaced under warranty at month 18 of a 24-month term, does the replacement unit inherit the remaining 6 months of the original warranty, or does a fresh 24-month warranty clock begin?
- **Why It Cannot Be Hard-Coded**: Standard manufacturer policy inherits the remaining term; goodwill or paid replacements often grant a new warranty.
- **Recommended Configurable Architecture**: Setting in `system_settings`:
  - `replacement_warranty_rule`: `INHERIT_REMAINING` | `RESTART_FULL_TERM` | `CONFIGURABLE_PER_CLAIM`
- **Demo Baseline Value [DEMO]**:
  - `replacement_warranty_rule`: `INHERIT_REMAINING` (Replacement unit inherits the end date of the replaced unit).

---

### NC-21: Cancellation & Refund Policy Post-Advance Payment
- **Specification Section**: §17.8, §23
- **Unconfirmed Business Policy**: What cancellation fee is withheld if a customer cancels an order after the 20% advance is paid but before warehouse dispatch?
- **Why It Cannot Be Hard-Coded**: Forfeiture of deposit vs refund schedules are legal commercial policies. Automated refund processing is declared as Future Scope (§17.8).
- **Recommended Configurable Architecture**: Manual administrative reconciliation with reversing ledger entries.
- **Demo Baseline Value [DEMO]**:
  - Refund workflow is Out of Scope for hackathon. Order cancellation releases inventory reservations; financial refunds handled in Razorpay test dashboard with Admin manual reconciliation record.

---

### NC-22: Offline Manual Payment Acceptance
- **Specification Section**: §7.7, §16.5, §23
- **Unconfirmed Business Policy**: Does SunPower Solutions accept cash, paper cheques, or NEFT/RTGS bank transfers in addition to Razorpay online checkout?
- **Why It Cannot Be Hard-Coded**: Indian solar businesses often receive high-value payments via direct bank RTGS.
- **Recommended Configurable Architecture**:
  - `system_settings` -> `enable_offline_manual_payments`: Boolean
  - Dedicated endpoint `POST /payments/manual` requiring Admin role, transaction reference, and proof document upload.
- **Demo Baseline Value [DEMO]**:
  - `enable_offline_manual_payments`: `true` (Available to Admin with audit trail; primary demo focuses on Razorpay test mode).

---

### NC-23: Inventory Write-Off Authorization Thresholds
- **Specification Section**: §7.3, §16.6, §23
- **Unconfirmed Business Policy**: Can Warehouse managers write off minor damaged stock (e.g. broken cables < ₹1,000) without Admin sign-off?
- **Why It Cannot Be Hard-Coded**: Financial delegation of authority matrices vary by business size.
- **Recommended Configurable Architecture**:
  - `system_settings` -> `auto_write_off_limit_paise`: Number
- **Demo Baseline Value [DEMO]**:
  - `auto_write_off_limit_paise`: `0` (All stock write-offs regardless of value require explicit Admin approval).

---

### NC-24: Installation Scheduling Prerequisite Gates
- **Specification Section**: §7.4, §16.7, §23
- **Unconfirmed Business Policy**: Can an installation job be scheduled before materials have physically left the warehouse?
- **Why It Cannot Be Hard-Coded**: Some companies schedule crews ahead of time assuming delivery will occur; others forbid dispatching crew until materials are on site.
- **Recommended Configurable Architecture**: Setting in `system_settings`:
  - `installation_schedule_gate`: `MATERIALS_DISPATCHED` | `MATERIALS_DELIVERED` | `ADMIN_OVERRIDE`
- **Demo Baseline Value [DEMO]**:
  - `installation_schedule_gate`: `MATERIALS_DISPATCHED`

---

### NC-25: Overhead Allocation & Subsidy Income Recognition in Profitability
- **Specification Section**: §7.7, §23
- **Unconfirmed Business Policy**:
  1. Should general operating overheads (rent, management salaries) be allocated across installation projects?
  2. Does expected government subsidy count as project revenue at order time, or only when officially disbursed by DISCOM?
- **Why It Cannot Be Hard-Coded**: Managerial accounting versus statutory GAAP treatment differences.
- **Recommended Configurable Architecture**:
  - `system_settings` -> `include_overheads_in_profitability`: Boolean
  - `system_settings` -> `subsidy_revenue_recognition`: `AT_DISBURSEMENT` | `AT_APPROVAL` | `EXCLUDED`
- **Demo Baseline Value [DEMO]**:
  - `include_overheads_in_profitability`: `false` (Direct project costs only).
  - `subsidy_revenue_recognition`: `AT_DISBURSEMENT`

---

### NC-26: Hackathon Team Composition & Operational Roles
- **Specification Section**: §22, §23
- **Unconfirmed Business Policy**: What is the actual developer headcount, skill distribution, and time window for the hackathon build?
- **Why It Cannot Be Hard-Coded**: The architecture specification is implementation-ready regardless of team size.
- **Recommended Configurable Architecture**: Division of work structured into exactly 4 decoupled ownership groups (Member 1 Foundation, Member 2 Sales, Member 3 Operations, Member 4 Support/Finance/AI).
- **Demo Baseline Value [DEMO]**:
  - Executed across the 4 assigned engineering roles.

---

### NC-27: Brand Identity & Fictional Disclaimer
- **Specification Section**: §1.6, §5, §12.8, §23
- **Unconfirmed Business Policy**: Should the demo application use the name "SunPower Solutions" or a distinct modified name (e.g. "Solaria Solutions") to prevent judge confusion with the real US entity?
- **Why It Cannot Be Hard-Coded**: Legal trademark prudence versus hackathon case study fidelity.
- **Recommended Configurable Architecture**: Dynamic application title configurable in environment:
  - `VITE_APP_DISPLAY_NAME="SunPower Solutions (Case Study Demo)"`
  - Persistent global header/footer banner: "Fictional case-study demo — Not affiliated with any real SunPower company."
- **Demo Baseline Value [DEMO]**:
  - Name: `SunPower Solutions`; prominent fictional demo notices displayed across all public and internal screens.

---

### NC-28: Customer Portal Authentication Mechanism
- **Specification Section**: §4.2, §14.5, §23
- **Unconfirmed Business Policy**: Should customer portal login use standard email + password, or passwordless phone OTP via SMS?
- **Why It Cannot Be Hard-Coded**: SMS gateways incur per-message costs and require DLT registration in India.
- **Recommended Configurable Architecture**: Standard password auth default; OTP interface hook available (§14.5).
- **Demo Baseline Value [DEMO]**:
  - Email + Password login (`P-03`). Demo seed provides pre-configured credentials for sample customer.
