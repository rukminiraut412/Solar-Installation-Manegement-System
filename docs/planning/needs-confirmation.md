# NEEDS CONFIRMATION [NC] REGISTER & CONFIGURATION AUDIT
**Project:** Solar Installation Management System (SunPower Solutions)  
**Document Version:** 1.0.0  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md`  

---

## 1. Principles of Configuration & Governance

In strict accordance with architectural directives:
- **No business policy is permanently hardcoded.**
- All unconfirmed business policies are cataloged with an explicit `[NC]` identifier.
- Every `[NC]` item provides:
  1. The exact open question for the SunPower Solutions stakeholders.
  2. The recommended configurable architectural implementation (database/system settings table).
  3. The clearly marked **DEMO** fallback value used during development and testing until explicit client confirmation is received.

---

## 2. Needs Confirmation [NC] Inventory

### [NC-001] Advance Payment Percentage Policy
- **Open Question:** What exact percentage of the total quotation value is mandatory as an advance payment before warehouse packing and crew dispatch begin?
- **Specification Finding:** Section 3 states: *"A customer usually pays an advance, or the full amount, before work starts."* Exact percentage is not fixed.
- **Recommended Architecture:** Store advance percentage in `system_settings` table as `default_advance_payment_percentage` with per-quotation override capability by Sales Manager / Director.
- **DEMO Default Value:** **`[DEMO] 25% Advance Payment`** (with alternative toggle for 100% Full Payment upfront).

---

### [NC-002] Payment Gates & Order Milestones
- **Open Question:** What are the exact milestone gates where work must halt if payments are overdue? Is the final balance collected immediately upon physical installation sign-off, or within net-15/net-30 credit terms?
- **Specification Finding:** Section 3 states dispatch occurs after advance, and month-end reviews advance payments vs finished steps.
- **Recommended Architecture:** Configurable 2-stage or 3-stage milestone gate engine in `payment_milestone_templates`:
  - Milestone 1: Advance upon quote acceptance (blocks packing & dispatch).
  - Milestone 2: Balance payment upon customer handover sign-off (blocks final commercial tax invoice release).
- **DEMO Default Value:** **`[DEMO] 25% Advance (Gate: Pre-Dispatch) + 75% Handover Balance (Gate: Handover Sign-off)`**.

---

### [NC-003] Warranty Responsibility (Manufacturer vs Installer)
- **Open Question:** When an inverter, battery, or panel fails under warranty, does SunPower Solutions perform free on-site replacement directly from warehouse stock and claim vendor RMA later, or does the customer wait for manufacturer replacement approval?
- **Specification Finding:** Section 3 states: *"If it is [under warranty], the repair or replacement should cost the customer nothing."*
- **Recommended Architecture:** Dual-tier warranty policy table `warranty_policies`:
  - `Labor & Site Visit:` Borne 100% by SunPower Solutions for initial 12/24 months.
  - `Equipment Replacement:` Borne by OEM (Luminous / Microtek / Waaree / Adani) via RMA credit.
- **DEMO Default Value:** **`[DEMO] Direct replacement from SunPower buffer stock with parallel vendor RMA claim`**.

---

### [NC-004] Warranty Durations by Component Type
- **Open Question:** What are the exact warranty durations for every equipment category? Does the inverter warranty distinguish between residential string inverters and commercial three-phase inverters?
- **Specification Finding:** Section 3 mentions *"for example 2 years for an inverter or battery, and 20 years for solar panels."*
- **Recommended Architecture:** Configurable warranty duration matrix in database table `product_warranty_rules`:
  - Panels: `performance_warranty_months = 240` (20 Years)
  - Inverters: `replacement_warranty_months = 24` (2 Years)
  - Batteries: `replacement_warranty_months = 24` (2 Years)
  - Workmanship / Wiring: `workmanship_warranty_months = 12` (1 Year)
- **DEMO Default Value:** **`[DEMO] Solar Panels: 20 Years (240 mos), Inverter: 2 Years (24 mos), Battery: 2 Years (24 mos), Installation Labor: 1 Year (12 mos)`**.

---

### [NC-005] Warranty Start Event Policy
- **Open Question:** What exact operational milestone triggers the official start date of the warranty clock? Does it start on the dispatch date from the warehouse, or on the date of customer physical handover and signature?
- **Specification Finding:** Section 3 states *"The moment a delivery is done, the warranty clock should start by itself"* while also stating *"Homeowner signs on the screen to accept the work. The company should have clear proof of the job."*
- **Recommended Architecture:** Configurable trigger event setting `warranty_start_trigger_event`:
  - Option A: `DISPATCH_DELIVERY_CONFIRMED`
  - Option B: `CUSTOMER_HANDOVER_SIGNED` (Recommended for customer satisfaction)
- **DEMO Default Value:** **`[DEMO] CUSTOMER_HANDOVER_SIGNED`** (Fallback to `DISPATCH_DATE` if handover is delayed > 7 days).

---

### [NC-006] Taxes, GST Rates & Composite Solar Invoicing
- **Open Question:** What exact GST rates and SAC/HSN codes should be applied? In India, solar projects frequently operate under a composite 70:30 valuation scheme (70% hardware @ 12% GST and 30% service/erection @ 18% GST, creating an effective ~13.8% composite rate), or a flat 12% rate.
- **Specification Finding:** Section 3 mentions *"There are also invoices to send"*. GST rates are not explicitly mandated.
- **Recommended Architecture:** Multi-tier tax engine in `tax_configurations` table supporting:
  - Flat GST rate (e.g., 12.0%).
  - Composite GST split (70% Hardware @ 12% + 30% Installation Service @ 18%).
- **DEMO Default Value:** **`[DEMO] Flat 12.0% GST (CGST 6.0% + SGST 6.0% for intra-state Gujarat)`**.

---

### [NC-007] Government Subsidy Eligibility & Paperwork Rules
- **Open Question:** What specific subsidy rules apply to SunPower's customers? Are residential installations governed by the national PM Surya Ghar: Muft Bijli Yojana (e.g. ₹30,000 for 1kW, ₹60,000 for 2kW, ₹78,000 for 3kW to 5kW), and does the customer pay net of subsidy or wait for direct benefit transfer (DBT)?
- **Specification Finding:** Section 3 states *"asking for a 3 kW system under the subsidy"* and *"government subsidy paperwork to track"*.
- **Recommended Architecture:** Subsidy scheme rules table `subsidy_schemes` storing benchmark rates and disbursement modes:
  - Mode 1: Direct Benefit Transfer (Customer pays SunPower in full; government credits subsidy directly to customer's bank).
  - Mode 2: Net of Subsidy (Customer pays balance; installer claims subsidy from DISCOM).
- **DEMO Default Value:** **`[DEMO] PM Surya Ghar DBT Scheme: 1kW = ₹30k, 2kW = ₹60k, 3kW-5kW = ₹78k. Customer pays SunPower full contract; subsidy credited directly to homeowner account via DBT`**.

---

### [NC-008] Statutory Payroll & Technician Compensation Formula
- **Open Question:** How are the 15 field technicians compensated? Are they paid a fixed monthly salary with overtime, an hourly rate based on verified job start/finish timestamps, or a piece-rate per kilowatt (kW) installed?
- **Specification Finding:** Section 3 states *"technician hours and unfinished steps for customers are scattered across notebooks... technicians to pay."*
- **Recommended Architecture:** Configurable payroll engine in `technician_compensation_rules` supporting:
  - Rate Type: `HOURLY` (e.g. ₹250/hour based on job time) OR `PER_KW_INSTALLED` (e.g. ₹1,500/kW) OR `FIXED_MONTHLY_PLUS_PER_JOB`.
- **DEMO Default Value:** **`[DEMO] Base compensation: ₹250 / verified on-site installation hour, with ₹500 completion bonus per passed inspection`**.

---

### [NC-009] Service Ticket SLA Durations & Priority Escalation
- **Open Question:** What are the agreed Service Level Agreement (SLA) response and resolution time windows for customer service calls?
- **Specification Finding:** Section 3 states *"Eighteen months later, it is pouring and a customer calls: the inverter is showing a fault code and there is zero power."*
- **Recommended Architecture:** SLA configuration matrix `support_sla_rules`:
  - Critical (Zero Power / Electrical Hazard): Response <= 4 hours, Resolution <= 24 hours.
  - High (Single String Down / Partial Generation): Response <= 12 hours, Resolution <= 48 hours.
  - Normal (Monitoring / App / Inquiries): Response <= 24 hours, Resolution <= 72 hours.
- **DEMO Default Value:** **`[DEMO] Zero Power: 24h resolution SLA; Inverter Fault: 48h resolution SLA; Minor Query: 72h resolution SLA`**.

---

### [NC-010] AI Provider Selection & Customer PII Privacy Approval
- **Open Question:** Is SunPower Solutions authorized to send anonymized equipment fault data to third-party commercial LLM providers (e.g. OpenAI / Anthropic), or must the platform operate strictly using an on-premise/local model or rule-based mock provider?
- **Specification Finding:** Architectural specification states *"Mock AI provider by default"* and strict prohibition of consequential AI actions.
- **Recommended Architecture:** Pluggable AI adapter layer:
  - Provider 1: `MockAIProvider` (Default for local testing, CI/CD, and demo — deterministic responses, zero external network calls, zero cost, 100% privacy).
  - Provider 2: `OpenAIAdapter` / `AnthropicAdapter` (Optional, activated only via environment variables `AI_PROVIDER=openai` and `ENABLE_EXTERNAL_AI_PII_CONSENT=true`).
- **DEMO Default Value:** **`[DEMO] MockAIProvider enabled by default with realistic grounded inverter troubleshooting manuals and zero external data sharing`**.
