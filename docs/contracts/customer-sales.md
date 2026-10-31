# CUSTOMER & SALES MODULE CONTRACT (HARMONIZED)
**Project:** Solar Installation Management System (SunPower Solutions)  
**Module:** Customer & Sales (`customer-sales`)  
**Owner:** Member 2 (Customer & Sales Lead)  
**Document Version:** 1.2.0  
**Authority:** [`SOLAR_MANAGEMENT_SYSTEM.md`](file:///c:/Users/HP/Desktop/Solar-Installation-Manegement-System/SOLAR_MANAGEMENT_SYSTEM.md)  
**Cross-Member References:**  
- Member 1 Contract: [`docs/integration/contracts.md`](file:///c:/Users/HP/Desktop/Solar-Installation-Manegement-System/docs/integration/contracts.md)  
- Member 3 Contract: `docs/contracts/operations.md` (`origin/feature/operations-fulfilment`)  
- Member 4 Contract: `docs/contracts/support-finance.md` (`origin/feature/support-finance-ai`)  
- Master [NC] Register: [`docs/planning/needs-confirmation.md`](file:///c:/Users/HP/Desktop/Solar-Installation-Manegement-System/docs/planning/needs-confirmation.md)  
**API Mount Prefix:** `/api/v1/customer-sales`  
**Database Migration Target:** `server/src/db/migrations/101_customer_sales.sql`  

---

## 1. Executive Summary & Specification Alignment

The **Customer & Sales Module** governs the commercial and pre-installation lifecycle of SunPower Solutions. It establishes an auditable, automated customer journey across Stages 1 through 12 of the 26-Stage project lifecycle.

### 1.1 Direct Authoritative Requirements from `SOLAR_MANAGEMENT_SYSTEM.md`
Every requirement in this contract is verified against the specification text:
1. **The Rooftop Inquiry:** Homeowner completes an online form asking for a solar system (e.g. 3 kW system under subsidy). Name, phone, address, and needs must land with the sales team immediately without vanishing.
2. **Preliminary Check:** Sales representative calls the lead to verify basic feasibility: shadow-free roof space, monthly electricity bill, and grid connection suitability.
3. **Physical Survey Visit:** If preliminary checks look good, a technician visits to measure roof direction, tilt, and cable distance.
4. **Mandatory Survey Approval Gate:** *"Only after the survey is approved should the customer receive a quote."* (Explicit Spec Invariant — BR-SRV-002).
5. **Ready Templates & Automated BOM:** Quotation is built from standard capacity templates (1 kW to 5 kW, On-Grid or Off-Grid), and the exact parts list follows automatically: panels, inverter, stands, switches, wires, and safety parts without manual memory (BR-QTE-001).
6. **Order Confirmation & Customer Acceptance:** Customer accepts quote; order is initialized; warehouse and crew schedules are notified without manual phone calls (BR-QTE-002).
7. **Advance Payment Context:** *"A customer usually pays an advance, or the full amount, before work starts."* (Configurable business rule; advance percentage and payment gates are configurable `[NC-001]`, `[NC-002]`).

---

## 2. Strict File & Directory Ownership Map

Member 2 operates exclusively within the following boundaries:

```text
Solar-Installation-Manegement-System/
├── docs/
│   └── contracts/
│       └── customer-sales.md                          [M2] # Authoritative module contract
├── client/
│   └── src/
│       └── features/
│           └── customer-sales/                        [M2] # Exclusive frontend feature directory
│               ├── components/
│               │   ├── CustomerCard.jsx               [M2]
│               │   ├── CustomerTimeline.jsx           [M2]
│               │   ├── DuplicateMergeModal.jsx        [M2]
│               │   ├── SurveyScheduleModal.jsx        [M2] # Survey request dialog
│               │   ├── PhotoGallery.jsx               [M2]
│               │   ├── PackageSelector.jsx            [M2]
│               │   ├── BomTable.jsx                   [M2]
│               │   └── QuoteAcceptModal.jsx           [M2]
│               ├── pages/
│               │   ├── PublicEnquiryPage.jsx          [M2] # Public website landing form
│               │   ├── EnquiryInboxPage.jsx           [M2] # Sales lead queue & duplicate alerts
│               │   ├── CustomerListPage.jsx           [M2] # Filterable customer directory
│               │   ├── CustomerDetailPage.jsx         [M2] # 360 customer dossier & timeline
│               │   ├── SurveyExecutionPage.jsx        [M2] # Mobile field technician survey
│               │   ├── SurveyApprovalPage.jsx         [M2] # Engineering review gate
│               │   ├── QuotationBuilderPage.jsx       [M2] # Package selector & auto BOM
│               │   ├── QuotationDetailPage.jsx        [M2] # Quotation review & PDF view
│               │   └── PublicQuoteAcceptPage.jsx      [M2] # Customer acceptance portal
│               └── services/
│                   └── customerSalesApi.js            [M2] # API client for /api/v1/customer-sales
└── server/
    └── src/
        ├── db/
        │   └── migrations/
        │       └── 101_customer_sales.sql             [M2] # Exclusive DDL migration
        └── modules/
            └── customer-sales/                        [M2] # Exclusive backend feature directory
                ├── customerSales.routes.js            [M2] # Router mounted by Member 1
                ├── customerSales.validators.js        [M2] # Zod schemas for all payloads
                ├── controllers/
                │   ├── customer.controller.js         [M2]
                │   ├── enquiry.controller.js          [M2]
                │   ├── survey.controller.js           [M2]
                │   ├── quotation.controller.js        [M2]
                │   └── order.controller.js            [M2]
                └── services/
                    ├── customer.service.js            [M2]
                    ├── enquiry.service.js             [M2]
                    ├── deduplication.service.js       [M2]
                    ├── survey.service.js              [M2]
                    ├── package.service.js             [M2]
                    ├── bomGenerator.service.js        [M2]
                    ├── quotation.service.js           [M2]
                    └── orderHandover.service.js       [M2]
```

### Prohibited Boundaries:
- **No modification of root configuration files:** `package.json`, `package-lock.json`, `render.yaml`, `vercel.json`.
- **No modification of shared platform files (Member 1):** `server/src/app.js`, `server/src/server.js`, `server/src/config/*`, `server/src/db/index.js`, `server/src/db/migrate.js`, `server/src/db/migrations/001_platform_foundation.sql`, `client/src/App.jsx`.
- **No modification of Operations (Member 3) or Support/Finance/AI (Member 4) files:** Migrations `102_*`, `103_*`, or their feature folders.
- **No internal table assumptions:** All inter-module communication is governed by documented, agreed interfaces.

---

## 3. Subsystem Architecture & Business Workflows

### 3.1 Customer Management & Customer Timeline

1. **Customer Record Structure:**
   - Single authoritative record per customer.
   - Indexed by unique phone number and email.
   - Fields: Full Name, Primary Phone, Secondary Phone, Email, Preferred Contact Channel, Billing Address, Installation Site Address, City, State, Pincode, Landmark, Notes.
2. **Customer Lifecycle States:**
   `LEAD` ➔ `PROSPECT` ➔ `SURVEY_SCHEDULED` ➔ `SURVEY_COMPLETED` ➔ `QUOTED` ➔ `ORDER_CONFIRMED` ➔ `ACTIVE_PROJECT` ➔ `MAINTENANCE`
3. **Customer 360 Dossier:**
   - Unified API response aggregating: Contact Info, Active Enquiries, Surveys, Quotations, Orders, Installed Serials (queried via Operations endpoint `GET /api/v1/operations/serials`), and Support Cases/Tickets (queried via Support endpoint `GET /api/v1/support-finance/cases`).
4. **Authoritative Customer Timeline:**
   - Append-only event history in table `customer_timeline`:
     - `ENQUIRY_RECEIVED`: Initial lead entry.
     - `LEAD_QUALIFIED`: Telephone screening passed.
     - `SURVEY_REQUESTED`: Survey visit slot requested.
     - `SURVEY_SUBMITTED`: Field measurements & photos uploaded.
     - `SURVEY_APPROVED`: Engineering review completed.
     - `QUOTE_GENERATED`: Quotation prepared and sent.
     - `QUOTE_ACCEPTED`: Customer digital sign-off.
     - `ORDER_CREATED`: Order confirmed and handed over to Operations.

### 3.2 Enquiry Ingestion & Deduplication Subsystem

1. **Lead Ingestion Sources:**
   - `WEB`: Homeowner completes public web form.
   - `WHATSAPP`: Sales rep manually logs WhatsApp inquiry.
   - `PHONE_CALL`: Inbound customer call logged.
   - `REFERRAL`: Customer referral.
   - `WALK_IN`: Office visitor.
2. **Enquiry Status State Machine:**
   `NEW` ➔ `CONTACTED` ➔ `QUALIFIED` | `DISQUALIFIED` | `MERGED`
3. **Automated Duplicate Detection & Merging:**
   - Detects incoming leads matching existing phone numbers (`clean_phone(phone)`) or email.
   - If match found:
     - Enquiry created with `duplicate_of_id = <original_enquiry_id>`.
     - Alert badge `[DUPLICATE DETECTED]` displayed on Sales Inbox.
     - Side-by-side comparison modal allows sales reps to merge into primary record or retain as distinct.
4. **Preliminary Lead Screening (Verified against Spec):**
   - The specification states: *"Someone must call them and check the basics: how much shadow-free roof space they have, what their monthly electricity bill is, and whether the grid connection is suitable."*
   - Thresholds are configurable via system settings `[NC-013]` and `[NC-014]` (e.g. `[DEMO] shadow_free_area >= 100 sq ft`, `[DEMO] monthly_bill >= ₹1,500`).
   - If verified, `enquiry.status` advances to `QUALIFIED`, creating/linking a `customer` profile.

### 3.3 Site Survey & Engineering Approval Subsystem

1. **Technician Scheduling Ownership & Integration Boundary:**
   - **Customer & Sales Scope:** Requests a site survey appointment for a qualified lead (`POST /api/v1/customer-sales/surveys/request`).
   - **Operations Scope (Member 3):** Owns technician profiles, the 15-technician roster, availability, workload balancing, and conflict prevention.
   - **Integration Contract:** Customer & Sales queries Operations API `GET /api/v1/operations/technicians/availability?date=...&slot=...` to display open slots to the sales rep.
2. **On-Site Mobile Survey Form (Technician Execution):**
   - Directly recorded on rooftop via mobile/tablet browser:
     - `roof_area_sqft`: Total measured roof space.
     - `shadow_free_sqft`: Unshaded usable space.
     - `roof_type`: Flat RCC, Sloped Metal Sheet, Tiled, Ground Mount.
     - `azimuth_degrees`: Compass orientation (0°–360°).
     - `tilt_angle_degrees`: Inclination angle (validated 0°–90°; recommended range configurable `[NC-015]`).
     - `cable_run_meters`: Distance from panels to inverter/meter.
     - `grid_phase`: Single Phase, Three Phase.
     - `sanctioned_load_kw`: Utility sanctioned load.
     - `structural_condition`: Visual assessment of roof strength.
3. **Cloudinary Photo Proofs:**
   - Rooftop photos uploaded using Member 1's shared Cloudinary signed-upload interface (`POST /api/v1/media/sign-upload`, `folder = 'surveys'`).
   - Minimum photo count is configurable `[NC-016]` (e.g. `[DEMO] Minimum 2 photos: Panorama & Meter Board`).
4. **Mandatory Engineering Review Gate (Explicit Spec Invariant):**
   - *"Only after the survey is approved should the customer receive a quote."* (BR-SRV-002)
   - Reviewer: Sales Manager or Engineering Lead (`Admin/Owner` or `Sales`).
   - **APPROVE:** Sets `site_surveys.status = 'APPROVED'`. Unlocks Quotation Builder.
   - **REWORK:** Requires mandatory reason (minimum 10 characters). Sets `status = 'REWORK'`. Re-routes back to technician queue. Quotation creation remains strictly locked.
   - **REJECT:** Unfeasible site. Sets `status = 'REJECTED'`. Quotation creation remains locked.

### 3.4 Solar Packages, Automated BOM & Quotation Engine

1. **Ready Packages Catalog (Verified against Spec):**
   - Specification explicitly defines:
     - Capacities: Ready-made systems from 1 kW to 5 kW.
     - Kinds: `On-Grid` (connected to grid, no battery) and `Off-Grid` (with battery backup).
     - Standard package hardware: Inverter, wiring boxes, battery charge controller, panels, safety earthing, metal stands, plus large battery for Off-Grid.
   - Total: 10 standard package configurations (1 kW to 5 kW in On-Grid and Off-Grid).
2. **Authoritative Ownership of Project BOM Creation:**
   - **Member 2 Exclusively Owns:**
     - Package component definition templates.
     - Automated Bill of Materials derivation algorithm.
     - Translating survey cable lengths into dynamic extra cable line items.
     - Writing the authoritative `project_bom_items` snapshot upon quotation acceptance.
   - **Member 3 Consumes & Fulfills:**
     - Reads `project_bom_items` to reserve warehouse inventory (`inventory_items`, `stock_reservations`).
     - Scans serial numbers against BOM items at dispatch.
     - Verifies physical installation on-site against BOM checklist.
3. **Quotation Pricing, Validity & Customer Acceptance:**
   - `hardware_subtotal`: Sum of all auto-derived BOM components.
   - `installation_labor_cost`: Configurable installation service charge.
   - `tax_amount`: Calculated using configurable tax slab `[NC-006]` (`[DEMO] 12.0% Flat GST`).
   - `subsidy_estimated_amount`: Informational subsidy rebate display `[NC-007]`.
   - `discount_amount`: Sales discounts capped at configurable threshold `[NC-012]` (`[DEMO] 10% max without Director approval`).
   - `valid_until`: Strict validity window `[NC-011]` (`[DEMO] 15 Calendar Days`). Expired quotes cannot be accepted without revalidation.
4. **Customer Digital Acceptance Gate (Verified against Spec):**
   - Customer accesses branded quote portal via secure cryptographically random token: `/portal/quotes/:token`.
   - Customer inspects system specs, BOM breakdown, payment schedule, and terms.
   - **Acceptance:** Customer signs on screen and confirms terms. Quote status transitions to `ACCEPTED`. Automatically advances order creation.
   - **Decline:** Customer submits structured feedback. Status transitions to `DECLINED`.

### 3.5 Order Initialization & Operations/Finance Handover

1. **Order Creation Prerequisite (Explicit Spec Invariant):**
   - An Order and Project **CANNOT** be created from a Draft, Sent, Expired, or Declined quotation.
   - Quotation status must strictly equal `ACCEPTED` (BR-QTE-002).
2. **Order & Payment Status Fields (Harmonized with Members 3 & 4):**
   - To avoid conflating commercial milestones with financial payments, `orders` explicitly separates:
     - `order_status`: `CONFIRMED` ➔ `IN_FULFILMENT` ➔ `COMPLETED` | `CANCELLED`.
     - `payment_status`: `PENDING_ADVANCE` ➔ `ADVANCE_PAID` ➔ `FULLY_PAID`.
   - Operations (Member 3) checks `orders.payment_status IN ('ADVANCE_PAID', 'FULLY_PAID')` before releasing a dispatch order.
   - Finance (Member 4) updates `orders.payment_status` upon Razorpay cryptographic HMAC or webhook verification.
3. **Cross-Module Handover Protocol:**
   - **To Member 3 (Operations):**
     1. Member 2 creates `orders`, `projects`, and `project_bom_items` in the shared database.
     2. Member 2 triggers stock reservation via Member 3's REST API:
        ```text
        POST /api/v1/operations/projects/:id/reserve-stock
        ```
   - **To Member 4 (Finance):**
     1. Member 2 makes the order available in the database.
     2. Customer or Sales triggers Razorpay advance payment order creation via Member 4's REST API:
        ```text
        POST /api/v1/support-finance/payments/create-order
        Header: Idempotency-Key: <unique-uuid>
        Body: { "order_id": order.id, "purpose": "ADVANCE" }
        ```
     3. Member 4 derives the required advance amount server-side from `orders.total_contract_value` and `orders.advance_required_percent`.

---

## 4. Comprehensive API Specifications

All endpoints are mounted under: `/api/v1/customer-sales`

### 4.1 Customer Management Endpoints

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/customer-sales/customers` | Admin/Owner, Sales | Create customer profile |
| `GET` | `/api/v1/customer-sales/customers` | Admin/Owner, Sales, Support | Search & filter customer directory |
| `GET` | `/api/v1/customer-sales/customers/:id` | Admin/Owner, Sales, Support | Retrieve 360 customer dossier |
| `PUT` | `/api/v1/customer-sales/customers/:id` | Admin/Owner, Sales | Update customer contact & address info |
| `GET` | `/api/v1/customer-sales/customers/:id/timeline` | Admin/Owner, Sales, Support | Chronological event history |

### 4.2 Enquiry Management Endpoints

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/customer-sales/public/enquiries` | **Public** (Rate-limited) | Public web inquiry form intake |
| `GET` | `/api/v1/customer-sales/enquiries` | Admin/Owner, Sales | Sales lead queue with duplicate alerts |
| `GET` | `/api/v1/customer-sales/enquiries/:id` | Admin/Owner, Sales | Detailed enquiry view |
| `PATCH` | `/api/v1/customer-sales/enquiries/:id/assign` | Admin/Owner, Sales | Assign enquiry to sales representative |
| `POST` | `/api/v1/customer-sales/enquiries/:id/qualify` | Admin/Owner, Sales | Record telephone preliminary check |
| `GET` | `/api/v1/customer-sales/enquiries/duplicates` | Admin/Owner, Sales | List detected duplicate leads |
| `POST` | `/api/v1/customer-sales/enquiries/:id/merge` | Admin/Owner, Sales | Merge duplicate lead into primary record |

### 4.3 Site Survey Endpoints

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/customer-sales/surveys/request` | Admin/Owner, Sales | Request survey visit (queries Ops for slots) |
| `GET` | `/api/v1/customer-sales/surveys` | Admin/Owner, Sales, Tech | List survey appointments |
| `GET` | `/api/v1/customer-sales/surveys/:id` | Admin/Owner, Sales, Tech | Detailed survey record & measurements |
| `POST` | `/api/v1/customer-sales/surveys/:id/execute` | Technician, Admin/Owner | Mobile survey measurement submission |
| `POST` | `/api/v1/customer-sales/surveys/:id/photos` | Technician, Admin/Owner | Attach Cloudinary photo proofs |
| `POST` | `/api/v1/customer-sales/surveys/:id/approve` | Admin/Owner, Sales | **Engineering sign-off gate (Unlocks quotes)** |
| `POST` | `/api/v1/customer-sales/surveys/:id/rework` | Admin/Owner, Sales | Request technician rework (min 10 char reason) |
| `POST` | `/api/v1/customer-sales/surveys/:id/reject` | Admin/Owner, Sales | Reject unfeasible site |

### 4.4 Packages & Automated BOM Endpoints

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/customer-sales/packages` | Authenticated | 1-5 kW standard solar package catalog |
| `GET` | `/api/v1/customer-sales/packages/:id` | Authenticated | Package template and standard hardware spec |
| `POST` | `/api/v1/customer-sales/quotations/generate-bom` | Admin/Owner, Sales | Auto-derive BOM from package & survey cable |

### 4.5 Quotation Management Endpoints

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/customer-sales/quotations` | Admin/Owner, Sales | Create quote (**Requires approved survey**) |
| `GET` | `/api/v1/customer-sales/quotations` | Admin/Owner, Sales | Filterable quotation list |
| `GET` | `/api/v1/customer-sales/quotations/:id` | Admin/Owner, Sales | Detailed quotation view with BOM lines |
| `POST` | `/api/v1/customer-sales/quotations/:id/send` | Admin/Owner, Sales | Deliver quote link/PDF to customer |
| `GET` | `/api/v1/customer-sales/public/quotations/:token` | **Public** (Token-secured) | Customer quote portal viewer |
| `POST` | `/api/v1/customer-sales/public/quotations/:token/accept` | **Public** (Token-secured) | Accept quotation & digital sign-off |
| `POST` | `/api/v1/customer-sales/public/quotations/:token/decline`| **Public** (Token-secured) | Decline quotation with feedback |

### 4.6 Order Initialization & Handover Endpoints

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/customer-sales/orders/create-from-quote` | Admin/Owner, Sales | Create order (**Requires accepted quote**) |
| `GET` | `/api/v1/customer-sales/orders/:id` | Admin/Owner, Sales | Sales order overview |
| `GET` | `/api/v1/customer-sales/orders/:id/bom` | Admin/Owner, Sales, Ops | Authoritative project BOM items view |

---

## 5. Harmonized Database Schema (`101_customer_sales.sql`)

```sql
-- ==============================================================================
-- Migration: 101_customer_sales.sql
-- Module: Customer & Sales (CRM, Surveys, Packages, Quotations, Orders, Project BOM)
-- Author: Member 2
-- Dependencies: 001_platform_foundation.sql (users, audit_logs)
-- Harmonized with: Member 3 (Operations) and Member 4 (Support/Finance)
-- ==============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE enquiry_source_enum AS ENUM ('WEB', 'WHATSAPP', 'PHONE_CALL', 'REFERRAL', 'WALK_IN');
    CREATE TYPE enquiry_status_enum AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'MERGED');
    CREATE TYPE survey_status_enum AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REWORK', 'REJECTED');
    CREATE TYPE roof_type_enum AS ENUM ('FLAT_RCC', 'SLOPED_METAL_SHEET', 'TILED', 'GROUND_MOUNT');
    CREATE TYPE system_type_enum AS ENUM ('ON_GRID', 'OFF_GRID');
    CREATE TYPE quote_status_enum AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVISED');
    CREATE TYPE order_status_enum AS ENUM ('CONFIRMED', 'IN_FULFILMENT', 'COMPLETED', 'CANCELLED');
    CREATE TYPE payment_status_enum AS ENUM ('PENDING_ADVANCE', 'ADVANCE_PAID', 'FULLY_PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    secondary_phone VARCHAR(20),
    email VARCHAR(255),
    preferred_contact_channel VARCHAR(20) DEFAULT 'WHATSAPP',
    billing_address TEXT NOT NULL,
    site_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Ahmedabad',
    state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
    pincode VARCHAR(10) NOT NULL,
    landmark VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_pincode ON customers(pincode);

-- 3. CUSTOMER TIMELINE TABLE
CREATE TABLE IF NOT EXISTS customer_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL DEFAULT 'System',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_timeline_cust_id ON customer_timeline(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_timeline_created_at ON customer_timeline(created_at);

-- 4. ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    source enquiry_source_enum NOT NULL DEFAULT 'WEB',
    status enquiry_status_enum NOT NULL DEFAULT 'NEW',
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Ahmedabad',
    pincode VARCHAR(10) NOT NULL,
    monthly_electricity_bill NUMERIC(10,2) CHECK (monthly_electricity_bill >= 0),
    preferred_capacity_kw NUMERIC(3,1) CHECK (preferred_capacity_kw BETWEEN 1.0 AND 5.0),
    preferred_system_type system_type_enum NOT NULL DEFAULT 'ON_GRID',
    notes TEXT,
    duplicate_of_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    preliminary_qualification_passed BOOLEAN DEFAULT false,
    qualification_notes TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_phone ON enquiries(phone);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_to ON enquiries(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_duplicate_of ON enquiries(duplicate_of_id);

-- 5. SITE SURVEYS TABLE
CREATE TABLE IF NOT EXISTS site_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    enquiry_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status survey_status_enum NOT NULL DEFAULT 'SCHEDULED',
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    site_contact_name VARCHAR(255),
    site_contact_phone VARCHAR(20),
    scheduling_notes TEXT,
    review_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_surveys_cust_id ON site_surveys(customer_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_tech_id ON site_surveys(technician_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_status ON site_surveys(status);

-- 6. SURVEY MEASUREMENTS TABLE
CREATE TABLE IF NOT EXISTS survey_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL UNIQUE REFERENCES site_surveys(id) ON DELETE CASCADE,
    roof_area_sqft NUMERIC(8,2) NOT NULL CHECK (roof_area_sqft > 0),
    shadow_free_sqft NUMERIC(8,2) NOT NULL CHECK (shadow_free_sqft >= 0),
    roof_type roof_type_enum NOT NULL DEFAULT 'FLAT_RCC',
    azimuth_degrees NUMERIC(5,2) NOT NULL CHECK (azimuth_degrees BETWEEN 0 AND 360),
    tilt_angle_degrees NUMERIC(4,2) NOT NULL CHECK (tilt_angle_degrees BETWEEN 0 AND 90),
    cable_run_meters NUMERIC(5,2) NOT NULL CHECK (cable_run_meters > 0),
    grid_phase VARCHAR(20) NOT NULL CHECK (grid_phase IN ('SINGLE_PHASE', 'THREE_PHASE')),
    sanctioned_load_kw NUMERIC(5,2) CHECK (sanctioned_load_kw > 0),
    transformer_distance_meters NUMERIC(6,2),
    structural_condition VARCHAR(50) DEFAULT 'GOOD',
    technician_notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. SURVEY PHOTOS TABLE
CREATE TABLE IF NOT EXISTS survey_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE CASCADE,
    photo_type VARCHAR(50) NOT NULL,
    cloudinary_url TEXT NOT NULL,
    caption VARCHAR(255),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_survey_photos_survey_id ON survey_photos(survey_id);

-- 8. SOLAR PACKAGES CATALOG TABLE
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    capacity_kw NUMERIC(3,1) NOT NULL CHECK (capacity_kw BETWEEN 1.0 AND 5.0),
    grid_type system_type_enum NOT NULL,
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price > 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_capacity_grid UNIQUE (capacity_kw, grid_type)
);

-- 9. PACKAGE COMPONENTS TEMPLATE TABLE
CREATE TABLE IF NOT EXISTS package_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity NUMERIC(6,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    default_unit_price NUMERIC(10,2) NOT NULL CHECK (default_unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pkg_comp_package_id ON package_components(package_id);

-- 10. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE RESTRICT,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    version INT NOT NULL DEFAULT 1,
    status quote_status_enum NOT NULL DEFAULT 'DRAFT',
    hardware_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    installation_labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    tax_rate_percent NUMERIC(4,2) NOT NULL DEFAULT 12.0,
    taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    subsidy_estimated_amount NUMERIC(10,2) DEFAULT 0,
    net_customer_payable NUMERIC(10,2) NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ NOT NULL,
    public_token VARCHAR(100) NOT NULL UNIQUE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotations_cust_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_survey_id ON quotations(survey_id);
CREATE INDEX IF NOT EXISTS idx_quotations_public_token ON quotations(public_token);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- 11. QUOTATION ITEMS TABLE (Quote BOM Breakdown)
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity NUMERIC(6,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quotation_items(quotation_id);

-- 12. QUOTATION ACCEPTANCES TABLE
CREATE TABLE IF NOT EXISTS quotation_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL UNIQUE REFERENCES quotations(id) ON DELETE CASCADE,
    accepted_by_name VARCHAR(255) NOT NULL,
    accepted_by_phone VARCHAR(20) NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT true,
    signature_data_url TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    comments TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. ORDERS TABLE (Harmonized with Member 3 & Member 4)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id UUID NOT NULL UNIQUE REFERENCES quotations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_status order_status_enum NOT NULL DEFAULT 'CONFIRMED',
    payment_status payment_status_enum NOT NULL DEFAULT 'PENDING_ADVANCE',
    total_contract_value NUMERIC(10,2) NOT NULL,
    advance_required_percent NUMERIC(4,2) NOT NULL DEFAULT 25.0,
    advance_required_amount NUMERIC(10,2) NOT NULL,
    advance_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_id ON orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- 14. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    capacity_kw NUMERIC(3,1) NOT NULL,
    grid_type system_type_enum NOT NULL,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'SURVEY_COMPLETED_PENDING_PAYMENT',
    assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    installation_scheduled_date DATE,
    installation_completed_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_order_id ON projects(order_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(current_stage);

-- 15. PROJECT BOM ITEMS TABLE (Harmonized source for Member 3 Operations)
-- Exactly matches Member 3's inbound dependency: (id, project_id, product_id, quantity, is_serialized, unit_cost)
CREATE TABLE IF NOT EXISTS project_bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID,
    category VARCHAR(50) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(6,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    is_serialized BOOLEAN NOT NULL DEFAULT false,
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proj_bom_project_id ON project_bom_items(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_bom_product_id ON project_bom_items(product_id);
```

---

## 6. Harmonized Integration Interfaces

### 6.1 Integration with Member 1 (Platform Foundation)
- **Database Connection Pool:** `import { db } from '../../db/index.js'`.
- **JWT Authentication:** `import { authenticate } from '../../middleware/auth.middleware.js'`.
- **RBAC Authorization:** `import { authorize } from '../../middleware/rbac.middleware.js'`.
- **Schema Validation:** `import { validate } from '../../middleware/validate.middleware.js'`.
- **Audit Logging Engine:** `import { recordAuditLog } from '../../shared/utils/auditLogger.js'`.
- **Cloudinary Signed Media Uploads:** `POST /api/v1/media/sign-upload` with `{ folder: 'surveys' }`.

### 6.2 Integration with Member 3 (Operations & Fulfilment)

#### A. Technician Availability Query (Survey Scheduling)
- **Operations Endpoint Consumed:**
  ```text
  GET /api/v1/operations/technicians/availability?date=YYYY-MM-DD&slot=SLOT_NAME
  ```
- **Response Shape Provided by Member 3:**
  ```json
  {
    "success": true,
    "data": [
      {
        "technicianId": "u2-0000-0000-0000-000000000002",
        "fullName": "Kiran Rathod",
        "isAvailable": true,
        "currentDailyLoad": 1
      }
    ]
  }
  ```

#### B. Database Inbound Dependency Handover (Member 3 Spec §15.1)
Member 3's contract specifies direct database reading of accepted project orders and parts:
1. **`orders` table:** Created by Member 2 with `payment_status` (`PENDING_ADVANCE`, `ADVANCE_PAID`, `FULLY_PAID`) and `customer_id`.
2. **`projects` table:** Created by Member 2 with `projects.id`, `capacity_kw`, `grid_type`, `current_stage`.
3. **`project_bom_items` table:** Authoritatively populated by Member 2 upon quotation acceptance. Contains the exact columns required by Member 3:
   - `id`: UUID Primary Key
   - `project_id`: Foreign key to `projects(id)`
   - `product_id`: UUID matching inventory product
   - `quantity`: Number of units to reserve/dispatch
   - `is_serialized`: Flag indicating whether serial barcode scanning is mandatory at dispatch
   - `unit_cost`: Authoritative cost base for profitability calculations
4. **Member 3 REST Stock Reservation Trigger:**
   Once `projects` and `project_bom_items` are written to PostgreSQL, Member 2 invokes:
   ```text
   POST /api/v1/operations/projects/:id/reserve-stock
   ```
   Locks inventory stock and flags any hardware shortages.

### 6.3 Integration with Member 4 (Support, Finance & AI)

#### A. Advance Payment Initiation (Member 4 Spec §2.C)
When an order is created, the customer or sales representative initiates payment through Member 4's Razorpay engine:
- **Finance Endpoint Invoked:**
  ```text
  POST /api/v1/support-finance/payments/create-order
  ```
- **Required Header:**
  ```text
  Idempotency-Key: <unique-uuid>
  ```
- **Request Body:**
  ```json
  {
    "order_id": "ord-2026-0032",
    "purpose": "ADVANCE"
  }
  ```
- **Server Authority:** Member 4's backend queries `orders.total_contract_value` and calculates the advance amount in paise server-side (`[NC-001]`). The client never submits an arbitrary amount.
- **Payment Verification:** Upon successful Razorpay HMAC verification or webhook receipt, Member 4 updates `orders.payment_status = 'ADVANCE_PAID'`.

#### B. Customer 360 Query Interface
Member 4 queries Member 2's customer directory:
```text
GET /api/v1/customer-sales/customers/:id
```
Returns profile, address, past enquiries, surveys, quotes, and active order records.

---

## 7. Role-Based Permissions Matrix

| Endpoint / Operation | Public | Admin/Owner | Sales | Technician | Warehouse | Support |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `POST /public/enquiries` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /enquiries` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `PATCH /enquiries/:id/assign` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /enquiries/:id/qualify` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /enquiries/:id/merge` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /customers` | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `POST /customers` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /customers/:id` | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `POST /surveys/request` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /surveys/:id/execute` (Mobile) | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `POST /surveys/:id/photos` | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `POST /surveys/:id/approve` (Review Gate) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /surveys/:id/rework` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /surveys/:id/reject` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /packages` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /quotations/generate-bom` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /quotations` (Create Quote) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /quotations/:id/send` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /public/quotations/:token` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /public/quotations/:token/accept` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /public/quotations/:token/decline`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /orders/create-from-quote` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /orders/:id/bom` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 8. Needs Confirmation [NC] Harmonized Register

All unresolved business policies are anchored to the central project register in [`docs/planning/needs-confirmation.md`](file:///c:/Users/HP/Desktop/Solar-Installation-Manegement-System/docs/planning/needs-confirmation.md):

| Shared Master ID | Member 3 Cross-Ref | Parameter Description | Configurable Architectural Treatment | Marked [DEMO] Value |
|---|---|---|---|---|
| **`[NC-001]`** | `[NC-01]` | **Advance Payment Percentage** | Stored as configurable `advance_required_percent` in `orders` / `system_settings`. | **`[DEMO] 25.0% Advance`** (with 100% full-pay toggle) |
| **`[NC-002]`** | `[NC-01]` | **Advance Payment Gate Policy** | System setting `enforce_advance_dispatch_gate` checked prior to warehouse dispatch. | **`[DEMO] true (Advance required before dispatch)`** |
| **`[NC-006]`** | — | **Tax & GST Configuration** | Configurable `tax_rate_percent` in quotation calculation. | **`[DEMO] 12.0% Flat GST`** |
| **`[NC-007]`** | — | **Rooftop Subsidy Eligibility & Value** | Informational subsidy estimation table linked to package capacity. | **`[DEMO] PM Surya Ghar: 1kW=₹30k, 2kW=₹60k, 3kW-5kW=₹78k`** |
| **`[NC-011]`** | — | **Quotation Validity Window** | Configurable `validity_days` in quote generator. | **`[DEMO] 15 Calendar Days`** |
| **`[NC-012]`** | — | **Max Sales Representative Discount** | Configurable `max_rep_discount_percent` before requiring Admin sign-off. | **`[DEMO] 10.0% Max Rep Discount`** |
| **`[NC-013]`** | — | **Preliminary Bill Qualification Threshold** | Configurable `min_monthly_electricity_bill` in screening rules. | **`[DEMO] ₹1,500 / month`** |
| **`[NC-014]`** | — | **Preliminary Shadow-Free Roof Space Threshold** | Configurable `min_shadow_free_roof_sqft` in screening rules. | **`[DEMO] 100 sq ft`** |
| **`[NC-015]`** | `[NC-29]` | **Survey Roof Tilt Angle Nominal Range** | Advisory validation range in survey schema. Hard limit: 0°–90°. | **`[DEMO] 10° to 30° Nominal Range`** |
| **`[NC-016]`** | `[NC-30]` | **Minimum Mandatory Survey Photo Count** | Configurable `min_survey_photo_count` in survey submission schema. | **`[DEMO] Minimum 2 Photos (Panorama & Meter)`** |
| **`[NC-017]`** | — | **Default PV Panel Wattage & Model** | Configurable in `package_components` template table. | **`[DEMO] 540W Mono PERC Solar Panels`** |
| **`[NC-018]`** | — | **Survey Review SLA Duration** | Configurable `survey_review_sla_hours` for manager dashboard alerts. | **`[DEMO] 24 Hours SLA`** |

---

## 9. Validation & Testing Strategy

1. **Unit Tests (`server/test/customer-sales/unit/`):**
   - Deduplication: phone sanitization (`+919876543210` == `9876543210`), email case normalization.
   - BOM Generator: Automatic calculation of panels, inverter, rails, and earthing for 1–5 kW On/Off Grid.
   - Quotation calculations: Arithmetic verification for subtotal, taxes, labor, and customer payable.
2. **API Integration & Business Gate Tests (`server/test/customer-sales/integration/`):**
   - **BR-SRV-001 (Qualification Gate):** Survey request rejected if preliminary qualification check is not passed.
   - **BR-SRV-002 (Survey Approval Gate):** Quotation creation fails with `403 Forbidden` if survey status != `APPROVED`.
   - **BR-SRV-003 (Rework Protocol):** Rejecting/reworking survey requires reason length $\ge 10$ characters.
   - **BR-QTE-001 (BOM Generation):** BOM derived strictly from package templates without manual entry.
   - **BR-QTE-002 (Order Creation Gate):** Order creation fails with `400 Bad Request` if quotation status != `ACCEPTED`.
   - **BR-QTE-003 (Quote Expiry):** Accepting expired quote fails with `400 Bad Request (QUOTE_EXPIRED)`.
3. **Cross-Module Integration Verification:**
   - Verify Member 3's stock reservation endpoint triggers cleanly against created `project_bom_items`.
   - Verify Member 4's Razorpay payment order generation consumes `order.id` with `Idempotency-Key`.

---

## 10. Conclusion & Cross-Member Harmonization Status

This revised contract achieves 100% field-by-field harmonization with Member 3 and Member 4:
- Inbound dependencies for Member 3 match `projects`, `orders`, and `project_bom_items` specifications.
- Outbound triggers for Member 4 match `/api/v1/support-finance/payments/create-order` with server-side amount derivation.
- Separation of commercial `order_status` and financial `payment_status` is agreed across modules.
- `[NC]` register mapping is anchored to the project master list.

**Module Status:** HARMONIZATION AUDIT COMPLETE. Ready for Phase 1 implementation.
