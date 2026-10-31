# CUSTOMER & SALES MODULE CONTRACT
**Project:** Solar Installation Management System (SunPower Solutions)  
**Module:** Customer & Sales (`customer-sales`)  
**Owner:** Member 2 (Customer & Sales Lead)  
**Document Version:** 1.0.0  
**Authority:** [`SOLAR_MANAGEMENT_SYSTEM.md`](file:///c:/Users/HP/Desktop/Solar-Installation-Manegement-System/SOLAR_MANAGEMENT_SYSTEM.md)  
**API Mount Prefix:** `/api/v1/customer-sales`  
**Database Migration Target:** `server/src/db/migrations/101_customer_sales.sql`  

---

## 1. Executive Summary & Module Scope

The **Customer & Sales Module** governs Stages 1 through 12 of the 26-Stage SunPower Solutions operational lifecycle. It transforms fragmented WhatsApp messages, phone calls, and manual registers into an automated, auditable, and traceable sales-to-project pipeline.

### Core Objectives:
1. **Intake & Zero-Lead-Loss CRM:** Public lead capture with instant sales assignment and automated duplicate detection across phone, email, and property address.
2. **Technical Site Survey Governance:** Mobile-first rooftop feasibility capture (roof area, azimuth, tilt 10°–30°, shadow-free space, cable distance) with mandatory Cloudinary photo proofs.
3. **Engineering Review Gate:** Strict architectural blockade preventing quotation generation prior to formal survey sign-off by engineering/sales management.
4. **Standard Packages & Automated BOM Generator:** Automated bill of materials derivation for 1 kW to 5 kW On-Grid and Off-Grid systems, eliminating manual component memory errors.
5. **Quotation Lifecycle & Digital Acceptance:** Versioned quotes with price validity locks, customer portal review, and cryptographic digital acceptance tokens.
6. **Order Initialization & Operations Handover:** Automatic Order/Project creation following quote acceptance, providing a typed, documented handover contract to Member 3 (Operations & Fulfilment).

---

## 2. Strict File & Directory Ownership Map

Member 2 operates strictly within these assigned boundaries:

```text
Solar-Installation-Manegement-System/
├── docs/
│   └── contracts/
│       └── customer-sales.md                          [M2] # This authoritative contract
├── client/
│   └── src/
│       └── features/
│           └── customer-sales/                        [M2] # Exclusive frontend feature folder
│               ├── components/
│               │   ├── CustomerCard.jsx               [M2]
│               │   ├── CustomerTimeline.jsx           [M2]
│               │   ├── DuplicateMergeModal.jsx        [M2]
│               │   ├── SurveyScheduleModal.jsx        [M2]
│               │   ├── PhotoGallery.jsx               [M2]
│               │   ├── PackageSelector.jsx            [M2]
│               │   ├── BomTable.jsx                   [M2]
│               │   └── QuoteAcceptModal.jsx           [M2]
│               ├── pages/
│               │   ├── PublicEnquiryPage.jsx          [M2] # Public landing enquiry form
│               │   ├── EnquiryInboxPage.jsx           [M2] # Sales lead queue & deduplication
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
            └── customer-sales/                        [M2] # Exclusive backend feature folder
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

### Prohibited Actions:
- **No modification of root files:** `package.json`, `package-lock.json`, `.gitignore`, `render.yaml`, `vercel.json`.
- **No modification of server core:** `server/src/app.js`, `server/src/server.js`, `server/src/config/*`, `server/src/db/index.js`, `server/src/db/migrate.js`, `server/src/db/migrations/001_platform_foundation.sql`.
- **No modification of shared client shell:** `client/src/App.jsx`, `client/src/main.jsx`, `client/src/components/layout/*`, `client/src/shared/*`.
- **No modification of other members' migrations or modules:** `102_operations_fulfilment.sql`, `103_support_finance_ai.sql`, or their feature directories.

---

## 3. Subsystem Architecture & Business Workflows

### 3.1 Customer Management & Customer Timeline

1. **Authoritative Customer Profile:**
   - Single source of truth for residential and commercial property owners.
   - Indexed by unique phone number and email.
   - Properties: Full Name, Primary Phone, Secondary Phone, Email, Preferred Contact Channel, Billing Address, Installation Site Address, Pincode, City, State, Landmark.
2. **Customer Lifecycle States:**
   `LEAD` ➔ `PROSPECT` ➔ `SURVEY_SCHEDULED` ➔ `SURVEY_COMPLETED` ➔ `QUOTED` ➔ `ORDER_CONFIRMED` ➔ `ACTIVE_PROJECT` ➔ `MAINTENANCE`
3. **Customer 360 Dossier:**
   - Unified API response aggregating: Contact Details, Active Enquiries, Scheduled/Historical Surveys, Quotations with BOM snapshots, Orders/Projects, Installed Equipment Serials, and Open Support Tickets.
4. **Append-Only Customer Timeline:**
   - Every operational touchpoint records a timestamped event into `customer_timeline`:
     - `ENQUIRY_RECEIVED`: Initial lead entry.
     - `LEAD_QUALIFIED`: Sales phone screening passed.
     - `SURVEY_BOOKED`: Technician slot assigned.
     - `SURVEY_SUBMITTED`: Measurements & photos uploaded.
     - `SURVEY_APPROVED`: Engineering clearance granted.
     - `QUOTE_GENERATED`: Pricing PDF delivered.
     - `QUOTE_ACCEPTED`: Customer digital sign-off.
     - `ORDER_CREATED`: Project handed over to Operations.

### 3.2 Enquiry Management & Deduplication Subsystem

1. **Lead Ingestion Sources:**
   - `WEB`: Homeowner fills public website enquiry form.
   - `WHATSAPP`: Sales rep manually logs inbound message.
   - `PHONE_CALL`: Inbound call logged via quick-intake dialog.
   - `REFERRAL`: Customer referral with referrer tracking.
   - `WALK_IN`: Office walk-in visitor.
2. **Enquiry Status State Machine:**
   `NEW` ➔ `CONTACTED` ➔ `QUALIFIED` | `DISQUALIFIED` | `MERGED`
3. **Automated Deduplication Protocol:**
   - Triggered on every new enquiry submission.
   - Match criteria:
     - Exact Phone Number match (`clean_phone(phone)`).
     - Exact Email match (case-insensitive).
   - If match found:
     - Enquiry created with `status = 'NEW'` and `duplicate_of_id = <original_enquiry_id>`.
     - Alert badge `[DUPLICATE DETECTED]` displayed on Sales Inbox.
     - Sales representative is presented with a side-by-side field comparison modal:
       - Option A: Merge into existing customer/enquiry (consolidates notes and updates latest requirements).
       - Option B: Mark as distinct (e.g., existing customer requesting a solar installation on a second property).
4. **Preliminary Lead Qualification Gate (BR-SRV-001):**
   - Before scheduling a costly physical site survey, sales representative conducts a telephone screening:
     - Shadow-free roof area >= 100 sq ft.
     - Average monthly electricity bill >= ₹1,500.
     - Grid connection status: Active connection, stable voltage, phase type (Single Phase / Three Phase).
   - If verified, `enquiry.status` advances to `QUALIFIED`, and `customer` record is created/linked.

### 3.3 Site Survey & Engineering Approval Subsystem

1. **Survey Scheduling & Slot Assignment:**
   - Only qualified leads can have surveys scheduled.
   - Technician workload checked against `users` (role `Technician`) to prevent double-booking.
   - Survey record created with `status = 'SCHEDULED'`.
2. **Mobile On-Site Execution Form:**
   - Used by technician directly on rooftop via mobile/tablet browser:
     - `roof_area_sqft`: Measured total roof area.
     - `shadow_free_sqft`: Usable unshaded area.
     - `roof_type`: `FLAT_RCC`, `SLOPED_METAL_SHEET`, `TILED`, `GROUND_MOUNT`.
     - `azimuth_degrees`: Compass orientation (0°–360°, optimum ~180° South in India).
     - `tilt_angle_degrees`: Inclination angle (10°–30° nominal range, validated 0°–90°).
     - `cable_run_meters`: Physical distance from panels to inverter/distribution box.
     - `grid_phase`: `SINGLE_PHASE`, `THREE_PHASE`.
     - `sanctioned_load_kw`: Utility sanctioned capacity from electricity bill.
     - `transformer_distance_meters`: Proximity to local distribution transformer.
3. **Cloudinary Mandatory Photo Proofs (REQ-CRM-005 / REQ-PLT-005):**
   - Minimum 2 mandatory photo slots before submission:
     1. `ROOF_PANORAMA`: Clear shot of entire rooftop space and sun path.
     2. `METER_BOARD`: Existing utility energy meter and main distribution breaker.
     3. `OBSTACLE_SHADOW` *(Optional)*: Nearby trees, parapets, or water tanks.
     4. `INVERTER_LOCATION` *(Optional)*: Proposed shaded indoor/outdoor inverter wall.
   - Direct-to-Cloudinary signed upload utilized (`folder = 'surveys'`).
4. **Engineering Review Gate (BR-SRV-002 / BR-SRV-003):**
   - Reviewer: Sales Manager or Engineering Lead (`Admin/Owner` or `Sales`).
   - Actions:
     - **APPROVE:** Sets `site_surveys.status = 'APPROVED'`. Unlocks Quotation Builder.
     - **REWORK:** Requires mandatory reason (min 10 characters). Sets `status = 'REWORK'`. Automatically re-routes back to technician's active job card. Quotation generation remains strictly locked.
     - **REJECT:** Feasibility failed (e.g., insufficient structural load bearing, heavy perpetual shading). Sets `status = 'REJECTED'`. Customer notified.

### 3.4 Solar Packages, Automated BOM & Quotation Engine

1. **Standard Packages Catalog (1 kW to 5 kW):**
   - SunPower Solutions sells standardized configurations by system capacity:
     - **Capacities:** 1.0 kW, 2.0 kW, 3.0 kW, 4.0 kW, 5.0 kW.
     - **Types:** `ON_GRID` (Grid-tied net metering, no battery) and `OFF_GRID` (Battery storage bank).
     - Total: 10 standard package configurations.
2. **Formulaic Automated BOM Derivation (BR-QTE-001):**
   - Sales representatives are strictly prohibited from typing component lists from memory. Selecting capacity and grid type derives exact parts:

| Capacity | Grid Type | PV Modules (Mono PERC 540W) | Inverter Specification | Mounting Structures | DC/AC Solar Cable | Safety / Earthing Kit | Battery Bank (Off-Grid Only) |
|---|---|---|---|---|---|---|---|
| **1 kW** | ON_GRID | 2x (1.08 kWp) | 1x 1 kW On-Grid String | 1 Set (2-panel rail) | 20 meters 4 sq mm | 1x Dual AC/DC SPD Box + 1 Rod | None |
| **1 kW** | OFF_GRID| 2x (1.08 kWp) | 1x 1.2 kVA Solar Hybrid| 1 Set (2-panel rail) | 20 meters 4 sq mm | 1x Dual AC/DC SPD Box + 1 Rod | 1x 12V 150Ah Tubular / LiFePO4 |
| **2 kW** | ON_GRID | 4x (2.16 kWp) | 1x 2 kW On-Grid String | 1 Set (4-panel rail) | 25 meters 4 sq mm | 1x Dual AC/DC SPD Box + 1 Rod | None |
| **2 kW** | OFF_GRID| 4x (2.16 kWp) | 1x 2.5 kVA Solar Hybrid| 1 Set (4-panel rail) | 25 meters 4 sq mm | 1x Dual AC/DC SPD Box + 1 Rod | 2x 12V 150Ah (24V Bank) |
| **3 kW** | ON_GRID | 6x (3.24 kWp) | 1x 3.3 kW On-Grid String | 2 Sets (6-panel rails)| 35 meters 6 sq mm | 2x Earthing Rods + Chemical Bag | None |
| **3 kW** | OFF_GRID| 6x (3.24 kWp) | 1x 3.5 kVA Solar Hybrid| 2 Sets (6-panel rails)| 35 meters 6 sq mm | 2x Earthing Rods + Chemical Bag | 4x 12V 150Ah (48V Bank) |
| **4 kW** | ON_GRID | 8x (4.32 kWp) | 1x 4.2 kW On-Grid String | 2 Sets (8-panel rails)| 40 meters 6 sq mm | 2x Earthing Rods + Chemical Bag | None |
| **4 kW** | OFF_GRID| 8x (4.32 kWp) | 1x 5.0 kVA Solar Hybrid| 2 Sets (8-panel rails)| 40 meters 6 sq mm | 2x Earthing Rods + Chemical Bag | 4x 12V 200Ah (48V Bank) |
| **5 kW** | ON_GRID | 10x (5.40 kWp)| 1x 5.0 kW On-Grid String | 3 Sets (10-panel rails)| 50 meters 6 sq mm | 2x Earthing Rods + Chemical Bag | None |
| **5 kW** | OFF_GRID| 10x (5.40 kWp)| 1x 6.0 kVA Solar Hybrid| 3 Sets (10-panel rails)| 50 meters 6 sq mm | 2x Earthing Rods + Chemical Bag | 8x 12V 150Ah (48V High-Capacity) |

3. **Dynamic Survey Adjustments:**
   - If surveyed cable distance (`cable_run_meters`) exceeds the standard package allocation (e.g. 55m measured vs 35m package default for 3 kW), the BOM engine automatically adds an extra cable line item: `Extra Solar DC Cable: 20 meters @ ₹75/m`.
4. **Quotation Pricing & Validity Rules:**
   - `hardware_subtotal`: Sum of all itemized BOM parts.
   - `installation_labor_cost`: Configured base installation charge.
   - `tax_amount`: Calculated according to configured tax slab `[NC-006]`.
   - `subsidy_estimate`: Informational subsidy rebate display `[NC-007]`.
   - `discount_amount`: Sales rep may grant up to 10% discount. Discounts > 10% require `Admin/Owner` cryptographic sign-off.
   - `valid_until`: Strict 15-day validity window (BR-QTE-003). Expired quotes cannot be accepted.
5. **Customer Digital Acceptance Gate (BR-QTE-002):**
   - Customer receives secure URL: `/portal/quotes/:token`.
   - Displays branded solar layout, BOM parts list, price breakdown, payment schedule, and terms.
   - Actions:
     - **ACCEPT:** Customer enters full legal name, confirms terms, signs digitally on canvas. Transitions quote to `ACCEPTED`, records IP address, timestamp, and signature hash.
     - **DECLINE:** Customer submits structured decline feedback (e.g., Price too high, Competitor chosen, Financing delayed).

### 3.5 Order Initialization & Operations Handover

1. **Order Creation Enforcement (BR-QTE-002):**
   - An Order and Project **CANNOT** be created from a Draft, Sent, Expired, or Declined quotation.
   - Quotation status must strictly equal `ACCEPTED`.
2. **Operations Handover Contract:**
   - Order creation initializes:
     - `orders` table entry (`status = 'PENDING_ADVANCE'`).
     - `projects` table entry (`stage = 'SURVEY_COMPLETED_PENDING_PAYMENT'`).
     - Frozen snapshot of accepted BOM items copied to `project_bom`.
     - Event emitted for Member 4: Razorpay advance payment order creation.
     - Handover payload exposed for Member 3: Warehouse inventory reservation and technician crew allocation.

---

## 4. Comprehensive API Specifications

All endpoints are prefixed with: `/api/v1/customer-sales`

### 4.1 Customer Management Endpoints

#### `POST /api/v1/customer-sales/customers`
- **Description:** Manually create a new customer profile.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:**
  ```json
  {
    "fullName": "Rajesh Patel",
    "phone": "+919876543210",
    "secondaryPhone": "+919876543211",
    "email": "rajesh.patel@example.com",
    "preferredContactChannel": "WHATSAPP",
    "billingAddress": "Flat 402, Shivalik Residency, Drive-In Road",
    "siteAddress": "Bungalow 12, Sunrise Park, Bodakdev",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "pincode": "380054",
    "landmark": "Near Sunrise Lake"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Customer created successfully",
    "data": {
      "id": "c1f2e3d4-0000-0000-0000-000000000001",
      "customerCode": "CUST-2026-0041",
      "fullName": "Rajesh Patel",
      "phone": "+919876543210",
      "email": "rajesh.patel@example.com",
      "city": "Ahmedabad",
      "state": "Gujarat",
      "status": "ACTIVE",
      "createdAt": "2026-10-31T08:00:00.000Z"
    }
  }
  ```
- **Error Codes:** `400 Bad Request` (Zod validation failed), `409 Conflict` (Phone number already registered).

#### `GET /api/v1/customer-sales/customers`
- **Description:** Search and filter customer directory.
- **Access:** Protected (`Admin/Owner`, `Sales`, `Support`).
- **Query Parameters:** `search`, `city`, `pincode`, `status`, `page`, `limit`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c1f2e3d4-0000-0000-0000-000000000001",
        "customerCode": "CUST-2026-0041",
        "fullName": "Rajesh Patel",
        "phone": "+919876543210",
        "email": "rajesh.patel@example.com",
        "city": "Ahmedabad",
        "pincode": "380054",
        "activeProjectsCount": 1,
        "createdAt": "2026-10-31T08:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
  ```

#### `GET /api/v1/customer-sales/customers/:id`
- **Description:** Retrieve 360 customer dossier including past enquiries, surveys, quotes, projects, serials, and tickets.
- **Access:** Protected (`Admin/Owner`, `Sales`, `Support`).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "customer": {
        "id": "c1f2e3d4-0000-0000-0000-000000000001",
        "customerCode": "CUST-2026-0041",
        "fullName": "Rajesh Patel",
        "phone": "+919876543210",
        "email": "rajesh.patel@example.com",
        "siteAddress": "Bungalow 12, Sunrise Park, Bodakdev",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380054"
      },
      "enquiries": [],
      "surveys": [],
      "quotations": [],
      "projects": [],
      "installedSerials": [],
      "serviceTickets": []
    }
  }
  ```

#### `GET /api/v1/customer-sales/customers/:id/timeline`
- **Description:** Retrieve chronological audit activity history for customer.
- **Access:** Protected (`Admin/Owner`, `Sales`, `Support`).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "t1-0000-0000-0000-000000000001",
        "eventType": "ENQUIRY_RECEIVED",
        "title": "Public Rooftop Enquiry Received",
        "description": "Customer requested 3 kW On-Grid system under PM Surya Ghar subsidy.",
        "actorName": "System",
        "metadata": { "enquiryId": "e1-0000..." },
        "createdAt": "2026-10-31T08:00:00.000Z"
      }
    ]
  }
  ```

---

### 4.2 Enquiry Management Endpoints

#### `POST /api/v1/customer-sales/public/enquiries`
- **Description:** Public web enquiry intake for homeowners. Anti-spam rate limited (5 submissions per 15 min per IP).
- **Access:** **Public** (No JWT required).
- **Request Body:**
  ```json
  {
    "fullName": "Anil Sharma",
    "phone": "+919825012345",
    "email": "anil.sharma@example.com",
    "address": "15 Green Valley Bungalows",
    "city": "Vadodara",
    "pincode": "390001",
    "monthlyElectricityBill": 3200,
    "preferredCapacityKw": 3.0,
    "preferredSystemType": "ON_GRID",
    "notes": "Interested in central government rooftop subsidy."
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Enquiry submitted successfully. A solar advisor will call you within 24 hours.",
    "data": {
      "enquiryId": "e1f2a3b4-0000-0000-0000-000000000001",
      "referenceNumber": "ENQ-2026-0089",
      "status": "NEW"
    }
  }
  ```
- **Error Codes:** `429 Too Many Requests`, `400 Bad Request` (Invalid phone, bill <= 0).

#### `GET /api/v1/customer-sales/enquiries`
- **Description:** Sales representative lead queue with status filter and duplicate flags.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Query Parameters:** `status` (`NEW`, `CONTACTED`, `QUALIFIED`, `DISQUALIFIED`, `MERGED`), `isDuplicate`, `search`, `assignedTo`.
- **Response `200 OK`:** Returns array of enquiries with duplicate references and assigned sales agent.

#### `PATCH /api/v1/customer-sales/enquiries/:id/assign`
- **Description:** Assign lead to a specific sales executive.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:** `{ "assignedUserId": "u1-0000-0000-0000-000000000001" }`
- **Response `200 OK`:** `{ "success": true, "message": "Enquiry assigned successfully" }`

#### `POST /api/v1/customer-sales/enquiries/:id/qualify`
- **Description:** Record telephone screening qualification checklist. Automatically creates a linked customer record if none exists.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:**
  ```json
  {
    "shadowFreeRoofSpaceSqFt": 250,
    "monthlyElectricityBill": 3200,
    "gridConnectionStable": true,
    "gridPhase": "SINGLE_PHASE",
    "qualificationDecision": "PASSED",
    "qualificationNotes": "RCC terrace with zero shading. Bill verified. Good candidate for 3 kW."
  }
  ```
- **Response `200 OK`:** Returns `{ "enquiryStatus": "QUALIFIED", "customerId": "c1f2e3d4-..." }`.
- **Business Rule:** Fails with `400 Bad Request` if `shadowFreeRoofSpaceSqFt < 100` or `monthlyElectricityBill < 1500` without manager override note.

#### `POST /api/v1/customer-sales/enquiries/:id/merge`
- **Description:** Merge duplicate enquiry into a primary enquiry/customer record.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:**
  ```json
  {
    "primaryEnquiryId": "e1-0000-0000-0000-000000000001",
    "mergeNotes": "Customer called again with same mobile number regarding commercial shed."
  }
  ```
- **Response `200 OK`:** Sets secondary enquiry `status = 'MERGED'` and updates primary record notes.

---

### 4.3 Site Survey Endpoints

#### `POST /api/v1/customer-sales/surveys/schedule`
- **Description:** Schedule on-site physical survey and assign field technician.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Business Rule (BR-SRV-001):** Lead must be in `QUALIFIED` status. Technician double-booking in chosen window returns `409 Conflict`.
- **Request Body:**
  ```json
  {
    "customerId": "c1f2e3d4-0000-0000-0000-000000000001",
    "enquiryId": "e1f2a3b4-0000-0000-0000-000000000001",
    "technicianId": "u2-0000-0000-0000-000000000002",
    "scheduledDate": "2026-11-03",
    "timeSlot": "10:00-12:00",
    "siteContactName": "Rajesh Patel",
    "siteContactPhone": "+919876543210",
    "schedulingNotes": "Customer prefers morning visit before office."
  }
  ```
- **Response `201 Created`:** Survey created in `SCHEDULED` status.

#### `POST /api/v1/customer-sales/surveys/:id/execute`
- **Description:** Technician submits rooftop measurements from mobile device.
- **Access:** Protected (`Technician`, `Admin/Owner`).
- **Request Body:**
  ```json
  {
    "roofAreaSqFt": 450,
    "shadowFreeSqFt": 350,
    "roofType": "FLAT_RCC",
    "azimuthDegrees": 180,
    "tiltAngleDegrees": 22,
    "cableRunMeters": 32,
    "gridPhase": "SINGLE_PHASE",
    "sanctionedLoadKw": 4.0,
    "transformerDistanceMeters": 45,
    "structuralCondition": "GOOD",
    "technicianNotes": "Parapet height is 3 ft. Sufficient anchor points for standard South-facing stands."
  }
  ```
- **Response `200 OK`:** Survey updated with measurements; status transitions to `SUBMITTED`.

#### `POST /api/v1/customer-sales/surveys/:id/photos`
- **Description:** Attach Cloudinary photo references to survey.
- **Access:** Protected (`Technician`, `Admin/Owner`).
- **Request Body:**
  ```json
  {
    "photos": [
      {
        "photoType": "ROOF_PANORAMA",
        "cloudinaryUrl": "https://res.cloudinary.com/sunpower/image/upload/v1730370000/surveys/roof_pano_01.jpg",
        "caption": "Full view of terrace facing South"
      },
      {
        "photoType": "METER_BOARD",
        "cloudinaryUrl": "https://res.cloudinary.com/sunpower/image/upload/v1730370000/surveys/meter_board_01.jpg",
        "caption": "Existing 1-phase digital meter board"
      }
    ]
  }
  ```
- **Business Rule:** Survey requires minimum 2 verified photo records.

#### `POST /api/v1/customer-sales/surveys/:id/approve`
- **Description:** Engineering review sign-off. Unlocks quotation creation.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:** `{ "reviewNotes": "Structural and shadow clearance approved for 3 kW On-Grid." }`
- **Response `200 OK`:** `status = 'APPROVED'`. Emits audit log.

#### `POST /api/v1/customer-sales/surveys/:id/rework`
- **Description:** Engineering requests technician rework.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:** `{ "reworkReason": "Cable path to ground floor meter board is unclear. Re-measure path avoiding lift room." }`
- **Business Rule (BR-SRV-003):** `reworkReason` must have `>= 10` characters. `status = 'REWORK'`.

#### `POST /api/v1/customer-sales/surveys/:id/reject`
- **Description:** Reject survey due to insurmountable site limitations.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:** `{ "rejectionReason": "Terrace has heavy tree shade on South and West; structural slab damaged." }`
- **Response `200 OK`:** `status = 'REJECTED'`.

---

### 4.4 Packages & Automated BOM Endpoints

#### `GET /api/v1/customer-sales/packages`
- **Description:** Retrieve standard solar package catalog (1 kW to 5 kW On/Off Grid).
- **Access:** Protected (`Admin/Owner`, `Sales`, `Technician`, `Support`).
- **Response `200 OK`:** Returns all 10 configurations with base pricing, hardware templates, and inverter ratings.

#### `POST /api/v1/customer-sales/quotations/generate-bom`
- **Description:** Calculate full parts list automatically from package capacity and survey cable length.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Request Body:**
  ```json
  {
    "packageId": "pkg-3kw-ongrid-uuid",
    "surveyId": "srv-0000-0000-0000-000000000001",
    "customizations": []
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "package": { "name": "3 kW On-Grid Solar System", "capacityKw": 3.0, "gridType": "ON_GRID" },
      "items": [
        { "category": "SOLAR_PANEL", "name": "540W Mono PERC Solar Panel", "sku": "PNL-540W", "quantity": 6, "unit": "NOS", "unitPrice": 12500, "totalPrice": 75000 },
        { "category": "INVERTER", "name": "3.3 kW On-Grid String Inverter", "sku": "INV-3.3KW-ON", "quantity": 1, "unit": "NOS", "unitPrice": 38000, "totalPrice": 38000 },
        { "category": "STRUCTURE", "name": "Galvanized Iron Module Mounting Structure (2-row)", "sku": "STR-3KW-GI", "quantity": 2, "unit": "SET", "unitPrice": 7500, "totalPrice": 15000 },
        { "category": "CABLE", "name": "4 sq mm Solar DC Copper Flexible Cable (Red/Black)", "sku": "CBL-4MM-DC", "quantity": 35, "unit": "METER", "unitPrice": 75, "totalPrice": 2625 },
        { "category": "ELECTRICAL", "name": "Dual Array AC/DC Distribution Box with SPD & MCB", "sku": "DB-ACDC-3KW", "quantity": 1, "unit": "NOS", "unitPrice": 6500, "totalPrice": 6500 },
        { "category": "SAFETY", "name": "Chemical Earthing Rod (17.2mm x 2m) with Compound Bag", "sku": "EARTH-ROD-CHEM", "quantity": 2, "unit": "SET", "unitPrice": 3200, "totalPrice": 6400 }
      ],
      "hardwareSubtotal": 143525
    }
  }
  ```

---

### 4.5 Quotation Management Endpoints

#### `POST /api/v1/customer-sales/quotations`
- **Description:** Construct and save a quotation based on an approved site survey.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Business Rule (BR-SRV-002):** Survey must be in `APPROVED` status. Disallowing quotes on draft/pending surveys with `403 Forbidden`.
- **Request Body:**
  ```json
  {
    "customerId": "c1f2e3d4-0000-0000-0000-000000000001",
    "surveyId": "srv-0000-0000-0000-000000000001",
    "packageId": "pkg-3kw-ongrid-uuid",
    "installationLaborCost": 15000,
    "discountAmount": 5000,
    "taxRatePercent": 12.0,
    "subsidyEstimatedAmount": 78000,
    "validityDays": 15,
    "notes": "Includes PM Surya Ghar subsidy assistance and net-metering liaisoning."
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "q1-0000-0000-0000-000000000001",
      "quotationNumber": "QTE-2026-0104",
      "version": 1,
      "status": "DRAFT",
      "hardwareSubtotal": 143525,
      "installationLaborCost": 15000,
      "discountAmount": 5000,
      "taxableAmount": 153525,
      "taxAmount": 18423,
      "grandTotal": 171948,
      "subsidyEstimatedAmount": 78000,
      "netCustomerPayable": 93948,
      "validUntil": "2026-11-15T23:59:59.000Z",
      "publicToken": "sec_tok_9b2d8f7e6a5c4b3a2f1e"
    }
  }
  ```

#### `POST /api/v1/customer-sales/quotations/:id/send`
- **Description:** Finalize draft and send quotation link/PDF to customer.
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Response `200 OK`:** Sets `quotations.status = 'SENT'`.

#### `GET /api/v1/customer-sales/public/quotations/:token`
- **Description:** Customer portal quote viewer accessed via cryptographically random token.
- **Access:** **Public** (token-secured).
- **Business Rule:** Non-confidential customer view. Strips cost prices and margins.

#### `POST /api/v1/customer-sales/public/quotations/:token/accept`
- **Description:** Customer accepts quotation and digitally signs on screen.
- **Access:** **Public** (token-secured).
- **Business Rule (BR-QTE-002 / BR-QTE-003):** Quote must not be expired. Advances quote to `ACCEPTED` and automatically triggers Order/Project Creation.
- **Request Body:**
  ```json
  {
    "acceptedByName": "Rajesh Patel",
    "acceptedByPhone": "+919876543210",
    "termsAccepted": true,
    "signatureDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "comments": "Please prioritize installation before Diwali."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Quotation accepted successfully. Sales Order and Project have been initialized.",
    "data": {
      "quotationId": "q1-0000-0000-0000-000000000001",
      "status": "ACCEPTED",
      "orderId": "ord-2026-0032",
      "projectCode": "PRJ-2026-0032"
    }
  }
  ```

#### `POST /api/v1/customer-sales/public/quotations/:token/decline`
- **Description:** Customer declines quotation.
- **Access:** **Public** (token-secured).
- **Request Body:**
  ```json
  {
    "declineReason": "PRICE_TOO_HIGH",
    "feedback": "Budget currently limited to ₹1,20,000."
  }
  ```
- **Response `200 OK`:** Sets `status = 'DECLINED'`.

---

### 4.6 Order Creation & Handover Endpoints

#### `POST /api/v1/customer-sales/orders/create-from-quote`
- **Description:** Explicit API trigger to initialize order from accepted quote (if not auto-spawned).
- **Access:** Protected (`Admin/Owner`, `Sales`).
- **Business Rule:** Fails with `400 Bad Request` if quote status != `ACCEPTED`.

#### `GET /api/v1/customer-sales/handover/:orderId`
- **Description:** Typed integration handover query consumed by Member 3 (Operations) and Member 4 (Finance).
- **Access:** Protected (`Admin/Owner`, `Sales`, `Warehouse`, `Support`).
- **Response `200 OK`:** Returns structured handover payload (see Section 6.2).

---

## 5. Proposed Database Architecture (`101_customer_sales.sql`)

```sql
-- ==============================================================================
-- Migration: 101_customer_sales.sql
-- Module: Customer & Sales (CRM, Surveys, Packages, Quotations, Orders)
-- Author: Member 2
-- Dependencies: 001_platform_foundation.sql (users, audit_logs)
-- ==============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE enquiry_source_enum AS ENUM ('WEB', 'WHATSAPP', 'PHONE_CALL', 'REFERRAL', 'WALK_IN');
    CREATE TYPE enquiry_status_enum AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'MERGED');
    CREATE TYPE survey_status_enum AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REWORK', 'REJECTED');
    CREATE TYPE roof_type_enum AS ENUM ('FLAT_RCC', 'SLOPED_METAL_SHEET', 'TILED', 'GROUND_MOUNT');
    CREATE TYPE system_type_enum AS ENUM ('ON_GRID', 'OFF_GRID');
    CREATE TYPE quote_status_enum AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVISED');
    CREATE TYPE order_status_enum AS ENUM ('PENDING_ADVANCE', 'ADVANCE_PAID', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'CANCELLED');
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

-- 3. CUSTOMER TIMELINE TABLE (Append-Only Event Ledger)
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
CREATE INDEX IF NOT EXISTS idx_site_surveys_scheduled_date ON site_surveys(scheduled_date);

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
    photo_type VARCHAR(50) NOT NULL CHECK (photo_type IN ('ROOF_PANORAMA', 'METER_BOARD', 'OBSTACLE_SHADOW', 'INVERTER_LOCATION', 'OTHER')),
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

-- 11. QUOTATION ITEMS TABLE (BOM Snapshot)
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

-- 13. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id UUID NOT NULL UNIQUE REFERENCES quotations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status order_status_enum NOT NULL DEFAULT 'PENDING_ADVANCE',
    total_contract_value NUMERIC(10,2) NOT NULL,
    advance_required_percent NUMERIC(4,2) NOT NULL DEFAULT 25.0,
    advance_required_amount NUMERIC(10,2) NOT NULL,
    advance_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_id ON orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

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
```

---

## 6. Module Integration Interfaces

### 6.1 Consumption of Member 1 (Platform Foundation) Primitives

1. **Database Access:**
   ```javascript
   import { db } from '../../db/index.js';
   const result = await db.query('SELECT * FROM customers WHERE id = $1', [customerId]);
   ```
2. **Authentication & RBAC:**
   ```javascript
   import { authenticate } from '../../middleware/auth.middleware.js';
   import { authorize, requirePermission } from '../../middleware/rbac.middleware.js';
   router.post('/customers', authenticate, authorize('Admin/Owner', 'Sales'), customerController.create);
   ```
3. **Payload Validation:**
   ```javascript
   import { validate } from '../../middleware/validate.middleware.js';
   router.post('/surveys/schedule', validate(scheduleSurveySchema), surveyController.schedule);
   ```
4. **Audit Logging Engine:**
   ```javascript
   import { recordAuditLog } from '../../shared/utils/auditLogger.js';
   await recordAuditLog({
     userId: req.user.id,
     action: 'SURVEY_APPROVED',
     entity: 'SITE_SURVEY',
     entityId: survey.id,
     newValues: { status: 'APPROVED', reviewerNotes },
     ipAddress: req.ip,
     userAgent: req.headers['user-agent']
   });
   ```
5. **Standardized Responses & Custom Errors:**
   ```javascript
   import { successResponse } from '../../shared/utils/response.js';
   import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
   ```
6. **Cloudinary Signed Media Uploads:**
   - Frontend invokes `POST /api/v1/media/sign-upload` with `{ "folder": "surveys" }`.
   - Resulting CDN secure URL is stored in `survey_photos.cloudinary_url`.

### 6.2 Handover Contract to Member 3 (Operations & Fulfilment)

When an accepted quotation initializes an Order and Project, Member 2 provides the following typed payload to Member 3's service interface:

```typescript
interface ProjectHandoverContract {
  orderId: string;             // UUID v4
  orderNumber: string;         // 'ORD-2026-0032'
  projectId: string;           // UUID v4
  projectCode: string;         // 'PRJ-2026-0032'
  customerId: string;
  customerName: string;
  customerPhone: string;
  installationAddress: string;
  city: string;
  pincode: string;
  systemSpecification: {
    capacityKw: number;        // e.g. 3.0
    gridType: 'ON_GRID' | 'OFF_GRID';
    packageCode: string;       // 'PKG-3KW-ON'
  };
  surveyParameters: {
    surveyId: string;
    roofType: string;
    azimuthDegrees: number;
    tiltAngleDegrees: number;
    cableRunMeters: number;
    gridPhase: string;
    surveyPhotoUrls: string[];
  };
  billOfMaterials: Array<{
    category: string;          // 'SOLAR_PANEL' | 'INVERTER' | 'BATTERY' | 'STRUCTURE' | 'CABLE' | 'ELECTRICAL'
    sku: string;               // e.g. 'PNL-540W'
    name: string;
    quantity: number;
    unit: string;
  }>;
  financialStatus: {
    totalContractValue: number;
    advanceRequiredPercent: number; // 25.0
    advanceRequiredAmount: number;
    paymentStatus: 'PENDING_ADVANCE';
  };
  handoverTimestamp: string;
}
```

---

## 7. Role-Based Permission Matrix for Customer & Sales

| Endpoint / Action | Public | Admin/Owner | Sales | Technician | Warehouse | Support |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `POST /public/enquiries` (Web intake) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /enquiries` (Lead queue) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `PATCH /enquiries/:id/assign` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /enquiries/:id/qualify` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /enquiries/:id/merge` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /customers` | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `POST /customers` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /customers/:id` (360 Dossier) | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `POST /surveys/schedule` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /surveys/:id/execute` (Mobile) | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `POST /surveys/:id/photos` | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `POST /surveys/:id/approve` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /surveys/:id/rework` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /surveys/:id/reject` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /packages` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /quotations/generate-bom` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /quotations` (Create quote) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /quotations/:id/send` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /public/quotations/:token` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /public/quotations/:token/accept` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /public/quotations/:token/decline`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /orders/create-from-quote` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /handover/:orderId` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 8. Needs Confirmation [NC] Items Register

All unconfirmed business policies are cataloged below with recommended defaults and explicit `[DEMO]` values:

| Item ID | Parameter Description | Specification Reference | Configurable Architectural Treatment | DEMO Default Value |
|---|---|---|---|---|
| **[NC-001]** | **Advance Payment Percentage** | Section 3: *"A customer usually pays an advance, or the full amount, before work starts."* | Stored in quotation record (`advance_required_percent`). Can be overridden per quote by Sales Manager. | **`[DEMO] 25% Advance Payment`** |
| **[NC-002]** | **Payment Gates & Milestone Enforcement** | Section 3: Dispatch occurs after payment; month-end checks. | Order payment milestone status: `PENDING_ADVANCE` blocks packing/dispatch. | **`[DEMO] 25% Pre-Dispatch + 75% Handover Sign-off`** |
| **[NC-006]** | **Tax & GST Configuration** | Section 3: Invoices to send; GST rates. | Quotation tax engine with configurable tax percentage. | **`[DEMO] Flat 12.0% GST (CGST 6% + SGST 6%)`** |
| **[NC-007]** | **Rooftop Subsidy Eligibility & Value** | Section 3: *"under the subsidy"*. | Package-level informational subsidy estimation. | **`[DEMO] PM Surya Ghar Scheme: 1kW=₹30k, 2kW=₹60k, 3kW-5kW=₹78k`** |
| **[NC-011]** | **Quotation Validity Window** | Industry practice; material price fluctuations. | Field `validity_days` in quotation generator. | **`[DEMO] 15 Calendar Days`** |
| **[NC-012]** | **Maximum Sales Rep Discount Cap** | Commercial margin protection. | Max allowable discount before requiring `Admin/Owner` authorization. | **`[DEMO] 10.0% Max Rep Discount`** |

---

## 9. Testing & Quality Assurance Plan

Every requirement in this contract maps to executable unit, integration, and security tests:

1. **Unit Tests (`server/test/customer-sales/`):**
   - `deduplication.test.js`: Phone formatting, duplicate matching on phone/email, merge conflict resolution.
   - `bomGenerator.test.js`: Derives exact parts for 1 kW to 5 kW On/Off Grid; adds extra cable when survey length exceeds package standard.
   - `quotationMath.test.js`: Tax calculation, subtotal, discount cap verification, net payable calculation.
2. **API Integration Tests (`server/test/customer-sales/api.test.js`):**
   - **BR-SRV-001:** Attempting to schedule a survey for an unqualified enquiry returns `400 Bad Request`.
   - **BR-SRV-002:** Attempting to generate a quotation for a survey with status `SCHEDULED`, `SUBMITTED`, or `REWORK` returns `403 Forbidden`.
   - **BR-SRV-003:** Marking survey as `REWORK` with reason `< 10` characters returns `400 Bad Request`.
   - **BR-QTE-002:** Attempting to create an order from a `DRAFT` or `SENT` quotation returns `400 Bad Request`.
   - **BR-QTE-003:** Customer accepting an expired quotation returns `400 Bad Request (QUOTE_EXPIRED)`.
   - **Happy Path:** Public enquiry ➔ Qualify ➔ Schedule survey ➔ Execute survey with photos ➔ Approve survey ➔ Generate quote with BOM ➔ Accept quote ➔ Order created.
3. **Security & Authorization Tests:**
   - Unauthenticated access to protected routes returns `401 Unauthorized`.
   - Field Technician trying to approve a survey returns `403 Forbidden`.
   - Warehouse user trying to view profit margins or generate quotes returns `403 Forbidden`.

---

## 10. Conclusion & Integration Readiness

This document defines the strict, unalterable interface contract for Member 2's implementation. Once approved by the Technical Lead, implementation will proceed systematically through Phases 1 to 5:
- **Phase 1:** Customer Registration, Search, Profile Dossier, and Timeline.
- **Phase 2:** Enquiry Ingestion, Deduplication, and Telephone Qualification.
- **Phase 3:** Site Survey Mobile Forms, Cloudinary Photo Proofs, and Approval Gates.
- **Phase 4:** Packages Catalog, Automated BOM Generator, and Quotation Acceptance.
- **Phase 5:** Order Creation and Operations Handover Contract.

**Module Status:** PHASE 0 CONTRACT COMPLETE. Standing by for Phase 1 implementation approval.
