# MEMBER OWNERSHIP & STRICT FILE/FOLDER MAP
**Project:** Solar Installation Management System (SunPower Solutions)  
**Architecture:** Modular Monolith (Node.js/Express + PostgreSQL + React/Vite/Tailwind CSS)  
**Governance Model:** Strict Module Ownership & Integration Request Protocol  
**Document Version:** 1.0.0  

---

## 1. Ownership Group Distribution

The project responsibilities are strictly divided among four team members. No member may modify files outside their assigned scope without going through the formal Integration Request protocol managed by Member 1 (Platform Foundation Lead).

```
+----------------------------------------------------------------------------------------------------+
|                                SOLAR INSTALLATION MANAGEMENT SYSTEM                                |
+---------------------------------+----------------------------------+-------------------------------+
| MEMBER 1: PLATFORM FOUNDATION   | MEMBER 2: CUSTOMER & SALES       | MEMBER 3: OPERATIONS & FULFIL |
| - Core Monolith Infrastructure  | - Lead & Public Enquiry Form     | - Products & Inventory Ledger |
| - DB Migration Harness & Pools  | - Duplicate Detection & Customer | - Warehouses & Stock Receipts |
| - JWT Auth & 5-Role RBAC        | - Site Survey Scheduling & Forms | - BOM Stock Reservation & Disp|
| - Central Audit Logging Engine  | - Survey Engineering Approvals   | - Serial Barcode Scanner      |
| - Cloudinary Storage Integration| - Solar Packages (1-5 kW On/Off) | - 15-Tech Roster & Scheduling |
| - Shared Design System & Tokens | - Automated BOM Generator        | - Mobile Rooftop Job Form     |
| - Global Express Router & Error | - Quotation Engine & PDF         | - Power Generation Testing    |
| - Integration & Deployment CI   | - Customer Quote Acceptance Gate | - Customer Digital Signature  |
+---------------------------------+----------------------------------+ - Serialized Warranty Engine  |
| MEMBER 4: SUPPORT, FINANCE & AI                                    +-------------------------------+
| - Helpdesk Support Tickets & Service State Machine                 |
| - Automated Warranty Eligibility & Repair Billing Contracts        |
| - Razorpay TEST MODE Advance/Balance Payments & Webhook Idempotency|
| - GST Invoices, Job Expenses & Tech Timesheet Payroll Tracking    |
| - Government Subsidy Tracking & Project Profitability Engine       |
| - Role-Aware Dashboards (Director, Sales, Ops, Warehouse, Support) |
| - Grounded AI Support Copilot & Missing-Information Audit Engine   |
+--------------------------------------------------------------------+
```

---

## 2. Directory Tree & Strict Ownership Map

Legend:
- `[M1]` = Member 1 (Platform Foundation)
- `[M2]` = Member 2 (Customer & Sales)
- `[M3]` = Member 3 (Operations & Fulfilment)
- `[M4]` = Member 4 (Support, Finance & AI)

```text
Solar-Installation-Manegement-System/
├── .github/
│   └── workflows/ci-cd.yml                          [M1]  # CI/CD pipeline definition
├── docs/
│   └── planning/                                    [ALL] # Architecture & planning specifications
├── backend/
│   ├── package.json                                 [M1]  # Root backend dependencies
│   ├── package-lock.json                            [M1]
│   ├── .env.example                                 [M1]  # Central environment configuration
│   ├── src/
│   │   ├── app.js                                   [M1]  # Central Express application instance
│   │   ├── server.js                                [M1]  # HTTP server initialization
│   │   ├── config/
│   │   │   ├── database.js                          [M1]  # PostgreSQL pool and client config
│   │   │   ├── cloudinary.js                        [M1]  # Cloudinary SDK client setup
│   │   │   ├── razorpay.js                          [M1]  # Razorpay SDK client setup (M1 config, M4 usage)
│   │   │   └── environment.js                       [M1]  # Centralized typed env schema
│   │   ├── migrations/                              # Partitioned migration files
│   │   │   ├── 001_platform_foundation.sql          [M1]  # Auth, users, roles, audit_logs, media
│   │   │   ├── 002_customer_sales.sql               [M2]  # Enquiries, customers, surveys, packages, quotes
│   │   │   ├── 003_operations_fulfilment.sql        [M3]  # Products, inventory, serials, jobs, warranty
│   │   │   └── 004_support_finance_ai.sql           [M4]  # Tickets, payments, invoices, expenses, subsidies
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js                   [M1]  # JWT extraction and validation
│   │   │   ├── rbac.middleware.js                   [M1]  # Role verification (Director, Sales, etc.)
│   │   │   ├── audit.middleware.js                  [M1]  # Automatic state change audit logger
│   │   │   ├── validate.middleware.js               [M1]  # Zod schema validation middleware
│   │   │   ├── rateLimiter.middleware.js            [M1]  # IP rate limiter for public endpoints
│   │   │   └── errorHandler.middleware.js           [M1]  # Centralized error handler envelope
│   │   ├── common/
│   │   │   ├── db.js                                [M1]  # Transaction runners and query helpers
│   │   │   ├── response.js                          [M1]  # Standardized JSON response envelope
│   │   │   ├── logger.js                            [M1]  # Structured logger (Winston/Pino)
│   │   │   └── errors/                              [M1]  # Custom AppError classes
│   │   └── modules/                                 # Feature modules
│   │       ├── platform/                            [M1]
│   │       │   ├── auth.controller.js               [M1]
│   │       │   ├── auth.service.js                  [M1]
│   │       │   ├── auth.routes.js                   [M1]
│   │       │   ├── audit.controller.js              [M1]
│   │       │   └── audit.service.js                 [M1]
│   │       ├── sales/                               [M2]
│   │       │   ├── enquiry.controller.js            [M2]
│   │       │   ├── enquiry.service.js               [M2]
│   │       │   ├── customer.controller.js           [M2]
│   │       │   ├── customer.service.js              [M2]
│   │       │   ├── survey.controller.js             [M2]
│   │       │   ├── survey.service.js                [M2]
│   │       │   ├── quotation.controller.js          [M2]
│   │       │   ├── quotation.service.js             [M2]
│   │       │   ├── bomGenerator.service.js          [M2]
│   │       │   ├── sales.validators.js              [M2]
│   │       │   └── sales.routes.js                  [M2]
│   │       ├── operations/                          [M3]
│   │       │   ├── inventory.controller.js          [M3]
│   │       │   ├── inventory.service.js             [M3]
│   │       │   ├── serialRegistry.service.js        [M3]
│   │       │   ├── dispatch.controller.js           [M3]
│   │       │   ├── dispatch.service.js              [M3]
│   │       │   ├── technician.controller.js         [M3]
│   │       │   ├── technician.service.js            [M3]
│   │       │   ├── installation.controller.js       [M3]
│   │       │   ├── installation.service.js          [M3]
│   │       │   ├── warranty.controller.js           [M3]
│   │       │   ├── warranty.service.js              [M3]
│   │       │   ├── operations.validators.js         [M3]
│   │       │   └── operations.routes.js             [M3]
│   │       └── finance_support_ai/                  [M4]
│   │           ├── ticket.controller.js             [M4]
│   │           ├── ticket.service.js                [M4]
│   │           ├── payment.controller.js            [M4]
│   │           ├── payment.service.js               [M4]
│   │           ├── webhook.controller.js            [M4]
│   │           ├── invoice.controller.js            [M4]
│   │           ├── invoice.service.js               [M4]
│   │           ├── timesheet.controller.js          [M4]
│   │           ├── timesheet.service.js             [M4]
│   │           ├── subsidy.controller.js            [M4]
│   │           ├── subsidy.service.js               [M4]
│   │           ├── dashboard.controller.js          [M4]
│   │           ├── dashboard.service.js             [M4]
│   │           ├── aiCopilot.service.js             [M4]
│   │           ├── ai.controller.js                 [M4]
│   │           ├── financeSupport.validators.js     [M4]
│   │           └── financeSupport.routes.js         [M4]
├── frontend/
│   ├── package.json                                 [M1]  # Frontend dependencies
│   ├── vite.config.js                               [M1]  # Vite build configuration
│   ├── tailwind.config.js                           [M1]  # Tailwind design tokens & themes
│   ├── postcss.config.js                            [M1]
│   ├── index.html                                   [M1]
│   ├── src/
│   │   ├── main.jsx                                 [M1]  # App root entry
│   │   ├── App.jsx                                  [M1]  # Global router and route provider
│   │   ├── index.css                                [M1]  # Global styles and design tokens
│   │   ├── api/
│   │   │   ├── client.js                            [M1]  # Axios/Fetch client with interceptors
│   │   │   └── endpoints.js                         [M1]  # Shared endpoint URL constants
│   │   ├── context/
│   │   │   ├── AuthContext.jsx                      [M1]  # Global auth state and user roles
│   │   │   └── ToastContext.jsx                     [M1]  # Global notification provider
│   │   ├── components/shared/                       [M1]  # Shared atomic UI components
│   │   │   ├── Button.jsx                           [M1]
│   │   │   ├── Input.jsx                            [M1]
│   │   │   ├── Select.jsx                           [M1]
│   │   │   ├── Modal.jsx                            [M1]
│   │   │   ├── Table.jsx                            [M1]
│   │   │   ├── Badge.jsx                            [M1]
│   │   │   ├── Card.jsx                             [M1]
│   │   │   ├── PhotoUploader.jsx                    [M1]
│   │   │   ├── SignaturePad.jsx                     [M1]
│   │   │   └── ProtectedRoute.jsx                   [M1]
│   │   ├── layout/                                  [M1]
│   │   │   ├── AppLayout.jsx                        [M1]  # Sidebar, top header, user menu
│   │   │   ├── Sidebar.jsx                          [M1]  # Role-filtered navigation links
│   │   │   └── Header.jsx                           [M1]
│   │   └── features/                                # Modular feature views
│   │       ├── auth/                                [M1]
│   │       │   ├── LoginPage.jsx                    [M1]
│   │       │   └── AuditLogView.jsx                 [M1]
│   │       ├── sales/                               [M2]
│   │       │   ├── PublicEnquiryForm.jsx            [M2]  # External homeowner form
│   │       │   ├── EnquiryInboxPage.jsx             [M2]  # Lead queue & duplicate alerts
│   │       │   ├── CustomerDetailPage.jsx           [M2]  # 360 Customer dossier
│   │       │   ├── SurveyScheduleModal.jsx          [M2]  # Technician slot picker
│   │       │   ├── SiteSurveyExecutionForm.jsx      [M2]  # Mobile survey input
│   │       │   ├── SurveyApprovalPage.jsx           [M2]  # Manager review gate
│   │       │   ├── QuotationBuilderPage.jsx         [M2]  # Package selector & auto BOM
│   │       │   └── CustomerQuoteAcceptPage.jsx      [M2]  # Public customer review/sign
│   │       ├── operations/                          [M3]
│   │       │   ├── ProductCatalogPage.jsx           [M3]  # Product & SKU management
│   │       │   ├── WarehouseInventoryPage.jsx       [M3]  # Stock balances & ledger
│   │       │   ├── StockReceiptPage.jsx             [M3]  # Inbound GRN & serial entry
│   │       │   ├── DispatchScannerPage.jsx          [M3]  # Barcode scanner & dispatch gate
│   │       │   ├── SerialTrackerPage.jsx            [M3]  # 360 serial lookup
│   │       │   ├── TechnicianRosterPage.jsx         [M3]  # 15-technician scheduling board
│   │       │   ├── InstallationJobMobilePage.jsx    [M3]  # Mobile crew checklist
│   │       │   ├── GenerationTestingForm.jsx        [M3]  # Power testing validation
│   │       │   ├── HandoverSignatureModal.jsx       [M3]  # Customer touch signature
│   │       │   └── WarrantyRegistryPage.jsx         [M3]  # Active 2yr/20yr warranty cards
│   │       └── finance_support_ai/                  [M4]
│   │           ├── SupportHelpdeskPage.jsx          [M4]  # Ticket board & warranty badges
│   │           ├── TicketDetailPage.jsx             [M4]  # Ticket thread & AI copilot
│   │           ├── RazorpayCheckoutModal.jsx        [M4]  # Test-mode payment dialog
│   │           ├── InvoicesPage.jsx                 [M4]  # GST invoices & receipts
│   │           ├── ProjectExpensesPage.jsx          [M4]  # Expense logging & receipts
│   │           ├── TechnicianPayrollPage.jsx        [M4]  # Timesheets & payouts
│   │           ├── SubsidyTrackerPage.jsx           [M4]  # Govt subsidy milestone board
│   │           ├── ProjectProfitabilityPage.jsx     [M4]  # Unit economics P&L view
│   │           └── dashboards/                      [M4]
│   │               ├── DirectorDashboard.jsx        [M4]  # Full executive overview & Recharts
│   │               ├── SalesDashboard.jsx           [M4]  # Pipeline & conversion metrics
│   │               ├── OperationsDashboard.jsx      [M4]  # Field jobs & tech utilization
│   │               ├── WarehouseDashboard.jsx       [M4]  # Stock alerts & dispatch queue
│   │               └── SupportDashboard.jsx         [M4]  # Ticket SLA & warranty stats
```

---

## 3. Strict Rules of Engagement

1. **Member 1 Shared Ownership Protection:**
   - Members 2, 3, and 4 **MUST NOT** edit `package.json`, `app.js`, `database.js`, `auth.middleware.js`, `client.js`, `App.jsx`, or components in `components/shared/`.
   - Any new npm dependency, global middleware change, or shared UI primitive must be requested through an **Integration Request (IR)** to Member 1.

2. **Isolated Database Migrations:**
   - No team member may touch another member's migration file.
   - Migrations are strictly namespaced:
     - `001_platform_foundation.sql` (Owned exclusively by Member 1)
     - `002_customer_sales.sql` (Owned exclusively by Member 2)
     - `003_operations_fulfilment.sql` (Owned exclusively by Member 3)
     - `004_support_finance_ai.sql` (Owned exclusively by Member 4)
   - Foreign keys to tables owned by other members must refer only to stable primary keys established in base migrations.

3. **Isolated Express Routes:**
   - Member 1 registers high-level route mounts in `app.js`:
     ```javascript
     app.use('/api/auth', authRoutes);               // Member 1
     app.use('/api/sales', salesRoutes);             // Member 2
     app.use('/api/operations', operationsRoutes);   // Member 3
     app.use('/api/finance', financeRoutes);         // Member 4
     app.use('/api/support', supportRoutes);         // Member 4
     app.use('/api/ai', aiRoutes);                   // Member 4
     ```
   - Each member maintains all sub-routes, controllers, and services inside their respective module folders.

4. **Integration Request (IR) Protocol:**
   - When Member 2, 3, or 4 needs:
     - A new database column in a shared table (e.g. `users`)
     - An extra prop in a shared UI component (e.g. `Button` or `Modal`)
     - A new third-party utility library
   - The member files an IR issue detailing:
     - `Target File:`
     - `Requested Change:`
     - `Reason & Impact:`
     - `Fallback if deferred:`
   - Member 1 reviews, executes the change, and tags the requesting member in the commit.
