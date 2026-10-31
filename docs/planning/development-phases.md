# Solar Installation Management System
## Granular Phased Development Plan & Task Breakdown

**Document Version:** 1.0  
**Status:** Approved Architectural Baseline  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md` (§22 Phased Implementation Plan)  
**Total Phases:** 9 (Phase 0 to Phase 8 in strict dependency order)

---

## Phase 0: Platform Foundation & Architecture (Priority 0)
*Owner: Member 1 | Prerequisite: None*

### TASK-0.1: Project Scaffolding, Monolith Shell & Environment Validation
- **Exact Implementation Objective**: Initialize Vite React SPA, Express backend modular monolith, Tailwind CSS design system with SunPower tokens, and Zod environment variable validator.
- **Files Expected to be Created**:
  - `package.json`, `.gitignore`, `.env.example`, `vite.config.js`, `tailwind.config.js`
  - `backend/src/index.js`, `backend/src/app.js`
  - `backend/src/config/env.js`, `backend/src/config/constants.js`
  - `backend/src/middleware/error.middleware.js`
  - `backend/src/utils/response.js`, `backend/src/utils/logger.js`
  - `frontend/index.html`, `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/index.css`
- **Files Allowed to be Modified**: None.
- **Database Changes**: None.
- **API Changes**: `GET /api/v1/health` (returns `{ status: "ok", timestamp, version }`).
- **Frontend Screens**: Root empty shell with SunPower dark/light layout preview.
- **Business Rules**: Monolith architecture only (no microservices); server crashes immediately on boot if any required environment variable is missing or malformed.
- **Required Validations**: Zod schema validating `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- **Required Error States**: `500 CONFIG_ERROR` on boot; standard error envelope `{ error: { code, message, details, requestId } }`.
- **Authorization Requirements**: Public endpoint.
- **Audit Requirements**: Server startup and shutdown logged.
- **Test Cases**: `T-ENV-01` (missing env crashes server), `T-ENV-02` (health endpoint returns 200 OK).
- **Definition of Done**: Both frontend (`npm run dev`) and backend start cleanly; health check returns 200; Tailwind CSS builds with exact hex colors.
- **Dependencies**: None.

---

### TASK-0.2: PostgreSQL Connection Pool & Monotonic Migration Runner
- **Exact Implementation Objective**: Implement a robust PostgreSQL connection pool with transaction helper and a lightweight monotonic SQL migration runner.
- **Files Expected to be Created**:
  - `backend/src/config/database.js`
  - `backend/src/scripts/migrate.js`
  - `backend/src/migrations/001_foundation.sql`
- **Files Allowed to be Modified**: `backend/src/app.js`.
- **Database Changes**: Tables created: `users`, `roles`, `permissions`, `role_permissions`, `refresh_tokens`, `system_settings`, `audit_logs`, `status_history`, `idempotency_keys`.
- **API Changes**: None (Infrastructure).
- **Frontend Screens**: None.
- **Business Rules**: Migrations must be monotonically sequenced and recorded in `schema_migrations`; transactions must rollback cleanly on error.
- **Required Validations**: Database connection string syntax validation; connection retry with exponential backoff.
- **Required Error States**: `500 DATABASE_CONNECTION_FAILED`.
- **Authorization Requirements**: Internal DB engine.
- **Audit Requirements**: Migration executions recorded in schema table.
- **Test Cases**: `T-DB-01` (migration applies cleanly), `T-DB-02` (transaction rollback leaves DB unchanged on error).
- **Definition of Done**: `npm run db:migrate` runs cleanly; database tables exist in PostgreSQL with all indexes and check constraints.
- **Dependencies**: TASK-0.1.

---

### TASK-0.3: JWT Dual-Token Authentication & Password Hashing
- **Exact Implementation Objective**: Build secure login, token rotation, logout, and password reset endpoints using Argon2id/bcrypt and HTTP-only cookies.
- **Files Expected to be Created**:
  - `backend/src/modules/auth/auth.routes.js`, `auth.controller.js`, `auth.service.js`
  - `backend/src/middleware/auth.middleware.js`
  - `frontend/src/api/auth.api.js`
  - `frontend/src/pages/public/LoginPage.jsx` (`P-03`), `ForgotPassword.jsx` (`P-04`)
- **Files Allowed to be Modified**: `backend/src/app.js`, `frontend/src/App.jsx`.
- **Database Changes**: Populates `users` and `refresh_tokens`.
- **API Changes**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`.
- **Frontend Screens**: Login page (`P-03`), Forgot Password page (`P-04`).
- **Business Rules**: Access token 15 min lifetime; refresh token rotated on every use; cookie set with `httpOnly`, `Secure`, `SameSite=Strict`. Generic error messages (no account enumeration). 5 consecutive failures triggers 15-minute account lockout.
- **Required Validations**: Email format; password min 8 characters.
- **Required Error States**: 401 `INVALID_CREDENTIALS`, 429 `ACCOUNT_LOCKED`.
- **Authorization Requirements**: Public endpoints; refresh endpoint requires valid refresh cookie.
- **Audit Requirements**: Auth success, failure, lockout, and password reset logged to `audit_logs`.
- **Test Cases**: `T-AUTH-01` (valid login), `T-AUTH-02` (bad password returns generic 401), `T-AUTH-03` (refresh token rotation).
- **Definition of Done**: User can log in via UI, receive tokens, execute protected calls, refresh token, and log out with complete token invalidation.
- **Dependencies**: TASK-0.2.

---

### TASK-0.4: Dynamic RBAC Middleware & Permission Registry
- **Exact Implementation Objective**: Implement server-side permission check middleware and row-level access helpers for all 5 roles plus Customer portal.
- **Files Expected to be Created**:
  - `backend/src/middleware/rbac.middleware.js`
  - `backend/src/modules/auth/user.routes.js`, `user.controller.js`
  - `frontend/src/routes/ProtectedRoute.jsx`
- **Files Allowed to be Modified**: `backend/src/modules/auth/auth.routes.js`.
- **Database Changes**: Seeds `roles` (Admin, Sales, Warehouse, Technician, Support, Customer), `permissions`, and `role_permissions`.
- **API Changes**: `GET /me` (returns profile, role, and permission array).
- **Frontend Screens**: Route protection integration across shell.
- **Business Rules**: Token holds role; permissions queried dynamically on each request. Deny by default. Row-level filters: Technicians only see assigned jobs; customers only see own records.
- **Required Validations**: Permission string format `resource.action`.
- **Required Error States**: 401 `UNAUTHORIZED`, 403 `FORBIDDEN`.
- **Authorization Requirements**: Any authenticated user can call `/me`.
- **Audit Requirements**: Permission denials logged with user ID, attempted endpoint, and IP.
- **Test Cases**: `T-01` (calling unauthorized route returns 403 Forbidden).
- **Definition of Done**: `requirePermission('survey.approve')` blocks non-Admin users with 403; frontend dynamically adapts navigation.
- **Dependencies**: TASK-0.3.

---

### TASK-0.5: Append-Only Central Audit Logging & Status History Engine
- **Exact Implementation Objective**: Construct the immutable audit log and status history recording service.
- **Files Expected to be Created**:
  - `backend/src/modules/audit/audit.service.js`, `audit.controller.js`, `audit.routes.js`
  - `backend/src/middleware/audit.middleware.js`
  - `frontend/src/pages/staff/settings/AuditLogPage.jsx` (`S-108`)
- **Files Allowed to be Modified**: `backend/src/app.js`.
- **Database Changes**: Enforces trigger/rule preventing `UPDATE` or `DELETE` on `audit_logs`.
- **API Changes**: `GET /audit-logs` (Admin only).
- **Frontend Screens**: Audit Viewer (`S-108`) with filters by entity, actor, and date.
- **Business Rules**: All consequential actions must write an audit record with `old_value`, `new_value`, `reason`, and actor metadata. No hard deletes.
- **Required Validations**: Actor ID and entity type cannot be null.
- **Required Error States**: 403 Forbidden for non-Admin access.
- **Authorization Requirements**: Admin only.
- **Audit Requirements**: Self-auditing append-only engine.
- **Test Cases**: `T-49` (audit entry written on status change), `T-AUD-02` (direct SQL UPDATE on audit_logs fails).
- **Definition of Done**: Admin can browse complete, immutable audit logs; non-admins receive 403; database strictly prohibits log tampering.
- **Dependencies**: TASK-0.4.

---

### TASK-0.6: Cloudinary File Storage Service & Signed Parameter Provider
- **Exact Implementation Objective**: Implement direct-to-Cloudinary signed upload parameter generation and asset confirmation.
- **Files Expected to be Created**:
  - `backend/src/config/cloudinary.js`
  - `backend/src/modules/files/file.routes.js`, `file.controller.js`, `file.service.js`
  - `frontend/src/components/common/FileUpload.jsx`
- **Files Allowed to be Modified**: `backend/src/app.js`.
- **Database Changes**: Table `files` (provider_public_id, purpose, owner_entity_type, owner_entity_id, uploaded_by, bytes, mime).
- **API Changes**: `POST /files/sign-upload`, `POST /files/confirm`.
- **Frontend Screens**: Reusable photo and document upload UI with progress indicator and retry queue.
- **Business Rules**: Client never touches Cloudinary API Secret. Only allowed MIME types (`image/jpeg`, `image/png`, `application/pdf`). Max size: 10MB photos, 2MB signatures. Files referenced by provider public ID, delivered via signed temporary URLs.
- **Required Validations**: MIME type allowlist; file size limit check.
- **Required Error States**: 400 `INVALID_FILE_TYPE`, 400 `FILE_TOO_LARGE`.
- **Authorization Requirements**: Authenticated users.
- **Audit Requirements**: File uploads logged with purpose and owner entity.
- **Test Cases**: `T-FILE-01` (successful signed upload param generation), `T-FILE-02` (disallowed file type rejected).
- **Definition of Done**: Frontend uploads photo directly to Cloudinary using backend-signed token; backend confirms file record in database.
- **Dependencies**: TASK-0.4.

---

### TASK-0.7: System Settings Repository & Notification Outbox Fallback
- **Exact Implementation Objective**: Implement configuration key-value store for unconfirmed policy items [NC] and an in-app notification engine with simulated outbox.
- **Files Expected to be Created**:
  - `backend/src/modules/settings/settings.routes.js`, `settings.controller.js`, `settings.service.js`
  - `backend/src/modules/notifications/notification.routes.js`, `notification.controller.js`, `notification.service.js`
  - `frontend/src/pages/staff/settings/NotificationOutboxPage.jsx` (`S-109`)
- **Files Allowed to be Modified**: `backend/src/app.js`.
- **Database Changes**: Tables `system_settings`, `notifications`, `notification_outbox`.
- **API Changes**: `GET /settings/:group`, `PATCH /settings/:group`, `GET /notifications`, `PATCH /notifications/:id/read`, `GET /admin/notification-outbox`.
- **Frontend Screens**: Notification Outbox (`S-109`), header notification drawer.
- **Business Rules**: Settings manage [NC] items (advance %, payment gates, warranty start event). Modifications audited with old/new values. Notifications deliver in-app; external channels logged as `Simulated - not sent` in demo mode.
- **Required Validations**: Zod schema per settings group.
- **Required Error States**: 400 `INVALID_SETTINGS_PAYLOAD`.
- **Authorization Requirements**: Admin for settings; users for own notifications.
- **Audit Requirements**: Settings changes audited with actor ID and diff.
- **Test Cases**: `T-SET-01` (admin updates payment policy), `T-NOTIF-02` (simulated notification captured in outbox).
- **Definition of Done**: Settings can be updated via API/UI; in-app alerts trigger reliably; simulated messages appear in outbox.
- **Dependencies**: TASK-0.5.

---

### TASK-0.8: SunPower Shared Design System & Layout Shell
- **Exact Implementation Objective**: Build accessible shared React UI components adhering strictly to SunPower design tokens (§12.3) and application layout shells.
- **Files Expected to be Created**:
  - `frontend/src/components/common/Button.jsx`, `Input.jsx`, `Table.jsx`, `Badge.jsx`, `Modal.jsx`, `Card.jsx`, `SignaturePad.jsx`, `Skeleton.jsx`
  - `frontend/src/components/layout/PublicNavbar.jsx`, `StaffSidebar.jsx`, `PortalHeader.jsx`, `RoleLayout.jsx`
  - `frontend/src/pages/public/LandingPage.jsx` (`P-01`)
- **Files Allowed to be Modified**: `frontend/src/App.jsx`.
- **Database Changes**: None.
- **API Changes**: None.
- **Frontend Screens**: Landing Page (`P-01`), Staff Layout Shell, Customer Portal Shell.
- **Business Rules**: Strict token adherence (`--color-ink`: `#0B0D10`, `--color-charcoal`: `#1A1D23`, `--color-solar-blue`: `#1D6FE0`, etc.). Interactive elements require hover, focus-visible (2px outline), active, disabled, loading, and error states. Touch targets min 44x44px. Persistent demo banner displayed.
- **Required Validations**: Client-side WCAG contrast verification; keyboard operability.
- **Required Error States**: Empty state and loading skeleton support for all components.
- **Authorization Requirements**: Public landing page; role layouts wrapped in guards.
- **Audit Requirements**: None.
- **Test Cases**: `T-UI-01` (keyboard navigation through landing page), `T-UI-02` (interactive states present on all buttons).
- **Definition of Done**: High-aesthetic, responsive landing page and staff navigation shell operational with zero Tailwind styling warnings.
- **Dependencies**: TASK-0.1.

---

## Phase 1: Customer and Sales Management (Priority 1)
*Owner: Member 2 | Prerequisite: Phase 0*

### TASK-1.1: Public Enquiry Submission with Internal Duplicate Detection
- **Exact Implementation Objective**: Build the public enquiry intake form with IP rate limiting and backend duplicate matching.
- **Files Expected to be Created**:
  - `backend/src/migrations/020_customers_enquiries.sql`
  - `backend/src/modules/enquiries/enquiry.public.routes.js`, `enquiry.controller.js`, `enquiry.service.js`
  - `frontend/src/pages/public/EnquiryPage.jsx` (`P-02`)
  - `frontend/src/api/sales.api.js`
- **Files Allowed to be Modified**: None (routes mounted via Member 1 integration or modular router).
- **Database Changes**: Tables `customers`, `enquiries`. Indices on `phone_norm` and `email`.
- **API Changes**: `POST /public/enquiries`.
- **Frontend Screens**: Public Enquiry Form (`P-02`).
- **Business Rules**: Rate limit per IP; normalize phone to E.164; match existing phone/email; flag duplicate candidate internally without exposing customer data to the public; generate `ENQ-` and `CUS-` codes.
- **Required Validations**: Name (2–120 chars), valid phone or email, monthly bill ≥ 0, capacity > 0.
- **Required Error States**: 400 `VALIDATION_ERROR`, 429 `TOO_MANY_REQUESTS`.
- **Authorization Requirements**: Public.
- **Audit Requirements**: Enquiry creation logged with IP.
- **Test Cases**: `T-02` (duplicate phone flags duplicate enquiry), `T-03` (spam burst triggers rate limit).
- **Definition of Done**: Public user can submit enquiry, receive reference code, and view confirmation; database records lead and internal duplicate flag.
- **Dependencies**: TASK-0.4, TASK-0.7.

---

### TASK-1.2: Customer Directory, Profile 360 Timeline & Admin Merge
- **Exact Implementation Objective**: Implement staff customer management, unified customer timeline, duplicate review, and soft merge engine.
- **Files Expected to be Created**:
  - `backend/src/modules/customers/customer.routes.js`, `customer.controller.js`, `customer.service.js`
  - `frontend/src/pages/staff/customers/CustomerListPage.jsx` (`S-10`)
  - `frontend/src/pages/staff/customers/CustomerDetailPage.jsx` (`S-12`)
  - `frontend/src/pages/staff/customers/DuplicateMergePage.jsx` (`S-15`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Trigram index on `customers.full_name` and `address`.
- **API Changes**: `GET /customers`, `POST /customers`, `GET /customers/:id`, `PATCH /customers/:id`, `GET /customers/:id/timeline`, `POST /customers/:id/merge`.
- **Frontend Screens**: Customer List (`S-10`), Detail & Timeline (`S-12`), Merge (`S-15`).
- **Business Rules**: Creating customer with existing phone returns 409 unless link/override reason provided. Merging re-points all foreign keys, sets `merged_into_id`, preserves history, never deletes. Unified timeline aggregates enquiries, surveys, quotes, orders, jobs, warranties, and cases.
- **Required Validations**: Phone normalization; merge target != source.
- **Required Error States**: 409 `DUPLICATE_CANDIDATE`, 404 `CUSTOMER_NOT_FOUND`.
- **Authorization Requirements**: Sales/Support/Admin: Read/Write; Admin: Merge approval.
- **Audit Requirements**: Overrides and merges audited with Admin ID and reason.
- **Test Cases**: `T-CUS-02` (admin merge re-points linked records cleanly).
- **Definition of Done**: Staff can search customers, view full timeline, resolve duplicate candidates, and merge duplicates safely.
- **Dependencies**: TASK-1.1.

---

### TASK-1.3: Staff Enquiry Management & Repeat Lead Identification
- **Exact Implementation Objective**: Implement internal enquiry management, manual lead logging (WhatsApp/phone), and repeat enquiry tagging.
- **Files Expected to be Created**:
  - `backend/src/modules/enquiries/enquiry.routes.js`
  - `frontend/src/pages/staff/customers/EnquiryListPage.jsx` (`S-13`)
  - `frontend/src/pages/staff/customers/EnquiryDetailPage.jsx` (`S-14`)
- **Files Allowed to be Modified**: `backend/src/modules/enquiries/enquiry.controller.js`, `enquiry.service.js`.
- **Database Changes**: Column `enquiries.repeat_of_id`.
- **API Changes**: `GET /enquiries`, `POST /enquiries`, `GET /enquiries/:id`, `PATCH /enquiries/:id`, `POST /enquiries/:id/status`.
- **Frontend Screens**: Enquiry List (`S-13`), Enquiry Detail (`S-14`).
- **Business Rules**: Lead from existing customer within 30 days tagged `Repeat` and linked. Status changes: `New → Contacted → Survey Scheduled → ...`. Moving to `Lost` requires mandatory reason.
- **Required Validations**: Channel ∈ Website/Phone/WhatsApp; reason mandatory for Lost/Hold.
- **Required Error States**: 422 `REASON_REQUIRED`.
- **Authorization Requirements**: Sales, Admin.
- **Audit Requirements**: Status transitions and assignments recorded in `status_history`.
- **Test Cases**: `T-ENQ-02` (enquiry within 30 days tagged repeat), `T-ENQ-03` (lost status rejected without reason).
- **Definition of Done**: Staff can log phone/WhatsApp leads, assign enquiries, view repeat lead banners, and advance lead statuses.
- **Dependencies**: TASK-1.2.

---

### TASK-1.4: Site Survey Scheduling & Conflict Detection
- **Exact Implementation Objective**: Build site survey booking calendar with surveyor availability and conflict validation.
- **Files Expected to be Created**:
  - `backend/src/migrations/021_surveys.sql`
  - `backend/src/modules/surveys/survey.routes.js`, `survey.controller.js`, `survey.service.js`
  - `frontend/src/pages/staff/surveys/SurveyListPage.jsx` (`S-20`)
  - `frontend/src/pages/staff/surveys/SurveySchedulePage.jsx` (`S-21`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Table `surveys` (survey_code, enquiry_id, assigned_to, scheduled_at, status, revision_no).
- **API Changes**: `POST /surveys`, `GET /surveys`, `POST /surveys/:id/reschedule`.
- **Frontend Screens**: Survey List (`S-20`), Schedule Calendar (`S-21`).
- **Business Rules**: Customer address required before scheduling. Checks surveyor availability; blocks double booking with 409 Conflict. Moves enquiry to `Survey Scheduled`.
- **Required Validations**: Future timestamp; valid surveyor user ID.
- **Required Error States**: 409 `SURVEYOR_SCHEDULE_CONFLICT`, 422 `ADDRESS_REQUIRED`.
- **Authorization Requirements**: Sales, Admin.
- **Audit Requirements**: Scheduling and assignments audited.
- **Test Cases**: `T-SRV-01` (survey scheduled), `T-SRV-02` (overlapping schedule rejected 409).
- **Definition of Done**: Staff can schedule surveys without double-booking; enquiry status advances.
- **Dependencies**: TASK-1.3.

---

### TASK-1.5: Mobile Survey Capture & Field Submission
- **Exact Implementation Objective**: Create mobile-first survey entry form with physical parameter validation and photo upload.
- **Files Expected to be Created**:
  - `frontend/src/pages/staff/surveys/SurveyFormPage.jsx` (`S-22`)
- **Files Allowed to be Modified**: `backend/src/modules/surveys/survey.controller.js`, `survey.service.js`.
- **Database Changes**: CHECK constraint `(shadow_free_area_sqm <= roof_area_sqm)`. Table `files` linked.
- **API Changes**: `PATCH /surveys/:id`, `POST /surveys/:id/photos/sign`, `POST /surveys/:id/submit`.
- **Frontend Screens**: Mobile Survey Form (`S-22`).
- **Business Rules**: Surveyor can save partial drafts. Final submission blocked unless all technical parameters populated, shadow-free area ≤ roof area, and required photos uploaded. Submission advances survey to `Submitted` and enquiry to `Survey Under Review`.
- **Required Validations**: Roof area > 0; tilt 0–90°; shadow-free area ≤ roof area; cable distance ≥ 0; min 4 photos.
- **Required Error States**: 422 `SURVEY_INCOMPLETE` with missing fields list.
- **Authorization Requirements**: Assigned Surveyor, Admin.
- **Audit Requirements**: Survey submissions and photo additions audited.
- **Test Cases**: `T-SRV-04` (shadow-free > roof area fails), `T-SRV-05` (submit fails when photos missing).
- **Definition of Done**: Field surveyor fills mobile form, uploads photos, and submits findings with full physics validation.
- **Dependencies**: TASK-0.6, TASK-1.4.

---

### TASK-1.6: Survey Approval, Rejection & Revision Tracking
- **Exact Implementation Objective**: Implement administrative survey approval queue with mandatory rejection reasons and revision history.
- **Files Expected to be Created**:
  - `backend/src/modules/surveys/survey-review.service.js`
  - `frontend/src/pages/staff/surveys/SurveyApprovalPage.jsx` (`S-23`)
- **Files Allowed to be Modified**: `backend/src/modules/surveys/survey.routes.js`, `survey.controller.js`.
- **Database Changes**: Tables `survey_reviews`, `survey_revisions`.
- **API Changes**: `POST /surveys/:id/approve`, `POST /surveys/:id/reject`, `POST /surveys/:id/resubmit`.
- **Frontend Screens**: Survey Approval Queue (`S-23`).
- **Business Rules**: Rejection requires reason code and comment (≥ 10 chars), moving survey to `Rejected` / `Rework Required`. Resubmission creates revision snapshot (`revision_no + 1`) and returns to `Submitted`. Approval locks survey (`Approved`) and advances enquiry to `Survey Approved`. Approved survey is prerequisite for quotation.
- **Required Validations**: Rejection comment min 10 chars.
- **Required Error States**: 422 `REJECTION_REASON_REQUIRED`.
- **Authorization Requirements**: Admin: Approve/Reject; Surveyor: Resubmit.
- **Audit Requirements**: Approvals, rejections, and rework revisions audited.
- **Test Cases**: `T-05` (reject without reason blocked), `T-06` (rejection → rework → resubmit → approve cycle).
- **Definition of Done**: Admin reviews findings and approves/rejects; rework updates revision number; approved survey unlocks quote generation.
- **Dependencies**: TASK-1.5.

---

### TASK-1.7: Solar Packages & Compatibility Rule Engine
- **Exact Implementation Objective**: Build configuration for solar packages (1–5 kW, On/Off-Grid) and technical compatibility validation rules.
- **Files Expected to be Created**:
  - `backend/src/migrations/022_packages.sql`
  - `backend/src/modules/packages/package.routes.js`, `package.controller.js`, `package.service.js`
  - `backend/src/modules/packages/compatibility.engine.js`
  - `frontend/src/pages/staff/settings/PackageSettingsPage.jsx` (`S-100`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `solar_packages`, `package_bom_items`, `package_compat_rules`.
- **API Changes**: `GET /packages`, `POST /packages`, `PATCH /packages/:id`.
- **Frontend Screens**: Package Settings (`S-100`).
- **Business Rules**: On-Grid systems cannot have battery lines. Off-Grid systems MUST have battery and charge controller/hybrid inverter. Inverter capacity must cover system capacity.
- **Required Validations**: Package capacity range 1–5 kW.
- **Required Error States**: 422 `COMPATIBILITY_RULE_VIOLATION`.
- **Authorization Requirements**: Admin: Manage; Sales: Read.
- **Audit Requirements**: Package and rule modifications audited.
- **Test Cases**: `T-08` (off-grid without battery blocked by compatibility rule).
- **Definition of Done**: Packages configured with templates; compatibility engine evaluates equipment pairings accurately.
- **Dependencies**: TASK-0.7.

---

### TASK-1.8: Survey-Gated Quotation & Automatic BOM Generation
- **Exact Implementation Objective**: Implement quotation creation strictly gated by an approved survey, with automatic BOM line calculation.
- **Files Expected to be Created**:
  - `backend/src/migrations/023_quotations.sql`
  - `backend/src/modules/quotations/quotation.routes.js`, `quotation.controller.js`, `quotation.service.js`
  - `backend/src/modules/quotations/bom.engine.js`
  - `frontend/src/pages/staff/quotations/QuotationListPage.jsx` (`S-30`)
  - `frontend/src/pages/staff/quotations/QuotationCreatePage.jsx` (`S-31`)
  - `frontend/src/pages/staff/quotations/BOMReviewPage.jsx` (`S-32`)
  - `frontend/src/pages/staff/quotations/QuotationDetailPage.jsx` (`S-33`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `quotations`, `quotation_items`, `price_list_items`. Unique index `(enquiry_id, version)`.
- **API Changes**: `POST /quotations`, `GET /quotations/:id`, `PATCH /quotations/:id`, `POST /quotations/:id/bom/regenerate`, `PATCH /quotations/:id/items/:itemId`, `POST /quotations/:id/issue`.
- **Frontend Screens**: Quotation List (`S-30`), Create (`S-31`), BOM Review (`S-32`), Detail (`S-33`).
- **Business Rules**: **CRITICAL**: Creation strictly rejected unless survey is `Approved`. BOM generated via quantity rules (`CEIL_DIV_KW`, `PER_KW`, `FIXED`). Line adjustments record template variance. Issuance locks quotation and advances enquiry to `Quotation Issued`.
- **Required Validations**: Survey must be Approved; positive item quantities; discount > threshold requires Admin.
- **Required Error States**: 422 `SURVEY_NOT_APPROVED`, 422 `COMPATIBILITY_VIOLATION`.
- **Authorization Requirements**: Sales, Admin.
- **Audit Requirements**: Quotation issuance and manual BOM overrides audited.
- **Test Cases**: `T-07` / `AC-1` (quotation creation before survey approval returns 422 `SURVEY_NOT_APPROVED`), `T-BOM-01` (3 kW system generates 6 panels via CEIL_DIV_KW).
- **Definition of Done**: Quotation cannot be created without approved survey; BOM calculates automatically from package; line pricing itemized.
- **Dependencies**: TASK-1.6, TASK-1.7.

---

### TASK-1.9: Customer Quotation Acceptance & Order/Project Spawning
- **Exact Implementation Objective**: Enable customer quotation review/acceptance on portal and execute atomic creation of Order, Project, and frozen BOM snapshot.
- **Files Expected to be Created**:
  - `frontend/src/pages/portal/PortalQuotationPage.jsx` (`P-12`)
- **Files Allowed to be Modified**: `backend/src/modules/quotations/quotation.controller.js`, `quotation.service.js`.
- **Database Changes**: Creates records in `orders`, `projects`, and `project_bom_items` via cross-module contract.
- **API Changes**: `POST /quotations/:id/accept`, `POST /quotations/:id/decline`.
- **Frontend Screens**: Customer Portal Quotation View (`P-12`), Staff Quotation Detail (`S-33`).
- **Business Rules**: Customer (or Sales with evidence) accepts quotation. Single database transaction:
  1. Sets quotation to `Accepted`.
  2. Creates `orders` (`status = 'Created'`, `payment_status = 'Unpaid'`).
  3. Creates `projects` (`status = 'Created'`).
  4. Freezes snapshot of BOM lines into `project_bom_items`.
  5. Advances enquiry to `Converted to Order`.
  Accepted quotations are immutable. Decline requires reason.
- **Required Validations**: Quotation must not be expired.
- **Required Error States**: 409 `ALREADY_ACCEPTED`, 422 `QUOTATION_EXPIRED`.
- **Authorization Requirements**: Customer (own), Sales/Admin (with evidence).
- **Audit Requirements**: Quotation acceptance method, actor, and resulting Order/Project audited.
- **Test Cases**: `T-04` (happy path acceptance spawns order and project), `T-QUO-02` (expired quote acceptance fails).
- **Definition of Done**: Customer clicks Accept on portal; order and project records created atomically with frozen BOM snapshot.
- **Dependencies**: TASK-1.8.

---

## Phase 2: Operations and Fulfilment (Priority 2)
*Owner: Member 3 | Prerequisite: Phase 1*

### TASK-2.1: Product Catalog & Dual-State Stock Ledger
- **Exact Implementation Objective**: Implement products catalog and transactional stock movement ledger (`on_hand`, `reserved`, `available`).
- **Files Expected to be Created**:
  - `backend/src/migrations/040_inventory.sql`
  - `backend/src/modules/products/product.routes.js`, `product.controller.js`, `product.service.js`
  - `backend/src/modules/inventory/stock.routes.js`, `stock.controller.js`, `stock.service.js`
  - `frontend/src/pages/staff/inventory/InventoryOverviewPage.jsx` (`S-50`)
  - `frontend/src/pages/staff/inventory/ProductDetailPage.jsx` (`S-51`)
  - `frontend/src/api/operations.api.js`
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `products`, `stock_levels`, `stock_movements`. CHECK constraint `(on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand)`.
- **API Changes**: `GET /products`, `POST /products`, `GET /stock`, `GET /stock/movements`.
- **Frontend Screens**: Stock Overview (`S-50`), Product Detail & Movements (`S-51`).
- **Business Rules**: Available = on_hand - reserved. Database CHECK constraint strictly prevents negative on_hand or reserved > on_hand. Every stock alteration records a row in `stock_movements`.
- **Required Validations**: SKU unique; standard cost ≥ 0; positive movement quantities.
- **Required Error States**: 409 `SKU_EXISTS`, 422 `INVALID_STOCK_OPERATION`.
- **Authorization Requirements**: Warehouse, Admin: Full CRUD; Sales: Read availability.
- **Audit Requirements**: Every stock movement audited with actor, quantity, and reason.
- **Test Cases**: `T-STK-01` (stock movement updates on_hand and available), `T-STK-02` (reserving beyond on_hand throws DB check error).
- **Definition of Done**: Product catalog operational; movements update ledger transactionally; DB constraint prevents negative stock.
- **Dependencies**: TASK-0.4.

---

### TASK-2.2: Goods Receipt & Serial Number Registration
- **Exact Implementation Objective**: Ingest purchase receipts and register physical units into `serial_items`.
- **Files Expected to be Created**:
  - `backend/src/modules/inventory/receipt.service.js`
  - `frontend/src/pages/staff/inventory/GoodsReceiptPage.jsx` (`S-52`)
- **Files Allowed to be Modified**: `backend/src/modules/inventory/stock.routes.js`, `stock.controller.js`.
- **Database Changes**: Table `serial_items`. Unique index `(product_id, serial_number)`.
- **API Changes**: `POST /inventory/receipts`.
- **Frontend Screens**: Goods Receipt Form (`S-52`).
- **Business Rules**: For serialized products (Inverter, Battery, Panels), each unit gets a `serial_items` row with status `IN_STOCK`. Duplicate serial for same product strictly rejected by DB. Receipt increments `on_hand`.
- **Required Validations**: Supplier invoice non-empty; unit cost > 0; unique serials.
- **Required Error States**: 409 `SERIAL_ALREADY_EXISTS`.
- **Authorization Requirements**: Warehouse, Admin.
- **Audit Requirements**: Purchase receipts and serial ingestions audited.
- **Test Cases**: `T-12` (duplicate serial entry rejected with specific error), `T-STK-03` (goods receipt increments stock).
- **Definition of Done**: Warehouse staff can log receipts and scan/enter serial numbers; physical inventory registered in database.
- **Dependencies**: TASK-2.1.

---

### TASK-2.3: Project Stock Reservation & Shortage Handling
- **Exact Implementation Objective**: Implement payment-gated BOM material allocation and automated shortage flagging.
- **Files Expected to be Created**:
  - `backend/src/modules/inventory/allocation.service.js`
  - `frontend/src/pages/staff/inventory/ProjectMaterialsPage.jsx` (`S-53`)
- **Files Allowed to be Modified**: `backend/src/modules/inventory/stock.routes.js`, `stock.controller.js`.
- **Database Changes**: Tables `project_bom_items`, `stock_reservations`.
- **API Changes**: `POST /projects/:id/allocate`, `POST /projects/:id/reservations/release`.
- **Frontend Screens**: Project BOM Readiness (`S-53`).
- **Business Rules**: Allocation blocked unless order payment gate is met or policy exception approved. Reserves `min(required, available)`. Shortages flagged as `Short` with shortfall count; notifies Warehouse/Admin. Dispatch beyond reserved quantity blocked.
- **Required Validations**: Project ID valid; order confirmed or exception exists.
- **Required Error States**: 422 `PAYMENT_GATE_NOT_MET`, 422 `INSUFFICIENT_STOCK`.
- **Authorization Requirements**: Warehouse, Admin.
- **Audit Requirements**: Reservations and shortages audited.
- **Test Cases**: `T-09` (dispatch blocked when stock insufficient), `T-RES-01` (shortage flagged when stock deficient).
- **Definition of Done**: Project BOM allocates available stock when payment gate passes; shortages flagged clearly on UI.
- **Dependencies**: TASK-1.9, TASK-2.1.

---

### TASK-2.4: Dispatch Workflow & Serial Scanning Verification
- **Exact Implementation Objective**: Build dispatch note management and pre-dispatch barcode/serial number verification scanning.
- **Files Expected to be Created**:
  - `backend/src/migrations/041_dispatches.sql`
  - `backend/src/modules/dispatches/dispatch.routes.js`, `dispatch.controller.js`, `dispatch.service.js`
  - `frontend/src/pages/staff/inventory/DispatchListPage.jsx` (`S-54`)
  - `frontend/src/pages/staff/inventory/SerialScanDispatchPage.jsx` (`S-55`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `dispatches`, `dispatch_items`, `dispatch_serials`. Partial unique index `unique(serial_item_id) WHERE released_at IS NULL`.
- **API Changes**: `POST /dispatches`, `POST /dispatches/:id/scan`, `DELETE /dispatches/:id/scan/:serial`, `POST /dispatches/:id/confirm`.
- **Frontend Screens**: Dispatch List (`S-54`), Serial Scanning & Dispatch Screen (`S-55`).
- **Business Rules**:
  1. Serial scan validates: exists, product matches BOM line, status `IN_STOCK`/`RESERVED` for this project, not active elsewhere.
  2. Database row lock on `serial_items` prevents concurrent duplicate scanning.
  3. Dispatch confirmation blocked until scanned count equals required quantity for all serialized items.
  4. Confirmation advances serials to `DISPATCHED`, writes movements, and creates warranty records in `Pending Activation`.
- **Required Validations**: Scan counts must equal BOM line quantities.
- **Required Error States**: 422 `SERIAL_UNKNOWN`, 422 `SERIAL_ALREADY_ASSIGNED`, 422 `SERIAL_WRONG_PRODUCT`, 422 `SCAN_COUNT_MISMATCH`.
- **Authorization Requirements**: Warehouse. Admin: override.
- **Audit Requirements**: Scans, unscans, and dispatch confirmations audited.
- **Test Cases**: `T-10` (scan serial assigned to another project rejected), `T-11` (concurrent scan race condition handled by DB lock), `T-13` (confirmation blocked on count mismatch).
- **Definition of Done**: Warehouse scans serials per BOM line; validation rejects mismatches; confirmation links serials and creates pending warranties.
- **Dependencies**: TASK-2.2, TASK-2.3.

---

### TASK-2.5: Site Delivery Confirmation & Warranty Activation Trigger
- **Exact Implementation Objective**: Implement equipment arrival confirmation at installation site, triggering warranty timeline activation.
- **Files Expected to be Created**:
  - `backend/src/modules/dispatches/delivery.service.js`
- **Files Allowed to be Modified**: `backend/src/modules/dispatches/dispatch.routes.js`, `dispatch.controller.js`.
- **Database Changes**: Updates `dispatches.delivered_at` and `serial_items.status = 'DELIVERED'`.
- **API Changes**: `POST /dispatches/:id/deliver`.
- **Frontend Screens**: Dispatch Detail Delivery Confirmation button.
- **Business Rules**: Sets `delivered_at`. Under default rule (`warranty_start_event = 'DELIVERY'` [SRC]), triggers `WarrantyService.activateForProject()`: moves records to `Active`, computes `end_date = delivered_at + duration_months`.
- **Required Validations**: Dispatch must be in `Dispatched` status; timestamp <= current time.
- **Required Error States**: 400 `INVALID_DISPATCH_STATUS`.
- **Authorization Requirements**: Warehouse, Assigned Technician, Admin.
- **Audit Requirements**: Delivery confirmation and warranty activations audited.
- **Test Cases**: `T-17` (delivery confirmation sets start_date = delivered_at and activates warranty records).
- **Definition of Done**: Delivery confirmed at site; equipment status updated; warranty records activated automatically.
- **Dependencies**: TASK-2.4.

---

### TASK-2.6: Warehouse Exceptions: Returns, Damage & Stock Corrections
- **Exact Implementation Objective**: Implement site returns, damage quarantine, and administrative write-off workflow.
- **Files Expected to be Created**:
  - `backend/src/modules/inventory/exceptions.service.js`
  - `frontend/src/pages/staff/inventory/InventoryExceptionsPage.jsx` (`S-56`)
- **Files Allowed to be Modified**: `backend/src/modules/inventory/stock.routes.js`, `stock.controller.js`.
- **Database Changes**: Table `stock_exceptions` (type, product_id, serial_item_id, qty, reason, photo_file_id, status, approved_by).
- **API Changes**: `POST /stock-exceptions`, `POST /stock-exceptions/:id/approve`.
- **Frontend Screens**: Inventory Exceptions Screen (`S-56`).
- **Business Rules**: Returned serial from site moves to `RETURNED_QC`. Damage reporting requires photo and reason. Admin approval required for write-offs, updating stock movements and posting cost entry to project.
- **Required Validations**: Reason ≥ 10 chars; photo required for damage.
- **Required Error States**: 422 `REASON_REQUIRED`, 422 `PHOTO_REQUIRED`.
- **Authorization Requirements**: Warehouse/Technician: Submit; Admin: Approve write-off.
- **Audit Requirements**: Damage reports and write-off approvals audited.
- **Test Cases**: `T-EXC-01` (damage reported requires admin approval before inventory write-off).
- **Definition of Done**: Site returns quarantined; damaged goods require photo and Admin approval before write-off.
- **Dependencies**: TASK-0.6, TASK-2.1.

---

### TASK-2.7: Serial Number Traceability (Roof-to-Warehouse)
- **Exact Implementation Objective**: Build unified serial number lifecycle audit page showing unbroken chain of custody.
- **Files Expected to be Created**:
  - `backend/src/modules/inventory/trace.service.js`
  - `frontend/src/pages/staff/inventory/SerialTracePage.jsx` (`S-57`)
- **Files Allowed to be Modified**: `backend/src/modules/inventory/stock.routes.js`, `stock.controller.js`.
- **Database Changes**: Query joins across movements, serials, dispatches, jobs, warranties, and tickets.
- **API Changes**: `GET /serials/:serial/trace`.
- **Frontend Screens**: Serial Trace Screen (`S-57`).
- **Business Rules**: Serial lookup displays complete chronological lineage: purchase invoice → project reservation → dispatch scan → rooftop installation → warranty record → service tickets.
- **Required Validations**: Serial number format.
- **Required Error States**: 404 `SERIAL_NOT_FOUND`.
- **Authorization Requirements**: Admin, Warehouse, Support: Full trace; Sales: Limited.
- **Audit Requirements**: Serial trace lookups logged.
- **Test Cases**: `T-TRACE-01` / `AC-3` (serial lookup shows unbroken lineage from supplier to roof).
- **Definition of Done**: Searching any serial displays complete history across all business modules in under 500ms.
- **Dependencies**: TASK-2.4.

---

### TASK-2.8: Technician Profiles & Unavailability Scheduling
- **Exact Implementation Objective**: Manage technician profiles, skills, service areas, and leave/unavailability blocks.
- **Files Expected to be Created**:
  - `backend/src/migrations/042_technicians.sql`
  - `backend/src/modules/technicians/technician.routes.js`, `technician.controller.js`, `technician.service.js`
  - `frontend/src/pages/staff/technicians/TechnicianListPage.jsx` (`S-60`)
  - `frontend/src/pages/staff/technicians/TechnicianSchedulePage.jsx` (`S-61`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `technicians`, `technician_unavailability`.
- **API Changes**: `GET /technicians`, `PATCH /technicians/:id`, `GET /technicians/:id/unavailability`, `POST /technicians/:id/unavailability`.
- **Frontend Screens**: Technician Directory (`S-60`), Availability Scheduler (`S-61`).
- **Business Rules**: Cost rate visible to Admin only. Daily job limits enforced. Scheduler checks leave blocks before assignment.
- **Required Validations**: Unavailability start < end; non-negative cost rate.
- **Required Error States**: 422 `INVALID_DATE_RANGE`.
- **Authorization Requirements**: Admin: Full CRUD; Technician: Update own leave.
- **Audit Requirements**: Profile updates and leave bookings audited.
- **Test Cases**: `T-TECH-01` (technician cannot be scheduled during logged unavailability window).
- **Definition of Done**: Technician skills and leave managed; schedule view displays blocked dates.
- **Dependencies**: TASK-0.4.

---

### TASK-2.9: Installation Job Scheduling & Multi-Technician Crew Assignment
- **Exact Implementation Objective**: Create installation jobs and dispatch multi-technician crews (Lead and Helpers) with conflict detection.
- **Files Expected to be Created**:
  - `backend/src/migrations/043_installation_jobs.sql`
  - `backend/src/modules/installation-jobs/job.routes.js`, `job.controller.js`, `job.service.js`
  - `frontend/src/pages/staff/technicians/JobListPage.jsx` (`S-62`)
  - `frontend/src/pages/staff/technicians/JobDetailPage.jsx` (`S-63`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `installation_jobs`, `job_assignments`, `job_reschedules`.
- **API Changes**: `POST /jobs`, `POST /jobs/:id/assign`, `POST /jobs/:id/reschedule`.
- **Frontend Screens**: Job List (`S-62`), Job Detail (`S-63`).
- **Business Rules**: Job creation checks project readiness (materials dispatched/ready). Assigns Lead and Helpers. Overlapping technician assignments rejected with 409 Conflict. Rescheduling records reason and requester.
- **Required Validations**: At least one Lead technician required; scheduled start < end.
- **Required Error States**: 409 `TECHNICIAN_OVERLAP_CONFLICT`, 422 `LEAD_TECHNICIAN_REQUIRED`.
- **Authorization Requirements**: Admin: Create/Assign; Technician: Read assigned jobs only.
- **Audit Requirements**: Job assignments and rescheduling audited.
- **Test Cases**: `T-JOB-01` (assigning technician to two concurrent jobs returns 409 Conflict).
- **Definition of Done**: Installation jobs dispatched to available crews; double bookings blocked; technicians see only assigned jobs.
- **Dependencies**: TASK-2.4, TASK-2.8.

---

### TASK-2.10: Mobile Installation Workflow, Testing Checklist & Signature
- **Exact Implementation Objective**: Build mobile installation workflow with clock-in/out, photos, commissioning test checklist, and customer signature capture.
- **Files Expected to be Created**:
  - `backend/src/modules/installation-jobs/completion.validator.js`
  - `frontend/src/pages/staff/technicians/MobileWorkPage.jsx` (`S-64`)
  - `frontend/src/pages/staff/technicians/CompletionReviewPage.jsx` (`S-65`)
- **Files Allowed to be Modified**: `backend/src/modules/installation-jobs/job.routes.js`, `job.controller.js`, `job.service.js`.
- **Database Changes**: Tables `job_time_entries`, `job_photos`, `test_templates`, `test_results`, `signatures`.
- **API Changes**: `POST /jobs/:id/start`, `POST /jobs/:id/time-entries`, `POST /jobs/:id/photos/sign`, `PUT /jobs/:id/system-details`, `PUT /jobs/:id/tests`, `POST /jobs/:id/signature`, `POST /jobs/:id/complete`.
- **Frontend Screens**: Mobile Installation Workflow (`S-64`), Admin Completion Review (`S-65`).
- **Business Rules**:
  1. Completion strictly BLOCKED unless: actual start/end times recorded, all photo categories uploaded, system details match dispatch, test checklist complete and PASSED, and customer digital signature captured.
  2. Failed test sets status to `Rework Required` and blocks completion until rework passes.
  3. Completion moves job to `Completed` and order to `Installed`.
- **Required Validations**: Signature payload non-empty; all test items passed.
- **Required Error States**: 422 `COMPLETION_INCOMPLETE` with list of missing items.
- **Authorization Requirements**: Assigned Technician, Admin.
- **Audit Requirements**: Working hours, test results, signatures, and completions audited.
- **Test Cases**: `T-14` / `AC-4` (completion rejected with missing items list), `T-15` (failed test sets Rework Required).
- **Definition of Done**: Mobile crew executes workflow, passes electrical tests, captures signature, and completes job with zero missing requirements.
- **Dependencies**: TASK-0.6, TASK-2.9.

---

### TASK-2.11: Configurable Warranty Terms & Authoritative Warranty Records
- **Exact Implementation Objective**: Implement multi-party warranty terms management (Manufacturer vs Installer) and active warranty record tracking.
- **Files Expected to be Created**:
  - `backend/src/migrations/044_warranties.sql`
  - `backend/src/modules/warranties/warranty.routes.js`, `warranty.controller.js`, `warranty.service.js`
  - `frontend/src/pages/staff/settings/WarrantySettingsPage.jsx` (`S-102`)
  - `frontend/src/pages/staff/warranty/WarrantyListPage.jsx` (`S-70`)
  - `frontend/src/pages/staff/warranty/WarrantyDetailPage.jsx` (`S-71`)
  - `frontend/src/pages/portal/PortalWarrantiesPage.jsx` (`P-14`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `warranty_terms`, `warranty_records`. Index on `serial_item_id`.
- **API Changes**: `GET /warranties`, `GET /warranties/:id`, `POST /warranties/:id/void`, `POST /settings/warranty`.
- **Frontend Screens**: Warranty Terms Settings (`S-102`), Warranty Search & Detail (`S-70`, `S-71`), Portal Warranties (`P-14`).
- **Business Rules**: Sample durations: Inverter (24 mos), Battery (24 mos), Panels (240 mos). Terms changes apply only to future records. Start date derived from configured event (`DELIVERY` default); end date = start date + duration. Admin void requires reason.
- **Required Validations**: Duration > 0; void reason mandatory.
- **Required Error States**: 422 `VOID_REASON_REQUIRED`.
- **Authorization Requirements**: Support/Admin: Manage; Customer: View own.
- **Audit Requirements**: Terms changes, activations, and voids audited.
- **Test Cases**: `T-16` (warranty records created with correct dates), `T-WAR-02` (voiding requires admin reason).
- **Definition of Done**: Warranty records tracked per serial unit with party badges; customer portal displays active warranties.
- **Dependencies**: TASK-2.4, TASK-2.5.

---

### TASK-2.12: Authoritative Backend Warranty Eligibility Evaluator
- **Exact Implementation Objective**: Build deterministic backend warranty eligibility evaluator returning explicit result codes.
- **Files Expected to be Created**:
  - `backend/src/modules/warranties/eligibility.service.js`
- **Files Allowed to be Modified**: `backend/src/modules/warranties/warranty.routes.js`, `warranty.controller.js`.
- **Database Changes**: None.
- **API Changes**: `POST /warranties/eligibility`.
- **Frontend Screens**: Warranty Detail Eligibility Panel (`S-71`).
- **Business Rules**: Evaluates claim date against active record:
  - `WITHIN_PERIOD`: Active and start_date <= claim_date <= end_date (shows remaining days/months).
  - `EXPIRED`: Active and claim_date > end_date.
  - `NOT_ACTIVE`: Pending Activation or start_date in future.
  - `VOID`: Status Void.
  - `NO_RECORD`: No record located.
- **Required Validations**: Serial number or customer ID provided.
- **Required Error States**: 400 `MISSING_LOOKUP_PARAM`.
- **Authorization Requirements**: Support, Admin, Customer (own).
- **Audit Requirements**: Eligibility evaluations logged during claim creation.
- **Test Cases**: `T-16` / `AC-5` (18-month inverter claim returns `WITHIN_PERIOD`; 30-month returns `EXPIRED`).
- **Definition of Done**: Evaluator returns 100% deterministic result codes with remaining duration; UI displays status badge.
- **Dependencies**: TASK-2.11.

---

## Phase 3: Razorpay Payments and Financial Ledger (Priority 3)
*Owner: Member 4 | Prerequisite: Phase 1*

### TASK-3.1: Server-Authoritative Razorpay Order Creation & Idempotency
- **Exact Implementation Objective**: Implement server-side Razorpay order creation for advance/balance payments with strict idempotency key enforcement.
- **Files Expected to be Created**:
  - `backend/src/migrations/060_payments.sql`
  - `backend/src/modules/payments/payment.routes.js`, `payment.controller.js`, `payment.service.js`
  - `backend/src/modules/payments/razorpay.client.js`
  - `frontend/src/pages/portal/PortalPaymentPage.jsx` (`P-13`)
  - `frontend/src/api/finance.api.js`
- **Files Allowed to be Modified**: None.
- **Database Changes**: Table `payment_requests` (order_id, purpose, amount_paise, currency, status, razorpay_order_id, idempotency_key, is_test). Unique index on `razorpay_order_id` and `(order_id, purpose, idempotency_key)`.
- **API Changes**: `POST /orders/:id/payment-requests`, `GET /payment-requests/:id`.
- **Frontend Screens**: Customer Payment Portal (`P-13`) with test mode banner and Razorpay Checkout launcher.
- **Business Rules**: Client NEVER provides payment amount. Backend derives exact paise from order total, advance policy [NC], and remaining balance. Requires `Idempotency-Key` header; repeated key returns same request without creating duplicate Razorpay orders. Sets `is_test = true`.
- **Required Validations**: Idempotency-Key header present; remaining balance > 0.
- **Required Error States**: 400 `IDEMPOTENCY_KEY_REQUIRED`, 422 `ZERO_BALANCE_REMAINING`.
- **Authorization Requirements**: Customer (own order), Sales, Admin.
- **Audit Requirements**: Payment request creation and idempotency re-hits audited.
- **Test Cases**: `T-32` (repeated request with same Idempotency-Key returns identical order), `T-PAY-01` (client amount injection ignored).
- **Definition of Done**: Customer clicks "Pay Advance"; backend calculates amount, creates Razorpay test order, returns order ID; frontend launches Checkout.
- **Dependencies**: TASK-1.9.

---

### TASK-3.2: Dual-Channel Signature Verification & Idempotent Ledger Application
- **Exact Implementation Objective**: Implement cryptographic callback signature verification, raw-body webhook handler, and atomic single-ledger application.
- **Files Expected to be Created**:
  - `backend/src/modules/payments/webhook.controller.js`
  - `backend/src/modules/payments/ledger.service.js`
- **Files Allowed to be Modified**: `backend/src/modules/payments/payment.routes.js`, `payment.controller.js`, `payment.service.js`.
- **Database Changes**: Tables `payment_attempts`, `payments`, `razorpay_webhook_events`. Unique index on `razorpay_payment_id`, `payments.attempt_id`, `razorpay_webhook_events.provider_event_id`.
- **API Changes**: `POST /payment-requests/:id/verify`, `POST /webhooks/razorpay`.
- **Frontend Screens**: Payment Status Page (`P-13`) with polling.
- **Business Rules**: Never trust frontend success alone. Client callback verifies HMAC SHA256 signature using `RAZORPAY_KEY_SECRET`. Webhook verifies signature on raw request body using `RAZORPAY_WEBHOOK_SECRET`. Both channels route to `applyVerifiedPayment()` with row lock on `payment_requests` and `unique(attempt_id)`. Exactly ONE `payments` row is inserted. Updates order status (`Confirmed` if advance gate met) and balance. Duplicate webhooks return 200 OK as no-ops.
- **Required Validations**: HMAC signature check; raw body buffer validation.
- **Required Error States**: 400 `INVALID_PAYMENT_SIGNATURE`, 400 `INVALID_WEBHOOK_SIGNATURE`.
- **Authorization Requirements**: Callback: authenticated; Webhook: signature-verified public route.
- **Audit Requirements**: Every verified payment, webhook event, and signature failure audited.
- **Test Cases**: `T-25` / `AC-2` (test mode payment verified and balance updated), `T-28` (invalid callback signature rejected), `T-29` (invalid webhook signature rejected 400), `T-30` (duplicate webhook delivery causes no second ledger entry), `T-33` (callback and webhook race creates exactly one payment row).
- **Definition of Done**: Customer completes test payment; backend verifies signature cryptographically; balance updates; webhooks deduplicated cleanly.
- **Dependencies**: TASK-3.1.

---

### TASK-3.3: Admin Payment Reconciliation, Manual Payments & Policy Exceptions
- **Exact Implementation Objective**: Build administrative reconciliation tools for mismatched payments, offline payment entry, and payment gate overrides.
- **Files Expected to be Created**:
  - `frontend/src/pages/staff/orders/PaymentListPage.jsx` (`S-42`)
  - `frontend/src/pages/staff/orders/PaymentDetailPage.jsx` (`S-43`)
  - `frontend/src/pages/staff/orders/PolicyExceptionsPage.jsx` (`S-44`)
- **Files Allowed to be Modified**: `backend/src/modules/payments/payment.routes.js`, `payment.controller.js`, `payment.service.js`.
- **Database Changes**: Tables `payment_reconciliations`, `policy_exceptions`.
- **API Changes**: `POST /payment-requests/:id/reconcile`, `POST /payments/manual`, `POST /policy-exceptions/:id/approve`.
- **Frontend Screens**: Payment List (`S-42`), Payment Detail & Reconciliation (`S-43`), Policy Exceptions (`S-44`).
- **Business Rules**: Verified payments are immutable; adjustments require reversing entries. Admin can log manual cash/bank payments with proof document. Policy exceptions allow stock allocation or dispatch before required payment gate is met; requires Admin approval and justification.
- **Required Validations**: Manual payment requires reference and proof document upload; reconcile requires reason.
- **Required Error States**: 422 `PROOF_DOCUMENT_REQUIRED`.
- **Authorization Requirements**: Admin only.
- **Audit Requirements**: Reconciliations, manual payments, and policy exceptions audited.
- **Test Cases**: `T-31` (payment mismatch under review), `T-PAY-02` (admin records manual bank transfer with proof).
- **Definition of Done**: Admin resolves mismatched transactions, logs manual offline payments with proof, and approves policy overrides.
- **Dependencies**: TASK-0.6, TASK-3.2.

---

### TASK-3.4: Automated Invoicing, Receipts & Customer Balances
- **Exact Implementation Objective**: Generate itemized invoices from accepted quotations, allocate payments, and compute balances strictly from ledger.
- **Files Expected to be Created**:
  - `backend/src/migrations/061_invoices.sql`
  - `backend/src/modules/invoices/invoice.routes.js`, `invoice.controller.js`, `invoice.service.js`
  - `frontend/src/pages/staff/finance/InvoiceListPage.jsx` (`S-90`)
  - `frontend/src/pages/portal/PortalProjectPage.jsx` (`P-11`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `invoices`, `invoice_items`. Unique index `invoice_code`.
- **API Changes**: `POST /invoices`, `GET /invoices`, `POST /invoices/:id/void`.
- **Frontend Screens**: Invoice Management (`S-90`), Customer Portal Project & Receipts (`P-11`).
- **Business Rules**: Generated from accepted quotation BOM. Balances derived from ledger: `outstanding = order_total - verified_payments`. If verified payments > total, display "Overpaid — review required". Receipts generated for every verified payment.
- **Required Validations**: Order must be in confirmed state; voiding requires reason.
- **Required Error States**: 422 `VOID_REASON_REQUIRED`.
- **Authorization Requirements**: Admin: Full CRUD; Sales: View own; Customer: View own.
- **Audit Requirements**: Invoice issuance and voids audited.
- **Test Cases**: `T-22` (order outstanding balance accurately reflects advance and balance payments).
- **Definition of Done**: Invoices issued automatically; customer views itemized invoices and verified payment receipts on portal.
- **Dependencies**: TASK-3.2.

---

## Phase 4: Warranty Claims and Service Workflow (Priority 4)
*Owner: Member 4 | Prerequisite: Phase 2, Phase 3*

### TASK-4.1: Service Ticket Intake & Pre-Billing Warranty Enforcement
- **Exact Implementation Objective**: Create formal service work tickets and strictly gate billing/charges behind recorded warranty coverage decisions.
- **Files Expected to be Created**:
  - `backend/src/migrations/062_service_tickets.sql`
  - `backend/src/modules/service-tickets/ticket.routes.js`, `ticket.controller.js`, `ticket.service.js`
  - `frontend/src/pages/staff/service/TicketListPage.jsx` (`S-80`)
  - `frontend/src/pages/staff/service/TicketCreatePage.jsx` (`S-81`)
  - `frontend/src/pages/staff/service/TicketDetailPage.jsx` (`S-82`)
  - `frontend/src/api/support.api.js`
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `service_tickets`, `service_charges`, `service_parts_used`.
- **API Changes**: `POST /service-tickets`, `PATCH /service-tickets/:id/coverage`, `POST /service-tickets/:id/charges`.
- **Frontend Screens**: Ticket List (`S-80`), Create (`S-81`), Detail (`S-82`).
- **Business Rules**:
  1. Serial lookup displays customer, project, install date, and warranty status.
  2. **CRITICAL BILLING GUARD**: Adding charges is strictly blocked while `coverage_decision === 'PENDING'`.
  3. Active warranty within period (`WITHIN_PERIOD`) routes to free covered repair [SRC]. Expired/uncovered routes to paid repair. Goodwill waiver on expired warranty requires Admin approval and reason [NC].
- **Required Validations**: Serial number must exist; charge amount ≥ 0.
- **Required Error States**: 422 `COVERAGE_PENDING` (returned when attempting to add charges before coverage is decided).
- **Authorization Requirements**: Support, Admin.
- **Audit Requirements**: Coverage decisions, goodwill waivers, and charge additions audited.
- **Test Cases**: `T-18` (adding charges before coverage decision returns 422 `COVERAGE_PENDING`), `T-19` (covered vs not-covered routes to free vs paid path).
- **Definition of Done**: Support creates service tickets; backend strictly prevents adding charges until warranty coverage is formally decided.
- **Dependencies**: TASK-2.12.

---

### TASK-4.2: Warranty Claims Lifecycle & Replacement Tracking
- **Exact Implementation Objective**: Manage formal manufacturer/installer warranty claims, RMA tracking, and replacement serial linking.
- **Files Expected to be Created**:
  - `backend/src/modules/warranties/claims.service.js`
  - `frontend/src/pages/staff/warranty/WarrantyClaimsPage.jsx` (`S-72`)
- **Files Allowed to be Modified**: `backend/src/modules/warranties/warranty.routes.js`, `warranty.controller.js`.
- **Database Changes**: Table `warranty_claims` (warranty_id, ticket_id, type, coverage_decision, decision_reason, decided_by, rma_ref, replacement_serial_id, status).
- **API Changes**: `POST /warranty-claims`, `POST /warranty-claims/:id/decision`.
- **Frontend Screens**: Warranty Claims Management (`S-72`).
- **Business Rules**: Claims record RMA reference. Replacement serial links new unit, marks defective serial `REPLACED`, and creates superseding warranty record.
- **Required Validations**: Replacement serial must exist and be in `IN_STOCK` status.
- **Required Error States**: 422 `REPLACEMENT_SERIAL_INVALID`.
- **Authorization Requirements**: Support: Propose; Admin: Approve exceptions.
- **Audit Requirements**: Warranty claim decisions and replacement serial links audited.
- **Test Cases**: `T-CLM-01` (replacement serial marks old serial REPLACED and creates new warranty record).
- **Definition of Done**: Warranty claims processed with RMA tracking; replacement equipment updates inventory and warranty records seamlessly.
- **Dependencies**: TASK-2.11, TASK-4.1.

---

## Phase 5: AI-First Support Chain & Case Escalation (Priority 5)
*Owner: Member 4 | Prerequisite: Phase 2, Phase 4*

### TASK-5.1: Customer Issue Reporting & Pre-Model Safety Screen
- **Exact Implementation Objective**: Build customer issue reporting intake with deterministic regex screening for electrical/fire hazards.
- **Files Expected to be Created**:
  - `backend/src/migrations/063_support_cases.sql`
  - `backend/src/modules/support-cases/case.routes.js`, `case.controller.js`, `case.service.js`
  - `backend/src/modules/support-cases/safety.interceptor.js`
  - `frontend/src/pages/portal/PortalSupportNewPage.jsx` (`P-15`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `support_cases`, `case_messages`, `help_articles`.
- **API Changes**: `POST /cases`, `POST /cases/:id/messages`.
- **Frontend Screens**: Customer Issue Report (`P-15`) with fixed safety notice and equipment picker.
- **Business Rules**: Deterministic safety screening runs BEFORE any model call. Keywords matching smoke, burning smell, fire, sparks, shock, exposed wire, or swollen battery immediately set `safety_flag = true`, `priority = 'P1'`, bypass AI guidance, show fixed safety notice, and alert Support and Admin. Model or customer cannot downgrade P1.
- **Required Validations**: Description non-empty; equipment reference must belong to customer.
- **Required Error States**: 403 `EQUIPMENT_NOT_OWNED`.
- **Authorization Requirements**: Customer (own), Support, Admin.
- **Audit Requirements**: Case intake and safety flag triggers audited with client IP.
- **Test Cases**: `T-40` / `AC-8` ("burning smell" sets P1, displays safety notice, alerts staff, and bypasses AI guidance).
- **Definition of Done**: Customer reports issue; safety scanner intercepts hazards immediately; non-safety cases proceed to triage.
- **Dependencies**: TASK-0.6, TASK-4.1.

---

### TASK-5.2: 33-Transition Support Case State Machine
- **Exact Implementation Objective**: Implement finite state machine enforcing the 33 valid status transitions and 5-stage human escalation chain.
- **Files Expected to be Created**:
  - `backend/src/modules/support-cases/state-machine.js`
  - `frontend/src/pages/staff/service/SupportQueuePage.jsx` (`S-83`)
  - `frontend/src/pages/staff/service/CaseDetailPage.jsx` (`S-84`)
  - `frontend/src/pages/portal/PortalCaseDetailPage.jsx` (`P-16`)
- **Files Allowed to be Modified**: `backend/src/modules/support-cases/case.routes.js`, `case.controller.js`, `case.service.js`.
- **Database Changes**: Tables `case_transitions`, `case_escalations`.
- **API Changes**: `GET /cases`, `GET /cases/:id`, `POST /cases/:id/pickup`, `POST /cases/:id/classification`, `POST /cases/:id/escalate-admin`.
- **Frontend Screens**: Support Queue (`S-83`) with P1 pinned, Staff Case Detail & Timeline (`S-84`), Customer Case Timeline (`P-16`).
- **Business Rules**: Enforces transitions strictly per §9.5. Unlisted transitions rejected with 422. Customer view strictly excludes `case_messages` with `visibility = 'INTERNAL'`. Support can confirm/override AI classification (recorded in DB). Moving to Admin requires category, priority, coverage proposal, and summary.
- **Required Validations**: Valid state pair in `case_transitions`; role authorized for transition.
- **Required Error States**: 422 `CASE_TRANSITION_NOT_ALLOWED`.
- **Authorization Requirements**: Role-scoped per transition table.
- **Audit Requirements**: Every state transition logged to `status_history` and `audit_logs`.
- **Test Cases**: `T-47` (invalid state transition rejected), `T-48` (internal notes excluded from customer API response).
- **Definition of Done**: Support cases transition strictly through authorized states; internal notes remain invisible to customers; timelines render accurately.
- **Dependencies**: TASK-5.1.

---

### TASK-5.3: Admin Service Review, Technician Assignment & Work Submission
- **Exact Implementation Objective**: Implement Admin service authorization queue, conflict-checked crew assignment, and technician mobile execution.
- **Files Expected to be Created**:
  - `frontend/src/pages/staff/service/AdminServiceApprovalPage.jsx` (`S-85`)
  - `frontend/src/pages/staff/service/TechnicianServiceJobsPage.jsx` (`S-87`)
  - `frontend/src/pages/staff/service/TechnicianServiceCompletePage.jsx` (`S-88`)
- **Files Allowed to be Modified**: `backend/src/modules/support-cases/case.routes.js`, `case.controller.js`, `case.service.js`.
- **Database Changes**: Table `case_approvals`.
- **API Changes**: `POST /cases/:id/admin-decision`, `POST /cases/:id/assign`, `POST /cases/:id/technician-updates`, `POST /cases/:id/technician-complete`.
- **Frontend Screens**: Admin Service Queue (`S-85`), Technician Assigned Jobs (`S-87`), Technician Work Submission (`S-88`).
- **Business Rules**: Admin reviews issue, coverage, and operational impact. Approves/rejects/returns. Assigns technician with schedule conflict check. Technician sees only customer address, issue summary, and approved work instructions. Technician submits work notes and parts used; unresolved repairs return case to `Escalated to Support`. Technician completion moves case to `Awaiting Support Review`—it NEVER closes the case.
- **Required Validations**: Technician must be available; conflict check passes.
- **Required Error States**: 409 `TECHNICIAN_CONFLICT`.
- **Authorization Requirements**: Admin: Approve/Assign; Technician: View assigned and submit work.
- **Audit Requirements**: Admin decisions, assignments, and technician submissions audited.
- **Test Cases**: `T-42` (assignment blocked without Admin approval), `T-44` (technician completion does not close case).
- **Definition of Done**: Admin authorizes service visit; technician completes field repair; case advances to Support review without premature closure.
- **Dependencies**: TASK-2.8, TASK-5.2.

---

### TASK-5.4: Multi-Check Resolution Review & Customer-Confirmed Closure
- **Exact Implementation Objective**: Implement Support resolution evidence review and enforce mandatory customer confirmation prior to case closure.
- **Files Expected to be Created**:
  - `frontend/src/pages/staff/service/ResolutionReviewPage.jsx` (`S-89`)
- **Files Allowed to be Modified**: `backend/src/modules/support-cases/case.routes.js`, `case.controller.js`, `case.service.js`.
- **Database Changes**: Table `customer_confirmations`.
- **API Changes**: `POST /cases/:id/support-review`, `POST /cases/:id/customer-confirmation`, `POST /cases/:id/reopen`, `POST /cases/:id/close`.
- **Frontend Screens**: Support Resolution Review (`S-89`), Customer Case Detail (`P-16`) with Confirm/Dispute buttons.
- **Business Rules**:
  1. Support reviews technician work evidence and requests customer confirmation.
  2. Customer clicks "Confirm Resolved" or "Dispute / Issue Persists" on portal.
  3. **CRITICAL CLOSURE GUARD**: Case closure (`POST /cases/:id/close`) strictly blocked unless technician work complete, Support evidence accepted, customer confirmation recorded, charges paid/waived, and no open child jobs.
  4. If customer disputes, status moves to `Reopened`, priority increments, and returns to Support Review.
- **Required Validations**: Customer confirmation record must exist.
- **Required Error States**: 422 `CLOSURE_CHECKS_FAILED` with list of unmet criteria.
- **Authorization Requirements**: Customer: Confirm/Dispute; Support/Admin: Close.
- **Audit Requirements**: Customer confirmations, disputes, and closures audited.
- **Test Cases**: `T-21` / `AC-6` (closing case without customer confirmation returns 422 `CLOSURE_CHECKS_FAILED`), `T-45` (customer dispute reopens case).
- **Definition of Done**: Cases close only after customer sign-off and complete administrative verification; disputes reopen cleanly.
- **Dependencies**: TASK-5.3.

---

## Phase 6: Financial Visibility, Expenses & Dashboards (Priority 6)
*Owner: Member 4 | Prerequisite: Phase 3, Phase 5*

### TASK-6.1: Project Profitability & Financial Health Analytics
- **Exact Implementation Objective**: Build real-time project P/L calculation engine distinguishing actual costs from estimated BOM figures.
- **Files Expected to be Created**:
  - `backend/src/modules/finance/profitability.service.js`
  - `frontend/src/pages/staff/finance/ProjectProfitabilityPage.jsx` (`S-94`)
- **Files Allowed to be Modified**: `backend/src/modules/finance/finance.routes.js`, `finance.controller.js`.
- **Database Changes**: Queries spanning `orders`, `serial_items`, `job_time_entries`, `expenses`, `service_charges`.
- **API Changes**: `GET /projects/:id/profitability`, `GET /reports/profitability`.
- **Frontend Screens**: Project Profitability Screen (`S-94`).
- **Business Rules**: Formula:
  `Profit = Contract Revenue - (Material Cost + Labor Cost + Other Direct Costs + Unbilled Service Costs)`.
  `Margin % = Profit / Contract Revenue`.
  Dispatched items priced at actual serial receipt cost; non-serialized at weighted average. Labor cost = approved hours * technician rate. All figures explicitly labeled **Actual** vs **Estimate**. Overheads excluded by default [NC].
- **Required Validations**: Contract revenue > 0.
- **Required Error States**: 404 `PROJECT_NOT_FOUND`.
- **Authorization Requirements**: Admin only.
- **Audit Requirements**: Access to financial P/L audited.
- **Test Cases**: `T-23` / `AC-12` (project profitability math reconciles against manual calculation using §7.7 formula).
- **Definition of Done**: Admin views itemized revenue, actual material costs, labor, and net margin for any project with clear actual/estimate tags.
- **Dependencies**: TASK-2.4, TASK-2.10, TASK-3.4, TASK-4.1.

---

### TASK-6.2: Secondary Financial Tracking: Expenses, Timesheets & Subsidy Tracker
- **Exact Implementation Objective**: Implement project direct expense logging, technician timesheet approvals, and government subsidy document tracking.
- **Files Expected to be Created**:
  - `backend/src/migrations/064_finance_aux.sql`
  - `backend/src/modules/finance/expenses.service.js`, `timesheets.service.js`, `subsidy.service.js`
  - `frontend/src/pages/staff/finance/ExpensesPage.jsx` (`S-91`)
  - `frontend/src/pages/staff/finance/TechnicianPayPage.jsx` (`S-92`)
  - `frontend/src/pages/staff/finance/SubsidyTrackerPage.jsx` (`S-93`)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Tables `expenses`, `expense_categories`, `technician_pay_records`, `subsidy_applications`.
- **API Changes**: `POST /expenses`, `POST /expenses/:id/approve`, `POST /timesheets/:id/approve`, `GET /pay-records`, `GET /subsidy/:projectId`, `PATCH /subsidy/:projectId`.
- **Frontend Screens**: Expenses (`S-91`), Technician Pay Records (`S-92`), Subsidy Tracker (`S-93`).
- **Business Rules**: Expenses only count toward project costs after Admin approval. Timesheet approvals lock hours. Subsidy tracker tracks document checklist and receivable amounts only; NO statutory eligibility rules are implemented [NC]. Statutory payroll deductions are out of scope.
- **Required Validations**: Expense amount > 0; non-negative hours.
- **Required Error States**: 422 `INVALID_FINANCIAL_AMOUNT`.
- **Authorization Requirements**: Admin: Approve expenses, timesheets, pay records; Sales: Upload subsidy docs.
- **Audit Requirements**: Expense and timesheet approvals audited.
- **Test Cases**: `T-FIN-01` (unapproved expense excluded from P/L; approved expense included).
- **Definition of Done**: Auxiliary costs tracked; timesheets approved; subsidy documents monitored through submission lifecycle.
- **Dependencies**: TASK-0.6, TASK-2.10.

---

### TASK-6.3: Role-Aware Dashboards & Metric Reconciliation Widget
- **Exact Implementation Objective**: Build role-specific executive dashboards with server-computed metrics and mathematical payment reconciliation widget.
- **Files Expected to be Created**:
  - `backend/src/modules/dashboards/dashboard.routes.js`, `dashboard.controller.js`, `dashboard.service.js`
  - `frontend/src/pages/staff/DashboardPage.jsx` (`S-01`)
  - `frontend/src/pages/portal/PortalHomePage.jsx` (`P-10`)
  - `frontend/src/components/finance/ReconciliationWidget.jsx`
- **Files Allowed to be Modified**: None.
- **Database Changes**: Optimized aggregation queries and indices.
- **API Changes**: `GET /dashboard/:role`.
- **Frontend Screens**: Staff Dashboard (`S-01`), Customer Portal Home (`P-10`).
- **Business Rules**: All metrics computed server-side. Every metric links to drill-down list. Admin dashboard contains authoritative reconciliation widget: `dashboard total - sum(verified payments) = 0`. Seeded demo data carries global demo banner.
- **Required Validations**: Role-scoped query filtering.
- **Required Error States**: 403 Forbidden for unauthorized dashboard role view.
- **Authorization Requirements**: Dynamic per authenticated user role.
- **Audit Requirements**: Dashboard views logged.
- **Test Cases**: `T-24` / `AC-9` (dashboard payment totals equal verified payments ledger with 0 discrepancy).
- **Definition of Done**: Every role sees a personalized, real-time dashboard; reconciliation widget proves 0 discrepancy between metrics and ledger.
- **Dependencies**: TASK-3.2, TASK-6.1, TASK-6.2.

---

## Phase 7: AI Assistance Layer MVP (Priority 7)
*Owner: Member 4 | Prerequisite: Phase 1, Phase 4, Phase 5*

### TASK-7.1: Sandboxed AI Layer Foundation & Output Validator
- **Exact Implementation Objective**: Implement the internal Express `ai` module with caller-permission scoping, prompt templates, output validator, and mock provider default.
- **Files Expected to be Created**:
  - `backend/src/migrations/065_ai.sql`
  - `backend/src/modules/ai/ai.routes.js`, `ai.controller.js`, `ai.service.js`
  - `backend/src/modules/ai/context.builder.js`
  - `backend/src/modules/ai/output.validator.js`
  - `backend/src/modules/ai/providers/mock.provider.js`
  - `frontend/src/components/ai/AIPanel.jsx`
  - `frontend/src/api/ai.api.js`
- **Files Allowed to be Modified**: None.
- **Database Changes**: Table `ai_requests` (user_id, feature, entity_refs, provider_mode, status, latency_ms, input_hash, output_hash, fallback_used). No raw prompts stored.
- **API Changes**: Base `/ai/*` routes.
- **Frontend Screens**: Reusable Labeled AI Panel (`--color-ai` purple tint, "AI-generated" badge, source record links, Regenerate button, demo template banner, fallback notice).
- **Business Rules**: Default provider is `mock` (deterministic templates). Runs strictly as the authenticated caller; context builder enforces same row scopes as REST API. AI CANNOT perform mutating actions. Output validator checks cited IDs and numbers against context; falls back to template on mismatch. No PII/photos sent to external models.
- **Required Validations**: Max input 4,000 characters; caller permission verified on every cited entity.
- **Required Error States**: Return deterministic template with `fallbackUsed: true` on any model timeout or error.
- **Authorization Requirements**: Authenticated users with respective read permissions.
- **Audit Requirements**: Requests logged to `ai_requests` with input/output hashes and latency.
- **Test Cases**: `T-35` (output citations grounded in context), `T-37` (asking about unauthorized record returns neutral refusal), `T-38` (provider failure returns graceful fallback).
- **Definition of Done**: AI panel renders clean summaries; output validator blocks hallucinations; fallback works when mock provider is active.
- **Dependencies**: TASK-0.4, TASK-0.5.

---

### TASK-7.2: Concrete AI MVP Integrations: Summaries, Missing Info, Warranty & Triage
- **Exact Implementation Objective**: Wire up the 5 core AI MVP capabilities: Enquiry Summary (AI-A1), Missing-Info Check (AI-A2), Case Summary (AI-D1), Warranty Plain-Language Explanation (AI-E1), and Customer Triage (AI-G1).
- **Files Expected to be Created**:
  - `backend/src/modules/ai/features/enquiry-summary.js`
  - `backend/src/modules/ai/features/missing-info.js`
  - `backend/src/modules/ai/features/case-summary.js`
  - `backend/src/modules/ai/features/warranty-explain.js`
  - `backend/src/modules/ai/features/customer-triage.js`
- **Files Allowed to be Modified**:
  - `frontend/src/pages/staff/customers/EnquiryDetailPage.jsx` (`S-14`)
  - `frontend/src/pages/staff/service/CaseDetailPage.jsx` (`S-84`)
  - `frontend/src/pages/staff/warranty/WarrantyDetailPage.jsx` (`S-71`)
  - `frontend/src/pages/portal/PortalWarrantiesPage.jsx` (`P-14`)
  - `frontend/src/pages/portal/PortalSupportNewPage.jsx` (`P-15`)
- **Database Changes**: Seeds `help_articles` with approved troubleshooting content.
- **API Changes**:
  - `POST /ai/enquiries/:id/summary`
  - `POST /ai/enquiries/:id/missing-info`
  - `POST /ai/cases/:id/summary`
  - `POST /ai/warranties/:id/explain`
  - `POST /ai/cases/:id/triage`
- **Frontend Screens**: Enquiry Detail (`S-14`), Case Detail (`S-84`), Warranty Detail (`S-71`), Portal Warranties (`P-14`), Portal Support (`P-15`).
- **Business Rules**:
  - Missing info check (AI-A2) is 100% deterministic based on required field rules.
  - Warranty explanation (AI-E1) returns two distinct panels: (1) Authoritative backend result badge, (2) Plain-language explanation. Output validator asserts explanation matches backend dates and terms.
  - Triage (AI-G1) provides non-hazardous advice strictly derived from approved help articles (`help_articles.status = 'Approved'`).
- **Required Validations**: Grounded context assertion; cited record must exist in context payload.
- **Required Error States**: Fallback template returned if validator rejects output.
- **Authorization Requirements**: Respective module read permissions.
- **Audit Requirements**: Invocations recorded in `ai_requests`.
- **Test Cases**: `T-20` (18-month inverter warranty explained clearly alongside WITHIN_PERIOD badge), `T-CASE-01` (guided triage pulls approved help article).
- **Definition of Done**: Sales can summarize leads and view missing info; Support views case summaries; customers see plain-language warranty explanations and triage advice.
- **Dependencies**: TASK-7.1.

---

## Phase 8: Integration Polish, Seeded Demo & Rehearsal (Priority 8)
*Collaborative All Members | Prerequisite: Phases 0–7*

### TASK-8.1: Master Demo Seed Data Generator (`SEED_DEMO_DATA`)
- **Exact Implementation Objective**: Create a deterministic seed script populating a coherent end-to-end dataset labeled as fictional demo data.
- **Files Expected to be Created**:
  - `backend/src/scripts/seed.js`
  - `backend/src/scripts/seedData.json`
- **Files Allowed to be Modified**: None.
- **Database Changes**: Seeds realistic 3 kW On-Grid and 5 kW Off-Grid packages, products, inventory with serial numbers, customers, surveys, orders, technicians, and warranty records.
- **API Changes**: None.
- **Frontend Screens**: Global banner displays: "Demo data — fictional company, not affiliated with any real SunPower company."
- **Business Rules**: All demo records carry `is_demo = true` or demo prefixes. Passwords standard for demo users (`demo123!`). Never commit live production credentials.
- **Required Validations**: Seed script idempotency (can run multiple times without duplicating keys).
- **Required Error States**: None.
- **Authorization Requirements**: CLI / Admin script.
- **Audit Requirements**: Seed execution logged.
- **Test Cases**: `T-SEED-01` (seed script runs cleanly on empty DB and populates full test environment).
- **Definition of Done**: Running `npm run db:seed` provisions a complete demo environment ready for live hackathon demonstration.
- **Dependencies**: All prior database migrations.

---

### TASK-8.2: End-to-End Workflow Verification & Acceptance Criteria Validation
- **Exact Implementation Objective**: Execute automated and manual end-to-end test suite verifying the 26-stage workflow (§10.2) and critical acceptance criteria (`AC-1` to `AC-12`).
- **Files Expected to be Created**:
  - `backend/tests/e2e/workflow.test.js`
  - `backend/tests/e2e/payment-webhook.test.js`
  - `backend/tests/e2e/safety-escalation.test.js`
- **Files Allowed to be Modified**: None.
- **Database Changes**: None.
- **API Changes**: None.
- **Frontend Screens**: End-to-end browser verification.
- **Business Rules**: Verify survey gate blocks quotation; test-mode payment verifies and decrements balance; serial scans link to roof; test checklist required for install completion; warranty checks precede service charges; safety signals trigger P1; customer confirmation required for case closure.
- **Required Validations**: All 50 test cases (`T-01` to `T-50`) pass.
- **Required Error States**: Ensure all negative and boundary tests return expected error envelopes.
- **Authorization Requirements**: All 5 roles verified.
- **Audit Requirements**: Complete audit trail verified end-to-end.
- **Test Cases**: `T-04` (happy path 26 stages), `AC-1` through `AC-12`.
- **Definition of Done**: 100% of critical acceptance criteria pass automated regression tests and manual browser execution.
- **Dependencies**: All Phase 0–7 tasks.

---

### TASK-8.3: Hackathon Demo Rehearsal & Deployment Readiness (Vercel / Render)
- **Exact Implementation Objective**: Deploy backend and PostgreSQL to Render, deploy frontend to Vercel, configure Razorpay test webhooks, and rehearse the 16-step connected demo script (§21.2).
- **Files Expected to be Created**:
  - `render.yaml`
  - `vercel.json`
  - `README.md` (Deployment and demo guide)
- **Files Allowed to be Modified**: None.
- **Database Changes**: Remote Render PostgreSQL migration and seed.
- **API Changes**: Webhook registered on Razorpay test dashboard.
- **Frontend Screens**: Live deployed URL on Vercel.
- **Business Rules**: Live demo operates in test mode only; banner clearly visible; API kept warm to prevent cold start webhook delays.
- **Required Validations**: HTTPS certificates active; CORS origins restricted; environment secrets populated on Render and Vercel.
- **Required Error States**: Graceful UI error boundaries and offline fallbacks.
- **Authorization Requirements**: Production deployment credentials.
- **Audit Requirements**: Deployed system audit log operational.
- **Test Cases**: `T-DEMO-01` (complete 16-step demo script executed on live deployed URLs).
- **Definition of Done**: Live deployed platform executes steps 1–16 of connected demo flawlessly; judge Q&A answers prepared.
- **Dependencies**: TASK-8.1, TASK-8.2.
