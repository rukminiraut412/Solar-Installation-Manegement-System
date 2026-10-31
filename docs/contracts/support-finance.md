# Module Contract: Support, Finance & AI
**Module Owner:** Member 4  
**API Route Prefix:** `/api/v1/support-finance`  
**Migration Reference:** `server/src/db/migrations/103_support_finance.sql`  
**Repository Layer:** `server/src/modules/support-finance/repository.js`  
**Warranty Adapter:** `server/src/modules/support-finance/warranty.adapter.js`  
**Status:** Partially Ready (Audit Phase 8 Complete — Security Hardened; Awaiting live PostgreSQL credentials from Member 1 and Operations schema merge from Member 3)  
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

All routes mounted under `/api/v1/support-finance`:

### A. Support Cases & Safety Chain
- `POST /cases` — Report an issue (authenticated; triggers deterministic safety screen).
- `GET /cases` — List cases (authenticated; filtered by role; P1 pinned; SLA tracked).
- `GET /cases/:id` — Case detail (authenticated; customers strictly excluded from seeing `INTERNAL` notes).
- `POST /cases/:id/messages` — Add customer message or internal team note (authenticated).
- `POST /cases/:id/classification` & `PATCH /cases/:id/classification` — `requireRole(['Admin', 'Support'])`.
- `POST /cases/:id/admin-decision` — `requireRole(['Admin'])`.
- `POST /cases/:id/assign` — `requireRole(['Admin'])`.
- `POST /cases/:id/technician-complete` — `requireRole(['Admin', 'Technician'])` (technician submits field findings; cannot close case).
- `POST /cases/:id/support-review` — `requireRole(['Admin', 'Support'])`.
- `POST /cases/:id/customer-confirmation` — `requireRole(['Admin', 'Customer'])`.
- `POST /cases/:id/close` — `requireRole(['Admin', 'Support'])` (enforces customer confirmation closure gate).

### B. Service Tickets & Warranty-Gated Billing
- `GET /tickets/by-case/:caseId` & `GET /service-tickets/case/:caseId` — Retrieve ticket and charges for a case.
- `GET /tickets/:id/warranty-lookup` & `GET /warranties/eligibility/:serial` — Query warranty status via Operations Warranty Adapter.
- `POST /service-tickets` — `requireRole(['Admin', 'Support'])`.
- `PATCH /service-tickets/:id/coverage` & `PATCH /tickets/:id/coverage-decision` — `requireRole(['Admin', 'Support'])`.
- `POST /service-tickets/:id/charges` & `POST /tickets/:id/charges` — `requireRole(['Admin', 'Support'])` (**422 BLOCKED** while coverage is `PENDING`).

### C. Razorpay Test Payments & Webhooks
- `GET /payments/requests` — List active payment requests.
- `POST /payments/create-order` & `POST /payments/orders` — Create Razorpay order (backend derives amount in paise; requires `Idempotency-Key`).
- `POST /payments/verify-signature` & `POST /payments/verify` — Cryptographic HMAC-SHA256 timing-safe verification of checkout callback.
- `POST /payments/webhook` & `POST /payments/simulate-webhook` — Webhook handler verifying HMAC on raw request body buffer (no test bypass in production).
- `GET /payments/ledger` & `GET /payments` — Verified payments ledger.
- `POST /payments/manual` & `POST /payments/offline` — `requireRole(['Admin', 'Finance'])` (mandatory reference and proof file).

### D. Finance, Invoices & Profitability
- `GET /invoices` & `GET /finance/invoices` — List invoices and outstanding balances (flags negative balances as overpaid).
- `GET /expenses` & `GET /finance/expenses` — List direct project expenses.
- `POST /expenses` & `POST /finance/expenses` — `requireRole(['Admin', 'Finance'])`.
- `POST /expenses/:id/approve` & `PATCH /finance/expenses/:id/review` — `requireRole(['Admin', 'Finance'])`.
- `GET /technician-pay` & `GET /finance/technician-pay` — View approved technician timesheet pay records.
- `GET /subsidy/:projectId` & `GET /finance/subsidies` — Subsidy application document status.
- `PATCH /subsidy/:projectId` & `PATCH /finance/subsidies/:projectId/checklist` — `requireRole(['Admin', 'Finance'])`.
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

## 3. Security Hardening & Audit Verification (Phase 8)

### A. PostgreSQL Persistence & Production Fail-Fast
- **100% Parameterized Queries:** Every database access in `repository.js` utilizes parameterized SQL ($1, $2, ...).
- **SQL Injection Prevention:** Dynamic updates in `updateCase` are protected by a strict column name allowlist (`ALLOWED_CASE_COLUMNS`).
- **Production Mode Fail-Fast:** In production mode (`NODE_ENV === 'production'`), silent fallback to in-memory fixtures is strictly blocked. If PostgreSQL fails or is unreachable, write and read operations fail loudly with a 500 `DATABASE_PERSISTENCE_ERROR`.
- **Transactions & Rollback:** Multi-step ledger recordings execute `BEGIN ... COMMIT` with explicit `ROLLBACK` on failure and guaranteed client release in `finally`.
- **Persistence Verification Status:** Code-level parameterized SQL and error handling are fully audited. Live database verification remains pending valid database credentials from Member 1.

### B. Authentication & RBAC Hardening
- **Route-Level Permission Guards:** Applied Member 1's `requireRole(...)` middleware across administrative and finance routes.
- **Client Header Deprecation:** In production mode, client-supplied headers `x-role` and `x-user-role` are completely ignored; user context is extracted strictly from the authenticated session (`req.user`).
- **Customer Confidentiality Gate:** `CasesService.getCaseDetail` strictly excludes `INTERNAL` staff notes from Customer queries.

### C. Payment Security & Tamper Protection
- **Server Authority:** The payment amount is strictly computed by backend logic from verified invoice totals and prior payments; client cannot submit an arbitrary amount.
- **Constant-Time Verification:** Signatures are compared using `crypto.timingSafeEqual` on UTF-8 buffers to prevent timing side-channel attacks.
- **Webhook Security:** Webhook endpoint strictly requires `x-razorpay-signature` and validates HMAC SHA256 against raw request body bytes.
- **Test Bypass Prohibition:** Simulated mock signatures (`simulated_hmac_sha256_valid`, `valid_test_sig_`) are strictly rejected in production mode.
- **Idempotency:** Webhook events check provider event ID deduplication. Verified callback signatures check if request is already marked `Paid` to prevent duplicate ledger transactions.

### D. Warranty Integration & Operations Dependency
- **Isolated Adapter:** `warranty.adapter.js` mediates interaction with Operations tables (`warranty_records` JOIN `serial_items` JOIN `products`).
- **Unavailable Status Handling:** If Operations database records are missing or offline in production mode, the adapter returns `UNAVAILABLE` and never silently defaults to confirmed coverage.
- **Pre-Billing Guard:** Adding service charges remains strictly gated by `coverage_decision !== 'PENDING'`.

### E. AI Safety Guardrails
- **Mutation Barrier:** AI service exposes zero mutation capabilities (cannot approve payments, modify stock, set warranty coverage, or close cases).
- **Emergency Safety Interceptor:** Pre-model screening detects fire, smoke, and shock hazard patterns, immediately pinning priority to P1, returning emergency safety guidance, and bypassing AI generative routing.
- **Dual-Panel Transparency:** AI warranty responses present authoritative system results alongside plain-language explanations and explicitly disclose that final coverage requires human technical staff review.

---

## 4. Verification & Testing

- **Backend Test Suite:** 20 passing automated tests in `server/src/modules/support-finance/support-finance.test.js`.
  - Sections include Safety Interceptor, Case FSM, Pre-Billing Warranty Guard, 7-Stage Chain, Customer Dispute, Notes Scoping, Razorpay HMAC, Webhook Idempotency, Reconciliation, Profitability, AI Grounding, Database Probe, Warranty Adapter, Route Harmonization, Production Fail-Fast, Production Warranty Fallback Prohibited, Payment Tampering Rejection, Webhook Signature Requirement, RBAC Middleware Guards, and AI Safety Mutation Barriers.
- **Frontend Build Status:** Succeeded (`npm run build` compiled 2217 modules with 0 errors).
- **Integration Readiness Status:** **PARTIALLY READY**. Member 4 code is internally audited and security hardened. Full live production readiness requires Member 1's live PostgreSQL credentials, real JWT issuer, and Member 3's Operations schema tables.
