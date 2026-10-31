# Module Contract: Support, Finance & AI
**Module Owner:** Member 4  
**API Route Prefix:** `/api/v1/support-finance`  
**Migration Reference:** `server/src/db/migrations/103_support_finance.sql`  
**Repository Layer:** `server/src/modules/support-finance/repository.js`  
**Warranty Adapter:** `server/src/modules/support-finance/warranty.adapter.js`  
**Status:** Partially Ready (Phase 9.1 Final Contract & Integration Corrections Completed)  
**Branch:** `feature/support-finance-ai`  

---

## 1. Domain Scope & Responsibility

Member 4 exclusively provides:
1. **Support Cases & 33-Transition FSM (§9):** Customer issue reporting, deterministic pre-model safety interceptor (P1 Critical), AI triage guidance, Support queue, Admin approval/assignment, technician work submission, Support evidence review, customer confirmation sign-off gate, and closure criteria verification.
2. **Service Tickets & Pre-Billing Warranty Check (§7.6):** Formal repair tickets, pre-billing warranty eligibility guard (`coverage_decision !== 'PENDING'`), itemized charges, and goodwill approvals.
3. **Razorpay Test Mode Payments (§17):** Server-authoritative order creation, checkout verification via HMAC SHA256 signature with constant-time comparison, raw-body webhook signature verification, idempotency deduplication (`Idempotency-Key` header), and atomic verified ledger recording via database transactions.
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
- **No `Customer` Role in Staff Directory:** The platform `users` table represents internal staff. Customer portal authentication is currently **PENDING** in platform foundation.
- **Customer Confirmation & Disputes:** Customer sign-offs are logged through Support staff or Admin workflows until customer authentication is officially delivered.

### Harmonized RBAC Guard Groups:
- `ADMIN_ROLES`: `['Admin/Owner', 'Admin']`
- `SUPPORT_ADMIN_ROLES`: `['Admin/Owner', 'Admin', 'Support']`
- `TECH_ADMIN_ROLES`: `['Admin/Owner', 'Admin', 'Technician']`

---

## 3. Exported Harmonized REST API Endpoints & RBAC Guards

All routes are defined under `/api/v1/support-finance`:

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
- `POST /cases/:id/customer-confirmation` — `requireRole(SUPPORT_ADMIN_ROLES)` (Support/Admin logs customer acceptance).
- `POST /cases/:id/close` — `requireRole(SUPPORT_ADMIN_ROLES)` (enforces customer confirmation closure gate).

### B. Service Tickets & Warranty-Gated Billing
- `GET /tickets/by-case/:caseId` & `GET /service-tickets/case/:caseId` — Retrieve ticket and charges for a case.
- `GET /tickets/:id/warranty-lookup` & `GET /warranties/eligibility/:serial` — Query warranty status via Operations Warranty Adapter.
- `POST /service-tickets` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `PATCH /service-tickets/:id/coverage` & `PATCH /tickets/:id/coverage-decision` — `requireRole(SUPPORT_ADMIN_ROLES)`.
- `POST /service-tickets/:id/charges` & `POST /tickets/:id/charges` — `requireRole(SUPPORT_ADMIN_ROLES)` (**422 BLOCKED** while coverage is `PENDING`).

### C. Razorpay Test Payments & Webhooks
- `GET /payments/requests` — List active payment requests.
- `POST /payments/create-order` & `POST /payments/orders` — Create Razorpay order (requires `Idempotency-Key` header; amount in paise).
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

## 4. Cross-Module Contract Analysis & Mismatch Report

### A. Warranty Integration (Member 3 Operations Contract Alignment)
1. **Authoritative Table:**
   - `serial_items` is the sole authoritative table in PostgreSQL (`server/src/db/migrations/001_foundation.sql`).
   - The speculative `serial_registry` query fallback has been completely removed from `warranty.adapter.js`.
   - No speculative view is assumed to exist unless actually created and verified in migration scripts.
2. **Schema Alignment:**
   - Adapter joins: `warranty_records w JOIN serial_items s ON w.serial_item_id = s.id JOIN products p ON s.product_id = p.id`.
   - Response envelope matches Member 3's `GET /api/v1/operations/warranties/:serialNumber`:
     `serialNumber`, `warrantyCode`, `productName`, `productId`, `customerId`, `projectId`, `status`, `durationMonths`, `startDate`, `endDate`, `remainingDays`, `remainingMonths`, `isAuthoritativeDB`.
3. **Production Fail-Fast:**
   - When PostgreSQL is offline or unmigrated in production mode, `WarrantyAdapter.checkEligibility` returns `{ status: 'UNAVAILABLE', record: null, isAuthoritativeDB: false }`. It never fabricates coverage.

### B. Order & Payment Contract Cross-Module Comparison

| Dimension | Member 1 (Platform Foundation) | Member 2 (Customer & Sales) | Member 3 (Operations) | Member 4 (Support & Finance) | Mismatch / Alignment Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Order Primary Key** | `orders.id VARCHAR(50)` (`001_foundation.sql`) | `orders.id UUID` (`101_customer_sales.sql`) | References `orders.id UUID` | Accepts string / UUID (`order_id`) | **MISMATCH:** Member 1 defined `VARCHAR(50)`, Member 2 implemented `UUID`. Needs central database migration harmonization. |
| **Order Identifier** | `order_code VARCHAR(30)` | `order_number VARCHAR(50)` | Not queried directly | Accepts either in query parameters | **MISMATCH:** Column name discrepancy (`order_code` vs `order_number`). |
| **Monetary Units** | `total_paise BIGINT` | `total_contract_value NUMERIC(10,2)` (Rupees) | Not monetary authority | Razorpay requires integer paise (`amount_paise`), ledger stores paise | **MISMATCH:** Member 2 stores decimal Rupees; Member 1 and Member 4 store integer paise. Conversion required (`rupees * 100`). |
| **Order Status Column** | `status VARCHAR(50)` AND `payment_status VARCHAR(50)` | `status order_status_enum` (no `payment_status` column in `101_customer_sales.sql`) | Queries `orders.payment_status IN ('ADVANCE_PAID', 'FULLY_PAID')` | Maintains ledger `payment_records` and updates payment status | **CRITICAL MISMATCH:** Member 3's installation gate requires `orders.payment_status`, but Member 2's migration does not include a `payment_status` column. |
| **Advance Payment Threshold** | Not specified | 25.0% mandatory advance (`advance_required_percent NUMERIC(4,2) DEFAULT 25.0` [NC-01]) | Checks advance paid before scheduling | Reconciles invoice against payment records; updated to recognize 25% minimum | **ALIGNED:** Member 4 recognizes Member 2's 25% threshold for order advance billing. |
| **Payment Creation Endpoint** | Not owned | Not owned | Not owned | `POST /api/v1/support-finance/payments/create-order` | **ALIGNED:** Member 4 is sole owner of payment gateway integration. |
| **Idempotency Requirement** | Not owned | Not owned | Not owned | Mandatory `Idempotency-Key` header on `POST /payments/create-order` | **ALIGNED:** Enforces idempotency to prevent duplicate Razorpay order generation. |

---

## 5. Integration Architecture & Route Mounting Distinction

### Important Architectural Distinction:
- **Module Router Ready:** The Member 4 Express router (`server/src/modules/support-finance/routes.js`) is fully implemented, self-contained, and thoroughly tested across all 24 automated unit/integration tests.
- **Central Express Mounting:** In `origin/main:server/src/app.js`, only `/api/v1/auth` and `/api/v1/media` are currently mounted. Member 4's `/api/v1/support-finance` route is **NOT YET MOUNTED** in `server/src/app.js`.
- **Ownership Compliance:** Per strict project ownership boundaries, Member 4 does NOT edit `server/src/app.js`. Central mounting will be completed by Member 1 during platform assembly.

---

## 6. Authentication & Customer Portal Status

1. **Staff Authentication:**
   - Fully harmonized with Member 1's real JWT verification (`verifyAccessToken`).
   - Unauthenticated requests are rejected with 401 Unauthorized (`UNAUTHORIZED`).
   - Requests with insufficient role permissions are rejected with 403 Forbidden (`FORBIDDEN`).
   - Spoofed client headers (`x-role`, `x-user-role`) are ignored.
2. **Customer Portal Authentication Status:**
   - **PENDING:** Member 1's authentication subsystem currently provisions only internal staff accounts. Customer portal session management has not yet been implemented in Platform Foundation.
   - Member 4 does not create fake sessions or mock customer JWT tokens.

---

## 7. Verification, Testing & PostgreSQL Status

1. **Automated Backend Tests:**
   - **25/25 tests PASSING** (0 failed, 0 skipped in `server/src/modules/support-finance/support-finance.test.js`).
   - Dedicated tests verify:
     - Pre-model safety interceptor and P1 emergency pinning.
     - 33-transition case FSM and customer dispute re-opening.
     - Pre-billing warranty eligibility gating (charges blocked when coverage is pending).
     - Internal notes visibility scoping (customers cannot view internal notes).
     - Razorpay order creation, timing-safe HMAC-SHA256 callback verification, and raw webhook HMAC.
     - Webhook idempotency and duplicate delivery protection.
     - Mathematical reconciliation widget (discrepancy strictly equals zero).
     - Project profitability calculation (`Revenue - Costs`).
     - AI grounding, dual-panel plain language warranty, and hazard screening.
     - Unauthorized access rejection (401 for unauthenticated, 403 for unauthorized roles).
     - Missing database tables and production fail-fast (no fallback in production mode).
     - Controller security: Zero silent demo-admin fallback on unauthenticated requests.
2. **Frontend Production Build:**
   - **PASSING:** `npm run build` in `client/` succeeded with 0 errors (Vite v6.4.5 built 2217 modules into `dist/`).
3. **Live PostgreSQL Status:**
   - **UNVERIFIED (LOCAL DB OFFLINE / ACCESS DENIED):**
   - The local PostgreSQL service (`postgresql-x64-18`) is active on Windows localhost:5432, but requires specific credentials. The default connection string `postgresql://postgres:postgres@localhost:5432/solar_management` fails with `password authentication failed for user "postgres"`.
   - In accordance with audit instructions, live database testing is **NOT** claimed as passed.
   - All tests currently execute against isolated unit/mock layers, while production fail-fast error handling guarantees that production mode will never silently fall back to memory.

---

## 8. Summary Status

**Overall Status: PARTIALLY READY**

The Support, Finance & AI module is fully written, hardened, and verified in isolation. Full end-to-end operational readiness requires:
1. Member 1 mounting `/api/v1/support-finance` in central `server/src/app.js`.
2. Resolution of database schema mismatches (`orders.id` UUID vs VARCHAR, `orders.payment_status` column presence, and paise vs rupees).
3. Delivery of customer portal authentication by Platform Foundation.
4. Live PostgreSQL database provisioning and seeding.
