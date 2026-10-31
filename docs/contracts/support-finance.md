# Module Contract: Support, Finance & AI
**Module Owner:** Member 4  
**API Route Prefix:** `/api/v1/support-finance`  
**Migration Reference:** `server/src/db/migrations/103_support_finance.sql`  
**Repository Layer:** `server/src/modules/support-finance/repository.js`  
**Warranty Adapter:** `server/src/modules/support-finance/warranty.adapter.js`  
**Status:** Partially Ready (Phase 9 Cross-Module Integration Verified — Security Hardened & Contract Aligned; Awaiting live PostgreSQL credentials and branch integration from Member 1 and Member 3)  
**Branch:** `feature/support-finance-ai`

---

## 1. Domain Scope & Responsibility

Member 4 exclusively provides:
1. **Support Cases & 33-Transition FSM (§9):** Customer issue reporting, deterministic pre-model safety interceptor (P1 Critical), AI triage guidance, Support queue, Admin approval/assignment, technician work submission, Support evidence review, customer confirmation sign-off gate, and closure criteria verification.
2. **Service Tickets & Pre-Billing Warranty Check (§7.6):** Formal repair tickets, pre-billing warranty eligibility guard (`coverage_decision !== 'PENDING'`), itemized charges, and goodwill approvals.
3. **Razorpay Test Mode Payments (§17):** Server-authoritative order creation, checkout verification via HMAC SHA256 signature with constant-time comparison, raw-body webhook signature verification, idempotency deduplication, and atomic verified ledger recording via database transactions.
4. **Financial Reporting & Project P/L (§7.7):** Invoices, customer balances (with overpayment detection), direct expenses, approved timesheets and payroll tracking, government subsidy paperwork tracking, and project-wise profitability calculation (`Revenue - Costs`).
5. **Dashboards & Analytics (§13):** Role-tailored operational widgets using Recharts, and the authoritative mathematical reconciliation widget (`dashboard total - sum(verified payments) = 0`).
6. **Sandboxed AI Assistance Layer (§8):** AI summaries, missing information detector, plain-language warranty explanations with dual-panel segregation, and triage assistance using a local mock provider by default with deterministic safety fallbacks.

---

## 2. Exported Harmonized REST API Endpoints & RBAC Guards

All routes mounted under `/api/v1/support-finance`. Protected with `requireRole` supporting Member 1's Platform Foundation role schema:
- `ADMIN_ROLES`: `['Admin', 'Admin/Owner']`
- `SUPPORT_ADMIN_ROLES`: `['Admin', 'Admin/Owner', 'Support']`
- `FINANCE_ADMIN_ROLES`: `['Admin', 'Admin/Owner', 'Finance']`
- `TECH_ADMIN_ROLES`: `['Admin', 'Admin/Owner', 'Technician']`
- `CUSTOMER_ADMIN_ROLES`: `['Admin', 'Admin/Owner', 'Customer']`

### A. Support Cases & Safety Chain
- `POST /cases` — Report an issue (authenticated; triggers deterministic safety screen).
- `GET /cases` — List cases (authenticated; filtered by role; P1 pinned; SLA tracked).
- `GET /cases/:id` — Case detail (authenticated; customers strictly excluded from seeing `INTERNAL` notes).
- `POST /cases/:id/messages` — Add customer message or internal team note (authenticated).
- `POST /cases/:id/classification` & `PATCH /cases/:id/classification` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `POST /cases/:id/admin-decision` — `requireRole(ADMIN_ROLES)`.
- `POST /cases/:id/assign` — `requireRole(ADMIN_ROLES)`.
- `POST /cases/:id/technician-complete` — `requireRole(TECH_ADMIN_ROLES)` (technician submits field findings; cannot close case).
- `POST /cases/:id/support-review` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `POST /cases/:id/customer-confirmation` — `requireRole(CUSTOMER_ADMIN_ROLES)`.
- `POST /cases/:id/close` — `requireRole(SUPPORT_ADMIN_ROLES)` (enforces customer confirmation closure gate).

### B. Service Tickets & Warranty-Gated Billing
- `GET /tickets/by-case/:caseId` & `GET /service-tickets/case/:caseId` — Retrieve ticket and charges for a case.
- `GET /tickets/:id/warranty-lookup` & `GET /warranties/eligibility/:serial` — Query warranty status via Operations Warranty Adapter.
- `POST /service-tickets` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `PATCH /service-tickets/:id/coverage` & `PATCH /tickets/:id/coverage-decision` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `POST /service-tickets/:id/charges` & `POST /tickets/:id/charges` — `requireRole(SUPPORT_ADMIN_ROLES)` (**422 BLOCKED** while coverage is `PENDING`).

### C. Razorpay Test Payments & Webhooks
- `GET /payments/requests` — List active payment requests.
- `POST /payments/create-order` & `POST /payments/orders` — Create Razorpay order (backend derives amount in paise; requires `Idempotency-Key`).
- `POST /payments/verify-signature` & `POST /payments/verify` — Cryptographic HMAC-SHA256 timing-safe verification of checkout callback.
- `POST /payments/webhook` & `POST /payments/simulate-webhook` — Webhook handler verifying HMAC on raw request body buffer (no test bypass in production).
- `GET /payments/ledger` & `GET /payments` — Verified payments ledger.
- `POST /payments/manual` & `POST /payments/offline` — `requireRole(FINANCE_ADMIN_ROLES)` (mandatory reference and proof file).

### D. Finance, Invoices & Profitability
- `GET /invoices` & `GET /finance/invoices` — List invoices and outstanding balances (flags negative balances as overpaid).
- `GET /expenses` & `GET /finance/expenses` — List direct project expenses.
- `POST /expenses` & `POST /finance/expenses` — `requireRole(FINANCE_ADMIN_ROLES)`.
- `POST /expenses/:id/approve` & `PATCH /finance/expenses/:id/review` — `requireRole(FINANCE_ADMIN_ROLES)`.
- `GET /technician-pay` & `GET /finance/technician-pay` — View approved technician timesheet pay records.
- `GET /subsidy/:projectId` & `GET /finance/subsidies` — Subsidy application document status.
- `PATCH /subsidy/:projectId` & `PATCH /finance/subsidies/:projectId/checklist` — `requireRole(FINANCE_ADMIN_ROLES)`.
- `GET /profitability/:projectId` & `GET /finance/project-profitability/:projectId` — Project-wise P/L breakdown with actual vs estimate labels.

### E. Dashboards & Analytics
- `GET /dashboards/reconciliation` & `POST /dashboards/reconcile` — Authoritative payment reconciliation proving zero discrepancy.
- `GET /dashboards/metrics` & `GET /dashboards/:role` — Role-specific metrics for Admin, Support, Finance, Customer, and Technician.

### F. AI Assistance Layer (Mock Default)
- `POST /ai/summarize` — Grounded summary of enquiry, case, or project with source citations.
- `POST /ai/missing-info` — Deterministic detector for unpopulated survey/permit fields.
- `POST /ai/warranty-explain` & `POST /ai/explain-warranty` — Dual-panel plain-language warranty explanation alongside system result.
- `POST /ai/triage` — Non-hazardous customer troubleshooting advice with safety interceptor.
- `GET /ai/logs` — Audit trail of AI invocations.

---

## 3. Cross-Module Integration Verification (Phase 9 Audit)

### A. Member 1 (Platform Foundation) — Authentication & JWT
1. **Inspection of `origin/main`:**
   - Member 1 merged `feature/platform-foundation` with real JWT verification in `server/src/middleware/auth.middleware.js` and `server/src/shared/utils/jwt.js`.
   - Access tokens are signed using `jwt.sign({ sub, email, role, type: 'access' }, env.JWT_SECRET)`.
   - Incoming requests are decoded via `verifyAccessToken(token)`.
   - Tokens must correspond to an active database row in `users` (`SELECT id, email, full_name, role, phone, is_active FROM users WHERE id = $1;`).
2. **Rejection of Unauthenticated Requests:**
   - Missing or invalid tokens throw `UnauthorizedError('Authentication required: Missing access token')`.
3. **Role Authorization Integrity:**
   - Client headers `x-role` and `x-user-role` are ignored in production mode.
   - User identity and role derive exclusively from verified JWT and database user state (`req.user`).
4. **Role Schema Harmonization:**
   - Member 1 defined `ROLES.ADMIN = 'Admin/Owner'`.
   - Member 4 RBAC route guards (`routes.js`) have been upgraded to accept `Admin/Owner` across all administrative endpoints.
5. **Identified Blockers / Gaps:**
   - **Finance Role:** Member 1's role enum (`Admin/Owner`, `Sales`, `Warehouse`, `Technician`, `Support`) lacks a dedicated `Finance` role; Member 4 maps Finance privileges to `Admin/Owner` for parity.
   - **Customer Portal Authentication:** Member 1's internal `users` table currently does not model portal customer logins. Customer case interactions require an authentication strategy or customer user mapping upon final merge.

### B. Member 3 (Operations) — Warranty Contract & Table Mismatch
1. **Investigation of `serial_registry` vs `serial_items` Mismatch:**
   - In early planning documents (`development-phases.md`, `requirement-inventory.md`), the serialized inventory table was referred to as `serial_registry`.
   - In `001_foundation.sql`, the physical table was created as `serial_items` (`id`, `product_id`, `serial_number`, `status`, `unit_cost_paise`, `project_id`, `customer_id`).
   - In `docs/contracts/operations.md` (§15.3, §17), Member 3 confirmed `serial_items` as the primary table and defined a compatibility view: `CREATE OR REPLACE VIEW serial_registry AS SELECT * FROM serial_items;`.
2. **Adapter Dual-Resilience:**
   - Member 4's `warranty.adapter.js` queries `serial_items` as primary and falls back to `serial_registry` if `serial_items` is not yet migrated.
   - Normalizes all response fields matching Member 3's `GET /api/v1/operations/warranties/:serialNumber` contract: `serialNumber`, `warrantyCode`, `productName`, `productId`, `customerId`, `projectId`, `status`, `durationMonths`, `startDate`, `endDate`, `remainingDays`, `remainingMonths`, `isAuthoritativeDB`.
3. **No Silent Mock Fallback:**
   - If Operations database tables are unreachable in production, `checkEligibility` returns `{ status: 'UNAVAILABLE', isAuthoritativeDB: false }` and never grants false warranty coverage.

### C. PostgreSQL Persistence Status
- **Parameterization:** 100% of queries use `$1, $2, ...` parameterized placeholders.
- **Fail-Fast Policy:** In production mode (`NODE_ENV === 'production'`), any query error or failure throws a 500 `DATABASE_PERSISTENCE_ERROR`. Silent in-memory store fallback is prohibited.
- **Live Connection Status:** **UNVERIFIED (LIVE DB OFFLINE / ACCESS DENIED)**. Environment credentials in `server/src/config/env.js` fail with `password authentication failed for user "postgres"`. No fake credentials were created.
- **Test Separation:** Mocked/isolated tests pass cleanly (22/22 tests). Production fail-fast is validated via dedicated rejection tests.

### D. Route Integration & Central Mounting
- Member 4 router is mounted at `/api/v1/support-finance` in `server/src/app.js`.
- All routes export cleanly and verify against role checks.

---

## 4. Test & Build Status

- **Automated Backend Tests:** **22 passing tests** (0 failed, 0 skipped, 100% pass rate in `server/src/modules/support-finance/support-finance.test.js`).
  - Covers Safety Interceptor, Case FSM, Pre-Billing Warranty Guard, 7-Stage Chain, Customer Dispute, Notes Scoping, Razorpay HMAC, Webhook Idempotency, Reconciliation, Profitability, AI Grounding, Database Probe, Warranty Adapter, Route Harmonization, Production Fail-Fast, Production Warranty Fallback Prohibited, Payment Tampering Rejection, Webhook Signature Requirement, RBAC Middleware Guards, AI Safety Mutation Barriers, Member 1 "Admin/Owner" Role Interoperability, and Operations Contract Schema Alignment.
- **Frontend Production Build:** Succeeded (`npm run build` in `client/` compiled 2217 modules in 7.33s with 0 errors).
- **Module Status:** **PARTIALLY READY** pending final live PostgreSQL database credentials, JWT integration from Member 1, and Operations table seeding from Member 3.
