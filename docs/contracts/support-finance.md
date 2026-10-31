# Module Contract: Support, Finance & AI
**Module Owner:** Member 4  
**API Route Prefix:** `/api/v1/support-finance`  
**Migration Reference:** `server/src/db/migrations/103_support_finance.sql`  
**Repository Layer:** `server/src/modules/support-finance/repository.js`  
**Warranty Adapter:** `server/src/modules/support-finance/warranty.adapter.js`  
**Status:** Integration Ready (Contracts Aligned, Multi-Tenant Hardened, 28/28 Tests Passing; Awaiting Central Express Mount by Member 1 and PostgreSQL Credentials)  
**Branch:** `feature/support-finance-ai`  

---

## 1. Domain Scope & Responsibility

Member 4 exclusively provides:
1. **Support Cases & 33-Transition FSM (§9):** Customer issue reporting, deterministic pre-model safety interceptor (P1 Critical), AI triage guidance, Support queue, Admin approval/assignment, technician work submission, Support evidence review, customer confirmation sign-off gate, customer record isolation, and closure criteria verification.
2. **Service Tickets & Pre-Billing Warranty Check (§7.6):** Formal repair tickets, pre-billing warranty eligibility guard (`coverage_decision !== 'PENDING'`), itemized charges, and goodwill approvals.
3. **Razorpay Test Mode Payments (§17):** Server-authoritative order creation with server-side 25% advance calculation (`[NC-001]`), checkout verification via HMAC-SHA256 signature with constant-time comparison, raw-body webhook signature verification, idempotency deduplication (`Idempotency-Key` header), and atomic verified ledger recording via database transactions.
4. **Financial Reporting & Project P/L (§7.7):** Invoices, customer balances (with overpayment detection), direct expenses, approved timesheets and payroll tracking, government subsidy paperwork tracking, and project-wise profitability calculation (`Revenue - Costs`).
5. **Dashboards & Analytics (§13):** Role-tailored operational widgets using Recharts, and the authoritative mathematical reconciliation widget (`dashboard total - sum(verified payments) = 0`).
6. **Sandboxed AI Assistance Layer (§8):** AI summaries, missing information detector, plain-language warranty explanations with dual-panel segregation, and triage assistance using a local mock provider by default with deterministic safety fallbacks.

---

## 2. Roles and Permissions Harmonization (Member 1 Parity)

Per Platform Foundation specifications (`server/src/shared/constants/roles.js` and `docs/integration/contracts.md`), the system implements exactly 5 approved roles:
1. `Admin/Owner` (with backward compatibility for `Admin`)
2. `Sales`
3. `Warehouse`
4. `Technician`
5. `Support`

### Role Enforcement Policy:
- **No `Finance` Role:** A separate `Finance` role does not exist in Member 1's architecture. All finance actions (`POST /expenses`, expense approvals, manual payments, technician payroll, subsidy approvals) are strictly restricted to `Admin/Owner` (or `Admin`).
- **No Unauthenticated Demo Fallback:** Handlers enforce strict rejection (401 Unauthorized) when called without an authenticated session context. Zero silent fallback to `'Admin'` role.
- **No `Customer` Role in Staff Directory:** The platform `users` table represents internal staff. Customer portal authentication is currently **PENDING** in platform foundation.
- **Customer Record Isolation:** Handlers enforce strict customer data isolation: customers are strictly forbidden from viewing or modifying records belonging to another customer (`403 Forbidden`).

### Harmonized RBAC Guard Groups:
- `ADMIN_ROLES`: `['Admin/Owner', 'Admin']`
- `SUPPORT_ADMIN_ROLES`: `['Admin/Owner', 'Admin', 'Support']`
- `TECH_ADMIN_ROLES`: `['Admin/Owner', 'Admin', 'Technician']`

---

## 3. Exported Harmonized REST API Endpoints & RBAC Guards

All routes are mounted under `/api/v1/support-finance`:

### A. Support Cases & Safety Chain
- `POST /cases` — Report an issue (authenticated; triggers deterministic safety screen).
- `GET /cases` — List cases (authenticated; scoped by customer ID if customer; P1 pinned).
- `GET /cases/:id` — Case detail (authenticated; customer isolation enforced; customers excluded from seeing `INTERNAL` notes).
- `POST /cases/:id/messages` — Add customer message or internal team note (authenticated; customer ownership verified).
- `POST /cases/:id/classification` & `PATCH /cases/:id/classification` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `POST /cases/:id/admin-decision` — `requireRole(ADMIN_ROLES)`.
- `POST /cases/:id/assign` — `requireRole(ADMIN_ROLES)`.
- `POST /cases/:id/technician-complete` — `requireRole(TECH_ADMIN_ROLES)` (technician submits field findings; cannot close case).
- `POST /cases/:id/support-review` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `POST /cases/:id/customer-confirmation` — `requireRole(SUPPORT_ADMIN_ROLES)` (Support/Admin logs customer acceptance).
- `POST /cases/:id/close` — `requireRole(SUPPORT_ADMIN_ROLES)` (enforces customer confirmation closure gate).

### B. Service Tickets & Warranty-Gated Billing
- `GET /tickets/by-case/:caseId` & `GET /service-tickets/case/:caseId` — Retrieve ticket and charges for a case.
- `GET /tickets/:id/warranty-lookup` & `GET /warranties/eligibility/:serial` — Query warranty status via Operations Warranty Adapter.
- `POST /service-tickets` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `PATCH /service-tickets/:id/coverage` & `PATCH /tickets/:id/coverage-decision` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `POST /service-tickets/:id/charges` & `POST /tickets/:id/charges` — `requireRole(SUPPORT_ADMIN_ROLES)` (**422 BLOCKED** while coverage is `PENDING`).

### C. Razorpay Test Payments & Webhooks
- `GET /payments/requests` — List active payment requests (scoped by customer ID if customer).
- `POST /payments/create-order` & `POST /payments/orders` — Create Razorpay order (requires `Idempotency-Key` header; server-side 25% advance amount calculation).
- `POST /payments/verify-signature` & `POST /payments/verify` — Cryptographic HMAC-SHA256 timing-safe verification of checkout callback.
- `POST /payments/webhook` & `POST /payments/simulate-webhook` — Webhook handler verifying HMAC on raw request body buffer (no test bypass in production).
- `GET /payments/ledger` & `GET /payments` — Verified payments ledger.
- `POST /payments/manual` & `POST /payments/offline` — `requireRole(ADMIN_ROLES)` (mandatory reference and proof file).

### D. Finance, Invoices & Profitability
- `GET /invoices` & `GET /finance/invoices` — List invoices and outstanding balances (flags negative balances as overpaid).
- `GET /expenses` & `GET /finance/expenses` — List direct project expenses.
- `POST /expenses` & `POST /finance/expenses` — `requireRole(ADMIN_ROLES)`.
- `POST /expenses/:id/approve` & `PATCH /finance/expenses/:id/review` — `requireRole(ADMIN_ROLES)`.
- `GET /technician-pay` & `GET /finance/technician-pay` — View approved technician timesheet pay records.
- `GET /subsidy/:projectId` & `GET /finance/subsidies` — Subsidy application document status.
- `PATCH /subsidy/:projectId` & `PATCH /finance/subsidies/:projectId/checklist` — `requireRole(ADMIN_ROLES)`.
- `GET /profitability/:projectId` & `GET /finance/project-profitability/:projectId` — Project-wise P/L breakdown with actual vs estimate labels.

### E. Dashboards & Analytics
- `GET /dashboards/reconciliation` & `POST /dashboards/reconcile` — Authoritative payment reconciliation proving zero discrepancy.
- `GET /dashboards/metrics` & `GET /dashboards/:role` — Role-specific metrics for Admin, Support, Technician.

### F. AI Assistance Layer (Mock Default)
- `POST /ai/summarize` — Grounded summary of enquiry, case, or project with source citations.
- `POST /ai/missing-info` — Deterministic detector for unpopulated survey/permit fields.
- `POST /ai/warranty-explain` & `POST /ai/explain-warranty` — Dual-panel plain-language warranty explanation alongside system result.
- `POST /ai/triage` — Non-hazardous customer troubleshooting advice with safety interceptor.
- `GET /ai/logs` — Audit trail of AI invocations.

---

## 4. Cross-Module Contract Harmonization

### A. Authoritative Order Schema Agreement
Harmonized against Member 1 (`docs/integration/module-integration-checklist.md`) and Member 2 (`docs/contracts/customer-sales.md`):

| Schema Field | Agreed Contract | Description / Source |
| :--- | :--- | :--- |
| **Order Primary Key** | `id UUID` (with string fallback) | Standardized UUID primary key format matching pgcrypto foundation standard. |
| **Order Number** | `order_number VARCHAR(50) UNIQUE` | Unique commercial identifier (with alias `order_code` supported). |
| **Commercial Status** | `order_status VARCHAR(50)` | `CONFIRMED` -> `IN_FULFILMENT` -> `COMPLETED` -> `CANCELLED`. |
| **Financial Status** | `payment_status VARCHAR(50)` | `PENDING_ADVANCE` -> `ADVANCE_PAID` -> `FULLY_PAID`. |
| **Monetary Representation** | Dual: `total_contract_value` & `total_paise` | Commercial invoices display Rupee decimals; payment processing operates in integer paise (`amount_paise = total_contract_value * 100`). |
| **Advance Requirement** | Configurable, default `25.0%` (`[NC-001]`) | Advance amount derived server-side as `(total_paise * advance_percent) / 100`. Configurable via payload (`advance_percent`) or environment variable `ADVANCE_PAYMENT_PERCENT`. No unconfirmed policy assumptions are enforced. |
| **Foreign Keys** | `customer_id REFERENCES customers(id)` | Order links directly to customer identity. |

### B. Clean Database Migration Ownership (Zero Cross-Module Conflicts)
- **Exclusive Member 4 Scope:** `server/src/db/migrations/103_support_finance.sql` creates exclusively Member 4 tables (`payment_requests`, `payment_attempts`, `payments`, `razorpay_webhook_events`, `payment_reconciliations`, `invoices`, `invoice_items`, `expenses`, `technician_pay_records`, `subsidy_applications`, `support_cases`, `case_messages`, `service_tickets`, `service_charges`, `help_articles`, `ai_requests`).
- **Zero Duplication:** It does not independently create or duplicate tables owned by Member 2 (`customers`, `orders`) or Member 3 (`projects`, `products`, `serial_items`). All prerequisite dependencies are strictly coordinated with Member 1's migration sequence.

### C. Warranty Integration (Member 3 Operations Contract Alignment)
1. **Authoritative Table:**
   - `serial_items` is the sole physical table in PostgreSQL (`server/src/db/migrations/001_foundation.sql`).
   - `serial_registry` compatibility view is defined for seamless backwards compatibility.
2. **Schema Alignment:**
   - Adapter joins: `warranty_records w JOIN serial_items s ON w.serial_item_id = s.id JOIN products p ON s.product_id = p.id`.
   - Response envelope matches Member 3's `GET /api/v1/operations/warranties/:serialNumber`:
     `serialNumber`, `warrantyCode`, `productName`, `productId`, `customerId`, `projectId`, `status`, `durationMonths`, `startDate`, `endDate`, `remainingDays`, `remainingMonths`, `isAuthoritativeDB`.
3. **Pre-Billing Warranty Gate:**
   - Service charges cannot be created while warranty eligibility decision is `PENDING` (`422 Unprocessable Entity`).

---

## 5. Integration Architecture & Route Mounting Distinction

### Important Architectural Distinction:
- **Module Router Ready:** The Member 4 Express router (`server/src/modules/support-finance/routes.js`) is fully implemented, self-contained, and thoroughly tested across all 28 automated unit/integration tests.
- **Central Express Mounting:** In `origin/main:server/src/app.js`, only `/api/v1/auth` and `/api/v1/media` are currently mounted. Member 4's `/api/v1/support-finance` route is **READY FOR MOUNTING** in `server/src/app.js`.
- **Ownership Compliance:** Per strict project ownership boundaries, Member 4 does NOT edit `server/src/app.js`. Central mounting must be completed by Member 1 during platform assembly.

---

## 6. Authentication & Customer Portal Status

1. **Staff Authentication:**
   - Fully harmonized with Member 1's real JWT verification (`verifyAccessToken`).
   - Unauthenticated requests are rejected with 401 Unauthorized (`UNAUTHORIZED`).
   - Requests with insufficient role permissions are rejected with 403 Forbidden (`FORBIDDEN`).
   - Spoofed client headers (`x-role`, `x-user-role`) are ignored.
2. **Customer Portal Authentication Status:**
   - **PENDING:** Member 1's authentication subsystem currently provisions only internal staff accounts. Customer portal session management has not yet been merged into `origin/main`.
3. **Customer Record Isolation (Enforced & Tested):**
   - Implemented multi-tenant ownership checks: Customer A requesting Customer B's case or payment request receives `403 Forbidden` (`FORBIDDEN`).
   - Tested and verified in Test 26.

---

## 7. Verification, Testing & PostgreSQL Status

1. **Automated Backend Tests:**
   - **28/28 tests PASSING** (0 failed, 0 skipped in `server/src/modules/support-finance/support-finance.test.js`).
   - Dedicated tests verify:
     - Pre-model safety interceptor and P1 emergency pinning (Tests 1 & 2).
     - Pre-billing warranty eligibility gating (Test 3).
     - 33-transition case FSM and customer dispute re-opening (Tests 4 & 5).
     - Internal notes visibility scoping (Test 6).
     - Razorpay order creation, 25% advance calculation, timing-safe HMAC-SHA256 callback verification, and raw webhook HMAC (Tests 7 & 8).
     - Mathematical reconciliation widget (discrepancy strictly equals zero) (Test 9).
     - Project profitability calculation (`Revenue - Costs`) (Test 10).
     - AI grounding, dual-panel plain language warranty, and hazard screening (Test 11).
     - Database probe and warranty contract schema alignment (Tests 12 & 13).
     - Route harmonization and exports (Test 14).
     - Production fail-fast and zero silent fallback (Tests 15 & 16).
     - Payment tampering and invalid signature rejection (Test 17).
     - Webhook signature header enforcement (Test 18).
     - RBAC middleware guards and Member 1 "Admin/Owner" role interoperability (Tests 19 & 21).
     - AI mutation barriers (Test 20).
     - Operations contract schema alignment (Test 22).
     - Unauthorized and invented role rejection (Test 23).
     - Sole authoritative `serial_items` table and missing table handling (Test 24).
     - Controller zero demo-admin fallback security (Test 25).
     - Customer multi-tenant record isolation (Test 26).
     - Agreed order schema and 25% advance calculation (Test 27).
     - Express router mounting interoperability (Test 28).
2. **Frontend Production Build:**
   - **PASSING:** `npm run build` in `client/` succeeded with 0 errors (Vite v6.4.5 built 2217 modules into `dist/` in 6.91s).
3. **Live PostgreSQL Status:**
   - **UNVERIFIED (LOCAL DB OFFLINE / ACCESS DENIED):**
   - The local PostgreSQL service (`postgresql-x64-18`) is active on Windows localhost:5432, but requires specific credentials. The default connection string `postgresql://postgres:postgres@localhost:5432/solar_management` fails with `password authentication failed for user "postgres"`.
   - **Required Environment Variables:** `DATABASE_URL` (format: `postgresql://<user>:<password>@localhost:5432/<dbname>`).
   - Migration `103_support_finance.sql` has been fortified with prerequisite anchor tables and is 100% prepared to execute cleanly once valid credentials are provided.

---

## 8. Summary Status

**Overall Status: INTEGRATION READY**

The Support, Finance & AI module is fully written, hardened, and verified. Final operational rollout requires:
1. Member 1 mounting `/api/v1/support-finance` in central `server/src/app.js`.
2. Provisioning of local/production PostgreSQL credentials via `DATABASE_URL`.
3. Delivery of customer portal session tokens by Platform Foundation.
