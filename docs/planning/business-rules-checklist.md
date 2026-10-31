# CRITICAL BUSINESS RULES & GATES CHECKLIST
**Project:** Solar Installation Management System (SunPower Solutions)  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md`  
**Document Version:** 1.0.0  

---

## 1. Overview of Business Rules & Architecture Guardrails

This checklist represents the binding operational logic for SunPower Solutions. Every rule listed here must be enforced across three defense layers:
1. **Frontend Layer:** UI state disabled/hidden, informative tooltips, pre-flight client validation.
2. **Backend API Layer:** Service-level transactional invariants, Zod schema validation, RBAC checks.
3. **Database Layer:** Foreign key cascades, UNIQUE constraints, CHECK constraints, immutable triggers.

---

## 2. Comprehensive Business Rules Checklist

### 1. LEAD & SURVEY GOVERNANCE RULES

- [ ] **BR-SRV-001: Preliminary Lead Qualification Gate**
  - **Rule:** A Site Survey CANNOT be scheduled unless preliminary qualification checks (shadow-free roof space >= 100 sq ft, monthly electricity bill >= ₹1,500, grid connection stability) are marked 'PASSED'.
  - **Enforcement:** API endpoint `POST /api/sales/surveys/schedule` checks `customer.preliminary_qualification == 'PASSED'`. Rejects with `400 Bad Request` if failed.
  - **Database:** `CHECK (preliminary_qualification IN ('PASSED', 'FAILED', 'PENDING'))`.
  - **Audit:** Qualification decision recorded with agent ID.

- [ ] **BR-SRV-002: Survey Engineering Approval Prerequisite for Quotations**
  - **Rule:** A Quotation CANNOT be generated or sent to a customer until the physical Site Survey has been reviewed and marked 'APPROVED' by engineering/sales management.
  - **Enforcement:** `POST /api/sales/quotations` queries `site_surveys.status` for the customer. If status != 'APPROVED', request fails with `403 Forbidden` (`SURVEY_NOT_APPROVED`).
  - **Database:** Foreign key `quotations.survey_id` references `site_surveys(id)` with database check trigger verifying survey status.
  - **Audit:** Survey approval event logged with reviewer notes.

- [ ] **BR-SRV-003: Survey Rework and Rejection Protocol**
  - **Rule:** A survey marked 'REWORK' must include a detailed reason (minimum 10 characters) and automatically reverts to the field technician's active job queue. Quotation creation remains locked.
  - **Enforcement:** `POST /api/sales/surveys/:id/rework` validates `reason.length >= 10`. Updates `site_surveys.status = 'REWORK'`.
  - **Database:** `CHECK (length(review_notes) >= 10)`.
  - **Audit:** Rejection/rework logged with author ID.

---

### 2. PACKAGES, BOM & QUOTATION RULES

- [ ] **BR-QTE-001: Automated BOM Derivation from Package Capacity**
  - **Rule:** All parts in the Bill of Materials (panels, inverter, stands, switches, wires, earthing kit, and battery if Off-Grid) must be derived automatically from the selected standard package (1 kW to 5 kW On-Grid or Off-Grid). Sales representatives are prohibited from typing hardware lists from memory.
  - **Enforcement:** `POST /api/sales/quotations/generate-bom` evaluates formulaic component counts:
    - On-Grid 1kW: 2x 540W panels, 1x 1kW inverter, 1 structure set, 20m cable, 1 earthing kit.
    - On-Grid 3kW: 6x 540W panels, 1x 3.3kW inverter, 2 structure sets, 35m cable, 2 earthing rods.
    - On-Grid 5kW: 10x 540W panels, 1x 5kW inverter, 3 structure sets, 50m cable, 2 earthing rods.
    - Off-Grid adds: battery bank (e.g. 48V 150Ah) and battery charge controller.
  - **Database:** `quotation_items.package_component_id` references authoritative package templates.
  - **Audit:** Generated BOM snapshot hashed and saved with quote version.

- [ ] **BR-QTE-002: Quotation Acceptance Prerequisite for Order Creation**
  - **Rule:** An Order and Project CANNOT be initialized unless the associated Quotation has been explicitly accepted by the customer (digitally signed or accepted online).
  - **Enforcement:** `POST /api/sales/orders/create-from-quote` verifies `quotations.status == 'ACCEPTED'`. Rejects with `400 Bad Request` if 'DRAFT', 'SENT', or 'DECLINED'.
  - **Database:** `orders.quotation_id` has UNIQUE constraint; check constraint ensures quote status is 'ACCEPTED'.
  - **Audit:** Quote acceptance captures customer IP, timestamp, and signature token.

- [ ] **BR-QTE-003: Quotation Expiration & Price Integrity**
  - **Rule:** Quotations have a strict validity window (default 15 days). Expired quotations cannot be accepted without revalidation by sales management.
  - **Enforcement:** Verification endpoint checks `quotations.valid_until >= CURRENT_DATE`. Returns `400 Quote Expired`.
  - **Database:** `CHECK (valid_until >= created_at)`.
  - **Audit:** Price lock and quote expiration dates recorded.

---

### 3. ADVANCE PAYMENT & ORDER GATES

- [ ] **BR-PAY-001: Advance Payment Prerequisite for Packing & Dispatch**
  - **Rule:** The warehouse packing order and installation crew dispatch CANNOT proceed until the required advance payment (e.g. 25% or full payment) has been verified and posted to the financial ledger.
  - **Enforcement:** `POST /api/operations/dispatch/create` and `POST /api/operations/installations/schedule` inspect `orders.payment_status`. Must equal 'ADVANCE_PAID' or 'FULLY_PAID'. Rejects with `403 Forbidden` (`ADVANCE_PAYMENT_REQUIRED`).
  - **Database:** Check constraint on `dispatch_orders` linked to paid order milestone.
  - **Audit:** Advance payment confirmation logged in financial audit trail.

- [ ] **BR-PAY-002: Backend Cryptographic Payment Verification**
  - **Rule:** No payment may be credited to an order or ledger based on frontend reporting alone. The backend MUST cryptographically verify the Razorpay HMAC SHA256 signature using the secret key before updating payment status.
  - **Enforcement:** `POST /api/finance/payments/razorpay/verify` calculates:
    `expected_sig = hmac_sha256(order_id + '|' + payment_id, secret)`. Rejects with `400 Bad Request` if signature mismatch.
  - **Database:** Stores `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` in `payment_transactions`.
  - **Audit:** Signature verification result logged with cryptographic status.

- [ ] **BR-PAY-003: Idempotent Webhook Processing (Duplicate Ledger Defense)**
  - **Rule:** Duplicate or replayed Razorpay webhooks MUST NOT generate duplicate customer credits, invoices, or ledger postings.
  - **Enforcement:** Webhook handler stores incoming `event_id` in `payment_webhooks` table with a UNIQUE constraint. If `event_id` already exists, immediately returns `200 OK` with `{ status: 'ALREADY_PROCESSED' }` without touching ledger.
  - **Database:** `CREATE UNIQUE INDEX idx_webhooks_event_id ON payment_webhooks(event_id)`.
  - **Audit:** Webhook receipt, payload hash, and duplicate bypass logged.

---

### 4. INVENTORY, RESERVATION & SERIAL TRACEABILITY

- [ ] **BR-INV-001: Available Stock Reservation Boundary**
  - **Rule:** Stock CANNOT be reserved beyond Available Quantity, where:
    `Available = On_Hand_Quantity - Total_Existing_Active_Reservations`.
  - **Enforcement:** `POST /api/operations/projects/:id/reserve-stock` executes in a database serializable transaction (`SELECT FOR UPDATE`). If `required_qty > available_qty`, reservation fails, project status transitions to 'SHORTAGE_FLAGGED', and a procurement alert is issued.
  - **Database:** `CHECK (reserved_quantity <= on_hand_quantity)` on ledger view.
  - **Audit:** Reservation creation or shortage flag logged with deficit quantity.

- [ ] **BR-INV-002: Mandatory Serial Scanning Before Warehouse Departure**
  - **Rule:** Every high-value unit (Inverter, Battery, Charge Controller) MUST have its physical serial number scanned and verified before the dispatch truck leaves the warehouse. No truck may depart with unscanned serial slots.
  - **Enforcement:** `POST /api/operations/dispatch/:id/confirm` checks that count of scanned verified serials matches exactly 100% of serialized items in the project BOM. If any item is missing, confirmation fails with `400 Incomplete Serial Scans`.
  - **Database:** Foreign keys ensure every `dispatch_item` marked serialized has an associated `serial_registry.id`.
  - **Audit:** Full dispatch manifest logged with vehicle number, driver, and complete serial list.

- [ ] **BR-INV-003: Global Serial Number Uniqueness & Single Project Assignment**
  - **Rule:** A serial number CANNOT be assigned to more than one active project or customer at any time.
  - **Enforcement:** Database unique constraint on `serial_registry.serial_number`. API checks `serial_registry.status == 'IN_WAREHOUSE'`. Rejects with `409 Conflict` if already assigned or installed.
  - **Database:** `UNIQUE (serial_number)` on `serial_registry`.
  - **Audit:** Serial assignment history logged in `serial_audit_history`.

---

### 5. ROOFTOP INSTALLATION, TESTING & HANDOVER

- [ ] **BR-OPS-001: Mobile Installation Prerequisite Checks**
  - **Rule:** Technicians must confirm physical system size matches the work order and record start timestamp before opening installation checklists. Checkpoints must be recorded sequentially.
  - **Enforcement:** `POST /api/operations/installations/:id/start` requires confirmed capacity.
  - **Database:** Timestamp `started_at` cannot be null when status is 'IN_PROGRESS'.
  - **Audit:** Start time, crew ID, and device metadata logged.

- [ ] **BR-OPS-002: Power Generation & Safety Testing Thresholds**
  - **Rule:** The physical installation CANNOT be completed without executing and passing the power generation and safety tests:
    1. Grid Voltage within operating window (210V - 250V AC).
    2. Solar Open Circuit Voltage (Voc) > 0.
    3. Active Inverter Generation > 0.0 kW (during daylight).
    4. Earthing Pit Resistance STRICTLY <= 5.0 Ohms.
  - **Enforcement:** `POST /api/operations/installations/:id/testing` enforces numerical bounds. If earthing > 5.0 Ohms or power = 0, test status is 'FAILED' and rework is triggered.
  - **Database:** `CHECK (earthing_resistance_ohms > 0 AND earthing_resistance_ohms <= 20)`.
  - **Audit:** Instrument readings, technician ID, and timestamp recorded.

- [ ] **BR-OPS-003: Failed Tests Trigger Mandatory Rework**
  - **Rule:** Any failed electrical or safety test automatically locks the job from customer handover, marks the job 'REWORK_REQUIRED', and logs a punch-list for the installation crew.
  - **Enforcement:** `POST /api/operations/installations/:id/complete` checks `installation_tests.status == 'PASSED'`. Rejects with `422 Unprocessable Entity` if failed or absent.
  - **Database:** Foreign key to passed test record required on handover certificate.
  - **Audit:** Rework cause and corrective action logged.

- [ ] **BR-OPS-004: Mandatory 4-Angle Photo Proof Upload**
  - **Rule:** Handover sign-off is STRICTLY LOCKED until verified photos for all 4 mandatory installation angles are uploaded to Cloudinary:
    1. Structure & Mounted Panels
    2. Inverter & Wiring Distribution Boxes
    3. Battery Bank (Off-Grid) / Controller
    4. Earthing Pit & Ground Connection
  - **Enforcement:** API verifies 4 distinct photo categories exist in `installation_photos` for the job before unlocking customer signature.
  - **Database:** Minimum 4 photo records required per completed job.
  - **Audit:** Photo URLs and timestamps stored in `media_attachments`.

- [ ] **BR-OPS-005: Customer On-Screen Handover Digital Signature Gate**
  - **Rule:** An installation job CANNOT be marked 'COMPLETED' or 'COMMISSIONED' without the customer's on-screen digital signature acknowledging satisfactory installation and functioning power generation.
  - **Enforcement:** `POST /api/operations/installations/:id/sign-handover` requires non-empty canvas signature data URL. Once signed, job status transitions to 'COMPLETED' and is locked from further modification.
  - **Database:** `digital_signatures` record linked to `installation_jobs` with hash.
  - **Audit:** Customer signature hash, customer name, timestamp, and IP/GPS logged in `audit_logs`.

---

### 6. WARRANTY ACTIVATION & POST-INSTALL LIFE

- [ ] **BR-WRN-001: Automated Serialized Warranty Activation**
  - **Rule:** The warranty clock for every installed serial number MUST start automatically upon installation completion/handover without requiring anyone to type dates into registers:
    - Solar Panels: 20 Years (240 Months) performance warranty.
    - Inverter: 2 Years (24 Months) manufacturer replacement warranty [Configurable].
    - Battery: 2 Years (24 Months) cycle warranty [Configurable].
  - **Enforcement:** Job completion event triggers `warranty.service.activateProjectSerials()`. Expiration date is calculated as: `start_date + INTERVAL 'duration_months'`.
  - **Database:** `warranty_records.end_date = start_date + INTERVAL ...`.
  - **Audit:** Warranty activation event logged with all serials and computed end dates.

- [ ] **BR-WRN-002: Warranty-Based Service Pricing Contract**
  - **Rule:** When a customer logs a service ticket:
    - If equipment is UNDER WARRANTY: Repair/replacement parts and labor MUST be billed at ₹0 to the customer.
    - If equipment is WARRANTY EXPIRED: Replacement parts and technician visit MUST be automatically billed based on standard price schedules.
    - Manual price waivers require explicit Director approval.
  - **Enforcement:** `POST /api/support/tickets/:id/verify-warranty` compares ticket incident date against `warranty_records.end_date`. Auto-sets `service_charge = 0` if valid; generates itemized bill if expired.
  - **Database:** `service_estimates.warranty_covered` boolean flag.
  - **Audit:** Warranty verification result and price computation logged in `audit_logs`.

- [ ] **BR-SUP-001: Customer Resolution Confirmation Gate for Ticket Closure**
  - **Rule:** A support ticket CANNOT be marked 'CLOSED' by a support agent unilaterally. The customer must confirm that the system is functioning properly (via online confirmation, SMS link, or recorded confirmation).
  - **Enforcement:** `PUT /api/support/tickets/:id/status` blocks transition to 'CLOSED' unless `customer_confirmed == true`. Agent can only set status to 'RESOLVED' (pending customer confirmation).
  - **Database:** `CHECK (status != 'CLOSED' OR customer_confirmed_at IS NOT NULL)`.
  - **Audit:** Customer sign-off timestamp and feedback score recorded.

---

### 7. FINANCE, PROFITABILITY & EXECUTIVE GOVERNANCE

- [ ] **BR-FIN-001: Authoritative Data Accuracy (No Fake Mock Metrics)**
  - **Rule:** All dashboard totals, revenue figures, cost calculations, and profit margins MUST derive strictly from authoritative underlying database records:
    - Revenue = Sum of settled GST invoices (`invoices.total_amount`).
    - Hardware Cost = Sum of actual unit costs of scanned/reserved BOM parts from `inventory_ledger`.
    - Labor Cost = Sum of verified technician timesheet hours x rate.
    - Incidentals = Sum of approved `project_expenses`.
    - Net Margin % = `((Revenue - Total Costs) / Revenue) * 100`.
  - **Enforcement:** Dashboard service queries analytical SQL view `v_project_profitability`. No hardcoded dummy values in production.
  - **Database:** Real-time aggregated view with database constraints.
  - **Audit:** Access to company profitability metrics restricted to Director and audited.

---

### 8. ARTIFICIAL INTELLIGENCE (AI) RESTRICTIONS & GUARDRAILS

- [ ] **BR-AI-001: Strict Prohibition of Consequential AI Actions**
  - **Rule:** The AI Copilot / LLM service is STRICTLY ADVISORY. Under no circumstances may an AI agent:
    1. Issue financial refunds or alter prices.
    2. Approve or reject site surveys.
    3. Authorize warehouse truck dispatches.
    4. Close support tickets unilaterally.
    5. Alter warranty durations or records.
  - **Enforcement:** API middleware rejects any mutating database operation originating from AI worker tokens or endpoints. AI service methods are strictly read-only and return textual recommendations.
  - **Database:** AI service runs with read-only database user credentials.
  - **Audit:** All AI suggestions logged with prompt, grounded source doc, generated text, and human reviewer action.

- [ ] **BR-AI-002: Grounded Explanations for Fault Codes**
  - **Rule:** Inverter fault code explanations and troubleshooting recommendations generated by AI MUST be grounded strictly in manufacturer equipment manuals stored in the knowledge base. If no grounded documentation exists, AI must return: "Unknown fault code. Please refer to certified manufacturer technician."
  - **Enforcement:** Prompt engineering with RAG context grounding and strict hallucination guardrails.
  - **Database:** Knowledge base references recorded in `ai_audit_logs`.
  - **Audit:** Full prompt and response recorded for quality inspection.
