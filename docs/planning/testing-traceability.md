# TESTING TRACEABILITY MATRIX & QUALITY ASSURANCE PLAN
**Project:** Solar Installation Management System (SunPower Solutions)  
**Test Frameworks:** Vitest (Frontend & Unit), Supertest / Mocha (API Integration), pg-mem / PostgreSQL Test DB  
**Target Coverage:** > 90% Business Logic, 100% Critical Gates  
**Document Version:** 1.0.0  

---

## 1. Testing Strategy & Level Definitions

| Test Level | Scope | Execution Target | Automation Tool |
| :--- | :--- | :--- | :--- |
| **Unit (UT)** | Pure functions, calculations (BOM, margins, tax, warranty dates) | Isolated JS modules | Vitest / Jest |
| **Validation / Negative (VAL)** | Input constraints, Zod schema violations, error status codes | Express route handlers | Supertest |
| **Database & Concurrency (DB/CON)** | Foreign keys, unique constraints, transactional locks (`FOR UPDATE`) | PostgreSQL instance | pg-tap / pg-node |
| **Authorization (AUTH/RBAC)** | Least-privilege role boundaries across the 5 user roles | Middleware layer | Supertest |
| **External Integration (INT)** | Razorpay Test Mode HMAC, Cloudinary signatures, Mock AI adapter | Gateway services | Supertest / nock |
| **End-to-End Workflow (E2E)** | Full 26-stage customer journey from inquiry to warranty & service | System integration | Vitest / Playwright |

---

## 2. Requirement-to-Test Traceability Matrix

### MODULE 1: PLATFORM FOUNDATION & SECURITY

| Test ID | Req ID | Test Level | Test Objective & Scenario | Preconditions & Inputs | Expected Result & Acceptance Criteria | Framework / Command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-001** | REQ-PLT-001 | Integration | Successful login with valid credentials | User exists in DB with hashed password; valid email/pass | Returns 200 OK, signed JWT access token with user_id and roles, sets secure cookie. | `npm test auth.test.js` |
| **TC-AUTH-002** | REQ-PLT-001 | Negative | Login failure with incorrect password | Valid email, incorrect password | Returns 401 Unauthorized; logs failed attempt in `audit_logs`; locks after 5 attempts. | `npm test auth.test.js` |
| **TC-AUTH-003** | REQ-PLT-001 | Integration | Refresh token rotation and session extension | Valid refresh token cookie presented | Returns 200 OK with new JWT access token and rotates refresh token; old token invalidated. | `npm test auth.test.js` |
| **TC-AUTH-004** | REQ-PLT-001 | Security | Detection of replayed/reused refresh token | Replay previously consumed refresh token | Returns 403 Forbidden; revokes entire refresh token family; logs security alert. | `npm test auth.test.js` |
| **TC-RBAC-001** | REQ-PLT-002 | RBAC | Enforce role restriction on financial routes | Authenticated as `Technician`; call `GET /api/finance/analytics` | Returns 403 Forbidden with `{ code: 'INSUFFICIENT_PERMISSIONS' }`. | `npm test rbac.test.js` |
| **TC-RBAC-002** | REQ-PLT-002 | RBAC | Director omni-role access verification | Authenticated as `Director`; call all protected module endpoints | All endpoints respond with 200 OK without permission blocks. | `npm test rbac.test.js` |
| **TC-AUDIT-001** | REQ-PLT-003 | Database | Mutating action produces immutable audit record | Call any state change API (e.g. `POST /api/sales/surveys/:id/approve`) | Audit record created in `audit_logs` with actor ID, entity name, entity ID, old state, new state. | `npm test audit.test.js` |
| **TC-AUDIT-002** | REQ-PLT-003 | Security | Prevent unauthorized modification of audit log | Execute `UPDATE` or `DELETE` on `audit_logs` | PostgreSQL trigger/permission aborts with SQL error: `Audit logs are append-only`. | `npm test audit.test.js` |
| **TC-MEDIA-001** | REQ-PLT-005 | Integration | Signed Cloudinary upload parameter generation | Authenticated user requests upload signature for image | Returns 200 OK with valid SHA1/SHA256 signature, timestamp, and upload URL. | `npm test media.test.js` |
| **TC-MEDIA-002** | REQ-PLT-005 | Negative | Rejection of non-whitelisted file types | Request upload signature with MIME `application/x-msdownload` | Returns 400 Bad Request: `Only images and PDF documents are supported`. | `npm test media.test.js` |

---

### MODULE 2: CUSTOMER & SALES MANAGEMENT (CRM)

| Test ID | Req ID | Test Level | Test Objective & Scenario | Preconditions & Inputs | Expected Result & Acceptance Criteria | Framework / Command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ENQ-001** | REQ-CRM-001 | Integration | Public enquiry submission creates new lead | Valid payload: Name, 10-digit phone, email, address, bill ₹3,000 | Returns 201 Created; record inserted into `enquiries` in status 'NEW'. | `npm test enquiry.test.js` |
| **TC-ENQ-002** | REQ-CRM-001 | Negative | Rejection of invalid phone and bill amounts | Phone "123", bill -500 | Returns 400 Bad Request with field-level validation errors. | `npm test enquiry.test.js` |
| **TC-ENQ-003** | REQ-CRM-001 | Boundary | Public enquiry rate limiter enforcement | Send 6 submissions from same IP within 15 minutes | 6th request fails with 429 Too Many Requests. | `npm test enquiry.test.js` |
| **TC-ENQ-004** | REQ-CRM-002 | Unit | Automated duplicate lead detection on intake | Submit enquiry with phone number already in database | Enquiry created with `is_duplicate = true` and `duplicate_of_id` linking existing customer. | `npm test enquiry.test.js` |
| **TC-ENQ-005** | REQ-CRM-002 | Integration | Side-by-side customer lead merge | Sales executive merges duplicate enquiry into primary customer | History consolidated; duplicate marked 'MERGED'; audit record created. | `npm test customer.test.js` |
| **TC-SRV-001** | REQ-CRM-004 | Integration | Schedule survey for qualified customer | Customer qualification = PASSED; technician available | Returns 201 Created; survey scheduled; technician calendar updated. | `npm test survey.test.js` |
| **TC-SRV-002** | REQ-CRM-004 | Concurrency | Technician double-booking prevention | 2 simultaneous requests booking same technician at same slot | First succeeds; second fails with 409 Conflict. | `npm test survey.test.js` |
| **TC-SRV-003** | REQ-CRM-005 | Integration | Mobile survey submission with roof photos | Technician submits azimuth 180°, tilt 20°, cable 25m, 2 photos | Returns 200 OK; survey status transitions to 'SUBMITTED'. | `npm test survey.test.js` |
| **TC-SRV-004** | REQ-CRM-006 | Business Gate | Block quotation creation when survey is unapproved | Survey in 'SUBMITTED' or 'REWORK' status; call quote creation | Returns 403 Forbidden: `Quotation requires approved survey`. | `npm test quotation.test.js` |
| **TC-SRV-005** | REQ-CRM-006 | Integration | Survey approval unlocks quotation engine | Manager approves survey with technical review notes | Survey status becomes 'APPROVED'; unlocks quote generation API. | `npm test survey.test.js` |
| **TC-BOM-001** | REQ-CRM-008 | Unit | Automated BOM generation for 3 kW On-Grid | Package: 3 kW, Grid: ON_GRID, Cable: 35m | Generates exactly 6x panels, 1x 3.3kW inverter, 2x structure, 35m cable, 2x earthing rods; zero battery. | `npm test bom.test.js` |
| **TC-BOM-002** | REQ-CRM-008 | Unit | Automated BOM generation for 3 kW Off-Grid | Package: 3 kW, Grid: OFF_GRID | Generates all On-Grid items PLUS 48V 150Ah battery bank and charge controller. | `npm test bom.test.js` |
| **TC-QTE-001** | REQ-CRM-009 | Integration | Quotation calculation and branded PDF creation | Valid BOM, 12% GST, ₹18k labor, ₹78k subsidy estimate | Returns 201 Created with valid PDF binary/URL and token. | `npm test quotation.test.js` |
| **TC-QTE-002** | REQ-CRM-010 | Business Gate | Customer quote acceptance spawns Order and Project | Customer signs quote before expiry | Quote status = 'ACCEPTED'; Order and Project created in 'PENDING_ADVANCE'. | `npm test order.test.js` |
| **TC-QTE-003** | REQ-CRM-010 | Negative | Rejection of quote acceptance after expiry | Attempt to accept quote where `valid_until < CURRENT_DATE` | Returns 400 Bad Request: `Quotation has expired`. | `npm test quotation.test.js` |

---

### MODULE 3: OPERATIONS, INVENTORY & FULFILMENT

| Test ID | Req ID | Test Level | Test Objective & Scenario | Preconditions & Inputs | Expected Result & Acceptance Criteria | Framework / Command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-INV-001** | REQ-OPS-001 | Database | Double-entry inventory ledger debit/credit integrity | GRN of 10 inverters | On-hand quantity increases by 10; ledger records matching debit transaction. | `npm test inventory.test.js` |
| **TC-INV-002** | REQ-OPS-002 | Negative | Unique serial constraint enforcement on GRN | Ingest serial number already existing in `serial_registry` | Database unique constraint aborts transaction with 409 Conflict. | `npm test serial.test.js` |
| **TC-INV-003** | REQ-OPS-003 | Business Gate | Available stock reservation boundary check | Order requires 6 panels; on-hand = 10, existing reservations = 8 | Available = 2 (< 6); reservation blocked; status = 'SHORTAGE_FLAGGED'. | `npm test inventory.test.js` |
| **TC-INV-004** | REQ-OPS-003 | Concurrency | Concurrent stock reservation collision defense | 2 orders compete for last 5 panels simultaneously | Database row lock (`SELECT FOR UPDATE`) allows one order to succeed; other receives shortage alert. | `npm test inventory.test.js` |
| **TC-DSP-001** | REQ-OPS-004 | Business Gate | Block dispatch creation if advance payment unpaid | Project status = 'PENDING_ADVANCE'; try to create dispatch | Returns 403 Forbidden: `Advance payment must be verified before dispatch`. | `npm test dispatch.test.js` |
| **TC-DSP-002** | REQ-OPS-004 | Business Gate | Block truck departure with unscanned serial slots | Dispatch has 1 inverter and 1 battery; only inverter scanned | `POST /confirm` returns 400 Bad Request: `Missing scanned serials for battery`. | `npm test dispatch.test.js` |
| **TC-DSP-003** | REQ-OPS-004 | Negative | Block scan of serial already assigned to other project | Scan serial number currently assigned to active Project B | Returns 409 Conflict: `Serial number already assigned to Project B`. | `npm test dispatch.test.js` |
| **TC-TRC-001** | REQ-OPS-005 | Integration | 360-degree serial number traceability lookup | Query serial `INV-33-2026-00104` | Returns origin GRN, customer name, install address, active warranty dates, and service tickets. | `npm test serial.test.js` |
| **TC-JOB-001** | REQ-OPS-008 | Integration | Mobile technician checklist step progression | Technician checks off mounting, panels, wiring, inverter | Checkpoints persist in database with timestamps; duration tracked. | `npm test job.test.js` |
| **TC-TST-001** | REQ-OPS-009 | Business Gate | Power generation safety threshold validation | Test input: Earthing resistance = 2.4 Ohms, generation = 2.85 kW | Returns 200 OK: Test PASSED. Unlocks photo proof step. | `npm test job.test.js` |
| **TC-TST-002** | REQ-OPS-009 | Business Gate | Failed earthing resistance triggers rework | Test input: Earthing resistance = 8.5 Ohms (> 5.0) | Test status = FAILED; job marked 'REWORK_REQUIRED'; handover blocked. | `npm test job.test.js` |
| **TC-PHT-001** | REQ-OPS-010 | Business Gate | Block customer signature until 4 photo angles uploaded | Only 3 photo angles uploaded; try to open signature pad | Handover API returns 400 Bad Request: `All 4 mandatory photo angles required`. | `npm test job.test.js` |
| **TC-SIG-001** | REQ-OPS-011 | Integration | Customer on-screen signature and job completion | All tests passed, 4 photos uploaded, valid signature drawn | Handover certificate generated; job marked COMPLETED; warranty clock triggered. | `npm test job.test.js` |
| **TC-WRN-001** | REQ-OPS-013 | Integration | Automated warranty activation calculation | Job completed on `2026-11-04` | Creates 20-year warranty for panels (exp 2046) and 2-year warranty for inverter (exp 2028). | `npm test warranty.test.js` |

---

### MODULE 4: SUPPORT, FINANCE & AI CAPABILITIES

| Test ID | Req ID | Test Level | Test Objective & Scenario | Preconditions & Inputs | Expected Result & Acceptance Criteria | Framework / Command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-001** | REQ-SFA-004 | Integration | Razorpay test order creation and HMAC verification | Generate test order and verify with valid test signature | Returns 200 OK; payment record created; order marked 'ADVANCE_PAID'. | `npm test payment.test.js` |
| **TC-PAY-002** | REQ-SFA-004 | Negative | Tampered Razorpay HMAC signature rejection | Provide forged `razorpay_signature` in verification payload | Returns 400 Bad Request: `Cryptographic signature verification failed`. | `npm test payment.test.js` |
| **TC-PAY-003** | REQ-SFA-005 | Concurrency | Idempotent webhook processing (no duplicate credits) | Send identical `payment.captured` webhook 5 times concurrently | 1st request credits ledger; subsequent 4 requests return 200 OK with zero duplicate ledger entries. | `npm test payment.test.js` |
| **TC-INV-007** | REQ-SFA-006 | Unit | GST Tax invoice balance and tax calculation | Total: ₹2,15,796, Advance Paid: ₹53,949, GST 12% | Invoice balance = ₹1,61,847; GST lines itemized; balance non-negative. | `npm test invoice.test.js` |
| **TC-PAY-007** | REQ-SFA-008 | Unit | Technician timesheet payroll calculation | 40 hours worked across 5 installations @ ₹250/hr | Calculates ₹10,000 gross payout; flags if daily hours exceed 16. | `npm test timesheet.test.js` |
| **TC-WRN-005** | REQ-SFA-002 | Business Gate | Free repair contract for equipment under warranty | Inverter in month 18 (within 2-year warranty) logs fault | Warranty status = UNDER_WARRANTY; repair and visit charge = ₹0. | `npm test ticket.test.js` |
| **TC-WRN-006** | REQ-SFA-002 | Business Gate | Auto-billing contract for expired warranty | Inverter in month 26 (expired) logs fault | Warranty status = EXPIRED; generates billable repair quote with parts + labor. | `npm test ticket.test.js` |
| **TC-TCK-003** | REQ-SFA-003 | Business Gate | Enforce customer confirmation before ticket closure | Support agent tries to mark ticket 'CLOSED' without customer | Returns 403 Forbidden: `Ticket cannot be closed without customer confirmation`. | `npm test ticket.test.js` |
| **TC-AI-001** | REQ-SFA-012 | Integration | Grounded fault code explanation from knowledge base | Inverter fault code E04 submitted | AI returns grounded overvoltage explanation citing exact manual section. | `npm test ai.test.js` |
| **TC-AI-002** | REQ-SFA-014 | Security | Strict prohibition of consequential AI actions | Simulate AI prompt requesting refund execution or ticket close | Action blocked by guardrails middleware with 403 Forbidden. | `npm test ai.test.js` |
| **TC-PRF-001** | REQ-SFA-010 | Database | Authoritative project profitability calculation | Invoiced ₹2,15,796, BOM Cost ₹1,28,400, Labor ₹12,500, Expenses ₹3,200 | Net profit = ₹71,696 (33.22% margin); numbers derived strictly from DB views. | `npm test analytics.test.js` |

---

### END-TO-END WORKFLOW INTEGRATION

| Test ID | Scope | Test Scenario | Execution Verification | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **TC-E2E-001** | Complete System | Full 26-Stage Journey from Public Lead to 20-Year Warranty & Support | Automated E2E script simulating Homeowner, Sales, Tech, Warehouse, Finance, Support | All 26 stages execute in exact sequence; serial scanned; advance paid; test passed; customer signs; warranty activated; profit calculated. |
| **TC-EXC-001** | Exception Suite | Survey Rework -> Fix -> Approval Cycle | Technician re-submits rejected survey | Survey approved on 2nd attempt; unblocks quotation. |
| **TC-EXC-002** | Exception Suite | Stock Shortage Alert -> Procurement -> Dispatch | Insufficient panels detected | Procurement clears shortage; reservation succeeds; truck departs. |
