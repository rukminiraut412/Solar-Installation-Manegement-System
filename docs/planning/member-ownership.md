# Solar Installation Management System
## Team Member Ownership & File Governance Map

**Document Version:** 1.0  
**Status:** Approved Architectural Baseline  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md` (§6, §14, §15, §16, §22)

---

## 1. Ownership Division Overview

To prevent race conditions, merge conflicts, and overlapping feature boundaries, the codebase is partitioned into four independent, decoupled ownership groups. Each group maps to a dedicated engineering lead.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MEMBER 1: PLATFORM FOUNDATION                        │
│ Shared Core Infrastructure · Auth · RBAC · Migrations · Audit · Deploy │
└──────┬───────────────────┬───────────────────┬───────────────────┬─────┘
       │                   │                   │                   │
┌──────▼────────┐   ┌──────▼────────┐   ┌──────▼────────┐   ┌──────▼────────┐
│   MEMBER 2    │   │   MEMBER 3    │   │   MEMBER 4    │   │   MEMBER 1    │
│  CUSTOMER &   │   │  OPERATIONS & │   │   SUPPORT,    │   │  INTEGRATION  │
│     SALES     │   │  FULFILMENT   │   │ FINANCE & AI  │   │  GOVERNANCE   │
│ Modules 1 & 2 │   │ Modules 3,4,5 │   │ Modules 6,7,AI│   │  Shared Core  │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
```

---

## 2. Member Assignment Matrix

| Member | Domain & Modules | Key Scope Deliverables | Spec References |
|---|---|---|---|
| **Member 1** | **Platform Foundation** | • Monolith architecture & environment configuration<br>• Shared Express server & routing foundation<br>• PostgreSQL connection pool & migration runner<br>• Authentication (JWT access/refresh token lifecycle)<br>• 5-role RBAC, permission registry & row-level scopes<br>• Central audit logger & status history engine<br>• Cloudinary signed file upload infrastructure<br>• System settings & configuration repository<br>• In-app notifications & simulated outbox<br>• Shared UI design system, layout shell & nav<br>• Vercel/Render deployment pipeline & CI checks | §1.3, §6.1–6.4, §11.1–11.3, §12, §14, §15.2, §16.1–16.2, §18, §19 |
| **Member 2** | **Customer & Sales**<br>(Modules 1 & 2) | • Customer 360 directory & duplicate detection<br>• Admin customer merge engine<br>• Public enquiry form with anti-spam & rate limit<br>• Staff enquiry intake (WhatsApp/phone leads)<br>• Repeat lead identification & linking<br>• Site survey scheduling & conflict detection<br>• Mobile survey execution & technical findings<br>• Survey approval, rejection & rework revisions<br>• Survey-gated quotation creation engine<br>• Solar packages & compatibility rule evaluator<br>• Deterministic BOM generation & price list engine<br>• Customer quotation acceptance/decline<br>• Atomic Order & Project delivery record creation | §7.1, §7.2, §10.2 (Stages 1–9), §11.3 (`P-02`, `P-12`), §11.4 (`S-10`–`S-33`), §15.2, §16.3–16.4 |
| **Member 3** | **Operations & Fulfilment**<br>(Modules 3, 4, 5) | • Products catalog & dual-state inventory ledger<br>• Stock movements (receipts, reservations, dispatches)<br>• Goods receipt with serialized asset registration<br>• Payment-gated BOM allocation & shortage alerts<br>• Dispatch notes & barcode/serial scanning flow<br>• Site delivery confirmation & warranty trigger<br>• Warehouse exceptions (returns, QC, damage write-off)<br>• Complete serial traceability (roof-to-warehouse)<br>• Technician profiles, skill matrix & unavailability<br>• Installation scheduling & crew assignment<br>• Mobile installation workflow & time tracking<br>• Photographic evidence & electrical testing checklist<br>• Customer digital signature capture & job completion<br>• Multi-party warranty terms & active warranty records<br>• Deterministic backend warranty eligibility engine | §7.3, §7.4, §7.5, §10.2 (Stages 13–20), §11.4 (`S-50`–`S-72`), §15.2, §16.6–16.8 |
| **Member 4** | **Support, Finance & AI**<br>(Modules 6, 7, AI, Razorpay) | • Customer support issue intake & timeline<br>• Deterministic pre-model safety interceptor (P1)<br>• 33-transition support case finite state machine<br>• 5-stage human escalation responsibility chain<br>• Service tickets & pre-billing warranty check<br>• Service charges & goodwill waiver approvals<br>• Admin service approvals & field technician dispatch<br>• Technician service execution & parts tracking<br>• Multi-check closure engine with customer sign-off<br>• Server-side Razorpay test-mode payment creation<br>• Cryptographic signature verification & webhooks<br>• Idempotent ledger updates & dual-channel race guard<br>• Payment reconciliation & offline manual payments<br>• Invoicing, balances & customer payment receipts<br>• Real-time project P/L & financial profitability<br>• Expenses, timesheet approvals & subsidy tracker<br>• Role-tailored dashboards & reconciliation widget<br>• Sandboxed AI layer (mock default, validation, audit)<br>• AI MVP: summaries, missing info, warranty explain | §7.6, §7.7, §8, §9, §10.2 (Stages 10–12, 21–26), §11.3 (`P-10`, `P-11`, `P-13`–`P-16`), §11.4 (`S-40`–`S-44`, `S-80`–`S-96`), §13, §15.2, §16.5, §16.9–16.10, §17 |

---

## 3. Strict Folder & File Ownership Map

### Proposed Directory Layout

```
Solar-Installation-Manegement-System/
├── package.json                          [MEMBER 1 ONLY]
├── package-lock.json                     [MEMBER 1 ONLY]
├── .env.example                          [MEMBER 1 ONLY]
├── vite.config.js                        [MEMBER 1 ONLY]
├── tailwind.config.js                    [MEMBER 1 ONLY]
│
├── backend/
│   ├── src/
│   │   ├── index.js                      [MEMBER 1 ONLY]
│   │   ├── app.js                        [MEMBER 1 ONLY]
│   │   │
│   │   ├── config/                       [MEMBER 1 ONLY]
│   │   │   ├── database.js
│   │   │   ├── env.js
│   │   │   ├── constants.js
│   │   │   └── cloudinary.js
│   │   │
│   │   ├── middleware/                   [MEMBER 1 ONLY]
│   │   │   ├── auth.middleware.js
│   │   │   ├── rbac.middleware.js
│   │   │   ├── validate.middleware.js
│   │   │   ├── audit.middleware.js
│   │   │   ├── rateLimit.middleware.js
│   │   │   └── error.middleware.js
│   │   │
│   │   ├── migrations/                   [NON-OVERLAPPING PREFIXES]
│   │   │   ├── 001_foundation.sql        [MEMBER 1]
│   │   │   ├── 002_customers_sales.sql   [MEMBER 2]
│   │   │   ├── 003_operations_stock.sql  [MEMBER 3]
│   │   │   ├── 004_support_finance.sql   [MEMBER 4]
│   │   │   └── ...
│   │   │
│   │   ├── modules/                      [DOMAIN PARTITIONED]
│   │   │   ├── auth/                     [MEMBER 1]
│   │   │   ├── settings/                 [MEMBER 1]
│   │   │   ├── audit/                    [MEMBER 1]
│   │   │   ├── notifications/            [MEMBER 1]
│   │   │   ├── files/                    [MEMBER 1]
│   │   │   │
│   │   │   ├── customers/                [MEMBER 2]
│   │   │   ├── enquiries/                [MEMBER 2]
│   │   │   ├── surveys/                  [MEMBER 2]
│   │   │   ├── quotations/               [MEMBER 2]
│   │   │   ├── packages/                 [MEMBER 2]
│   │   │   │
│   │   │   ├── products/                 [MEMBER 3]
│   │   │   ├── inventory/                [MEMBER 3]
│   │   │   ├── dispatches/               [MEMBER 3]
│   │   │   ├── technicians/              [MEMBER 3]
│   │   │   ├── installation-jobs/        [MEMBER 3]
│   │   │   ├── warranties/               [MEMBER 3]
│   │   │   │
│   │   │   ├── orders/                   [MEMBER 4]
│   │   │   ├── payments/                 [MEMBER 4]
│   │   │   ├── invoices/                 [MEMBER 4]
│   │   │   ├── finance/                  [MEMBER 4]
│   │   │   ├── support-cases/            [MEMBER 4]
│   │   │   ├── service-tickets/          [MEMBER 4]
│   │   │   ├── dashboards/               [MEMBER 4]
│   │   │   └── ai/                       [MEMBER 4]
│   │   │
│   │   └── utils/                        [MEMBER 1]
│   │       ├── response.js
│   │       ├── idGenerator.js
│   │       └── logger.js
│   │
│   └── tests/
│       ├── unit/                         [DOMAIN OWNER OWNS RELEVANT SPEC]
│       ├── integration/                  [DOMAIN OWNER OWNS RELEVANT SPEC]
│       └── e2e/                          [COLLABORATIVE, MEMBER 1 LEADS]
│
└── frontend/
    ├── index.html                        [MEMBER 1 ONLY]
    ├── src/
    │   ├── main.jsx                      [MEMBER 1 ONLY]
    │   ├── App.jsx                       [MEMBER 1 ONLY]
    │   ├── index.css                     [MEMBER 1 ONLY - TOKENS]
    │   │
    │   ├── api/                          [API CLIENT & CONTRACTS]
    │   │   ├── client.js                 [MEMBER 1 ONLY]
    │   │   ├── auth.api.js               [MEMBER 1]
    │   │   ├── sales.api.js              [MEMBER 2]
    │   │   ├── operations.api.js         [MEMBER 3]
    │   │   ├── finance.api.js            [MEMBER 4]
    │   │   ├── support.api.js            [MEMBER 4]
    │   │   └── ai.api.js                 [MEMBER 4]
    │   │
    │   ├── components/
    │   │   ├── common/                   [MEMBER 1 ONLY]
    │   │   │   ├── Button.jsx
    │   │   │   ├── Input.jsx
    │   │   │   ├── Table.jsx
    │   │   │   ├── Badge.jsx
    │   │   │   ├── Modal.jsx
    │   │   │   ├── Card.jsx
    │   │   │   ├── FileUpload.jsx
    │   │   │   ├── SignaturePad.jsx
    │   │   │   └── Skeleton.jsx
    │   │   │
    │   │   ├── layout/                   [MEMBER 1 ONLY]
    │   │   │   ├── PublicNavbar.jsx
    │   │   │   ├── StaffSidebar.jsx
    │   │   │   ├── PortalHeader.jsx
    │   │   │   └── RoleLayout.jsx
    │   │   │
    │   │   ├── ai/                       [MEMBER 4]
    │   │   │   ├── AIPanel.jsx
    │   │   │   └── AISuggestionBadge.jsx
    │   │   │
    │   │   ├── sales/                    [MEMBER 2]
    │   │   ├── operations/               [MEMBER 3]
    │   │   └── finance/                  [MEMBER 4]
    │   │
    │   ├── pages/
    │   │   ├── public/                   [MEMBER 1 & MEMBER 2]
    │   │   │   ├── LandingPage.jsx       [MEMBER 1 - P-01]
    │   │   │   ├── EnquiryPage.jsx       [MEMBER 2 - P-02]
    │   │   │   ├── LoginPage.jsx         [MEMBER 1 - P-03]
    │   │   │   └── ForgotPassword.jsx    [MEMBER 1 - P-04]
    │   │   │
    │   │   ├── portal/                   [CUSTOMER PORTAL]
    │   │   │   ├── PortalHome.jsx        [MEMBER 4 - P-10]
    │   │   │   ├── PortalProject.jsx     [MEMBER 2/3 - P-11]
    │   │   │   ├── PortalQuotation.jsx   [MEMBER 2 - P-12]
    │   │   │   ├── PortalPayment.jsx     [MEMBER 4 - P-13]
    │   │   │   ├── PortalWarranties.jsx  [MEMBER 3 - P-14]
    │   │   │   ├── PortalSupportNew.jsx  [MEMBER 4 - P-15]
    │   │   │   └── PortalCaseDetail.jsx  [MEMBER 4 - P-16]
    │   │   │
    │   │   └── staff/                    [STAFF APP PAGES S-01 to S-110]
    │   │       ├── DashboardPage.jsx     [MEMBER 4 - S-01]
    │   │       ├── customers/            [MEMBER 2 - S-10 to S-15]
    │   │       ├── surveys/              [MEMBER 2 - S-20 to S-23]
    │   │       ├── quotations/           [MEMBER 2 - S-30 to S-33]
    │   │       ├── orders/               [MEMBER 4 - S-40 to S-44]
    │   │       ├── inventory/            [MEMBER 3 - S-50 to S-57]
    │   │       ├── technicians/          [MEMBER 3 - S-60 to S-65]
    │   │       ├── warranty/             [MEMBER 3 - S-70 to S-72]
    │   │       ├── service/              [MEMBER 4 - S-80 to S-89]
    │   │       ├── finance/              [MEMBER 4 - S-90 to S-96]
    │   │       ├── settings/             [MEMBER 1 - S-100 to S-109]
    │   │       └── partners/             [MEMBER 1/3 - S-110 OPT]
    │   │
    │   └── routes/
    │       ├── index.jsx                 [MEMBER 1 ONLY]
    │       ├── ProtectedRoute.jsx        [MEMBER 1 ONLY]
    │       └── routeConfig.js            [MEMBER 1 ONLY]
```

---

## 4. Protected Central Files (Member 1 Exclusives)

Members 2, 3, and 4 are **STRICTLY PROHIBITED** from directly modifying the following centralized files:

1. `package.json` & `package-lock.json` (Root dependencies).
2. `backend/src/index.js` & `backend/src/app.js` (Express bootstrap and global middleware mounting).
3. `backend/src/config/database.js` (Database connection and transaction managers).
4. `backend/src/middleware/*` (Auth, RBAC, error, audit, and validation middleware).
5. `frontend/src/App.jsx` & `frontend/src/routes/*` (Global routing and route guards).
6. `frontend/src/index.css` & `tailwind.config.js` (Global CSS tokens, theme palette, typography).
7. `frontend/src/components/common/*` (Shared primitive UI components).
8. `frontend/src/api/client.js` (Axios HTTP client instance and interceptors).

---

## 5. Non-Overlapping Migration Sequence Allocation

To prevent database migration lockups and merge conflicts, each member is assigned a specific migration file numbering block:

| Member | Assigned Migration File Pattern | Scope of Schema Tables |
|---|---|---|
| **Member 1** | `001_foundation.sql`<br>`010_...sql` to `019_...sql` | `users`, `roles`, `permissions`, `role_permissions`, `refresh_tokens`, `files`, `system_settings`, `notifications`, `notification_outbox`, `audit_logs`, `status_history`, `idempotency_keys` |
| **Member 2** | `020_...sql` to `039_...sql` | `customers`, `enquiries`, `surveys`, `survey_reviews`, `survey_revisions`, `solar_packages`, `package_bom_items`, `package_compat_rules`, `price_list_items`, `quotations`, `quotation_items` |
| **Member 3** | `040_...sql` to `059_...sql` | `products`, `stock_levels`, `stock_movements`, `serial_items`, `project_bom_items`, `stock_reservations`, `dispatches`, `dispatch_items`, `dispatch_serials`, `stock_exceptions`, `technicians`, `technician_unavailability`, `installation_jobs`, `job_assignments`, `job_time_entries`, `job_photos`, `test_templates`, `test_results`, `signatures`, `job_reschedules`, `warranty_terms`, `warranty_records` |
| **Member 4** | `060_...sql` to `079_...sql` | `orders`, `projects`, `payment_requests`, `payment_attempts`, `payments`, `razorpay_webhook_events`, `payment_reconciliations`, `policy_exceptions`, `invoices`, `invoice_items`, `expenses`, `expense_categories`, `stock_purchases`, `stock_purchase_items`, `suppliers`, `technician_pay_records`, `subsidy_applications`, `warranty_claims`, `support_cases`, `case_messages`, `ai_triage_results`, `case_escalations`, `case_approvals`, `case_transitions`, `service_tickets`, `service_charges`, `service_parts_used`, `service_work_logs`, `customer_confirmations`, `help_articles`, `ai_requests` |

---

## 6. Shared Integration Request (SIR) Protocol

When Member 2, 3, or 4 requires a modification to a central or shared file (such as installing a new npm package, mounting a new top-level router, or adding a common UI primitive):

1. **Do NOT edit the protected file.**
2. Create an **Integration Request** in `docs/planning/integration-requests/` using the template below:
   - **ID**: `SIR-M[X]-[YYYY]`
   - **Requesting Member**: Member 2 / 3 / 4
   - **Target Shared File**: e.g., `package.json`, `App.jsx`, `database.js`
   - **Exact Code Change**: Diff block showing requested addition.
   - **Justification**: Architectural reason.
3. **Member 1 Reviews and Applies**: Member 1 validates that the request adheres to system guidelines, applies the edit, verifies build integrity, and notifies the requesting member.

---

## 7. Cross-Module Service Interface Contracts

When one module must trigger an action in another member's domain, it must do so **ONLY** via documented, exported Service APIs—never by directly mutating another module's internal database tables.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CROSS-MODULE INTERFACE CONTRACTS                     │
├────────────────────────────────┬───────────────────────────────────────┤
│ Caller ➔ Callee Module        │ Permitted Exported Function           │
├────────────────────────────────┼───────────────────────────────────────┤
│ Member 2 ➔ Member 4 (Order)    │ `OrderService.createFromQuotation()`  │
│ Member 2 ➔ Member 3 (BOM)      │ `BOMSnapshotService.freeze()`         │
│ Member 4 ➔ Member 3 (Stock)    │ `StockService.checkAndAllocate()`     │
│ Member 3 ➔ Member 3/5 (Deliv)  │ `WarrantyService.activateForProject()`│
│ Member 4 ➔ Member 3 (Warranty) │ `WarrantyService.checkEligibility()`  │
│ Member 4 ➔ Member 3 (Job)      │ `InstallationJobService.schedule()`   │
│ Any ➔ Member 1 (Audit)         │ `AuditService.log()`                  │
│ Any ➔ Member 1 (Notifications) │ `NotificationService.dispatch()`      │
│ Any ➔ Member 1 (Files)         │ `FileService.getSignedUrl()`          │
└────────────────────────────────┴───────────────────────────────────────┘
```
