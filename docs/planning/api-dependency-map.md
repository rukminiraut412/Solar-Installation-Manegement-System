# API DEPENDENCY MAP & CONTRACT SPECIFICATION
**Project:** Solar Installation Management System (SunPower Solutions)  
**Architecture:** Modular Monolith RESTful API (Express + PostgreSQL)  
**Standard Envelope:** JSON `{ success: boolean, data?: any, error?: { code: string, message: string, details?: any } }`  
**Document Version:** 1.0.0  

---

## 1. Global API Standards & Conventions

### 1.1 HTTP Status Codes
- `200 OK`: Request succeeded; returns data payload.
- `201 Created`: Resource successfully created (includes `Location` header or resource ID).
- `400 Bad Request`: Zod validation failure or malformed payload.
- `401 Unauthorized`: Missing, expired, or invalid JWT Bearer token.
- `403 Forbidden`: Authenticated user lacks required RBAC role or business state gate prevents action.
- `404 Not Found`: Targeted resource does not exist.
- `409 Conflict`: Unique constraint violation, duplicate serial scan, or double-booking.
- `422 Unprocessable Entity`: Business domain logic failure (e.g. failed safety thresholds).
- `429 Too Many Requests`: Rate limiter exceeded.
- `500 Internal Server Error`: Unhandled server exception (stack trace stripped in production).

### 1.2 Common Request Headers
- `Authorization`: `Bearer <jwt_access_token>` (Mandatory for authenticated routes).
- `Content-Type`: `application/json` (or `multipart/form-data` for direct media streams).
- `Idempotency-Key`: UUID v4 for financial and stock mutating endpoints.

---

## 2. API Endpoints by Feature Module

### MODULE 1: PLATFORM FOUNDATION, AUTH & SECURITY (MEMBER 1)

#### 1. POST /api/auth/login
- **Owner:** Member 1
- **Auth & RBAC:** Public (Unauthenticated)
- **Calling Frontend:** `LoginPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "email": "director@sunpower.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "usr_981a2b",
        "name": "SunPower Director",
        "email": "director@sunpower.com",
        "roles": ["Director"]
      }
    }
  }
  ```
  *(Refresh token set as HTTP-only secure cookie `refreshToken`)*
- **Error Codes:** 400 (Bad email/pass format), 401 (Invalid credentials), 429 (Rate limit).
- **Downstream Dependencies:** `users`, `refresh_tokens`, `audit_logs`.

#### 2. POST /api/auth/refresh
- **Owner:** Member 1
- **Auth & RBAC:** Cookie-based (`refreshToken`)
- **Calling Frontend:** Axios Interceptor (`client.js`)
- **Request:** Cookie payload with rotation token.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": { "accessToken": "eyJhbGciOiJIUzI1Ni..." }
  }
  ```
- **Error Codes:** 401 (Expired/invalid token), 403 (Token reuse detected; family revoked).
- **Downstream Dependencies:** `refresh_tokens`, `audit_logs`.

#### 3. GET /api/audit-logs
- **Owner:** Member 1
- **Auth & RBAC:** Authenticated; Role: `Director`
- **Calling Frontend:** `AuditLogView.jsx`
- **Query Params:** `?page=1&limit=50&actorId=...&entity=...&from=...&to=...`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "logs": [
        {
          "id": "aud_01",
          "actorId": "usr_981a2b",
          "actorName": "SunPower Director",
          "action": "SURVEY_APPROVED",
          "entityName": "site_surveys",
          "entityId": "srv_334",
          "oldState": { "status": "SUBMITTED" },
          "newState": { "status": "APPROVED" },
          "createdAt": "2026-10-31T12:00:00Z"
        }
      ],
      "pagination": { "total": 1420, "page": 1, "totalPages": 29 }
    }
  }
  ```
- **Downstream Dependencies:** `audit_logs` (read-only query).

#### 4. POST /api/media/sign-upload
- **Owner:** Member 1
- **Auth & RBAC:** Authenticated; Roles: All
- **Calling Frontend:** `PhotoUploader.jsx`
- **Request Body (Zod):**
  ```json
  {
    "folder": "installation_proof",
    "resourceType": "image"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "timestamp": 1793444400,
      "signature": "c8f2a1b9...",
      "apiKey": "cloudinary_api_key",
      "uploadUrl": "https://api.cloudinary.com/v1_1/sunpower/image/upload"
    }
  }
  ```
- **Downstream Dependencies:** Cloudinary SDK cryptographic signature generator.

---

### MODULE 2: CUSTOMER & SALES MANAGEMENT (MEMBER 2)

#### 5. POST /api/sales/public/enquiries
- **Owner:** Member 2
- **Auth & RBAC:** Public (Rate-limited: 5 requests/15m/IP)
- **Calling Frontend:** `PublicEnquiryForm.jsx`
- **Request Body (Zod):**
  ```json
  {
    "fullName": "Amit Patel",
    "phoneNumber": "9876543210",
    "email": "amit.patel@example.com",
    "address": "42 Surya Nagar, Near Main Water Tank",
    "pincode": "395007",
    "monthlyElectricityBill": 3200,
    "preferredSystemType": "ON_GRID",
    "sourceChannel": "WEB_FORM"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "data": {
      "enquiryId": "enq_7781",
      "referenceNumber": "SUN-ENQ-2026-7781",
      "status": "NEW"
    }
  }
  ```
- **Error Codes:** 400 (Invalid phone/bill), 429 (Rate limit).
- **Downstream Dependencies:** `enquiries`, duplicate checker, background SMS acknowledgment trigger.

#### 6. GET /api/sales/enquiries
- **Owner:** Member 2
- **Auth & RBAC:** Authenticated; Roles: `Sales`, `Director`
- **Calling Frontend:** `EnquiryInboxPage.jsx`
- **Query Params:** `?status=NEW&search=...&page=1&limit=25`
- **Response 200 OK:** List of enquiries with duplicate warning flags and preliminary qualification status.
- **Downstream Dependencies:** `enquiries`, `customers`.

#### 7. POST /api/sales/enquiries/:id/merge
- **Owner:** Member 2
- **Auth & RBAC:** Authenticated; Roles: `Sales`, `Director`
- **Calling Frontend:** `EnquiryInboxPage.jsx` (Merge Modal)
- **Request Body (Zod):**
  ```json
  {
    "targetCustomerId": "cust_101",
    "resolutionNotes": "Consolidated repeat inquiry from WhatsApp and web form."
  }
  ```
- **Response 200 OK:** Merged customer record with linked enquiry history.
- **Downstream Dependencies:** `enquiries`, `customers`, `audit_logs`.

#### 8. POST /api/sales/surveys/schedule
- **Owner:** Member 2
- **Auth & RBAC:** Authenticated; Roles: `Sales`, `Director`
- **Calling Frontend:** `SurveyScheduleModal.jsx`
- **Request Body (Zod):**
  ```json
  {
    "customerId": "cust_101",
    "technicianId": "tech_05",
    "scheduledDate": "2026-11-03T10:00:00Z",
    "roofAccessNotes": "Keys available with security guard. Flat RCC terrace."
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "data": {
      "surveyId": "srv_550",
      "status": "SCHEDULED",
      "assignedTechnician": "Rajesh Kumar"
    }
  }
  ```
- **Error Codes:** 400 (Customer not qualified), 409 (Technician slot conflict).
- **Downstream Dependencies:** `site_surveys`, `technician_assignments`, `customers`, `audit_logs`.

#### 9. POST /api/sales/surveys/:id/execute
- **Owner:** Member 2
- **Auth & RBAC:** Authenticated; Roles: `Technician`, `Director`
- **Calling Frontend:** `SiteSurveyExecutionForm.jsx`
- **Request Body (Zod):**
  ```json
  {
    "roofDirectionAzimuth": 180,
    "tiltAngleDegrees": 22.5,
    "shadowFreeAreaSqFt": 380,
    "cableDistanceMeters": 28,
    "roofType": "RCC_CONCRETE",
    "structuralIntegrity": "GOOD",
    "notes": "South-facing clear roof; minor chimney shadow on northwest corner."
  }
  ```
- **Response 200 OK:** Survey record updated with status = 'SUBMITTED'.
- **Downstream Dependencies:** `site_surveys`, `survey_measurements`, `audit_logs`.

#### 10. POST /api/sales/surveys/:id/approve (Review Gate)
- **Owner:** Member 2
- **Auth & RBAC:** Authenticated; Roles: `Sales`, `Director`
- **Calling Frontend:** `SurveyApprovalPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "decision": "APPROVED",
    "reviewNotes": "Structural strength adequate for 6 panels (3kW). Cable run within allowable limits."
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "surveyId": "srv_550",
      "status": "APPROVED",
      "approvedBy": "usr_sales_lead"
    }
  }
  ```
- **Error Codes:** 400 (Missing review notes), 422 (Survey missing required measurements/photos).
- **Downstream Dependencies:** `site_surveys`, `survey_reviews`, `audit_logs`.

#### 11. POST /api/sales/quotations/generate-bom
- **Owner:** Member 2
- **Auth & RBAC:** Authenticated; Roles: `Sales`, `Director`
- **Calling Frontend:** `QuotationBuilderPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "surveyId": "srv_550",
    "packageCapacityKw": 3.0,
    "gridType": "ON_GRID"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "packageTitle": "3 kW On-Grid Solar System",
      "bomItems": [
        { "sku": "PNL-MONO-540W", "name": "540W Monocrystalline Solar Panel", "quantity": 6, "unitPrice": 14000 },
        { "sku": "INV-3.3KW-ONGRID", "name": "3.3 kW Grid-Tied Inverter", "quantity": 1, "unitPrice": 38000 },
        { "sku": "MNT-ALU-STRUCTURE-3KW", "name": "Aluminium Mounting Structure Set", "quantity": 2, "unitPrice": 7500 },
        { "sku": "CBL-4SQMM-DC", "name": "4 sq mm Solar DC Copper Cable", "quantity": 35, "unitPrice": 85 },
        { "sku": "EARTH-KIT-COPPER", "name": "Safety Earthing Rod & Compound", "quantity": 2, "unitPrice": 3200 }
      ],
      "baseHardwareTotal": 174675,
      "installationLabor": 18000,
      "estimatedGst": 23121,
      "estimatedSubsidy": 78000,
      "netCustomerPayable": 137796
    }
  }
  ```
- **Downstream Dependencies:** `packages`, `package_components`, `products`.

#### 12. POST /api/sales/quotations
- **Owner:** Member 2
- **Auth & RBAC:** Authenticated; Roles: `Sales`, `Director`
- **Calling Frontend:** `QuotationBuilderPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "customerId": "cust_101",
    "surveyId": "srv_550",
    "packageCapacityKw": 3.0,
    "gridType": "ON_GRID",
    "bomItems": [...],
    "hardwareTotal": 174675,
    "laborTotal": 18000,
    "discountAmount": 0,
    "taxRatePercent": 12.0,
    "taxAmount": 23121,
    "grandTotal": 215796,
    "estimatedSubsidy": 78000,
    "validUntil": "2026-11-15T23:59:59Z"
  }
  ```
- **Response 201 Created:** Created quotation with secure public access token and PDF download URL.
- **Error Codes:** 403 (Survey not approved), 400 (Calculation mismatch).
- **Downstream Dependencies:** `quotations`, `quotation_items`, `quotation_versions`, `audit_logs`.

#### 13. POST /api/sales/public/quotations/:token/accept
- **Owner:** Member 2
- **Auth & RBAC:** Public (Cryptographic Token)
- **Calling Frontend:** `CustomerQuoteAcceptPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "customerSignatoryName": "Amit Patel",
    "acceptedTerms": true
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "quoteStatus": "ACCEPTED",
      "orderId": "ord_9901",
      "projectId": "prj_9901",
      "advanceRequiredPaise": 5394900,
      "message": "Quotation accepted. Order initialized. Proceed to advance payment."
    }
  }
  ```
- **Error Codes:** 400 (Quote expired or already accepted).
- **Downstream Dependencies:** `quotations`, `orders`, `projects`, `stock_reservations` trigger, `audit_logs`.

---

### MODULE 3: OPERATIONS, INVENTORY & FULFILMENT (MEMBER 3)

#### 14. POST /api/operations/inventory/receipts (GRN)
- **Owner:** Member 3
- **Auth & RBAC:** Authenticated; Roles: `Warehouse`, `Director`
- **Calling Frontend:** `StockReceiptPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "vendorName": "Luminous Solar Industries",
    "vendorInvoiceNumber": "LUM-INV-2026-904",
    "warehouseId": "wh_central",
    "items": [
      {
        "productId": "prd_inv_3.3kw",
        "quantity": 10,
        "unitCost": 35000,
        "serialNumbers": [
          "INV-33-2026-00101", "INV-33-2026-00102", "INV-33-2026-00103",
          "INV-33-2026-00104", "INV-33-2026-00105", "INV-33-2026-00106",
          "INV-33-2026-00107", "INV-33-2026-00108", "INV-33-2026-00109", "INV-33-2026-00110"
        ]
      }
    ]
  }
  ```
- **Response 201 Created:** GRN reference ID, inventory balances updated, 10 unique serial numbers registered.
- **Error Codes:** 409 (Duplicate serial number detected in database).
- **Downstream Dependencies:** `stock_receipts`, `inventory_ledger`, `serial_registry`, `audit_logs`.

#### 15. POST /api/operations/projects/:id/reserve-stock
- **Owner:** Member 3
- **Auth & RBAC:** Authenticated; Roles: `Warehouse`, `Director`, System
- **Calling Frontend:** Project Stock Card / Order Confirmation
- **Request Body:** `{}` (BOM components pulled automatically from Project)
- **Response 200 OK:** Stock reservation success or Shortage Flagged details.
- **Error Codes:** 409 Conflict with `{ shortageItems: [...] }`.
- **Downstream Dependencies:** `stock_reservations`, `inventory_ledger`.

#### 16. POST /api/operations/dispatch/:id/verify-serial
- **Owner:** Member 3
- **Auth & RBAC:** Authenticated; Roles: `Warehouse`
- **Calling Frontend:** `DispatchScannerPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "serialNumber": "INV-33-2026-00104",
    "productId": "prd_inv_3.3kw"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "serialNumber": "INV-33-2026-00104",
      "productName": "3.3 kW Grid-Tied Inverter",
      "status": "VERIFIED_FOR_DISPATCH",
      "scannedItemsCount": 1,
      "totalRequiredCount": 1
    }
  }
  ```
- **Error Codes:** 404 (Serial unknown), 400 (Wrong product model), 409 (Serial assigned elsewhere).
- **Downstream Dependencies:** `serial_registry`, `dispatch_items`.

#### 17. POST /api/operations/dispatch/:id/confirm
- **Owner:** Member 3
- **Auth & RBAC:** Authenticated; Roles: `Warehouse`
- **Calling Frontend:** `DispatchScannerPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "vehicleNumber": "GJ-05-BX-4412",
    "driverName": "Suresh Rathod",
    "driverPhone": "9825098250"
  }
  ```
- **Response 200 OK:** Dispatch confirmed; delivery challan generated; items marked 'IN_TRANSIT'.
- **Error Codes:** 400 (Unscanned serial slots remain).
- **Downstream Dependencies:** `dispatch_orders`, `inventory_ledger`, `serial_registry`, `audit_logs`.

#### 18. POST /api/operations/installations/:id/testing
- **Owner:** Member 3
- **Auth & RBAC:** Authenticated; Roles: `Technician`
- **Calling Frontend:** `GenerationTestingForm.jsx`
- **Request Body (Zod):**
  ```json
  {
    "gridVoltageVolts": 232.0,
    "vocVolts": 245.5,
    "activeGenerationKw": 2.85,
    "earthingResistanceOhms": 2.4,
    "testingInstrumentModel": "Fluke 1587 FC / Metravi Solar"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "testStatus": "PASSED",
      "message": "All parameters within safety thresholds. Ready for photo upload & handover."
    }
  }
  ```
- **Error Codes:** 422 (Earthing resistance > 5.0 Ohms or power = 0; status becomes 'FAILED_REWORK').
- **Downstream Dependencies:** `installation_tests`, `installation_jobs`, `audit_logs`.

#### 19. POST /api/operations/installations/:id/sign-handover
- **Owner:** Member 3
- **Auth & RBAC:** Authenticated; Roles: `Technician`, `Customer`
- **Calling Frontend:** `HandoverSignatureModal.jsx`
- **Request Body (Zod):**
  ```json
  {
    "customerSignatoryName": "Amit Patel",
    "relationship": "Property Owner",
    "signatureDataUrl": "data:image/png;base64,iVBORw0KGgo...",
    "customerConfirmationAcknowledged": true
  }
  ```
- **Response 200 OK:** Job completed; certificate generated; triggers automated warranty activation.
- **Error Codes:** 400 (Missing 4 photo angles, failed test, or blank signature).
- **Downstream Dependencies:** `installation_handover`, `installation_jobs`, `digital_signatures`, `warranty_records` activation, `audit_logs`.

---

### MODULE 4: SUPPORT, FINANCE & AI CAPABILITIES (MEMBER 4)

#### 20. POST /api/finance/payments/razorpay/create-order
- **Owner:** Member 4
- **Auth & RBAC:** Authenticated; Roles: `Customer`, `Sales`, `Finance`, `Director`
- **Calling Frontend:** `RazorpayCheckoutModal.jsx`
- **Request Body (Zod):**
  ```json
  {
    "projectId": "prj_9901",
    "milestoneType": "ADVANCE_PAYMENT",
    "amountPaise": 5394900
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "razorpayOrderId": "order_EKf345A67Z",
      "amount": 5394900,
      "currency": "INR",
      "keyId": "rzp_test_sunpower123"
    }
  }
  ```
- **Downstream Dependencies:** Razorpay Node.js SDK, `payments`, `payment_transactions`.

#### 21. POST /api/finance/payments/razorpay/verify
- **Owner:** Member 4
- **Auth & RBAC:** Authenticated; Roles: `Customer`, `Sales`, `Finance`
- **Calling Frontend:** `RazorpayCheckoutModal.jsx` (Client Checkout Callback)
- **Request Body (Zod):**
  ```json
  {
    "razorpayOrderId": "order_EKf345A67Z",
    "razorpayPaymentId": "pay_EKf789B12C",
    "razorpaySignature": "2f4e91b..."
  }
  ```
- **Response 200 OK:** Cryptographically verified; Order marked 'ADVANCE_PAID'.
- **Error Codes:** 400 (Invalid cryptographic HMAC signature).
- **Downstream Dependencies:** Crypto module, `payments`, `orders`, `audit_logs`.

#### 22. POST /api/finance/payments/razorpay/webhook
- **Owner:** Member 4
- **Auth & RBAC:** Public Webhook (HMAC Header `X-Razorpay-Signature`)
- **Calling Frontend:** Razorpay Webhook Gateway
- **Request Body:** Standard Razorpay Webhook JSON payload.
- **Response 200 OK:** `{ "status": "OK" }` (Processed or skipped duplicate).
- **Error Codes:** 400 (Invalid webhook secret signature).
- **Downstream Dependencies:** `payment_webhooks` (idempotency key: `event_id`), `payments`, `customer_ledger`.

#### 23. POST /api/support/tickets
- **Owner:** Member 4
- **Auth & RBAC:** Authenticated; Roles: `Support`, `Director`, `Customer`
- **Calling Frontend:** `SupportHelpdeskPage.jsx`
- **Request Body (Zod):**
  ```json
  {
    "customerPhone": "9876543210",
    "category": "INVERTER_FAULT",
    "faultCode": "E04",
    "description": "Inverter displays red blinking fault code E04 during rain and gives zero generation."
  }
  ```
- **Response 201 Created:** Ticket created; linked to installed inverter serial `INV-33-2026-00104`; warranty status resolved.
- **Downstream Dependencies:** `support_tickets`, `customers`, `serial_registry`, `warranty_records`.

#### 24. POST /api/support/tickets/:id/verify-warranty
- **Owner:** Member 4
- **Auth & RBAC:** Authenticated; Roles: `Support`, `Director`
- **Calling Frontend:** `TicketDetailPage.jsx`
- **Request Body:** `{}`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "ticketId": "tck_1102",
      "serialNumber": "INV-33-2026-00104",
      "warrantyStatus": "UNDER_WARRANTY",
      "warrantyEndDate": "2028-11-04T00:00:00Z",
      "daysRemaining": 734,
      "serviceBillableAmount": 0,
      "contractTerms": "Replacement and site visit 100% covered under manufacturer warranty."
    }
  }
  ```
- **Downstream Dependencies:** `warranty_records`, `support_tickets`.

#### 25. POST /api/ai/triage-ticket
- **Owner:** Member 4
- **Auth & RBAC:** Authenticated; Roles: `Support`, `Director`
- **Calling Frontend:** `TicketDetailPage.jsx` (AI Copilot Panel)
- **Request Body (Zod):**
  ```json
  {
    "ticketId": "tck_1102",
    "faultCode": "E04",
    "equipmentModel": "Luminous 3.3 kW Grid-Tied Inverter"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "groundedExplanation": "Fault code E04 indicates Grid Overvoltage Protection. The inverter automatically disconnected because AC grid voltage exceeded 255V.",
      "probableCauses": ["Local transformer tap setting high", "Phase imbalance on utility line during light neighborhood load"],
      "recommendedActions": ["Measure incoming AC grid voltage at ACDB", "Verify country code settings in inverter menu", "If grid voltage normal, inspect AC wiring for loose neutral"],
      "confidence": 0.95,
      "sourceDoc": "Luminous On-Grid Inverter Manual Rev 3.2, Section 8.4",
      "disclaimer": "AI suggestion for advisory assistance only. Must be verified by certified solar technician."
    }
  }
  ```
- **Downstream Dependencies:** Mock AI Provider / Knowledge Base, `ai_audit_logs`.

#### 26. GET /api/finance/analytics/projects/:id/profitability
- **Owner:** Member 4
- **Auth & RBAC:** Authenticated; Role: `Director` Only
- **Calling Frontend:** `ProjectProfitabilityPage.jsx`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "projectId": "prj_9901",
      "customerName": "Amit Patel",
      "capacityKw": 3.0,
      "contractRevenue": 215796,
      "settledInvoicedAmount": 215796,
      "hardwareBOMCost": 128400,
      "technicianLaborCost": 12500,
      "incidentalExpenses": 3200,
      "totalProjectCost": 144100,
      "netProfit": 71696,
      "netMarginPercent": 33.22,
      "marginHealth": "HEALTHY"
    }
  }
  ```
- **Error Codes:** 403 Forbidden (Non-director access).
- **Downstream Dependencies:** `v_project_profitability` view (`invoices`, `inventory_ledger`, `technician_timesheets`, `project_expenses`).

#### 27. GET /api/finance/dashboards/:role
- **Owner:** Member 4
- **Auth & RBAC:** Authenticated; Matching Role Required
- **Calling Frontend:** `DirectorDashboard.jsx`, `SalesDashboard.jsx`, `OperationsDashboard.jsx`, etc.
- **Response 200 OK:** Tailored metrics and Recharts chart datasets matching role authority.
- **Downstream Dependencies:** Analytical SQL queries across authoritative PostgreSQL tables.
