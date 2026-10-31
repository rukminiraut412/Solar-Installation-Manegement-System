# Solar Installation Management System
## Testing Strategy & Requirement Traceability Matrix

**Document Version:** 1.0  
**Status:** Approved Architectural Baseline  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md` (§20 Testing and Acceptance Criteria)  
**Test Categories Covered:** Unit, API Integration, Database Invariant, Authorization (RBAC), Validation & Boundary, Negative, Concurrency, Payment & Webhook, AI Guardrail & Fallback, and End-to-End Workflow.

---

## 1. Testing Framework & Tooling

| Test Level | Technology / Tool | Target Execution Environment | Purpose |
|---|---|---|---|
| **Unit Testing** | Vitest / Jest | In-memory mock environment | Fast mathematical & algorithmic testing (BOM calculations, date logic, string normalization, output validation). |
| **API Integration** | Supertest + Express | Local test database (`solar_test`) | HTTP route handling, controller logic, middleware chaining, JSON envelopes, and status codes. |
| **Database Invariants** | PostgreSQL + node-pg | Isolated test schema | Verification of unique indexes, CHECK constraints, foreign key cascades, triggers, and row-level locks. |
| **Authorization (RBAC)**| Supertest with JWT fixtures | Test DB with pre-seeded role permissions | Matrix testing of 5 roles + Customer across all protected endpoints; row-level isolation verification. |
| **Concurrency & Race** | Async worker scripts (`Promise.all` bursts) | Multi-connection test pool | Dual serial scanning race conditions, simultaneous webhook & callback arrivals, optimistic lock conflicts. |
| **Payment & Webhooks** | Supertest + HMAC fixtures | Mock Razorpay server | Signature generation/verification, webhook replay attacks, raw body tampering, idempotency key replays. |
| **AI Boundary Tests** | Mock AI Provider | Isolated API runner | Context building permission scope, hallucination rejection, safety pattern interception, fallback failover. |
| **End-to-End (E2E)** | Playwright | Full stack (Vite + Express + Postgres) | Full 26-stage workflow simulation, customer signature canvas, file uploads, role switching, UI state assertions. |

---

## 2. Master Test Matrix (T-01 through T-50 Traceability)

The 50 authoritative tests defined in §20.1 of the architecture specification mapped to their requirement IDs, test type, test scenario, and expected outcome:

| Test ID | Requirement IDs | Test Category | Target Component / Scenario | Detailed Test Input & Execution | Expected Assertions & HTTP Response |
|---|---|---|---|---|---|
| **T-01** | REQ-FND-03, REQ-FND-04 | Authorization (RBAC) | Role-Based Access Control violation across all modules | For each role (Sales, Warehouse, Tech, Support, Customer), send requests to unauthorized endpoints (e.g. Sales calls `/stock-purchases`, Tech calls `/payments`). | Status `403 FORBIDDEN`; standard error envelope; zero record alteration; denial event logged to `audit_logs`. |
| **T-02** | REQ-CS-01, REQ-CS-02 | Validation / Negative | Create enquiry with duplicate phone number | Staff submits `POST /customers` with phone matching existing customer without providing `duplicateDecision`. | Status `409 CONFLICT`; error code `DUPLICATE_CANDIDATE`; returns matching customer preview; record not created. |
| **T-03** | REQ-CS-01 | Boundary / Rate Limit | Public web enquiry spam burst | Script dispatches 10 rapid `POST /public/enquiries` requests from the same IP within 1 second. | First 5 requests return `200 OK` with `ENQ-` code; subsequent requests return `429 TOO_MANY_REQUESTS`. |
| **T-04** | All Core Requirements | End-to-End (E2E) | Full Happy Path Journey (§10.2 Steps 1–24) | Lead created → Survey scheduled → Survey submitted & approved → Quotation generated & accepted → Advance paid & verified → Stock reserved → Serials scanned & dispatched → Installed with tests & signature → Warranty activated → Ticket created & closed with confirmation. | All 24 workflow checkpoints complete successfully; order reaches `Installed`; all foreign keys resolve cleanly; full audit trail exists. |
| **T-05** | REQ-CS-06 | Validation / Negative | Reject survey without mandatory reason | Admin calls `POST /surveys/:id/reject` with empty comment or comment < 10 characters. | Status `422 UNPROCESSABLE_ENTITY`; error code `REJECTION_REASON_REQUIRED`; survey status remains `Submitted`. |
| **T-06** | REQ-CS-06 | API Integration | Survey rejection, rework, resubmission, approval loop | 1. Admin rejects survey with reason.<br>2. Surveyor calls `/resubmit` with updated findings.<br>3. Admin calls `/approve`. | Survey moves `Submitted` → `Rejected` (`Rework Required`) → `Submitted` (with `revision_no = 2`) → `Approved`. Historical revisions preserved. |
| **T-07** | REQ-CS-07 | Business Rule / Guard | Create quotation before survey approval | Sales calls `POST /quotations` referencing a survey whose status is `Submitted` or `Rejected`. | Status `422 UNPROCESSABLE_ENTITY`; error code `SURVEY_NOT_APPROVED`; quotation row is NOT created in database. |
| **T-08** | REQ-CS-08 | Compatibility / Negative | Off-Grid package quotation without battery line | Sales calls `POST /quotations/:id/issue` for an Off-Grid system where battery item was manually removed. | Status `422 UNPROCESSABLE_ENTITY`; error code `COMPATIBILITY_RULE_VIOLATION`; message specifies battery requirement. |
| **T-09** | REQ-OPS-03, REQ-OPS-04 | Database / Business Rule | Dispatch quantity exceeding available or reserved stock | Warehouse calls `POST /dispatches` requesting 10 inverters when only 5 are reserved for the project. | Status `422 UNPROCESSABLE_ENTITY`; error code `INSUFFICIENT_STOCK`; dispatch creation aborted; zero stock movements written. |
| **T-10** | REQ-OPS-04 | Business Rule / Guard | Scan serial already active on another project | Warehouse calls `POST /dispatches/:id/scan` with a serial number currently in `DISPATCHED` status on another project. | Status `422 UNPROCESSABLE_ENTITY`; error code `SERIAL_ALREADY_ASSIGNED`; serial is rejected; dispatch count unchanged. |
| **T-11** | REQ-OPS-04 | Concurrency Race | Concurrent scanning of the same physical serial | Two parallel asynchronous HTTP requests call `POST /dispatches/:id/scan` for the identical serial number simultaneously. | Exactly ONE request succeeds (`200 OK`); the second request fails with `422 SERIAL_ALREADY_ASSIGNED` due to row lock. |
| **T-12** | REQ-OPS-02, REQ-OPS-04 | Validation / Negative | Scan unknown or wrong-product serial | Warehouse calls `POST /dispatches/:id/scan` with non-existent serial or battery serial against an inverter BOM line. | Status `422 UNPROCESSABLE_ENTITY`; specific error codes `SERIAL_UNKNOWN` or `SERIAL_WRONG_PRODUCT`. |
| **T-13** | REQ-OPS-04 | Validation / Guard | Confirm dispatch with scan count mismatch | Dispatch note has required quantity 4, but only 3 serials scanned. Warehouse calls `POST /dispatches/:id/confirm`. | Status `422 UNPROCESSABLE_ENTITY`; error code `SCAN_COUNT_MISMATCH`; dispatch remains in `Scanning` status. |
| **T-14** | REQ-OPS-10 | Validation / Guard | Complete installation with missing items | Technician calls `POST /jobs/:id/complete` missing photos, test results, or signature. | Status `422 UNPROCESSABLE_ENTITY`; error code `COMPLETION_INCOMPLETE`; response payload lists exact missing items. |
| **T-15** | REQ-OPS-10 | Business Rule / Negative | Installation commissioning test failure | Technician calls `PUT /jobs/:id/tests` recording an earthing resistance test failure (`passed: false`). | Job status transitions to `Rework Required`; subsequent call to `/complete` returns 422; revisit must be scheduled. |
| **T-16** | REQ-OPS-11, REQ-OPS-12 | Unit / Database | Warranty period eligibility evaluation | Check eligibility for 4 scenarios: claim date within term, claim date after term, inactive warranty, unknown serial. | Returns authoritative codes: `WITHIN_PERIOD` (with remaining days), `EXPIRED`, `NOT_ACTIVE`, and `NO_RECORD`. |
| **T-17** | REQ-OPS-05, REQ-OPS-11 | Integration / Event | Warranty start event on delivery | Warehouse calls `POST /dispatches/:id/deliver` with `delivered_at = "2026-11-01"`. | Linked warranty records transition `Pending Activation` → `Active`; `start_date` set to `2026-11-01`; `end_date` computed correctly. |
| **T-18** | REQ-SFA-03 | Business Rule / Guard | Add charges to service ticket before coverage decision | Support calls `POST /service-tickets/:id/charges` while ticket `coverage_decision === 'PENDING'`. | Status `422 UNPROCESSABLE_ENTITY`; error code `COVERAGE_PENDING`; charge entry is strictly rejected. |
| **T-19** | REQ-SFA-03 | Business Rule | Covered vs Not-Covered service claim routing | 1. Ticket marked `COVERED_WARRANTY`.<br>2. Ticket marked `NOT_COVERED_PAID`. | Covered ticket sets customer bill to 0 paise (free repair); Not-Covered ticket unlocks billable labor/parts line entry. |
| **T-20** | REQ-OPS-12, REQ-SFA-14 | Integration / AI | 18-month inverter claim evaluation & plain explanation | Customer reports inverter fault 18 months after install (24-month term). | Backend returns `WITHIN_PERIOD` (~6 months remaining); AI explanation panel explains coverage without contradiction. |
| **T-21** | REQ-SFA-05 | Business Rule / Guard | Close service case without customer confirmation | Support calls `POST /cases/:id/close` after tech completion but before customer confirmation is recorded. | Status `422 UNPROCESSABLE_ENTITY`; error code `CLOSURE_CHECKS_FAILED`; case remains in `Awaiting Customer Confirmation`. |
| **T-22** | REQ-SFA-09 | Ledger / Calculation | Order balance calculation after advance & balance | Order total 300,000 paise. Record advance payment 60,000 paise, then balance payment 240,000 paise. | After advance: `outstanding = 240000`, `payment_status = Partially Paid`. After balance: `outstanding = 0`, `status = Paid`. |
| **T-23** | REQ-SFA-10 | Unit / Financial Math | Project profitability calculation formula | Dispatched serial items cost 180,000 paise, 10 labor hours @ 5,000 paise/hr (50,000 paise), direct expense 20,000 paise, contract revenue 300,000 paise. | Net profit = `300000 - (180000 + 50000 + 20000) = 50000 paise`; Margin = `50000 / 300000 = 16.67%`. Actuals labeled. |
| **T-24** | REQ-SFA-12 | Database / Integration | Dashboard totals vs underlying ledger records | Execute `GET /dashboard/admin` against seeded database. | `dashboard_total - sum(verified_payments) === 0`; reconciliation widget verifies 0 mathematical discrepancy. |
| **T-25** | REQ-SFA-07 | Payment Integration | Test-mode Razorpay payment verification success | Send valid HMAC SHA256 signature to `POST /payment-requests/:id/verify`. | Payment status moves to `Paid`; exactly one row inserted into `payments`; order balance updated; test flag `true`. |
| **T-26** | REQ-SFA-07 | Negative / Payment | Payment failure and checkout cancellation | 1. Provider reports payment failed.<br>2. Customer cancels checkout modal. | Failed attempt recorded with sanitized error; Cancelled updates request; zero rows created in `payments` ledger. |
| **T-27** | REQ-SFA-07, REQ-FND-08 | Integration / Background | Delayed payment verification & reconciliation job | Payment request stuck in `Pending Verification` for > 10 minutes. Run scheduled reconciliation job. | Job queries Razorpay Orders API, retrieves captured status, verifies amount, and marks payment `Paid` via ledger service. |
| **T-28** | REQ-SFA-07 | Security / Payment | Invalid callback signature rejection | Send forged or tampered signature to `POST /payment-requests/:id/verify`. | Status `400 BAD_REQUEST`; error code `INVALID_PAYMENT_SIGNATURE`; state remains unverified; security alert logged. |
| **T-29** | REQ-SFA-07 | Security / Webhook | Invalid webhook signature rejection | Send POST request to `/webhooks/razorpay` with invalid `X-Razorpay-Signature`. | Status `400 BAD_REQUEST`; payload parsing aborted; zero database records created; security log written. |
| **T-30** | REQ-SFA-07 | Idempotency / Webhook | Duplicate webhook delivery handling | Deliver identical signed webhook payload twice with the same `event_id`. | First delivery returns 200 OK and applies payment; second delivery returns 200 OK immediately with no duplicate write. |
| **T-31** | REQ-SFA-07, REQ-SFA-08 | Edge Case / Payment | Amount or order ID mismatch during verification | Webhook reports payment for 50,000 paise against a request generated for 60,000 paise. | Payment moves to `Mismatch (review)`; no ledger entry created; alert sent to Admin; requires manual reconciliation. |
| **T-32** | REQ-SFA-06 | Idempotency / API | Repeat payment request with same Idempotency-Key | Send two identical `POST /orders/:id/payment-requests` calls with the same `Idempotency-Key` header. | First call creates Razorpay order; second call returns identical existing payment request without calling Razorpay API again. |
| **T-33** | REQ-SFA-07 | Concurrency / Race | Webhook and callback simultaneous arrival race | Dispatch callback verification and webhook delivery concurrently for the same transaction. | Both execute `applyVerifiedPayment()` with row lock on `payment_requests`; exactly ONE `payments` row is created. |
| **T-34** | REQ-SFA-07 | Business Rule / Guard | Unverified payment impact on balances | Create payment request in `Initiated` or `Pending Verification` status. | Query balances and dashboards; unverified payments are completely excluded from received totals and order balances. |
| **T-35** | REQ-SFA-13, REQ-SFA-14 | AI / Grounding | Grounded AI output citation verification | Call `POST /ai/cases/:id/summary` with mock provider. | Output validator asserts every cited ID exists in input context; response includes labeled source records array. |
| **T-36** | REQ-SFA-13 | AI / Uncertainty | AI handling of missing or contradictory data | Call `POST /ai/enquiries/:id/missing-info` on enquiry lacking roof and bill data. | Missing-info list explicitly enumerates missing fields; summary text states information is unavailable without guessing. |
| **T-37** | REQ-SFA-13 | Security / AI | AI inquiry regarding unauthorized record | Technician calls `POST /ai/cases/:id/summary` for a case not assigned to them. | Status `403 FORBIDDEN`; neutral refusal message; zero case data, metadata, or internal notes disclosed. |
| **T-38** | REQ-SFA-13 | Reliability / AI | Fallback failover during provider timeout or error | Configure AI provider to throw timeout error. Call `/ai/enquiries/:id/summary`. | Returns deterministic template summary; response contains `fallbackUsed: true` and user-facing notice banner. |
| **T-39** | REQ-SFA-13 | Guardrail / AI | AI proposed action execution requires human authorization | AI summary returns proposed action button ("Approve survey"). | Clicking button calls `POST /surveys/:id/approve` under user's JWT; server validates permission; AI cannot execute directly. |
| **T-40** | REQ-SFA-01 | Safety / Interceptor | Pre-model safety detection on "burning smell" | Customer submits issue description: "Inverter is making sparking noise and burning smell." | `SafetyInterceptor` flags `safety_flag = true`, sets `priority = 'P1'`, bypasses AI, alerts Admin, and shows safety notice. |
| **T-41** | REQ-SFA-01, REQ-SFA-02 | Support Workflow | Support override of AI classification | AI classifies case as `Basic`; Support overrides to `Major` with reason. | Case updated with `category_confirmed = 'Major'`; override event logged with AI value, Support value, user, and time. |
| **T-42** | REQ-SFA-04 | Authorization / Guard | Admin approval required before service assignment | Support attempts to assign technician to major service job before Admin approves. | Status `422 UNPROCESSABLE_ENTITY`; error code `ADMIN_APPROVAL_REQUIRED`; assignment blocked until Admin approves. |
| **T-43** | REQ-OPS-09, REQ-FND-03 | Authorization / Scoping | Technician access to unassigned service job | Technician calls `GET /my/jobs/:id` for a job assigned to a different technician. | Status `403 FORBIDDEN` or `404 NOT_FOUND`; technician is prevented from viewing unassigned job details. |
| **T-44** | REQ-SFA-05 | Business Rule / Guard | Technician completion does not close case | Assigned technician calls `POST /cases/:id/technician-complete`. | Case moves to `Awaiting Support Review`; status is NOT `Closed`; service ticket remains open. |
| **T-45** | REQ-SFA-05 | Support Workflow | Customer dispute reopens case & raises priority | Customer calls `POST /cases/:id/customer-confirmation` with `result = 'DISPUTED'`. | Status moves to `Reopened`; priority increments (e.g. P3 → P2); case returns to Support Review queue. |
| **T-46** | REQ-SFA-05 | Support Workflow | Unresolved field repair escalation | Technician submits completion with `resolved: false` and note "compressor burnt". | Case moves to `Escalated to Support`; Admin and Support alerted for equipment replacement. |
| **T-47** | REQ-SFA-02 | FSM / Negative | Invalid support case transition attempt | Attempt to transition case directly from `New` to `Closed`. | Status `422 UNPROCESSABLE_ENTITY`; error code `CASE_TRANSITION_NOT_ALLOWED`; case state remains unchanged. |
| **T-48** | REQ-SFA-02 | Privacy / Security | Customer API exclusion of internal notes | Case contains customer messages and internal staff notes (`visibility: INTERNAL`). Fetch case as Customer. | Response payload contains customer messages only; internal notes array is completely stripped. |
| **T-49** | REQ-FND-04, REQ-SFA-02 | Audit Trail | End-to-end case lifecycle audit verification | Query `audit_logs` and `status_history` for a fully closed support case. | Complete unbroken chronological chain exists: intake → triage → review → approval → assignment → work → confirm → close. |
| **T-50** | REQ-FND-03, REQ-OPT-04 | Authorization / Scoping | Partner role data isolation (Optional) | User with Partner role calls `GET /customers` or `GET /invoices`. | Status `403 FORBIDDEN`; partner can only view assigned `partner_assignments`. |

---

## 3. Critical Acceptance Criteria (AC-1 through AC-12 Traceability)

Detailed verification steps proving that the 12 core workflow acceptance criteria defined in §20.2 are strictly fulfilled:

### AC-1: Survey-Gated Quotation
- **Given**: An enquiry with a survey in `Submitted`, `Scheduled`, or `Rejected` status.
- **When**: Sales attempts to generate a quotation via `POST /quotations`.
- **Then**: Backend API returns 422 `SURVEY_NOT_APPROVED`; database contains no quotation row.
- **Given**: An enquiry whose latest survey has been marked `Approved` by Admin.
- **When**: Sales generates a quotation.
- **Then**: Draft quotation is created; BOM line items are automatically calculated from the package template using configured quantity formulas.

### AC-2: Verified Payment
- **Given**: An order in `Awaiting Payment` with an advance payment due.
- **When**: Customer executes a test-mode Razorpay transaction.
- **Then**: The order displays `Paid` ONLY after backend verification of cryptographic HMAC signature (or signed webhook); exactly ONE payment record is created in `payments`; order balance equals `total - verified_paid`; UI clearly displays "TEST MODE".

### AC-3: Serial Traceability
- **Given**: A reserved project BOM in the warehouse.
- **When**: Warehouse scans serial numbers and confirms dispatch.
- **Then**: Each serial is bound to the project and customer; cannot be scanned elsewhere; appears on the serial trace page showing full lineage from supplier to roof; and warranty records are spawned.

### AC-4: Installation Completion
- **Given**: An assigned installation job in progress.
- **When**: Actual hours, matching serial equipment, all required photo categories, passed test results, and customer digital signature are recorded.
- **Then**: Completion succeeds; job moves to `Completed`; order moves to `Installed`; warranty records activate per configured start rule.

### AC-5: Warranty Eligibility
- **Given**: A serialized component installed on a customer site.
- **When**: Support queries eligibility for an issue date.
- **Then**: Backend returns authoritative status code (`WITHIN_PERIOD`, `EXPIRED`, `NOT_ACTIVE`, `VOID`, `NO_RECORD`) with remaining duration; AI explanation panel explains terms in plain language without contradicting backend dates.

### AC-6: Service Closure
- **Given**: A service ticket with technician field work submitted.
- **When**: Support reviews evidence and customer submits confirmation on portal.
- **Then**: Case closure succeeds and ticket closes.
- **When**: Closure is attempted without customer confirmation.
- **Then**: Closure is strictly rejected with 422 `CLOSURE_CHECKS_FAILED`.

### AC-7: Escalation Chain
- **Given**: A major issue reported by a customer.
- **When**: Case is submitted.
- **Then**: AI triage routes to Support → Support escalates to Admin → Admin approves and assigns technician → Technician records work → Support reviews → Customer confirms → Case closes. Full timeline rendered with internal notes hidden from customer.

### AC-8: Safety Interception
- **Given**: An issue description containing hazard signals (e.g., "burning smell", "sparks").
- **When**: Case is submitted.
- **Then**: System sets `priority = 'P1'`, flags `safety_flag = true`, bypasses AI guidance, renders fixed emergency safety alert, and notifies Support lead and Admin immediately.

### AC-9: Dashboard Integrity
- **Given**: Live and seeded database records.
- **When**: Admin loads dashboard (`S-01`).
- **Then**: Every displayed metric matches the sum or count of its underlying records; payment total reconciles with `sum(verified_payments)` with zero discrepancy.

### AC-10: AI Boundaries
- **Given**: Any AI feature invocation across the platform.
- **Then**: AI uses only authorized caller data; cites source records; displays labeled purple panel; falls back gracefully on failure; and cannot mutate database records.

### AC-11: Inventory Protection
- **Given**: A project BOM where stock is insufficient or order payment gate is unfulfilled.
- **When**: Warehouse attempts allocation or dispatch.
- **Then**: Operation is blocked with explicit error message (`INSUFFICIENT_STOCK` or `PAYMENT_GATE_NOT_MET`) unless an approved policy exception exists.

### AC-12: Project Profitability
- **Given**: Recorded revenue, dispatched serial equipment receipt costs, approved technician timesheet hours, and approved expenses for a project.
- **When**: Admin views project profitability (`S-94`).
- **Then**: Profit and margin match the authoritative formula: `Revenue - (Materials + Labor + Direct + Service)`; all figures are explicitly labeled as Actual or Estimate.
