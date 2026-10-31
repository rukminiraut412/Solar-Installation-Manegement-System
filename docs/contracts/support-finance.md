# Module Contract: Support, Finance & AI
**Module Owner:** Member 4  
**API Route Prefix:** `/api/v1/support-finance`  
**Migration Reference:** `server/src/db/migrations/103_support_finance.sql`  
**Repository Layer:** `server/src/modules/support-finance/repository.js`  
**Warranty Adapter:** `server/src/modules/support-finance/warranty.adapter.js`  
**Status:** Partially Ready (Awaiting Member 1 live Postgres credentials/JWT auth and Member 3 Operations warranty table population)  
**Branch:** `feature/support-finance-ai`

---

## 1. Domain Scope & Responsibility

Member 4 exclusively provides:
1. **Support Cases & 33-Transition FSM (§9):** Customer issue reporting, deterministic pre-model safety interceptor (P1 Critical), AI triage guidance, Support queue, Admin approval/assignment, technician work submission, Support evidence review, customer confirmation sign-off gate, and closure criteria verification.
2. **Service Tickets & Pre-Billing Warranty Check (§7.6):** Formal repair tickets, pre-billing warranty eligibility guard (`coverage_decision !== 'PENDING'`), itemized charges, and goodwill approvals.
3. **Razorpay Test Mode Payments (§17):** Server-authoritative order creation, checkout verification via HMAC SHA256 signature, webhook parsing on raw request body, idempotency deduplication, and atomic verified ledger recording via database transactions.
4. **Financial Reporting & Project P/L (§7.7):** Invoices, customer balances (with overpayment detection), direct expenses, approved timesheets and payroll tracking, government subsidy paperwork tracking, and project-wise profitability calculation (`Revenue - Costs`).
5. **Dashboards & Analytics (§13):** Role-tailored operational widgets using Recharts, and the authoritative mathematical reconciliation widget (`dashboard total - sum(verified payments) = 0`).
6. **Sandboxed AI Assistance Layer (§8):** AI summaries, missing information detector, plain-language warranty explanations with dual-panel segregation, and triage assistance using a local mock provider by default with deterministic safety fallbacks.

---

## 2. Exported Harmonized REST API Endpoints

All routes mounted under `/api/v1/support-finance`:

### A. Support Cases & Safety Chain
- `POST /cases` — Report an issue (triggers deterministic safety screen).
- `GET /cases` — List cases (filtered by role; P1 pinned; SLA tracked).
- `GET /cases/:id` — Case detail (customers cannot see `INTERNAL` notes).
- `POST /cases/:id/messages` — Add customer message or internal team note.
- `POST /cases/:id/classification` & `PATCH /cases/:id/classification` — Support confirms or overrides AI category.
- `POST /cases/:id/admin-decision` — Admin approves, rejects, or returns case.
- `POST /cases/:id/assign` — Assign technician with scheduled date.
- `POST /cases/:id/technician-complete` — Technician submits field findings (never closes case directly).
- `POST /cases/:id/support-review` — Support accepts evidence and requests customer confirmation.
- `POST /cases/:id/customer-confirmation` — Customer confirms resolved or disputes (reopening case).
- `POST /cases/:id/close` — Enforces customer confirmation closure gate; closes case and ticket.

### B. Service Tickets & Warranty-Gated Billing
- `GET /tickets/by-case/:caseId` & `GET /service-tickets/case/:caseId` — Retrieve ticket and charges for a case.
- `GET /tickets/:id/warranty-lookup` & `GET /warranties/eligibility/:serial` — Query warranty status via Operations Warranty Adapter.
- `POST /service-tickets` — Create formal service work ticket.
- `PATCH /service-tickets/:id/coverage` & `PATCH /tickets/:id/coverage-decision` — Set coverage (`COVERED_WARRANTY`, `NOT_COVERED_PAID`, `GOODWILL`).
- `POST /service-tickets/:id/charges` & `POST /tickets/:id/charges` — Add charges (**422 BLOCKED** while coverage is `PENDING`).

### C. Razorpay Test Payments & Webhooks
- `GET /payments/requests` — List active payment requests.
- `POST /payments/create-order` & `POST /payments/orders` — Create Razorpay order (backend derives amount in paise; requires `Idempotency-Key`).
- `POST /payments/verify-signature` & `POST /payments/verify` — Cryptographic HMAC-SHA256 verification of checkout callback.
- `POST /payments/webhook` & `POST /payments/simulate-webhook` — Webhook handler verifying HMAC on raw request body buffer.
- `GET /payments/ledger` & `GET /payments` — Verified payments ledger.
- `POST /payments/manual` & `POST /payments/offline` — Record offline payment with mandatory reference and proof file.

### D. Finance, Invoices & Profitability
- `GET /invoices` & `GET /finance/invoices` — List invoices and outstanding balances (flags negative balances as overpaid).
- `GET /expenses` & `GET /finance/expenses` — List direct project expenses.
- `POST /expenses` & `POST /finance/expenses` — Submit direct expense.
- `POST /expenses/:id/approve` & `PATCH /finance/expenses/:id/review` — Admin approves/rejects expense.
- `GET /technician-pay` & `GET /finance/technician-pay` — View approved technician timesheet pay records.
- `GET /subsidy/:projectId` & `GET /finance/subsidies` — Subsidy application document status.
- `PATCH /subsidy/:projectId` & `PATCH /finance/subsidies/:projectId/checklist` — Update subsidy checklist.
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

## 3. Database Persistence & Repository Layer

All business logic now interacts with PostgreSQL via `server/src/modules/support-finance/repository.js`:
- **Parameterized SQL Queries:** 100% of database queries use `$1, $2, ...` parameters. Raw user strings are never concatenated.
- **Financial Transactions:** `applyVerifiedPaymentTransaction` uses `pool.connect()` to execute `BEGIN ... COMMIT` wrapping payment insertion and payment request status updates.
- **Connection Fallback & Status:** `Repository.checkDatabaseHealth()` tests live PostgreSQL connectivity. When live database credentials fail or are offline, the repository alerts via `[REPO-SQL-NOTICE]` and mirrors records into local test state without breaking unit tests.

---

## 4. Cross-Module Dependencies & Integration Points

### 1. Member 1 (Foundation & Auth):
- **Database Connection:** Uses `query` and `pool` from `server/src/db/connection.js`.
- **Authentication & RBAC:** Currently attaches `authenticate` from `server/src/middleware/auth.middleware.js`.
- **Pending Integration Point:** When Member 1 merges signed JWT verification and database-backed users into `main`, Member 4 will:
  - Remove fallback to `x-role` / `x-user-role` headers.
  - Bind `req.user.id` and `req.user.role` strictly from verified JWT tokens.
  - Attach `requireRole(['Admin', 'Support', 'Finance'])` guards to administrative endpoints.

### 2. Member 2 (Customer & Sales):
- Relies on `orders` table (`id`, `order_code`, `total_paise`) and `customers` table (`id`, `full_name`).
- Referenced via standard foreign keys defined in `server/src/db/migrations/103_support_finance.sql`.

### 3. Member 3 (Operations):
- **Warranty Contract Interface:** Mediated by `server/src/modules/support-finance/warranty.adapter.js`.
- **Target Schema:**
  ```sql
  SELECT w.*, p.name AS product_name, s.serial_number 
  FROM warranty_records w 
  JOIN serial_items s ON w.serial_item_id = s.id 
  JOIN products p ON s.product_id = p.id 
  WHERE LOWER(s.serial_number) = LOWER($1);
  ```
- **Status:** Pending Member 3 Operations module merge and database table seeding.
