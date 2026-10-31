# Solar Installation Management System
## Master Business Rules & Enforcement Checklist

**Document Version:** 1.0  
**Status:** Approved Architectural Baseline  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md` (Single Source of Truth)

---

## 1. Executive Summary & Verification Matrix

This document provides an exhaustive, authoritative checklist of every deterministic business rule, validation guardrail, and state invariant specified across the platform. Every rule listed must be enforced by backend application code, database constraints, or cryptographic procedures—never left to client-side logic or AI models.

| Rule Category | Count of Rules | Primary Enforcement Mechanism | Test Verification Reference |
|---|---|---|---|
| Platform & Core Conventions | 6 Rules | DB Constraints & Middleware | `T-01`, `T-AUD-02`, `T-ENV-01` |
| Module 1: Customer & Enquiry | 7 Rules | API Services & Unique Indexes | `T-02`, `T-03`, `T-CUS-02` |
| Module 2: Survey & Quotation | 11 Rules | Service Guards & DB Triggers | `T-05`, `T-06`, `T-07`, `T-08`, `T-BOM-01` |
| Module 3: Inventory & Warehouse | 12 Rules | DB CHECK Constraints & Locks | `T-09`, `T-10`, `T-11`, `T-12`, `T-13` |
| Module 4: Installation & Crew | 9 Rules | Completion Validator & FSM | `T-14`, `T-15`, `T-JOB-01` |
| Module 5: Warranty Management | 8 Rules | Backend Eligibility Engine | `T-16`, `T-17`, `T-WAR-02` |
| Module 6 & §9: Support & Service | 14 Rules | State Machine & Safety Interceptor | `T-18`, `T-19`, `T-21`, `T-40`, `T-44`, `T-47` |
| Module 7 & §17: Payments & Finance | 14 Rules | HMAC Signatures & Ledger Math | `T-22`, `T-23`, `T-25`, `T-28`, `T-30`, `T-33` |
| Section 8: AI Layer Boundaries | 9 Rules | Output Validator & Caller Scope | `T-35`, `T-36`, `T-37`, `T-38`, `T-39` |
| **Total Tracked Rules** | **90 Rules** | **Full System Coverage** | **All Acceptance Criteria Met** |

---

## 2. Platform Foundation & Cross-Cutting Conventions

- [ ] **BR-FND-01: Immutable Financial, Audit, Serial & Warranty Records**  
  *Rule*: Financial ledgers (`payments`, `invoices`), audit entries (`audit_logs`), serialized items (`serial_items`), and warranty records (`warranty_records`) can NEVER be hard deleted. Corrections must be executed via documented reversing entries or administrative overrides with mandatory audit justification.  
  *Enforcement*: PostgreSQL permission grants prohibit `DELETE` statements on these tables; API service layers provide no delete operations.

- [ ] **BR-FND-02: Universal Integer Paise Currency Representation**  
  *Rule*: All monetary values must be stored, computed, and transferred as integer minor units (paise) in INR (`1 INR = 100 paise`). Floating-point arithmetic for currency is strictly prohibited.  
  *Enforcement*: PostgreSQL column types defined as `bigint` or `integer`; frontend formats paise to rupees for display only.

- [ ] **BR-FND-03: Optimistic Concurrency Locking**  
  *Rule*: Mutating operations on core entities (`customers`, `surveys`, `quotations`, `orders`, `jobs`, `cases`) must verify the entity `version` integer. If the record was modified by another transaction since retrieval, the update must fail with a conflict.  
  *Enforcement*: `UPDATE ... SET version = version + 1 WHERE id = :id AND version = :clientVersion`; returns 409 `VERSION_CONFLICT` if rows affected = 0.

- [ ] **BR-FND-04: Universal Status Transition Audit Trail**  
  *Rule*: Any status modification on an entity (`enquiries`, `surveys`, `quotations`, `orders`, `dispatches`, `jobs`, `warranties`, `cases`) must atomically record a row in `status_history` capturing `entity_type`, `entity_id`, `from_status`, `to_status`, `actor_user_id`, `reason`, and `at`.  
  *Enforcement*: Centralized `StatusHistoryService.record()` wrapped inside the entity's update transaction.

- [ ] **BR-FND-05: Deny-by-Default Role-Based Access Control**  
  *Rule*: Every API endpoint must enforce explicit permission checks. The absence of an explicit permission grant means access is denied. UI element hiding is purely cosmetic; backend strictly validates token and permission registry.  
  *Enforcement*: Express middleware `authenticate` and `requirePermission(permissionCode)`.

- [ ] **BR-FND-06: Strict Data Isolation for Field & Customer Roles**  
  *Rule*: Technicians can ONLY access jobs and equipment explicitly assigned to them. Customers can ONLY access records belonging to their own customer ID. Internal notes (`visibility = 'INTERNAL'`) and company cost rates/margins must NEVER be returned to customers, technicians, or external partners.  
  *Enforcement*: Row-level scoping middleware; response serializers stripping internal fields.

---

## 3. Module 1: Customer and Enquiry Management

- [ ] **BR-M1-01: Standardized Immutable Identifiers**  
  *Rule*: Customer codes (`CUS-XXXXXX`) and Enquiry codes (`ENQ-XXXXXX`) must be generated sequentially from database sequences and remain immutable once issued.  
  *Enforcement*: Backend ID generation utility backed by PostgreSQL sequences.

- [ ] **BR-M1-02: Mandatory Contact Details for Staff Leads**  
  *Rule*: Enquiries registered by internal staff (phone/WhatsApp) must include a valid phone number. Public web enquiries require a valid phone number or email address, plus full name and address.  
  *Enforcement*: Zod schema validation at the API boundary; rejects invalid submissions with 400 `VALIDATION_ERROR`.

- [ ] **BR-M1-03: Zero Public Leakage of Duplicate Matches**  
  *Rule*: Public web enquiry submissions must never reveal whether a matching phone or email already exists in the system (prevents customer harvesting). Duplicates are matched internally and flagged for staff review.  
  *Enforcement*: Public endpoint returns standard generic success response with the new enquiry reference code.

- [ ] **BR-M1-04: Staff Duplicate Detection & Override Justification**  
  *Rule*: Creating a customer with a phone number matching an existing record returns 409 `DUPLICATE_CANDIDATE`. Staff must explicitly choose to either link the enquiry to the existing customer or create a new customer record with a mandatory justification reason.  
  *Enforcement*: `CustomerService.create()` checks normalized phone index; throws 409 unless `duplicateDecision` is provided.

- [ ] **BR-M1-05: 30-Day Repeat Lead Tagging**  
  *Rule*: If a customer submits a new enquiry within 30 days of a prior enquiry (configurable [NC]), the system must flag it as `Repeat` and populate `repeat_of_id`.  
  *Enforcement*: Query on `enquiries` table for recent customer leads during intake.

- [ ] **BR-M1-06: Soft Customer Merge Without Historical Data Loss**  
  *Rule*: Merging duplicate customer records is an Admin-only operation. The source customer is marked merged (`merged_into_id = target_id`); all linked enquiries, surveys, orders, warranties, and cases are re-pointed to the target customer. Records are never deleted.  
  *Enforcement*: `CustomerService.merge()` wrapped in transaction; audited with Admin ID and reason.

- [ ] **BR-M1-07: Mandatory Reason for Inactive Pipeline Statuses**  
  *Rule*: Transitioning an enquiry to `Lost` or `On Hold` requires a mandatory reason code and descriptive note.  
  *Enforcement*: API validation rejects status change request if `lost_reason` is empty.

---

## 4. Module 2: Site Survey and Quotation

- [ ] **BR-M2-01: Customer Address Required for Survey Scheduling**  
  *Rule*: A site survey cannot be scheduled unless the customer's site address (street, city, PIN) is fully recorded.  
  *Enforcement*: API validates address presence on customer record prior to creating survey.

- [ ] **BR-M2-02: Surveyor Availability & Double-Booking Prevention**  
  *Rule*: Scheduling a survey checks the assigned surveyor's existing bookings and unavailability blocks. Concurrent assignments are strictly rejected with 409 Conflict.  
  *Enforcement*: Database conflict check query on `surveys` and `technician_unavailability`.

- [ ] **BR-M2-03: Physical Parameter Constraints & Physics Invariants**  
  *Rule*: Site survey technical findings must satisfy physical reality:
  1. `roof_area_sqm > 0`
  2. `tilt_degrees >= 0 AND tilt_degrees <= 90`
  3. `shadow_free_area_sqm > 0 AND shadow_free_area_sqm <= roof_area_sqm`
  4. `cable_distance_m >= 0`  
  *Enforcement*: PostgreSQL table CHECK constraint `(shadow_free_area_sqm <= roof_area_sqm)` and Zod schema validation.

- [ ] **BR-M2-04: Mandatory Photographic Evidence for Survey Submission**  
  *Rule*: Survey submission (`POST /surveys/:id/submit`) is blocked unless all technical fields are populated and minimum required photos are uploaded (Roof overview, Shade source, Meter/DB, Cable route).  
  *Enforcement*: `SurveyService.submit()` checks linked `files` count and categories; returns 422 `SURVEY_INCOMPLETE` with missing list.

- [ ] **BR-M2-05: Mandatory Rejection Reason & Revision Numbering**  
  *Rule*: Rejecting a submitted survey requires a mandatory reason code and comment (≥ 10 chars). Rejection advances survey to `Rework Required`. Re-submitting after rework creates a new revision (`revision_no = revision_no + 1`) and preserves prior finding snapshots.  
  *Enforcement*: `SurveyService.reject()` and `SurveyService.resubmit()` record immutable revision rows in `survey_revisions`.

- [ ] **BR-M2-06: Approved Surveys are Immutable**  
  *Rule*: An approved survey is locked. Reopening an approved survey requires Admin authorization with a documented reason, which flags any draft quotations for re-review.  
  *Enforcement*: `PATCH /surveys/:id` rejects updates if `status === 'Approved'`.

- [ ] **BR-M2-07: CRITICAL: Quotation Creation Strictly Gated by Survey Approval**  
  *Rule*: A quotation CANNOT be created unless the enquiry's latest survey is in `Approved` status. If no survey exists, or if the latest survey is Scheduled, In Progress, Submitted, or Rejected, quotation creation must be rejected with 422 `SURVEY_NOT_APPROVED`.  
  *Enforcement*: `QuotationService.create()` asserts `latestSurvey.status === 'Approved'`. Backed by a database check trigger on `quotations.survey_id`.

- [ ] **BR-M2-08: Automatic Package-Driven BOM Calculation**  
  *Rule*: Quotation Bill of Materials line items must be generated deterministically from the selected package's template using quantity rules (`FIXED`, `PER_KW`, `CEIL_DIV_KW`). Example: 3 kW system with 540W panel generates `⌈3000 / 540⌉ = 6` panels.  
  *Enforcement*: `BOMEngine.generate()` executes mathematical formula based on package template.

- [ ] **BR-M2-09: Package Compatibility Enforcement**  
  *Rule*: Issuing a quotation is blocked if equipment pairings violate technical compatibility rules:
  1. On-Grid systems must NOT contain battery lines.
  2. Off-Grid systems MUST contain battery and charge controller/hybrid inverter lines.
  3. Inverter capacity must cover system capacity.  
  *Enforcement*: `CompatibilityEngine.validate()` evaluates line items; returns 422 with rule explanation.

- [ ] **BR-M2-10: Template Variance Justification & Discount Approval**  
  *Rule*: Any manual modification to auto-generated BOM lines must record a mandatory justification note showing variance from template. Discounts exceeding the configured threshold [NC] require Admin approval before quotation can be issued.  
  *Enforcement*: API rejects line edits without reason; requires Admin role for high discounts.

- [ ] **BR-M2-11: Atomic Order & Project Creation on Quotation Acceptance**  
  *Rule*: Accepting an issued quotation creates the authoritative `orders` record, spawns the delivery `projects` record, freezes an immutable snapshot into `project_bom_items`, and advances the enquiry to `Converted to Order` within a SINGLE atomic database transaction.  
  *Enforcement*: `QuotationService.accept()` executed inside `db.transaction()`. Accepted quotations become immutable.

---

## 5. Module 3: Inventory and Warehouse Management

- [ ] **BR-M3-01: Available Stock Invariant & Negative Inventory Prevention**  
  *Rule*: Stock levels must satisfy `available = on_hand - reserved`. Available stock can never be negative. Reserved stock can never exceed on-hand stock.  
  *Enforcement*: PostgreSQL CHECK constraint `(on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand)`. Violations immediately abort transaction.

- [ ] **BR-M3-02: Universal Stock Movement Journaling**  
  *Rule*: Physical inventory can never be modified directly. Every change in stock must write an append-only row in `stock_movements` capturing movement type, quantity, project, actor, and reason.  
  *Enforcement*: Database triggers or service-layer architecture routing all stock updates through `StockService.recordMovement()`.

- [ ] **BR-M3-03: Serial Number Uniqueness per Product**  
  *Rule*: A serial number must be globally unique for a given product (`unique(product_id, serial_number)`). Duplicate serial registration at goods receipt is strictly rejected.  
  *Enforcement*: PostgreSQL unique index on `serial_items(product_id, serial_number)`.

- [ ] **BR-M3-04: Material Allocation Gated by Order Payment Policy**  
  *Rule*: Reserving inventory for a project BOM is blocked unless the configured order payment gate is met (e.g., advance payment verified [NC]), or an Admin-approved `policy_exception` exists.  
  *Enforcement*: `StockService.allocate()` validates order payment status against system policy before reserving.

- [ ] **BR-M3-05: Partial Reservation Allowed; Dispatch Beyond Reserved Prohibited**  
  *Rule*: If available stock is less than required BOM quantity, the system reserves available stock and flags the line as `Short` with shortfall count. Generating a dispatch note beyond the reserved quantity is strictly blocked.  
  *Enforcement*: Dispatch creation checks `dispatch_qty <= reserved_qty`.

- [ ] **BR-M3-06: Pre-Dispatch Serial Number Scanning Validation**  
  *Rule*: For every serialized component on a dispatch note, scanning is validated against 4 criteria:
  1. Serial number exists in `serial_items`.
  2. Product matches the BOM line item.
  3. Status is `IN_STOCK` or `RESERVED` for this specific project.
  4. Serial is not currently assigned or dispatched to any other project.  
  *Enforcement*: `DispatchService.scanSerial()` executes strict lookup; throws specific 422 errors on mismatch.

- [ ] **BR-M3-07: Concurrency Protection on Serial Scanning**  
  *Rule*: Two warehouse operators scanning the same serial number simultaneously must not result in dual assignment. Exactly one scan succeeds; the second receives an immediate rejection.  
  *Enforcement*: Database row-level lock (`SELECT ... FOR UPDATE`) on `serial_items` during scan transaction, backed by partial unique index `unique(serial_item_id) WHERE released_at IS NULL` on `dispatch_serials`.

- [ ] **BR-M3-08: Dispatch Confirmation Requires Complete Scan Count Match**  
  *Rule*: Confirming a dispatch (`POST /dispatches/:id/confirm`) is blocked unless the number of scanned serials exactly equals the required dispatch quantity for all serialized items.  
  *Enforcement*: `DispatchService.confirm()` verifies scanned counts vs BOM items; returns 422 `SCAN_COUNT_MISMATCH` if incomplete.

- [ ] **BR-M3-09: Atomic Dispatch Handover & Pending Warranty Spawning**  
  *Rule*: Confirming dispatch transitions serial items to `DISPATCHED`, links them to the project and customer, writes ledger movements, and creates corresponding records in `warranty_records` with status `Pending Activation`.  
  *Enforcement*: `DispatchService.confirm()` runs atomically inside a single database transaction.

- [ ] **BR-M3-10: Site Delivery Handover Triggers Default Warranty Start**  
  *Rule*: Confirming delivery of equipment at the installation site sets `delivered_at`. Under default configuration (`warranty_start_event = 'DELIVERY'` [SRC]), this event automatically transitions linked warranty records to `Active` and sets `start_date = delivered_at`.  
  *Enforcement*: `DispatchService.deliver()` invokes `WarrantyService.activateForProject()`.

- [ ] **BR-M3-11: Site Returns Quarantine & QC Inspection**  
  *Rule*: Serialized equipment returned from an installation site must move to status `RETURNED_QC`. It cannot be re-reserved or re-dispatched until a warehouse inspection marks it `IN_STOCK` or `DAMAGED`.  
  *Enforcement*: FSM for `serial_items.status`; restricts allocation to `IN_STOCK` units only.

- [ ] **BR-M3-12: Damaged / Missing Write-Offs Require Admin Approval**  
  *Rule*: Writing off damaged or lost stock requires photographic proof, descriptive reason, and Admin authorization. Write-offs update the stock ledger and record cost write-down entries in the project finance ledger.  
  *Enforcement*: `StockService.approveWriteOff()` restricted to Admin role; audited with cost impact.

---

## 6. Module 4: Installation and Technician Management

- [ ] **BR-M4-01: Crew Hierarchy: At Least One Lead Technician Required**  
  *Rule*: An installation job must be assigned at least one technician in the `LEAD` role. Helper technicians cannot be dispatched without a lead technician.  
  *Enforcement*: `JobService.assign()` validates that `job_assignments` contains `role === 'LEAD'`.

- [ ] **BR-M4-02: Technician Schedule Conflict & Overlap Prevention**  
  *Rule*: Assigning a technician to an installation job verifies that the technician is active, not on leave, and has no overlapping scheduled jobs during the designated time window.  
  *Enforcement*: Query checking `job_assignments` and `technician_unavailability`; throws 409 `TECHNICIAN_OVERLAP_CONFLICT` on collision.

- [ ] **BR-M4-03: Job Rescheduling History & Notification**  
  *Rule*: Rescheduling an installation job requires a mandatory reason, specification of requester (Customer vs Company), and automatically records an entry in `job_reschedules` while notifying assigned crew.  
  *Enforcement*: `JobService.reschedule()` updates timestamps and appends reschedule history.

- [ ] **BR-M4-04: Mandatory Clock-In / Clock-Out Working Hours**  
  *Rule*: Technicians must capture actual clock-in and clock-out timestamps on site. These records form the authoritative labor hours for technician payroll tracking and project labor cost calculation.  
  *Enforcement*: Stored in `job_time_entries`; validated so `clock_out > clock_in`.

- [ ] **BR-M4-05: Mandatory Photo Checklist Categories**  
  *Rule*: Installation completion requires uploaded photographic evidence covering all configured categories: Roof before, Panel layout, Inverter, Wiring, Earthing, Meter/Grid connection, and Final installed system.  
  *Enforcement*: `CompletionValidator.validate()` asserts all required categories exist in `job_photos`.

- [ ] **BR-M4-06: Commissioning Electrical Tests: 100% Pass Required**  
  *Rule*: Commissioning tests (VOC, ISC, earthing resistance, grid synchronization) must be recorded with measured values. If any test fails, the job cannot be completed; its status moves to `Rework Required`.  
  *Enforcement*: `CompletionValidator` rejects completion if any test item has `passed === false`.

- [ ] **BR-M4-07: Mandatory Customer Digital Signature**  
  *Rule*: Job completion requires a customer digital signature drawn on the technician device, stored with signer name, timestamp, and device metadata. Admin override of signature is prohibited by default [NC].  
  *Enforcement*: `CompletionValidator` asserts valid signature file linked in `signatures` table.

- [ ] **BR-M4-08: CRITICAL: Atomic Job Completion Validator**  
  *Rule*: `POST /jobs/:id/complete` executes a comprehensive validator. Completion is strictly BLOCKED unless:
  1. Actual start and end times recorded.
  2. Installed capacity and serial numbers match dispatched BOM.
  3. All required photo categories uploaded.
  4. Test checklist complete with all tests PASSED.
  5. Valid customer digital signature captured.  
  *Enforcement*: Returns 422 `COMPLETION_INCOMPLETE` listing all failing criteria. On success, moves job to `Completed` and order to `Installed`.

- [ ] **BR-M4-09: Reopening Completed Jobs Requires Admin Justification**  
  *Rule*: A completed installation job is locked. Reopening a completed job for rework or corrections requires Admin authorization with a mandatory reason, and is logged to `audit_logs`.  
  *Enforcement*: API rejects status modification on `Completed` jobs unless called by Admin via dedicated `/reopen` endpoint.

---

## 7. Module 5: Warranty Management

- [ ] **BR-M5-01: Multi-Party Warranty Terms Specification**  
  *Rule*: Warranty terms must explicitly distinguish the liable party: `MANUFACTURER` (equipment coverage) versus `INSTALLER` (workmanship coverage), alongside coverage scope (`PARTS`, `LABOR`, `BOTH`).  
  *Enforcement*: Table columns `warranty_terms.party` and `coverage_scope`. Displayed with color-coded party badges.

- [ ] **BR-M5-02: Non-Retroactive Warranty Terms Modification**  
  *Rule*: Modifying warranty terms applies strictly to future records. Existing active warranty records preserve their immutable term snapshot created at activation time.  
  *Enforcement*: `warranty_records.term_snapshot_json` freezes term rules at issuance.

- [ ] **BR-M5-03: Server-Computed End Date Invariant**  
  *Rule*: Warranty start and end dates are computed strictly by backend code based on the configured start event and duration months: `end_date = start_date + duration_months`. The client can never supply warranty dates.  
  *Enforcement*: `WarrantyService` date math executed inside database transaction.

- [ ] **BR-M5-04: Deterministic Eligibility Evaluation Codes**  
  *Rule*: Checking warranty eligibility for a claim date against an active record must return one of five authoritative system codes:
  - `WITHIN_PERIOD`: Record `Active` and `start_date <= claim_date <= end_date`.
  - `EXPIRED`: Record `Active` and `claim_date > end_date`.
  - `NOT_ACTIVE`: Record `Pending Activation` or `claim_date < start_date`.
  - `VOID`: Record status `Void`.
  - `NO_RECORD`: Serial or customer record not located.  
  *Enforcement*: `WarrantyService.evaluateEligibility()` backend query.

- [ ] **BR-M5-05: Separation of Period Eligibility from Coverage Decisions**  
  *Rule*: `WITHIN_PERIOD` confirms only that the warranty duration is valid. Whether a specific physical fault is covered (misuse, grid surge exclusions) is a human coverage decision recorded by Support. The system never auto-denies a claim based on fault text.  
  *Enforcement*: System result badge displayed alongside separate Support coverage decision dropdown.

- [ ] **BR-M5-06: Administrative Voiding Requires Documented Reason**  
  *Rule*: Voiding an active warranty record is an Admin-only operation requiring a mandatory reason (min 10 chars) and is logged to `audit_logs`.  
  *Enforcement*: `POST /warranties/:id/void` validates Admin permission and reason length.

- [ ] **BR-M5-07: Replacement Serial Heritage & Superseding Records**  
  *Rule*: When a serialized component is replaced under warranty, the defective serial is marked `REPLACED`, the replacement unit is assigned from inventory, and a superseding warranty record is created linked via `replaced_by_id`.  
  *Enforcement*: `WarrantyService.replaceSerial()` executed transactionally.

- [ ] **BR-M5-08: Automated Proactive Warranty Expiry Reminders**  
  *Rule*: Background scheduler scans active warranties daily and dispatches automated in-app notifications at 60 days, 30 days, and 7 days prior to `end_date`.  
  *Enforcement*: Scheduled background job `WarrantyReminderJob` with idempotency deduplication.

---

## 8. Module 6 & §9: Customer Support and Service Workflow

- [ ] **BR-M6-01: CRITICAL: Deterministic Pre-Model Safety Interception (P1)**  
  *Rule*: Customer issue descriptions are screened by deterministic regex patterns BEFORE any model call or routing logic. Keywords matching smoke, burning smell, fire, sparks, electrical shock, exposed live wiring, or swollen battery MUST immediately:
  1. Set `safety_flag = true`.
  2. Set `priority = 'P1'`.
  3. Bypass AI guidance completely.
  4. Display fixed, non-model safety instructions ("Keep away from equipment; call emergency services").
  5. Alert Support lead and Admin immediately.  
  *Enforcement*: `SafetyInterceptor.evaluate()` runs synchronously on intake; AI model is never called for P1 safety cases.

- [ ] **BR-M6-02: AI and Customer Cannot Downgrade P1 Safety Status**  
  *Rule*: Once a case is marked P1 Safety, neither an AI model nor the customer can lower its priority. Only authorized Support or Admin personnel can downgrade P1, and must provide a logged reason.  
  *Enforcement*: `CaseService.updatePriority()` rejects P1 downgrade if caller is Customer or System/AI.

- [ ] **BR-M6-03: Guided AI Guidance Restricted to Approved Help Content**  
  *Rule*: Automated AI guidance for basic, safe issues (AI-G1) is strictly restricted to approved, admin-curated knowledge articles (`help_articles.status === 'Approved'`). AI is prohibited from inventing unvetted electrical troubleshooting steps.  
  *Enforcement*: Context builder retrieves only approved help articles matching problem category.

- [ ] **BR-M6-04: Strict Support Case Finite State Machine (33 Transitions)**  
  *Rule*: Support cases must progress strictly through the 33 valid status transitions defined in §9.5. Any transition attempt not listed in the state matrix is rejected with 422 `CASE_TRANSITION_NOT_ALLOWED`.  
  *Enforcement*: Centralized `CaseService.transition()` verifying against `case_transitions` table.

- [ ] **BR-M6-05: Strict Exclusion of Internal Notes from Customer Views**  
  *Rule*: Case messages with `visibility = 'INTERNAL'` must NEVER be returned in any API response or notification delivered to the customer portal.  
  *Enforcement*: API query filter `WHERE visibility = 'CUSTOMER'` on all customer-facing endpoints.

- [ ] **BR-M6-06: 1-to-1 Mapping Between Support Case and Service Ticket**  
  *Rule*: A support case owns customer communication and status. When field work or billing is required, Support creates a service ticket (`TKT-XXXXXX`). A service ticket always links to exactly one case, and cannot close unless the case closes.  
  *Enforcement*: Foreign key constraint and service lifecycle sync between `support_cases` and `service_tickets`.

- [ ] **BR-M6-07: CRITICAL: Warranty Eligibility Check Precedes Any Service Billing**  
  *Rule*: The backend strictly blocks adding charges to a service ticket while `coverage_decision === 'PENDING'`. Support must formally evaluate warranty eligibility before any repair charges can be entered.  
  *Enforcement*: `ServiceTicketService.addCharge()` asserts `coverage_decision !== 'PENDING'`; throws 422 `COVERAGE_PENDING`.

- [ ] **BR-M6-08: Covered Warranty Repairs are Free of Charge**  
  *Rule*: If a service ticket is marked `COVERED_WARRANTY`, all replacement parts and labor covered under the terms must be billed at 0 paise to the customer [SRC]. Billed charges apply only to `NOT_COVERED_PAID` tickets.  
  *Enforcement*: Billing engine sets customer invoice amount to 0 for covered lines; actual costs recorded against company warranty expense.

- [ ] **BR-M6-09: Admin Authorization for Goodwill Waivers**  
  *Rule*: Providing free repair on an expired or excluded warranty (`GOODWILL`) requires Admin authorization and a mandatory business justification [NC].  
  *Enforcement*: `ServiceTicketService.setCoverage()` requires Admin role if decision is `GOODWILL`.

- [ ] **BR-M6-10: Technician Field Data Isolation**  
  *Rule*: Technicians assigned to service jobs see ONLY customer name, site address, issue summary, and approved work instructions. They are strictly barred from viewing quotation prices, customer payment history, company margins, or internal notes.  
  *Enforcement*: Dedicated technician job endpoint `GET /my/jobs/:id` with strict projection serializer.

- [ ] **BR-M6-11: Technician Work Completion Alone Never Closes a Case**  
  *Rule*: When a technician finishes on site, the case status advances to `Technician Work Complete` → `Awaiting Support Review`. Field technicians have zero authority to close a support case or service ticket.  
  *Enforcement*: `POST /cases/:id/technician-complete` moves case to `Awaiting Support Review`; only Support can trigger closure.

- [ ] **BR-M6-12: Unresolved Repairs Return to Escalation Queue**  
  *Rule*: If a technician marks a repair unresolved on site, the case moves immediately to `Escalated to Support` with recorded findings for reassignment or equipment replacement.  
  *Enforcement*: FSM branch on `resolved === false`.

- [ ] **BR-M6-13: CRITICAL: Mandatory Customer Confirmation for Case Closure**  
  *Rule*: Case closure (`POST /cases/:id/close`) is strictly BLOCKED unless:
  1. Technician field work is completed (if ticket exists).
  2. Support evidence review is recorded as accepted.
  3. **CUSTOMER CONFIRMATION IS RECORDED** (Customer confirms fixed on portal, or Admin waiver with proof [NC]).
  4. Charges are finalized and verified paid or waived.
  5. No open child jobs exist.  
  *Enforcement*: `CaseService.close()` validates checklist; returns 422 `CLOSURE_CHECKS_FAILED` with unmet list.

- [ ] **BR-M6-14: Customer Dispute Reopens Case & Increments Priority**  
  *Rule*: If a customer clicks "Dispute / Issue Persists", the case transitions to `Reopened`, its priority increases by one level, and it returns to Support Review with repeat complaint tracking.  
  *Enforcement*: `CaseService.customerConfirmation(result: 'DISPUTED')` updates status and priority.

---

## 9. Module 7 & §17: Payments, Razorpay and Finance

- [ ] **BR-M7-01: Server-Authoritative Payment Amounts (Client Never Supplies Amount)**  
  *Rule*: The client browser NEVER provides the payment amount. The backend computes the exact amount in integer paise based on the accepted order total, advance policy [NC], and remaining balance. Any client-injected amount is ignored.  
  *Enforcement*: `PaymentService.createRequest()` calculates amount server-side; throws 422 if balance <= 0.

- [ ] **BR-M7-02: Mandatory Idempotency Keys on Payment Creation**  
  *Rule*: Creating a payment request requires an `Idempotency-Key` header. Repeated requests with the same key return the existing payment request and Razorpay order without creating duplicate transactions.  
  *Enforcement*: Unique constraint on `payment_requests(order_id, purpose, idempotency_key)`.

- [ ] **BR-M7-03: Mandatory Cryptographic Callback Signature Verification**  
  *Rule*: Payment marked `Paid` via frontend callback ONLY after backend verifies HMAC SHA256 signature (`razorpay_order_id + "|" + razorpay_payment_id` hashed with `RAZORPAY_KEY_SECRET`). Frontend success callback alone never updates ledger or order status.  
  *Enforcement*: `PaymentService.verifyCallback()` uses crypto constant-time comparison; rejects invalid signatures with 400.

- [ ] **BR-M7-04: Mandatory Webhook Cryptographic Verification on Raw Body**  
  *Rule*: Razorpay webhooks must be verified using HMAC SHA256 against the **RAW, UNPARSED REQUEST BODY BUFFER** using `RAZORPAY_WEBHOOK_SECRET`. Invalid signatures return 400 immediately and trigger a security audit log.  
  *Enforcement*: Express `body-parser` configured with `verify` hook capturing raw buffer; verified before JSON parsing.

- [ ] **BR-M7-05: Idempotent Webhook Processing via Unique Provider Event ID**  
  *Rule*: Webhook handler checks `provider_event_id` in `razorpay_webhook_events`. If already processed, the system returns 200 OK immediately and performs zero duplicate database operations.  
  *Enforcement*: PostgreSQL unique constraint on `razorpay_webhook_events(provider_event_id)`.

- [ ] **BR-M7-06: Dual-Channel Race Condition Protection (Callback vs Webhook)**  
  *Rule*: Both client callback and webhook route to a single atomic function `applyVerifiedPayment()`. The function acquires a row-level lock on `payment_requests` and relies on `unique(attempt_id)` on `payments`. Exactly ONE payment row is created regardless of race order.  
  *Enforcement*: Database transaction with `SELECT ... FOR UPDATE` on `payment_requests` and unique attempt constraint.

- [ ] **BR-M7-07: Unverified Payments Never Alter Balances or Dashboards**  
  *Rule*: Payment requests in `Pending Verification`, `Failed`, `Cancelled`, or `Mismatch` have ZERO effect on order status, outstanding balances, invoices, or financial dashboards.  
  *Enforcement*: Financial ledger queries filter strictly `WHERE status = 'VERIFIED'`.

- [ ] **BR-M7-08: Automatic Order Confirmation on Meeting Advance Gate**  
  *Rule*: When a verified payment satisfies the configured advance policy gate [NC], the order status automatically advances from `Awaiting Payment` to `Confirmed`, unlocking warehouse material allocation.  
  *Enforcement*: `applyVerifiedPayment()` evaluates balance against gate and advances order status.

- [ ] **BR-M7-09: Overpayment Flagging (No Negative Balances)**  
  *Rule*: If verified payments exceed order total, the UI displays "Overpaid — review required" rather than a negative outstanding balance, and alerts Admin for reconciliation.  
  *Enforcement*: Derived balance logic in `OrderService.getBalance()`.

- [ ] **BR-M7-10: Payment Mismatch Quarantine**  
  *Rule*: If payment amount or order ID reported by provider does not match backend records, no ledger entry is created; the request moves to `Mismatch (review)` and requires Admin reconciliation.  
  *Enforcement*: `PaymentService.applyVerifiedPayment()` asserts `attempt.amount === request.amount`.

- [ ] **BR-M7-11: Verified Payment Records are Immutable (Reversal Records Only)**  
  *Rule*: A verified payment record cannot be updated or deleted. Corrections must be executed as separate reversing records by Admin with reference to provider refund or bank statement.  
  *Enforcement*: PostgreSQL permissions prohibit UPDATE/DELETE on `payments`.

- [ ] **BR-M7-12: Real-Time Project Profitability Calculation Formula**  
  *Rule*: Project profit and margin must be computed strictly from authoritative ledgers:  
  `Profit = Contract Revenue - (Material Cost + Labor Cost + Other Direct Costs + Unbilled Service Costs)`.  
  `Margin % = Profit / Contract Revenue`.  
  Estimates (BOM standard costs) and actuals (serial receipt costs, approved labor hours) must be strictly segregated and labeled. Overheads excluded by default [NC].  
  *Enforcement*: `FinanceService.getProjectProfitability()` executes deterministic SQL aggregation.

- [ ] **BR-M7-13: Expenses Require Admin Approval Before Impacting P/L**  
  *Rule*: Direct project expenses (transport, permits, consumables) count toward project actual cost ONLY after explicit Admin approval.  
  *Enforcement*: Profitability aggregation filters `expenses` where `status = 'APPROVED'`.

- [ ] **BR-M7-14: Zero Discrepancy Dashboard Reconciliation**  
  *Rule*: All dashboard payment totals must reconcile 100% against the sum of verified payment records. The Admin dashboard must display an authoritative reconciliation widget proving:  
  `dashboard total - sum(verified payments) = 0`.  
  *Enforcement*: Server-computed dashboard endpoint verifying sum equality before returning payload.

---

## 10. Section 8: AI Assistance Layer Boundaries

- [ ] **BR-AI-01: Strict Caller Permission & Row Scope Confinement**  
  *Rule*: The AI context builder runs strictly with the caller's identity and permissions. It can NEVER retrieve or summarize any record that the logged-in user would be forbidden from viewing via standard REST endpoints.  
  *Enforcement*: Context builder invokes existing service functions passing `req.user`.

- [ ] **BR-AI-02: Neutral Refusal on Unauthorized Record Queries**  
  *Rule*: If prompted to summarize or inspect a record outside the caller's authorization, the AI must return a neutral refusal ("You do not have access to this record") without disclosing record existence or metadata.  
  *Enforcement*: Service-level permission check returns 403 before prompt construction.

- [ ] **BR-AI-03: Strict Prohibition Against Autonomous Consequential Actions**  
  *Rule*: The AI model is strictly prohibited from executing mutations: it cannot approve surveys, issue binding quotes, modify inventory, authorize payments, decide warranty claims, assign technicians, or close cases.  
  *Enforcement*: AI endpoints are read-only; suggested actions returned as `proposed_actions` buttons invoking standard API endpoints under user authorization.

- [ ] **BR-AI-04: Deterministic Grounding & Output Validation**  
  *Rule*: AI outputs must be grounded entirely in provided context records. The output validator checks that every cited record ID, date, and numerical figure exists in the retrieved context payload. Hallucinations or mismatches cause output rejection and fallback to rule-based templates.  
  *Enforcement*: `OutputValidator.validate()` asserts cited entities match input context.

- [ ] **BR-AI-05: Prominent Visual Labeling & System Result Segregation**  
  *Rule*: Every AI-generated output must be displayed in a distinct panel (`--color-ai` purple tint), labeled "AI-generated" with an icon, list source record links, and timestamp. On warranty pages, the deterministic system result badge is visually segregated from the plain-language AI explanation.  
  *Enforcement*: UI component `AIPanel` enforces strict visual styling.

- [ ] **BR-AI-06: Seamless Deterministic Fallback on Model Failure**  
  *Rule*: If the AI provider is disabled, encounters an error, or times out, the system must immediately return a deterministic rule-based template with `fallbackUsed: true` and a clear notice: "AI assistance unavailable — showing system summary."  
  *Enforcement*: `try/catch` wrapper in `AIService` returning pre-compiled templates on error.

- [ ] **BR-AI-07: Default Mock Provider & Privacy Sandbox**  
  *Rule*: The system defaults to `AI_PROVIDER = 'mock'` (rule-based deterministic templates). External AI provider calls are disabled unless `AI_EXTERNAL_ALLOWED = true` and a documented privacy decision exists [NC]. Customer PII, financial details, photos, and signatures are never sent to external models.  
  *Enforcement*: Context builder masks sensitive fields; adapter checks configuration flag.

- [ ] **BR-AI-08: Complete Audit Logging of AI Requests**  
  *Rule*: Every invocation of an AI feature records an entry in `ai_requests` capturing `user_id`, `feature`, `entity_refs`, `provider_mode`, `latency_ms`, `input_hash`, `output_hash`, and `fallback_used`. Raw customer prompts are not stored to preserve privacy.  
  *Enforcement*: `AIService.logRequest()` executed on every call.

- [ ] **BR-AI-09: No Definitive Diagnosis or Hazardous Electrical Instructions**  
  *Rule*: AI suggestions must be labeled as advisory. The AI is strictly barred from giving hazardous electrical repair instructions or claiming a definitive hardware fault diagnosis.  
  *Enforcement*: System prompt guardrails and pre-screening safety interceptor.
