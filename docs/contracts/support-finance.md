# Module Contract: Support, Finance & AI
**Module Owner:** Member 4  
**API Route Prefix:** `/api/v1/support-finance`  
**Migration Reference:** `103_support_finance.sql`  
**Status:** Implementation Ready (Branch `feature/support-finance-ai`)

---

## 1. Domain Scope & Responsibility

Member 4 exclusively provides:
1. **Support Cases & State Machine (§9):** Customer issue registration, deterministic pre-model safety screening (P1), AI triage guidance via approved articles, Support queue, Admin approval/assignment, technician work logging, Support evidence review, customer confirmation sign-off, and closure verification.
2. **Service Tickets & Pre-Billing Warranty Check (§7.6):** Formal work tickets, pre-billing warranty eligibility guard (`coverage_decision !== 'PENDING'`), itemized charges, and goodwill approvals.
3. **Razorpay Test Mode Payments (§17):** Server-authoritative order creation, checkout verification via HMAC SHA256 signature, webhook parsing on raw request body, idempotency deduplication, and atomic verified ledger recording.
4. **Financial Reporting & Project P/L (§7.7):** Invoices, customer balances, direct expenses, approved timesheets and payroll tracking, government subsidy paperwork tracking, and project-wise profitability calculation (`Revenue - Costs`).
5. **Dashboards & Analytics (§13):** Role-tailored operational widgets using Recharts, and the authoritative mathematical reconciliation widget (`dashboard total - sum(verified payments) = 0`).
6. **Sandboxed AI Assistance Layer (§8):** AI summaries, missing information detector, plain-language warranty explanations, and triage assistance using a local mock provider by default with deterministic safety fallbacks.

---

## 2. Exported REST API Endpoints

All routes mounted under `/api/v1/support-finance`:

### A. Support Cases & Safety Chain
- `POST /cases` — Report an issue (triggers deterministic safety screen).
- `GET /cases` — List cases (filtered by role; P1 pinned; SLA tracked).
- `GET /cases/:id` — Case detail (customers cannot see `INTERNAL` notes).
- `POST /cases/:id/messages` — Add customer or internal communication.
- `POST /cases/:id/triage` — Run AI triage against approved help articles.
- `POST /cases/:id/classification` — Support confirms or overrides AI category.
- `POST /cases/:id/escalate-admin` — Escalate to Admin for field work approval.
- `POST /cases/:id/admin-decision` — Admin approves, rejects, or returns case.
- `POST /cases/:id/assign` — Assign technician with conflict verification.
- `POST /cases/:id/technician-complete` — Technician submits field findings (never closes case).
- `POST /cases/:id/support-review` — Support accepts evidence and requests customer confirmation.
- `POST /cases/:id/customer-confirmation` — Customer confirms resolved or disputes.
- `POST /cases/:id/close` — Enforces all closure criteria; closes case and ticket.

### B. Service Tickets & Warranty-Gated Billing
- `POST /service-tickets` — Create formal service work ticket.
- `GET /service-tickets/:id` — Ticket detail with warranty badge and charges.
- `PATCH /service-tickets/:id/coverage` — Set coverage (`COVERED_WARRANTY`, `NOT_COVERED_PAID`, `GOODWILL`).
- `POST /service-tickets/:id/charges` — Add charges (strictly blocked while coverage is pending).

### C. Razorpay Test Payments
- `POST /payments/create-order` — Create Razorpay order (backend derives amount in paise; requires `Idempotency-Key`).
- `POST /payments/verify-signature` — Cryptographic verification of checkout callback.
- `POST /payments/webhook` — Webhook handler verifying HMAC on raw request body buffer.
- `GET /payments/ledger` — Verified payments ledger (test mode flag true).
- `POST /payments/manual` — Record offline payment with mandatory reference and proof file.

### D. Finance, Invoices & Profitability
- `GET /invoices` — List invoices and outstanding balances.
- `POST /invoices` — Generate invoice from order.
- `GET /expenses` — List and filter direct project expenses.
- `POST /expenses` — Submit expense for Admin approval.
- `POST /expenses/:id/approve` — Approve expense to impact project P/L.
- `GET /technician-pay` — View approved technician timesheet pay records.
- `GET /subsidy/:projectId` — Subsidy application document status.
- `PATCH /subsidy/:projectId` — Update subsidy document checklist and status.
- `GET /profitability/:projectId` — Project-wise P/L breakdown with actual vs estimate labels.

### E. Dashboards & Analytics
- `GET /dashboard/:role` — Role-specific metrics for Admin, Support, Finance, Customer, and Technician.
- `GET /dashboard/reconciliation` — Authoritative payment reconciliation proving zero discrepancy.

### F. AI Assistance Layer (Mock Default)
- `POST /ai/summarize` — Grounded summary of enquiry, case, or project.
- `POST /ai/missing-info` — Deterministic detector for unpopulated fields.
- `POST /ai/warranty-explain` — Plain-language warranty explanation alongside system result.
- `POST /ai/triage` — Non-hazardous customer troubleshooting advice.

---

## 3. Imported Cross-Module Dependencies

Member 4 relies upon documented contracts from other modules:
- **Member 1 (Foundation):** `authenticate`, `requireRole`, `query`, `auditLog(actor, action, entity, diff)`.
- **Member 2 (Sales):** `orders` (id, order_code, customer_id, total_paise, payment_status).
- **Member 3 (Operations):** `warranty_records` (id, serial_item_id, start_date, end_date, status), `serial_items` (id, serial_number, product_id, status).

Member 4 accesses these strictly through standard database foreign keys and does NOT mutate another module's internal state.
