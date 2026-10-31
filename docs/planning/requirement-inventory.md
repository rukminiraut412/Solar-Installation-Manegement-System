# Solar Installation Management System
## Complete Requirement Inventory

**Document Version:** 1.0  
**Status:** Approved Architectural Baseline  
**Authority:** `SOLAR_MANAGEMENT_SYSTEM.md` (Single Source of Truth)  
**System Type:** Modular Monolith (Node.js, Express, PostgreSQL, React, Vite, Tailwind CSS, Recharts)

---

### Classification Key
- **[SRC] / Mandatory**: Authoritative requirement from core problem statement and master prompt.
- **[OPT] / Optional**: Optional enhancement defined in specification §4.2.
- **[REC] / Recommended**: Recommended design choice or pattern specified in architecture.
- **[NC] / Needs Confirmation**: Configuration-governed setting. Never hard-code; default demo value provided.
- **[OOS] / Out of Scope**: Explicitly excluded from implementation scope per §4.3.

---

## 1. Platform Foundation & Architecture (Member 1)

### REQ-FND-01: Modular Monolith Project Architecture & Environment Config
- **Exact Feature Name**: Core Express & Vite Monorepo Infrastructure with Strict Environment Configuration
- **Specification Section**: §1.3 (P7), §14.1, §14.2, §14.8, §14.9
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: React 18+ SPA with Vite, Tailwind CSS configured with exact SunPower design tokens (§12.3), React Router v6, Axios/Fetch wrapper with standard envelope and interceptors.
- **Backend Implementation**: Express application structure, modular routing (`/api/v1`), standard error envelope `{ error: { code, message, details, requestId } }`, CORS configuration, security headers (Helmet), compression, graceful shutdown.
- **Database Implementation**: PostgreSQL connection pool (`pg` or `slonik`/`knex`), migration engine with monotonic numbering (`001_...sql`), transaction helper with optimistic locking support.
- **API Dependencies**: None (Root platform).
- **Role Permissions**: Public infrastructure; accessible to all runtime processes.
- **Business Rules**: No microservices; single unified database; modular domain boundaries; environment variables strictly validated on startup.
- **Validation & Error Handling**: Zod validation of all environment variables (`NODE_ENV`, `DATABASE_URL`, `JWT_*`, `RAZORPAY_*`, `CLOUDINARY_*`, etc.) on server boot. Fatal crash if invalid.
- **Audit Requirements**: Application startup, shutdown, and environment profile logged.
- **Test Cases**: `T-ENV-01` (startup fails on missing env), `T-ENV-02` (database pool health check), `T-ENV-03` (CORS and security headers verified).
- **Acceptance Criteria**: Backend boots cleanly on port; connects to PostgreSQL; frontend renders root shell; environment variables validated.
- **Dependencies on Other Modules**: None.

---

### REQ-FND-02: Authentication & Token Lifecycle Management
- **Exact Feature Name**: JWT Dual-Token Authentication with Token Revocation & Password Hashing
- **Specification Section**: §6.1, §14.5, §16.2, §19
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Login page (`P-03`), Forgot Password (`P-04`), token storage (in-memory access token, automatic silent refresh via interceptor), logout action.
- **Backend Implementation**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`. Argon2id/bcrypt password hashing, account lockout backoff after repeated failures.
- **Database Implementation**: Tables: `users`, `refresh_tokens`. Indices on `users.email`, `refresh_tokens.user_id`.
- **API Dependencies**: None.
- **Role Permissions**: Public endpoints; token refresh requires valid refresh cookie.
- **Business Rules**: Access token short-lived (15 min); refresh token rotating, stored hashed in DB, delivered in `httpOnly`, `Secure`, `SameSite=Strict` cookie. Logout/password reset revokes all refresh tokens. Generic error messages (no user enumeration).
- **Validation & Error Handling**: Email format, password complexity (min 8 chars). 401 Generic for bad credentials; 429 for account lockout.
- **Audit Requirements**: Auth success, auth failure, account lockout, and token revocation logged to `audit_logs`.
- **Test Cases**: `T-AUTH-01` (valid login), `T-AUTH-02` (invalid login generic 401), `T-AUTH-03` (token rotation), `T-AUTH-04` (revoked token reuse rejected), `T-AUTH-05` (lockout on 5 failures).
- **Acceptance Criteria**: Secure authentication, seamless token refresh, complete revocation on logout, zero credential leakage.
- **Dependencies on Other Modules**: REQ-FND-01.

---

### REQ-FND-03: Five-Role RBAC & Dynamic Permission Enforcement
- **Exact Feature Name**: Permission-Based Access Control with Dynamic DB Lookup & Row-Level Scoping
- **Specification Section**: §6.1, §6.2, §6.3, §14.5, §16.1
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Role-based route guards (`<ProtectedRoute allowedRoles={[...]} />`), UI element visibility toggles based on permissions, accessible disabled states with tooltips.
- **Backend Implementation**: Middleware `authenticate`, `requirePermission(permCode)`, and row-level scoping helpers `scopeToUser()`, `scopeToAssigned()`. `GET /me` endpoint.
- **Database Implementation**: Tables: `roles`, `permissions`, `role_permissions`. Pre-seeded with 5 core roles: `Admin`, `Sales`, `Warehouse`, `Technician`, `Support`, plus `Customer` portal role and optional `Partner`.
- **API Dependencies**: REQ-FND-02.
- **Role Permissions**: Admin manages roles/permissions; all authenticated users access `GET /me`.
- **Business Rules**: Token carries `user_id` and `role_id` only; permissions looked up from DB/cache on every request so role modifications take effect immediately. Deny by default. UI hiding is cosmetic; server strictly validates.
- **Validation & Error Handling**: 401 Unauthorized if token missing/invalid; 403 Forbidden if permission missing or row scope violated.
- **Audit Requirements**: Role changes, user role assignments, and permission denials logged to `audit_logs`.
- **Test Cases**: `T-01` (RBAC violation across all modules returns 403), `T-RBAC-02` (immediate revocation takes effect without re-login).
- **Acceptance Criteria**: Every protected API route enforces permission checks; technicians see only assigned jobs; customers see only own records.
- **Dependencies on Other Modules**: REQ-FND-02.

---

### REQ-FND-04: Immutable Audit Logging & Status History Engine
- **Exact Feature Name**: Append-Only Central Audit Logger & Entity Status Transition Tracker
- **Specification Section**: §1.3 (P5), §6.4, §7 (conventions), §15.2, §16.11, §19
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Admin audit log viewer (`S-108`) with filters by actor, entity type, entity ID, date range, action.
- **Backend Implementation**: `AuditService.log()`, `StatusHistoryService.record()`. `GET /audit-logs` (Admin only). Middleware capturing `requestId`, IP, and actor context.
- **Database Implementation**: Tables: `audit_logs` (append-only, grants prohibit UPDATE/DELETE), `status_history`. Indices on `(entity_type, entity_id)` and `at`.
- **API Dependencies**: REQ-FND-03.
- **Role Permissions**: Admin: Read-only. System/Services: Write-only (append). Other roles: No access.
- **Business Rules**: All consequential actions (§6.4) MUST write an audit record with `actor_user_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `reason`, `request_id`, `ip`. No financial or audit record may ever be hard deleted.
- **Validation & Error Handling**: Database triggers or permission grants reject any `UPDATE` or `DELETE` statement on `audit_logs`.
- **Audit Requirements**: Self-auditing append-only table.
- **Test Cases**: `T-49` (full lifecycle audit trail verified), `T-AUD-02` (attempted update or deletion of audit logs throws DB error).
- **Acceptance Criteria**: Every approval, status change, financial record, stock movement, and AI action produces an immutable audit entry.
- **Dependencies on Other Modules**: REQ-FND-01.

---

### REQ-FND-05: Cloudinary File Storage & Signed Parameter Delivery
- **Exact Feature Name**: Direct Client Upload via Server-Signed Parameters with Strict Access Validation
- **Specification Section**: §14.1, §14.4, §15.2, §19
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Reusable `FileUpload` component with drag-and-drop, upload progress bar, retry queue for unstable connectivity, image preview, signature pad canvas.
- **Backend Implementation**: `POST /files/sign-upload` returns signed upload params (timestamp, signature, folder, upload preset) for Cloudinary. `POST /files/confirm` registers the uploaded asset in `files` table after validating metadata.
- **Database Implementation**: Table `files` (id, provider_public_id, resource_type, purpose, owner_entity_type, owner_entity_id, uploaded_by, bytes, mime). **No raw public URLs stored**.
- **API Dependencies**: REQ-FND-03.
- **Role Permissions**: Authenticated users upload files according to entity ownership; signed access URLs generated server-side.
- **Business Rules**: Client never receives Cloudinary API Secret. Only allowed MIME types (`image/jpeg`, `image/png`, `application/pdf`). Max size: 10MB photos, 2MB signatures. Files referenced by provider public ID. Private delivery via authenticated/short-lived signed URLs.
- **Validation & Error Handling**: Verify MIME type, payload size. Reject executable or unexpected formats.
- **Audit Requirements**: File uploads, attachments, and deletion flags recorded in audit log.
- **Test Cases**: `T-FILE-01` (successful signed upload and confirmation), `T-FILE-02` (disallowed file type rejected), `T-FILE-03` (direct access without signed URL denied).
- **Acceptance Criteria**: Photos and signatures upload directly to Cloudinary using signed tokens; records stored securely with entity links.
- **Dependencies on Other Modules**: REQ-FND-01, REQ-FND-03.

---

### REQ-FND-06: System Settings & Configurable Business Rules Engine
- **Exact Feature Name**: Dynamic Key-Value System Configuration Store with Audit & Versioning
- **Specification Section**: §1.3 (P6), §14.8, §15.2, §16.2, §23
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Admin Settings pages (`S-100` to `S-107`) covering packages, products, warranty terms, payment rules, business parameters, user management, help articles, and AI toggles.
- **Backend Implementation**: `GET /settings/:group`, `PATCH /settings/:group`. In-memory cached configuration service with invalidation on updates.
- **Database Implementation**: Table `system_settings` (key, value_json, updated_by, updated_at). Primary key `key`.
- **API Dependencies**: REQ-FND-03, REQ-FND-04.
- **Role Permissions**: Admin: Read/Write. Other roles: Read specific public/operational settings.
- **Business Rules**: All unconfirmed policy items [NC] (advance %, payment gates, warranty start event, SLA timers) must be managed here. Changes must write audit logs with old and new values. Changes apply to future transactions only.
- **Validation & Error Handling**: Zod schema per settings group. Reject malformed JSON or illegal ranges.
- **Audit Requirements**: Every setting modification audited with actor ID, old JSON, new JSON, and reason.
- **Test Cases**: `T-SET-01` (admin updates payment policy), `T-SET-02` (non-admin write rejected 403), `T-SET-03` (invalid setting payload rejected 400).
- **Acceptance Criteria**: Zero hard-coded business parameters; system settings drive payment gates, warranty durations, and workflow thresholds dynamically.
- **Dependencies on Other Modules**: REQ-FND-03, REQ-FND-04.

---

### REQ-FND-07: In-App Notification Hub & Simulated Outbox Fallback
- **Exact Feature Name**: Idempotent Notification Dispatcher with In-App Alerts & Demo Outbox
- **Specification Section**: §14.1, §15.2, §18
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Header notification bell with unread count badge, notification drawer, mark-as-read action. Admin Notification Outbox screen (`S-109`) showing simulated messages.
- **Backend Implementation**: `NotificationService.dispatch()`. `GET /notifications`, `PATCH /notifications/:id/read`, `GET /admin/notification-outbox`, `POST /admin/notification-outbox/:id/resend`.
- **Database Implementation**: Tables: `notifications`, `notification_outbox`. Indices on `(user_id, read_at)` and `status`.
- **API Dependencies**: REQ-FND-03.
- **Role Permissions**: Users view their own notifications. Admin views notification outbox (`S-109`).
- **Business Rules**: In-app notifications are mandatory and always active. External channels (email/SMS/WhatsApp) are simulated by default: recorded in `notification_outbox` with status `Simulated - not sent`. Demo never fails due to third-party SMS/email outage.
- **Validation & Error Handling**: Idempotency key per event trigger to prevent duplicate notification bursts.
- **Audit Requirements**: Critical alerts (P1 safety, payment mismatch) logged to audit trail.
- **Test Cases**: `T-NOTIF-01` (notification generated on survey approval), `T-NOTIF-02` (outbox captures simulated email), `T-NOTIF-03` (read status updated).
- **Acceptance Criteria**: Users receive immediate in-app alerts on state transitions; outbox accurately records external notification intent without external dependencies.
- **Dependencies on Other Modules**: REQ-FND-03.

---

### REQ-FND-08: Scheduled Job Runner & Background Maintenance Engine
- **Exact Feature Name**: Embedded Background Scheduler for Reconciliation, Timers & Reminders
- **Specification Section**: §14.1, §14.3, §17.5, §18
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: None (Backend infrastructure).
- **Backend Implementation**: Background worker utilizing `node-cron` or `pg-boss`. Jobs:
  1. `PaymentReconciliationJob`: Runs every 5 minutes; checks stuck `Pending Verification` payment requests older than 10 mins.
  2. `WarrantyReminderJob`: Daily run; detects warranties expiring in 60, 30, and 7 days.
  3. `OverdueJobEscalation`: Hourly run; detects open jobs past scheduled end time and unassigned support cases exceeding SLA timers.
- **Database Implementation**: Runs against existing transactional tables (`payment_requests`, `warranty_records`, `installation_jobs`, `support_cases`).
- **API Dependencies**: None (Runs in-process).
- **Role Permissions**: System execution context.
- **Business Rules**: Jobs must be idempotent. If multiple app instances run, advisory locks (`pg_advisory_lock`) prevent duplicate concurrent execution.
- **Validation & Error Handling**: Wrap each job in try-catch; log errors with stack trace; record job execution metric.
- **Audit Requirements**: Automated actions (such as automated case escalation) logged with actor `SYSTEM`.
- **Test Cases**: `T-JOB-01` (reconciliation job identifies stuck payment), `T-JOB-02` (warranty reminder creates notification at 30 days).
- **Acceptance Criteria**: Background scheduler executes periodic maintenance reliably without deadlocks or unhandled rejections.
- **Dependencies on Other Modules**: REQ-FND-01.

---

## 2. Customer and Sales Management (Member 2)

### REQ-CS-01: Public Enquiry Submission & Rate Limiting
- **Exact Feature Name**: Public Web Enquiry Form with Anti-Spam & Internal Duplicate Flagging
- **Specification Section**: §7.1, §10.2 (Stage 1), §11.3 (`P-02`), §16.3
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Public Enquiry Form (`/enquiry`, `P-02`): customer type (Residential / Small Factory), requested capacity (1–5 kW), system type (On-Grid / Off-Grid / Undecided), monthly bill amount/units, roof info (type, area, floor), contact info (name, phone, email, PIN, address), consent checkbox. Displays generated `ENQ-XXXXXX` reference on success.
- **Backend Implementation**: `POST /public/enquiries`. Rate-limited per IP (Express rate-limit). Generates sequential `CUS-` and `ENQ-` codes.
- **Database Implementation**: Tables: `customers`, `enquiries`.
- **API Dependencies**: None (Public route).
- **Role Permissions**: Public (Unauthenticated).
- **Business Rules**: Public submissions never reveal existing customer records (prevents lead harvesting). Duplicates are matched internally and flagged for staff review. Requested capacity outside 1–5 kW allowed with warning flag.
- **Validation & Error Handling**: Phone (E.164 normalization) or email required; name (2–120 chars); bill ≥ 0. 400 Bad Request on invalid format; 429 on spam burst.
- **Audit Requirements**: Public enquiry creation logged with client IP.
- **Test Cases**: `T-02` (public enquiry submission creates customer and enquiry), `T-03` (rate limiting blocks spam burst).
- **Acceptance Criteria**: Anyone can submit an enquiry; receives an `ENQ` code; duplicate customers flagged internally without public disclosure.
- **Dependencies on Other Modules**: REQ-FND-01, REQ-FND-07.

---

### REQ-CS-02: Staff Customer Management & Duplicate Merge Engine
- **Exact Feature Name**: Customer 360 Repository, Duplicate Detection & Admin Merge Engine
- **Specification Section**: §6.2, §7.1, §11.4 (`S-10`, `S-11`, `S-12`, `S-15`), §16.3
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Customer List (`S-10`), Customer Create modal (`S-11`), Customer Detail & Unified Timeline (`S-12`), Duplicate Review & Merge Screen (`S-15`).
- **Backend Implementation**: `GET /customers`, `POST /customers`, `GET /customers/:id`, `PATCH /customers/:id`, `GET /customers/:id/timeline`, `POST /customers/:id/merge`.
- **Database Implementation**: Table `customers` (customer_code, full_name, phone, phone_norm, alt_phone, email, customer_type, address, lat, lng, merged_into_id). Trigram index for fuzzy address/name match.
- **API Dependencies**: REQ-FND-03, REQ-FND-04.
- **Role Permissions**: Sales, Support, Admin: Create, Read, Update. Admin: Merge approval. Technician/Warehouse: Read-only limited.
- **Business Rules**: On customer creation, check exact match on `phone_norm` and fuzzy match on email/address. If match found, return 409 `DUPLICATE_CANDIDATE` requiring staff to either link to existing or create new with reason. Merge is soft (re-points foreign keys, sets `merged_into_id`, preserves history, never deletes).
- **Validation & Error Handling**: Normalized phone format; unique active customer code. 409 conflict on duplicate without override reason.
- **Audit Requirements**: Duplicate overrides and merges audited with Admin ID and reason.
- **Test Cases**: `T-02` (duplicate detection fires on matching phone), `T-CUS-02` (admin merge re-points all linked enquiries and orders).
- **Acceptance Criteria**: Single view of customer across all historical touchpoints; duplicate candidates reviewed and merged cleanly without data loss.
- **Dependencies on Other Modules**: REQ-FND-03, REQ-FND-04.

---

### REQ-CS-03: Staff Enquiry Management & Repeat Lead Identification
- **Exact Feature Name**: Lead Lifecycle Pipeline with Auto-Repeat Flagging
- **Specification Section**: §7.1, §10.2 (Stage 1), §11.4 (`S-13`, `S-14`), §16.3
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Enquiry List (`S-13`) with channel/status filters, Enquiry Detail (`S-14`) with status transitions, assignment dropdown, requirement editor, linked survey/quote widget.
- **Backend Implementation**: `GET /enquiries`, `POST /enquiries`, `GET /enquiries/:id`, `PATCH /enquiries/:id`, `POST /enquiries/:id/status`.
- **Database Implementation**: Table `enquiries` (enquiry_code, customer_id, channel, requested_capacity_kw, system_type, monthly_bill_paise, roof_info, status, lost_reason, assigned_to, repeat_of_id).
- **API Dependencies**: REQ-FND-03, REQ-CS-02.
- **Role Permissions**: Sales, Admin: Full CRUD and status management. Support: Read.
- **Business Rules**: Enquiries created from WhatsApp/Phone must capture channel and source reference. If a customer submits another enquiry within N days (default 30 [NC]), flag as `Repeat` and set `repeat_of_id`. Status transitions: `New → Contacted → Survey Scheduled → Survey Under Review → Survey Approved → Quotation Issued → Converted to Order`. Transitions to `Lost` require mandatory `lost_reason`.
- **Validation & Error Handling**: Capacity must be > 0. Lost/Hold status changes reject if reason missing.
- **Audit Requirements**: Status transitions and assignments recorded in `status_history` and `audit_logs`.
- **Test Cases**: `T-ENQ-01` (enquiry created from phone call), `T-ENQ-02` (repeat enquiry within 30 days flagged), `T-ENQ-03` (lost status rejected without reason).
- **Acceptance Criteria**: Complete pipeline tracking from cold lead to survey schedule with zero lost leads.
- **Dependencies on Other Modules**: REQ-CS-02.

---

### REQ-CS-04: Site Survey Scheduling & Availability Conflict Detection
- **Exact Feature Name**: Conflict-Free Site Survey Scheduling & Assignment
- **Specification Section**: §7.2, §10.2 (Stage 2), §11.4 (`S-20`, `S-21`), §16.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Survey Calendar & Scheduler (`S-20`, `S-21`): view surveyor availability, overlapping assignments, leave blocks, slot picker.
- **Backend Implementation**: `POST /surveys`, `GET /surveys`, `POST /surveys/:id/reschedule`.
- **Database Implementation**: Table `surveys` (survey_code, enquiry_id, assigned_to, scheduled_at, status, revision_no).
- **API Dependencies**: REQ-FND-03, REQ-CS-03.
- **Role Permissions**: Sales, Admin: Schedule and reassign. Assigned Surveyor: Read schedule.
- **Business Rules**: Survey cannot be scheduled if customer address is missing. Scheduler checks assigned user's existing calendar and leave blocks; rejects on overlap (409 Conflict). Enquiry status moves to `Survey Scheduled`.
- **Validation & Error Handling**: `scheduled_at` must be future timestamp. 409 Conflict if surveyor is already booked or on leave.
- **Audit Requirements**: Scheduling, surveyor assignment, and rescheduling logged to audit trail.
- **Test Cases**: `T-SRV-01` (survey scheduled successfully), `T-SRV-02` (booking overlapping slot rejected 409).
- **Acceptance Criteria**: Surveys assigned without double-booking; customer address confirmed prior to schedule.
- **Dependencies on Other Modules**: REQ-CS-03.

---

### REQ-CS-05: Mobile Survey Capture & Technical Validation
- **Exact Feature Name**: Mobile-First Site Survey Technical Audit & Photo Capture
- **Specification Section**: §7.2, §10.2 (Stage 3), §11.4 (`S-22`), §16.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Mobile Survey Form (`S-22`): step-by-step entry for roof area, direction (N/NE/E/SE/S/SW/W/NW/Flat), tilt (0–90°), shadow-free area, cable distance, grid suitability (Suitable/Needs Review/Not Suitable), structured photo uploader (Roof overview, Shade source, Meter/DB, Cable route), recommended capacity & system type. Draft saving capability.
- **Backend Implementation**: `PATCH /surveys/:id`, `POST /surveys/:id/photos/sign`, `POST /surveys/:id/submit`.
- **Database Implementation**: Table `surveys` with CHECK constraint `(shadow_free_area_sqm <= roof_area_sqm)`. Table `files` linked with purpose `SURVEY_PHOTO`.
- **API Dependencies**: REQ-FND-05, REQ-CS-04.
- **Role Permissions**: Assigned Surveyor (Technician or Sales per config [NC]), Admin.
- **Business Rules**: Surveyor can save drafts with partial data. Final submission (`POST /surveys/:id/submit`) is blocked unless all technical fields are populated, shadow-free area ≤ total roof area, and minimum required photo categories are uploaded. On submission, survey status becomes `Submitted`, enquiry becomes `Survey Under Review`.
- **Validation & Error Handling**: 422 `SURVEY_INCOMPLETE` returning exact list of missing fields or photos. DB CHECK constraint prevents invalid area physics.
- **Audit Requirements**: Survey submission and photo registrations audited.
- **Test Cases**: `T-SRV-03` (draft saved partially), `T-SRV-04` (submit fails when shadow-free area > roof area), `T-SRV-05` (submit fails when mandatory photos missing).
- **Acceptance Criteria**: Field findings and photographic proof captured on site; invalid physics strictly rejected by client and database.
- **Dependencies on Other Modules**: REQ-FND-05, REQ-CS-04.

---

### REQ-CS-06: Survey Approval, Rejection & Revision Rework Workflow
- **Exact Feature Name**: Survey Governance Queue with Revision Tracking & Rework Loops
- **Specification Section**: §6.4, §7.2, §10.2 (Stages 4–5), §10.3, §11.4 (`S-23`), §16.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Survey Approval Queue (`S-23`): side-by-side view of technical findings, photo gallery, AI survey review summary, revision history, Approve modal, Reject modal (mandatory reason code + comment ≥ 10 chars).
- **Backend Implementation**: `POST /surveys/:id/approve`, `POST /surveys/:id/reject`, `POST /surveys/:id/resubmit`.
- **Database Implementation**: Tables: `survey_reviews`, `survey_revisions`.
- **API Dependencies**: REQ-FND-04, REQ-CS-05.
- **Role Permissions**: Admin: Approve / Reject. Surveyor: Resubmit after rework.
- **Business Rules**: Rejection requires mandatory reason code and comment (≥ 10 chars). Rejection sets survey to `Rejected` / `Rework Required`. Surveyor corrects findings and submits rework via `/resubmit`; this creates a new revision (`revision_no = revision_no + 1`) and moves status back to `Submitted`. Approval locks survey (`Approved`) and advances enquiry to `Survey Approved`. Only an Approved survey can unlock quotation creation.
- **Validation & Error Handling**: Rejecting without reason fails with 422. Re-submitting an already approved survey fails with 400.
- **Audit Requirements**: Rejection reasons, approval decisions, and revision snapshots written to `audit_logs` and `survey_revisions`.
- **Test Cases**: `T-05` (reject without reason blocked), `T-06` (reject → rework → resubmit → approve cycle increments revision and preserves history).
- **Acceptance Criteria**: Surveys must be approved by authorized personnel; rework loop captures reasons and maintains full historical audit.
- **Dependencies on Other Modules**: REQ-CS-05.

---

### REQ-CS-07: Survey-Gated Quotation Generation
- **Exact Feature Name**: Survey-Locked Quotation Creation Engine
- **Specification Section**: §7.2, §10.2 (Stage 6), §11.4 (`S-30`, `S-31`), §16.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Quotation List (`S-30`), Quotation Create Wizard (`S-31`): survey selector filtered to **Approved** surveys only. If non-approved survey is chosen, UI disables button and displays explicit banner: "Quotation blocked: Selected survey must be in Approved status."
- **Backend Implementation**: `POST /quotations`. Validates `survey.status === 'Approved'` and survey belongs to the active enquiry.
- **Database Implementation**: Table `quotations` (quotation_code, version, enquiry_id, survey_id, package_id, system_type, capacity_kw, subtotal_paise, discount_paise, tax_paise, total_paise, status, valid_until). Unique constraint on `(enquiry_id, version)`. Trigger/Service guard verifying survey approved.
- **API Dependencies**: REQ-CS-06.
- **Role Permissions**: Sales, Admin: Create.
- **Business Rules**: **CRITICAL RULE**: The backend strictly rejects quotation creation if the latest survey is not in `Approved` status. If an approved survey is later reopened by Admin, new quotations are blocked and drafts flagged. Quotation version starts at 1.
- **Validation & Error Handling**: 422 `SURVEY_NOT_APPROVED` returned if survey is Scheduled, In Progress, Submitted, or Rejected.
- **Audit Requirements**: Quotation creation audited with linked `survey_id` and `enquiry_id`.
- **Test Cases**: `T-07` / `AC-1` (attempt to create quotation for non-approved survey returns 422 `SURVEY_NOT_APPROVED`).
- **Acceptance Criteria**: Zero quotations can exist without an approved site survey.
- **Dependencies on Other Modules**: REQ-CS-06.

---

### REQ-CS-08: Solar Package Management & Compatibility Validation
- **Exact Feature Name**: Configurable Solar Packages with Technical Compatibility Engine
- **Specification Section**: §7.2, §11.6 (`S-100`), §15.2, §16.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Package Settings Screen (`S-100`): manage packages (1–5 kW, On-Grid / Off-Grid), assign package BOM templates, configure compatibility rules.
- **Backend Implementation**: `GET /packages`, `POST /packages`, `PATCH /packages/:id`, `CompatibilityEngine.validate(package, systemType, bomLines)`.
- **Database Implementation**: Tables: `solar_packages`, `package_bom_items`, `package_compat_rules`.
- **API Dependencies**: REQ-FND-06.
- **Role Permissions**: Admin: Create / Update packages. Sales: Read-only.
- **Business Rules**: Packages define allowed capacities and system types. Compatibility engine enforces:
  1. On-Grid systems cannot contain battery items.
  2. Off-Grid systems MUST contain battery and charge controller / hybrid inverter.
  3. Inverter capacity must cover system capacity.
- **Validation & Error Handling**: Compatibility engine returns structured rule violations `{ ruleCode, message }`. Violations block quotation issuance.
- **Audit Requirements**: Package and compatibility rule changes logged in `audit_logs`.
- **Test Cases**: `T-08` (Off-Grid package configured without battery blocks issuance with compatibility error), `T-PKG-02` (On-Grid package with battery blocks issuance).
- **Acceptance Criteria**: Incompatible equipment pairings are programmatically prevented before quotation reaches customer.
- **Dependencies on Other Modules**: REQ-FND-06.

---

### REQ-CS-09: Automatic Bill of Materials (BOM) Generation & Pricing
- **Exact Feature Name**: Deterministic Package-to-BOM Calculation & Line Item Pricing Engine
- **Specification Section**: §7.2, §10.2 (Stage 7), §11.4 (`S-32`, `S-33`), §16.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: BOM Review & Adjustment Screen (`S-32`): displays generated line items, quantities, unit prices, subtotal, discount, tax, total. Allows manual adjustments with required variance justification note.
- **Backend Implementation**: `POST /quotations/:id/bom/regenerate`, `PATCH /quotations/:id/items/:itemId`. Calculation logic:
  - `FIXED`: Qty = rule value.
  - `PER_KW`: Qty = capacity_kw * rule value.
  - `CEIL_DIV_KW`: Qty = ⌈(capacity_kw * 1000) / panel_wattage⌉.
- **Database Implementation**: Tables: `quotation_items`, `price_list_items`.
- **API Dependencies**: REQ-CS-07, REQ-CS-08.
- **Role Permissions**: Sales, Admin: Edit BOM lines and apply discounts. Admin: Approve discounts exceeding configured threshold [NC].
- **Business Rules**: Quotation BOM lines are generated deterministically from the package template and active price list. Line modifications record variance from standard template. Total paise = sum(line_totals) - discount + taxes.
- **Validation & Error Handling**: Quantity must be positive integer. Discount > threshold requires Admin approval.
- **Audit Requirements**: Manual BOM line changes and discount overrides logged with reason.
- **Test Cases**: `T-BOM-01` (3 kW system with 540W demo panel generates 6 panels via CEIL_DIV_KW), `T-BOM-02` (price list reflects configured paise).
- **Acceptance Criteria**: Complete, accurate material requirements and itemized pricing generated in under 1 second.
- **Dependencies on Other Modules**: REQ-CS-08.

---

### REQ-CS-10: Quotation Issuance, Customer Acceptance & Project Creation
- **Exact Feature Name**: Quotation Issuance, Portal Acceptance & Atomic Order/Project Creation
- **Specification Section**: §7.2, §10.2 (Stages 8–9), §11.3 (`P-12`), §11.4 (`S-33`), §16.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Staff Quotation Detail (`S-33`) with "Issue to Customer" button. Customer Portal Quotation Review (`P-12`): view BOM, terms, warranty summary, total; "Accept Quotation" and "Decline Quotation" buttons.
- **Backend Implementation**: `POST /quotations/:id/issue`, `POST /quotations/:id/accept`, `POST /quotations/:id/decline`.
- **Database Implementation**: Tables: `quotations`, `orders`, `projects`, `project_bom_items`.
- **API Dependencies**: REQ-CS-09.
- **Role Permissions**: Sales/Admin: Issue quotation, record acceptance on behalf with evidence. Customer: Accept or decline own quotation.
- **Business Rules**:
  1. Issuance locks BOM and sets quotation to `Issued`, enquiry to `Quotation Issued`.
  2. Customer acceptance transitions quotation to `Accepted`.
  3. Acceptance triggers an **ATOMIC DATABASE TRANSACTION**:
     - Creates `orders` record (`status = 'Created'`, `payment_status = 'Unpaid'`).
     - Creates `projects` record (`status = 'Created'`).
     - Freezes snapshot of BOM lines into `project_bom_items`.
     - Snapshots current payment policy rules.
     - Advances enquiry to `Converted to Order`.
  4. Accepted quotations are immutable. Decline requires reason.
- **Validation & Error Handling**: Cannot accept expired quotation. Attempting to accept already accepted quotation returns 409.
- **Audit Requirements**: Quotation issuance, acceptance metadata (method, actor, timestamp), and project creation audited.
- **Test Cases**: `T-04` (happy path acceptance creates order and project), `T-QUO-02` (expired quotation cannot be accepted).
- **Acceptance Criteria**: Customer acceptance reliably spawns authoritative Order, Project, and frozen BOM snapshot within a single transaction.
- **Dependencies on Other Modules**: REQ-CS-09.

---

## 3. Operations and Fulfilment (Member 3)

### REQ-OPS-01: Product Catalog & Warehouse Stock Levels Ledger
- **Exact Feature Name**: Transactional Stock Ledger & Dual-State (On-Hand / Reserved / Available) Inventory
- **Specification Section**: §7.3, §11.4 (`S-50`, `S-51`), §15.2, §16.6
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Inventory Overview (`S-50`): categorized product table, low stock alerts, on-hand, reserved, available columns. Product Detail & Movements (`S-51`): movement timeline, SKU details, reorder levels.
- **Backend Implementation**: `GET /products`, `POST /products`, `GET /stock`, `GET /stock/movements`.
- **Database Implementation**: Tables: `products`, `stock_levels` (PK: product_id, location_id), `stock_movements`. CHECK constraint: `(on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand)`.
- **API Dependencies**: REQ-FND-03, REQ-FND-04.
- **Role Permissions**: Warehouse, Admin: Full CRUD. Sales: Read availability. Technician: Read assigned parts.
- **Business Rules**: Available = on_hand - reserved. Database CHECK constraint strictly prohibits negative on_hand or reserved > on_hand. Every stock alteration MUST record a row in `stock_movements` (`PURCHASE_RECEIPT`, `RESERVE`, `RELEASE`, `DISPATCH`, `RETURN`, `DAMAGED`, `MISSING`, `ADJUSTMENT`).
- **Validation & Error Handling**: DB constraint failure throws transaction rollback.
- **Audit Requirements**: Every movement records actor, timestamp, quantity, reason, and project reference.
- **Test Cases**: `T-STK-01` (stock movement correctly updates on_hand and available), `T-STK-02` (attempt to reserve beyond on_hand throws check constraint error).
- **Acceptance Criteria**: Real-time inventory visibility with 100% mathematical reconciliation against the movement ledger.
- **Dependencies on Other Modules**: REQ-FND-04.

---

### REQ-OPS-02: Goods Receipt & Serial Number Registration
- **Exact Feature Name**: Purchase Receipt Ingestion & Serialized Asset Registration
- **Specification Section**: §7.3, §11.4 (`S-52`), §15.2, §16.6
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Goods Receipt Screen (`S-52`): supplier selection, supplier invoice number, line items, bulk serial number input / barcode capture, unit cost input.
- **Backend Implementation**: `POST /stock-purchases`, `POST /inventory/receipts`.
- **Database Implementation**: Tables: `stock_purchases`, `stock_purchase_items`, `serial_items`. Unique index on `(product_id, serial_number)`.
- **API Dependencies**: REQ-OPS-01.
- **Role Permissions**: Warehouse, Admin: Create goods receipt.
- **Business Rules**: For serialized products (Inverter, Battery, Solar Panels per seed config [NC]), each physical unit must be recorded in `serial_items` with initial status `IN_STOCK`. Duplicate serial numbers for the same product are strictly rejected by DB unique index. Ingestion creates `PURCHASE_RECEIPT` movements and increments `on_hand`.
- **Validation & Error Handling**: 409 Conflict if any serial number already exists in database. Unit cost must be > 0.
- **Audit Requirements**: Goods receipt, supplier invoice, and serial ingestions audited.
- **Test Cases**: `T-12` (duplicate serial entry rejected with specific error), `T-STK-03` (goods receipt increments on_hand and creates serial rows).
- **Acceptance Criteria**: Serialized inventory tracked per physical unit from the minute it enters the warehouse.
- **Dependencies on Other Modules**: REQ-OPS-01.

---

### REQ-OPS-03: Project Stock Reservation & Shortage Detection
- **Exact Feature Name**: Payment-Gated Material Allocation & Shortage Flagging
- **Specification Section**: §7.3, §10.2 (Stage 13), §10.3, §11.4 (`S-53`), §16.6
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Project BOM Readiness Screen (`S-53`): BOM items table, required qty, available qty, reserved qty, status badge (`Reserved` vs `Short`), Allocate button, Request Policy Exception button.
- **Backend Implementation**: `POST /projects/:id/allocate`, `POST /projects/:id/reservations/release`.
- **Database Implementation**: Tables: `project_bom_items`, `stock_reservations`.
- **API Dependencies**: REQ-OPS-01, REQ-CS-10.
- **Role Permissions**: Warehouse, Admin: Execute allocation. Sales: View status.
- **Business Rules**:
  1. Allocation is blocked unless the configured order payment gate is met (§17.7), or an approved `policy_exception` exists.
  2. For each BOM item, reserve `min(qty_required, qty_available)`.
  3. If available < required, flag line as `Short` with shortfall count, and notify Warehouse/Admin.
  4. Partial reservation is permitted; dispatch beyond reserved quantity is strictly prohibited.
- **Validation & Error Handling**: 422 `PAYMENT_GATE_NOT_MET` if unpaid without exception. 422 `INSUFFICIENT_STOCK` if attempting to reserve 0 units.
- **Audit Requirements**: Stock reservations and shortage alerts written to audit log.
- **Test Cases**: `T-09` (dispatch blocked when stock insufficient), `T-RES-01` (allocation sets BOM line status to Short when stock deficient).
- **Acceptance Criteria**: Projects reserve stock cleanly when payment terms are met; material shortages surfaced immediately.
- **Dependencies on Other Modules**: REQ-OPS-01, REQ-CS-10.

---

### REQ-OPS-04: Dispatch Note Creation & Barcode/Serial Scanning
- **Exact Feature Name**: Dispatch Note Lifecycle & Pre-Dispatch Serial Verification Scanning
- **Specification Section**: §7.3, §10.2 (Stage 14), §10.3, §11.4 (`S-54`, `S-55`), §16.6
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Dispatch List (`S-54`), Serial Scanning & Dispatch Screen (`S-55`): real-time scan progress per line (e.g., "Inverter 1/1, Batteries 2/4"), scan input field (USB scanner / keyboard / optional camera), last scanned serial indicator, clear visual scan error alerts, Unscan button, Confirm Dispatch button.
- **Backend Implementation**: `POST /dispatches`, `POST /dispatches/:id/scan`, `DELETE /dispatches/:id/scan/:serial`, `POST /dispatches/:id/confirm`.
- **Database Implementation**: Tables: `dispatches`, `dispatch_items`, `dispatch_serials`. Partial unique index: `unique(serial_item_id) WHERE released_at IS NULL`.
- **API Dependencies**: REQ-OPS-02, REQ-OPS-03.
- **Role Permissions**: Warehouse: Manage dispatch and scan serials. Admin: Exception override.
- **Business Rules**:
  1. Scan validation: Serial must exist in `serial_items`, product must match BOM line, status must be `IN_STOCK` or `RESERVED` for this project, serial must not be active on another project.
  2. Row-level database lock on `serial_items` during scan prevents race conditions.
  3. `POST /dispatches/:id/confirm` is blocked until exact scan count matches required dispatch quantity for all serialized items.
  4. On confirmation, serial items advance to `DISPATCHED`, linked to project and customer; movements written; warranty records created in `Pending Activation`.
- **Validation & Error Handling**: 422 errors: `SERIAL_UNKNOWN`, `SERIAL_ALREADY_ASSIGNED`, `SERIAL_WRONG_PRODUCT`, `SERIAL_NOT_AVAILABLE`, `SCAN_COUNT_MISMATCH`.
- **Audit Requirements**: Scans, unscans, and dispatch confirmation recorded in audit logs with Warehouse actor ID.
- **Test Cases**: `T-10` (scan serial assigned to another project rejected), `T-11` (concurrent scan race condition handled cleanly by DB lock), `T-13` (confirm dispatch with scan count mismatch returns 422 `SCAN_COUNT_MISMATCH`).
- **Acceptance Criteria**: Zero wrong or duplicate serial numbers can leave the warehouse; serial trace link established.
- **Dependencies on Other Modules**: REQ-OPS-02, REQ-OPS-03.

---

### REQ-OPS-05: Site Delivery Confirmation & Warranty Trigger Event
- **Exact Feature Name**: Equipment Delivery Handover & Automatic Warranty Start Trigger
- **Specification Section**: §7.3, §7.5, §10.2 (Stage 15), §16.6
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Dispatch detail delivery confirmation button ("Confirm Site Delivery") with date/time picker and receiver notes.
- **Backend Implementation**: `POST /dispatches/:id/deliver`.
- **Database Implementation**: Updates `dispatches.delivered_at` and `dispatches.status = 'Delivered'`. Updates `serial_items.status = 'DELIVERED'`.
- **API Dependencies**: REQ-OPS-04.
- **Role Permissions**: Warehouse, Assigned Technician, Admin.
- **Business Rules**: Delivery confirmation records `delivered_at`. Under default configuration (`warranty_start_event = 'DELIVERY'` [SRC]), this event triggers `WarrantyService.activateForProject()`: converts linked warranty records from `Pending Activation` to `Active`, calculates `end_date = delivered_at + duration_months`.
- **Validation & Error Handling**: Cannot confirm delivery of un-dispatched note. Timestamp cannot be in the future.
- **Audit Requirements**: Delivery confirmation and resulting warranty activations audited.
- **Test Cases**: `T-17` (delivery confirmation sets start_date = delivered_at and activates warranty records).
- **Acceptance Criteria**: Equipment arrival at site recorded; initiates warranty protection timeline automatically.
- **Dependencies on Other Modules**: REQ-OPS-04.

---

### REQ-OPS-06: Warehouse Exceptions: Returns, Damage & Stock Corrections
- **Exact Feature Name**: Returns, Damage Quarantine & Admin Stock Write-Off Engine
- **Specification Section**: §7.3, §10.3, §11.4 (`S-56`), §16.6
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Inventory Exceptions Screen (`S-56`): return from site form, damage reporting with photo upload, missing item report, stocktake adjustment with Admin approval workflow.
- **Backend Implementation**: `POST /stock-exceptions`, `POST /stock-exceptions/:id/approve`.
- **Database Implementation**: Table `stock_exceptions` (type, product_id, serial_item_id, qty, reason, photo_file_id, status, approved_by).
- **API Dependencies**: REQ-FND-05, REQ-OPS-01.
- **Role Permissions**: Warehouse, Technician: Submit exception. Admin: Approve write-offs and large adjustments.
- **Business Rules**: Returned serial from site moves to `RETURNED_QC`. After QC, moves to `IN_STOCK` or `DAMAGED`. Damaged/missing items require photo, reason, and Admin write-off approval. Approved write-offs update stock ledger and post cost entries to project/finance.
- **Validation & Error Handling**: Mandatory reason (min 10 chars); mandatory photo for damage.
- **Audit Requirements**: Write-off approvals and stock adjustments audited with Admin ID and valuation impact.
- **Test Cases**: `T-EXC-01` (damage reported requires admin approval before inventory write-off occurs).
- **Acceptance Criteria**: Damaged and returned goods quarantined safely without corrupting project availability or financial records.
- **Dependencies on Other Modules**: REQ-OPS-01, REQ-FND-05.

---

### REQ-OPS-07: Serial Number Traceability (Roof-to-Warehouse)
- **Exact Feature Name**: Unified Serial Number Lifecycle & Lineage Trace
- **Specification Section**: §7.3, §11.4 (`S-57`), §16.6
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Serial Trace Screen (`S-57`): search by serial number; displays complete timeline: goods receipt (date, supplier, cost) → project reservation → dispatch note → scan event → installation record → active warranty status → service ticket history.
- **Backend Implementation**: `GET /serials/:serial/trace`.
- **Database Implementation**: Query spanning `serial_items`, `stock_movements`, `dispatch_serials`, `installation_jobs`, `warranty_records`, `service_tickets`.
- **API Dependencies**: REQ-OPS-02, REQ-OPS-04.
- **Role Permissions**: Admin, Warehouse, Support: Full trace. Sales: Limited trace.
- **Business Rules**: Every physical serialized asset must resolve to a complete unbroken audit chain from purchase invoice to rooftop installation and warranty claims.
- **Validation & Error Handling**: 404 if serial number does not exist.
- **Audit Requirements**: Trace view access by internal staff.
- **Test Cases**: `T-TRACE-01` / `AC-3` (serial lookup shows complete unbroken chain from supplier to roof).
- **Acceptance Criteria**: Instant lookup of any serial number resolves full history in under 500ms.
- **Dependencies on Other Modules**: REQ-OPS-02, REQ-OPS-04.

---

### REQ-OPS-08: Technician Profiles & Unavailability Scheduling
- **Exact Feature Name**: Technician Skill Matrix, Working Calendar & Leave Tracker
- **Specification Section**: §7.4, §11.4 (`S-60`, `S-61`), §15.2, §16.7
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Technician Directory (`S-60`), Availability & Capacity Scheduler (`S-61`): working days, service areas, max jobs/day limit, leave management. Cost rate visible to Admin only.
- **Backend Implementation**: `GET /technicians`, `PATCH /technicians/:id`, `GET /technicians/:id/unavailability`, `POST /technicians/:id/unavailability`.
- **Database Implementation**: Tables: `technicians`, `technician_unavailability`.
- **API Dependencies**: REQ-FND-03.
- **Role Permissions**: Admin: Full CRUD and cost rates. Technician: View and update own availability/leave.
- **Business Rules**: Technicians have daily job capacity limits (configurable [NC]). Scheduler checks unavailability blocks and flags conflicts before assignment.
- **Validation & Error Handling**: Unavailability start < end date. Cost rate must be non-negative integer paise.
- **Audit Requirements**: Technician profile edits and leave bookings audited.
- **Test Cases**: `T-TECH-01` (technician cannot be scheduled during logged unavailability window).
- **Acceptance Criteria**: Transparent workforce capacity management preventing scheduling overruns.
- **Dependencies on Other Modules**: REQ-FND-03.

---

### REQ-OPS-09: Installation Job Scheduling & Multi-Technician Assignment
- **Exact Feature Name**: Installation Job Dispatching with Lead/Helper Role Assignment
- **Specification Section**: §7.4, §10.2 (Stage 16), §11.4 (`S-61`, `S-62`, `S-63`), §16.7
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Job Scheduler (`S-61`), Job List (`S-62`), Job Detail (`S-63`): assign Lead Technician and Helpers, select scheduled start/finish, review project materials readiness.
- **Backend Implementation**: `POST /jobs`, `POST /jobs/:id/assign`, `POST /jobs/:id/reschedule`.
- **Database Implementation**: Tables: `installation_jobs`, `job_assignments`, `job_reschedules`.
- **API Dependencies**: REQ-OPS-04, REQ-OPS-08.
- **Role Permissions**: Admin: Create and assign jobs. Technician: Read assigned jobs only.
- **Business Rules**: Job creation requires project to be in ready state (payment/dispatch gates met [NC]). At least one Lead technician required. Overlapping technician assignments rejected with 409 Conflict. Rescheduling requires reason and requester (Customer / Company) and notifies technicians.
- **Validation & Error Handling**: 409 Conflict on schedule overlap; 422 if lead technician missing.
- **Audit Requirements**: Assignments and rescheduling events audited.
- **Test Cases**: `T-JOB-01` (assigning technician to two concurrent jobs returns 409 Conflict).
- **Acceptance Criteria**: Installation jobs dispatched to available crews with clear operational hierarchy.
- **Dependencies on Other Modules**: REQ-OPS-08.

---

### REQ-OPS-10: Mobile Installation Workflow: Evidence, Testing & Digital Signature
- **Exact Feature Name**: Mobile Installation Workflow with Mandatory Test Checklist & Signature Capture
- **Specification Section**: §7.4, §10.2 (Stages 17–19), §11.4 (`S-64`), §16.7
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Mobile Installation Execution Flow (`S-64`):
  1. Clock In / Clock Out (working hours capture).
  2. Photo checklist (Roof before, Panel layout, Inverter, Wiring, Earthing, Meter/Grid, Final).
  3. System detail verification (actual capacity kW, scanned serial verification).
  4. Commissioning Test Checklist (VOC, ISC, earthing resistance, grid sync; pass/fail with measured values).
  5. Customer Digital Signature canvas with signer name and timestamp.
  6. Final Complete button.
- **Backend Implementation**: `POST /jobs/:id/start`, `POST /jobs/:id/time-entries`, `POST /jobs/:id/photos/sign`, `PUT /jobs/:id/system-details`, `PUT /jobs/:id/tests`, `POST /jobs/:id/signature`, `POST /jobs/:id/complete`.
- **Database Implementation**: Tables: `job_time_entries`, `job_photos`, `test_results`, `signatures`.
- **API Dependencies**: REQ-FND-05, REQ-OPS-09.
- **Role Permissions**: Assigned Technician, Admin. Unassigned technicians receive 403 Forbidden.
- **Business Rules**:
  1. Completion (`POST /jobs/:id/complete`) is **BLOCKED** by backend validator unless:
     - Actual start and end times recorded.
     - Required photo categories uploaded.
     - System details and serials match dispatch.
     - All commissioning tests recorded and **PASSED**.
     - Valid customer digital signature captured.
  2. If any test fails, status moves to `Rework Required`; completion is blocked until rework is scheduled and tests pass.
  3. On completion, job becomes `Completed`, order becomes `Installed`.
- **Validation & Error Handling**: 422 `COMPLETION_INCOMPLETE` returning exhaustive list of missing requirements.
- **Audit Requirements**: Clock-in/out, test results, customer signature, and completion audited.
- **Test Cases**: `T-14` / `AC-4` (completion rejected with missing items list), `T-15` (failed test sets Rework Required and blocks completion).
- **Acceptance Criteria**: Strict zero-defect handover guarantee backed by photographic, electrical, and customer-signed proof.
- **Dependencies on Other Modules**: REQ-FND-05, REQ-OPS-09.

---

### REQ-OPS-11: Configurable Warranty Terms & Authoritative Warranty Records
- **Exact Feature Name**: Multi-Party Warranty Terms & Lifecycle Engine
- **Specification Section**: §7.5, §10.2 (Stage 20), §11.4 (`S-70`, `S-71`), §11.6 (`S-102`), §15.2, §16.8
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Warranty Terms Settings (`S-102`), Warranty Search & Detail (`S-70`, `S-71`): product category, party badge (`MANUFACTURER` vs `INSTALLER`), scope (`SERIAL` vs `PROJECT`), duration, coverage scope (`PARTS`, `LABOR`, `BOTH`), activation status.
- **Backend Implementation**: `GET /warranties`, `GET /warranties/:id`, `POST /warranties/:id/void`, `POST /settings/warranty`.
- **Database Implementation**: Tables: `warranty_terms`, `warranty_records`.
- **API Dependencies**: REQ-FND-06, REQ-OPS-04.
- **Role Permissions**: Support, Admin: View and search. Admin: Configure terms, void warranty (with reason). Customer: View own warranties (`P-14`).
- **Business Rules**:
  - Sample durations [SRC]: Inverter (2 years / 24 mos), Battery (2 years / 24 mos), Panels (20 years / 240 mos).
  - Terms changes apply only to future records; existing records keep immutable term snapshot.
  - Records created `Pending Activation` at dispatch; activated on configured event (`DELIVERY` default [SRC], alternate `INSTALLATION_COMPLETION` [NC]).
  - End date = start date + duration months (computed strictly by backend).
- **Validation & Error Handling**: Voiding requires mandatory reason (min 10 chars). End date cannot precede start date.
- **Audit Requirements**: Warranty activations, voids, and term modifications audited.
- **Test Cases**: `T-16` (warranty records created with correct start and end dates), `T-WAR-02` (voiding requires admin reason and is audited).
- **Acceptance Criteria**: Unambiguous warranty records per serialized asset distinguishing manufacturer coverage from installer workmanship.
- **Dependencies on Other Modules**: REQ-OPS-04, REQ-OPS-05.

---

### REQ-OPS-12: Authoritative Warranty Eligibility Engine
- **Exact Feature Name**: Deterministic Backend Warranty Period Eligibility Evaluator
- **Specification Section**: §7.5, §11.4 (`S-71`), §16.8
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Warranty Detail Eligibility Panel (`S-71`): input claim date (default today); displays authoritative system result badge (`WITHIN_PERIOD`, `EXPIRED`, `NOT_ACTIVE`, `VOID`, `NO_RECORD`), remaining months/days, terms reference.
- **Backend Implementation**: `POST /warranties/eligibility`.
- **Database Implementation**: Queries `warranty_records` by serial number or customer code.
- **API Dependencies**: REQ-OPS-11.
- **Role Permissions**: Support, Admin, Customer (own).
- **Business Rules**: Evaluates claim date against active record:
  - `WITHIN_PERIOD`: Status `Active` and `start_date <= claim_date <= end_date`.
  - `EXPIRED`: Status `Active` and `claim_date > end_date`.
  - `NOT_ACTIVE`: Status `Pending Activation` or `start_date > claim_date`.
  - `VOID`: Status `Void`.
  - `NO_RECORD`: No record located.
  `WITHIN_PERIOD` validates time period only. Specific fault coverage (misuse, exclusions) is a human coverage decision recorded by Support.
- **Validation & Error Handling**: Claim date defaults to current date if omitted.
- **Audit Requirements**: Eligibility lookups during claim creation audited.
- **Test Cases**: `T-16` / `AC-5` (18-month inverter claim returns `WITHIN_PERIOD` with ~6 months remaining; 30-month returns `EXPIRED`).
- **Acceptance Criteria**: Instant, 100% deterministic warranty period determination removing staff guesswork.
- **Dependencies on Other Modules**: REQ-OPS-11.

---

## 4. Support, Finance and AI (Member 4)

### REQ-SFA-01: Support Case Intake, Safety Screening & Classification
- **Exact Feature Name**: AI-First Support Case Intake with Deterministic Pre-Model Safety Interceptor
- **Specification Section**: §7.6, §9.1, §9.2, §9.3, §10.2 (Stage 21), §11.3 (`P-15`), §16.9
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Customer Report Issue Page (`P-15`): equipment picker from customer's installed assets, issue description, photo upload, fixed Emergency Safety Warning banner, always-accessible "Talk to Support" button.
- **Backend Implementation**: `POST /cases`, `POST /cases/:id/triage`. Deterministic regex safety screen runs **BEFORE** any AI or routing logic.
- **Database Implementation**: Table `support_cases` (case_code, customer_id, project_id, product_id, serial_item_id, category_ai, category_confirmed, priority, safety_flag, status, repeat_count).
- **API Dependencies**: REQ-FND-05, REQ-OPS-11.
- **Role Permissions**: Customer (own), Support, Admin.
- **Business Rules**:
  1. **DETERMINISTIC SAFETY SCREEN**: Patterns matching smoke, burning smell, fire, sparking, electrical shock, exposed live wires, swollen/hot battery, water ingress immediately flag `safety_flag = true`, set `priority = 'P1'`, bypass AI guidance completely, display fixed non-model safety alert ("Keep away from equipment; call emergency services"), and trigger immediate staff alerts.
  2. Model or customer cannot downgrade P1. Only Support/Admin can downgrade with logged reason.
  3. Non-safety issues classified as Basic, Major, or Unclear.
- **Validation & Error Handling**: Customer cannot report issue against equipment they do not own.
- **Audit Requirements**: Safety alerts and case creations audited with client IP and full context.
- **Test Cases**: `T-40` / `AC-8` ("burning smell" triggers immediate P1 safety alert and bypasses AI guidance), `T-41` (Support override of AI classification logged).
- **Acceptance Criteria**: Zero hazardous delays; critical electrical risks isolated immediately by deterministic safety rules.
- **Dependencies on Other Modules**: REQ-OPS-11.

---

### REQ-SFA-02: Support Case Finite State Machine & Escalation Chain
- **Exact Feature Name**: 33-Transition Support Case State Machine & 5-Stage Human Responsibility Chain
- **Specification Section**: §9.1, §9.4, §9.5, §10.2 (Stage 26), §11.4 (`S-83`, `S-84`), §16.9
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Support Queue (`S-83`) with P1 pinned at top, Case Detail & Timeline (`S-84`): displays current stage, responsible team, next action, escalation history. Clear distinction between customer-visible messages and internal notes.
- **Backend Implementation**: `CaseService.transition(caseId, toStatus, actor, reason)`. Enforces data-driven transitions in `case_transitions`.
- **Database Implementation**: Tables: `support_cases`, `case_transitions`, `case_messages`, `case_escalations`.
- **API Dependencies**: REQ-FND-03, REQ-FND-04, REQ-SFA-01.
- **Role Permissions**: Enforced per transition table (§9.5). Customer views cannot see `case_messages` with `visibility = 'INTERNAL'`.
- **Business Rules**: Enforces strict chain: Customer → AI → Support Review → Admin Approval → Technician Work → Support Evidence Review → Customer Confirmation → Case Closure. Unlisted transitions strictly rejected. Internal notes stripped from customer API responses.
- **Validation & Error Handling**: Invalid transition throws 422 `CASE_TRANSITION_NOT_ALLOWED`.
- **Audit Requirements**: Every state transition writes an immutable row to `status_history` and `audit_logs`.
- **Test Cases**: `T-47` (illegal transition rejected), `T-48` (internal notes excluded from customer API response).
- **Acceptance Criteria**: Complex customer service workflows progress through verified checkpoints with zero unauthorized jumps.
- **Dependencies on Other Modules**: REQ-SFA-01.

---

### REQ-SFA-03: Service Ticket Creation & Pre-Billing Warranty Check
- **Exact Feature Name**: Service Ticket Generation & Warranty-Gated Billing Guard
- **Specification Section**: §7.6, §10.2 (Stages 21–22), §11.4 (`S-80`, `S-81`, `S-82`), §16.9
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Service Ticket Detail (`S-82`): linked case info, serial lookup, warranty status badge, coverage decision selector (`COVERED_WARRANTY`, `NOT_COVERED_PAID`, `GOODWILL`), charges table (Part, Labor, Visit) with "Add Charge" button disabled while coverage is pending.
- **Backend Implementation**: `POST /service-tickets`, `PATCH /service-tickets/:id/coverage`, `POST /service-tickets/:id/charges`.
- **Database Implementation**: Tables: `service_tickets`, `service_charges`, `service_parts_used`.
- **API Dependencies**: REQ-OPS-12, REQ-SFA-02.
- **Role Permissions**: Support: Create ticket, propose coverage. Admin: Approve coverage exceptions and goodwill.
- **Business Rules**:
  1. Ticket always links to exactly one case.
  2. **CRITICAL BILLING RULE**: Adding charges is strictly blocked while `coverage_decision === 'PENDING'`.
  3. If warranty is active and valid (`WITHIN_PERIOD`), repair is free covered warranty repair [SRC]. If expired/not covered, paid repair path. Goodwill (free repair for expired item) requires Admin approval and reason [NC].
- **Validation & Error Handling**: 422 `COVERAGE_PENDING` returned if attempting to add charges before coverage decision is recorded.
- **Audit Requirements**: Coverage decisions, goodwill waivers, and charge additions audited.
- **Test Cases**: `T-18` (adding charges before coverage decision returns 422 `COVERAGE_PENDING`), `T-19` (covered vs not-covered routes to free vs paid path).
- **Acceptance Criteria**: Customers are never billed for in-warranty failures; financial decisions are fully verified against warranty records.
- **Dependencies on Other Modules**: REQ-OPS-12, REQ-SFA-02.

---

### REQ-SFA-04: Admin Service Approval & Technician Dispatch
- **Exact Feature Name**: Admin Service Approval & Conflict-Checked Field Repair Assignment
- **Specification Section**: §9.2, §11.4 (`S-85`, `S-86`, `S-87`), §16.9
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Admin Approval Queue (`S-85`), Technician Assignment Modal (`S-86`), Technician Assigned Service Job View (`S-87`).
- **Backend Implementation**: `POST /cases/:id/admin-decision`, `POST /cases/:id/assign`.
- **Database Implementation**: Tables: `case_approvals`, `installation_jobs` (type = 'Service').
- **API Dependencies**: REQ-OPS-08, REQ-SFA-02.
- **Role Permissions**: Admin: Approve and assign. Technician: View assigned job only.
- **Business Rules**: Admin reviews issue severity, coverage, and crew capacity. Approves, rejects, or returns to Support. On approval, assigns technician with schedule conflict validation. Technician sees customer address, issue summary, and approved work instructions. Technician NEVER sees pricing, financial records, or internal notes.
- **Validation & Error Handling**: 409 Conflict if technician is booked or on leave.
- **Audit Requirements**: Admin approval decisions and technician assignments logged to audit trail.
- **Test Cases**: `T-42` (technician assignment blocked until Admin approves), `T-43` (technician cannot access unassigned service job 403).
- **Acceptance Criteria**: Complete administrative oversight over field operations; strict data isolation for field staff.
- **Dependencies on Other Modules**: REQ-OPS-08, REQ-SFA-02.

---

### REQ-SFA-05: Technician Service Execution & Multi-Check Closure Engine
- **Exact Feature Name**: Technician Service Submission & Customer-Confirmed Closure Guard
- **Specification Section**: §7.6, §9.2, §9.5, §10.2 (Stage 23), §11.4 (`S-88`, `S-89`), §11.3 (`P-16`), §16.9
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Technician Work Completion Form (`S-88`): work notes, parts used (with replacement serials), resolved yes/no toggle. Support Resolution Review Screen (`S-89`): checklist of closure criteria, "Request Customer Confirmation" trigger. Customer Case Detail (`P-16`): "Confirm Issue Resolved" and "Dispute / Issue Persists" buttons.
- **Backend Implementation**: `POST /cases/:id/technician-complete`, `POST /cases/:id/support-review`, `POST /cases/:id/customer-confirmation`, `POST /cases/:id/close`.
- **Database Implementation**: Tables: `service_work_logs`, `customer_confirmations`, `support_cases`.
- **API Dependencies**: REQ-SFA-03, REQ-SFA-04.
- **Role Permissions**: Assigned Technician: Submit work. Support: Review evidence, close case. Customer: Confirm resolution or dispute.
- **Business Rules**:
  1. Technician submission does NOT close the case; moves status to `Awaiting Support Review`. If marked unresolved by technician, moves to `Escalated to Support`.
  2. **CRITICAL CLOSURE RULE**: Case closure (`POST /cases/:id/close`) is strictly blocked unless:
     - Technician work completed.
     - Support evidence review recorded.
     - **CUSTOMER CONFIRMATION RECORDED** (or Admin waiver with recorded evidence [NC]).
     - All charges finalized and paid or waived.
  3. If customer disputes, case moves to `Reopened`, priority increments, and returns to Support Review.
- **Validation & Error Handling**: 422 `CLOSURE_CHECKS_FAILED` returning list of unmet closure criteria.
- **Audit Requirements**: Work submissions, customer confirmations, disputes, and final closure audited.
- **Test Cases**: `T-21` / `AC-6` (attempt to close service case without customer confirmation returns 422 `CLOSURE_CHECKS_FAILED`), `T-44` (technician completion does not close case), `T-45` (customer dispute reopens case).
- **Acceptance Criteria**: Zero closed complaints without explicit customer sign-off or documented administrative resolution.
- **Dependencies on Other Modules**: REQ-SFA-03, REQ-SFA-04.

---

### REQ-SFA-06: Razorpay Test-Mode Payment Creation & Idempotency
- **Exact Feature Name**: Server-Authoritative Razorpay Order Creation with Idempotency Protection
- **Specification Section**: §1.3 (P2), §7.7, §10.2 (Stage 10), §11.3 (`P-13`), §16.5, §17.1, §17.3, §17.4
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Customer Payment Portal (`P-13`): displays order total, advance due, amount paid, remaining balance, prominent "TEST MODE — no real money moves" banner, "Pay Advance with Razorpay" button launching standard Razorpay Checkout modal.
- **Backend Implementation**: `POST /orders/:id/payment-requests`. Integrates Razorpay Orders API (`razorpay.orders.create`).
- **Database Implementation**: Table `payment_requests` (order_id, purpose, amount_paise, currency, status, razorpay_order_id, idempotency_key, is_test). Unique index on `razorpay_order_id` and `(order_id, purpose, idempotency_key)`.
- **API Dependencies**: REQ-FND-01, REQ-CS-10.
- **Role Permissions**: Customer (own orders), Sales, Admin.
- **Business Rules**:
  1. **CLIENT NEVER SUPPLIES PAYMENT AMOUNT**: Backend computes exact amount in integer paise based on configured payment policy [NC] and remaining balance.
  2. Request requires `Idempotency-Key` header; repeated calls with same key return existing payment request without creating new Razorpay orders.
  3. All records carry `is_test = true`. Razorpay credentials loaded strictly from server environment variables.
- **Validation & Error Handling**: Rejects if remaining balance <= 0. 409 Conflict if open payment request exists.
- **Audit Requirements**: Payment request creation and idempotency re-hits audited.
- **Test Cases**: `T-32` (repeated request with same Idempotency-Key returns identical Razorpay order), `T-PAY-01` (client amount injection ignored).
- **Acceptance Criteria**: Seamless, tamper-proof payment initialization strictly anchored to backend financial ledger.
- **Dependencies on Other Modules**: REQ-CS-10.

---

### REQ-SFA-07: Razorpay Signature Verification, Webhook Processing & Ledger Integration
- **Exact Feature Name**: Dual-Channel (Callback & Webhook) Cryptographic Verification & Idempotent Ledger Application
- **Specification Section**: §1.3 (P2), §7.7, §10.2 (Stages 11–12), §10.3, §11.4 (`S-42`, `S-43`), §16.5, §17.3, §17.4, §17.7
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Payment Verification Status Screen (`P-13`): polling with spinner, real-time transition to "Payment Verified Successfully" or "Verification Under Review". Admin Payment Detail (`S-43`).
- **Backend Implementation**: `POST /payment-requests/:id/verify`, `POST /webhooks/razorpay`, `applyVerifiedPayment(attempt)`.
- **Database Implementation**: Tables: `payment_attempts`, `payments`, `razorpay_webhook_events`. Unique constraints on `razorpay_payment_id`, `payments.attempt_id`, `razorpay_webhook_events.provider_event_id`.
- **API Dependencies**: REQ-SFA-06.
- **Role Permissions**: Customer callback: authenticated. Webhook: public route protected by HMAC signature verification.
- **Business Rules**:
  1. **NEVER TRUST CLIENT SUCCESS ALONE**: Payment marked verified ONLY after cryptographic signature verification (HMAC SHA256 of order_id + payment_id using `RAZORPAY_KEY_SECRET`).
  2. Webhook verification checks signature on **RAW REQUEST BODY** using `RAZORPAY_WEBHOOK_SECRET`.
  3. Dual-channel race condition (callback vs webhook) handled by single transactional `applyVerifiedPayment` function with row-level lock on `payment_requests` and `unique(attempt_id)` constraint. Exactly ONE `payments` row is created.
  4. Duplicate webhook delivery returns 200 OK immediately and performs no duplicate database writes.
  5. Verified payment updates order `payment_status` (`Paid` / `Partially Paid`), decrements balance, and unlocks fulfillment gate.
- **Validation & Error Handling**: Invalid signature returns 400 Bad Request and logs security alert. Amount/order mismatch flags status `Mismatch (review)` and excludes from balances.
- **Audit Requirements**: Every verified payment, webhook event, and signature failure recorded in `audit_logs` and `razorpay_webhook_events`.
- **Test Cases**: `T-25` / `AC-2` (test mode payment verified and balance updated), `T-28` (invalid callback signature rejected), `T-29` (invalid webhook signature rejected 400), `T-30` (duplicate webhook delivery causes no second ledger entry), `T-33` (callback and webhook race creates exactly one payment row).
- **Acceptance Criteria**: Mathematically infallible payment accounting immune to dropped connections, replay attacks, and duplicate webhook delivery.
- **Dependencies on Other Modules**: REQ-SFA-06.

---

### REQ-SFA-08: Admin Payment Reconciliation, Offline Payments & Exceptions
- **Exact Feature Name**: Administrative Payment Reconciliation, Manual Payment Logging & Policy Override
- **Specification Section**: §6.4, §7.7, §10.3, §11.4 (`S-43`, `S-44`), §16.5, §17.6, §17.10
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Payment Detail Reconciliation Tab (`S-43`), Manual Payment Entry Form, Policy Exception Approval Queue (`S-44`).
- **Backend Implementation**: `POST /payment-requests/:id/reconcile`, `POST /payments/manual`, `POST /policy-exceptions/:id/approve`.
- **Database Implementation**: Tables: `payment_reconciliations`, `policy_exceptions`.
- **API Dependencies**: REQ-SFA-07.
- **Role Permissions**: Admin only.
- **Business Rules**:
  1. Verified payment records are IMMUTABLE. Corrections require a reversing entry, never direct editing or deletion.
  2. Admin can record offline payments (Cash/Bank transfer) with mandatory reference and proof document upload.
  3. Policy exceptions permit inventory allocation or dispatch before required payment gate is satisfied; requires Admin approval and mandatory justification.
- **Validation & Error Handling**: Reconcile requires action and reason. Manual payment requires proof document.
- **Audit Requirements**: Reconciliations, manual payment entries, and policy exceptions fully audited.
- **Test Cases**: `T-31` (payment mismatch under review), `T-PAY-02` (admin records manual bank transfer with proof).
- **Acceptance Criteria**: Complete auditability of non-standard financial events and executive overrides.
- **Dependencies on Other Modules**: REQ-SFA-07.

---

### REQ-SFA-09: Invoicing, Receipts & Financial Balance Engine
- **Exact Feature Name**: Automated Invoice Generation, Payment Allocation & Customer Receipts
- **Specification Section**: §7.7, §11.4 (`S-90`), §15.2, §16.5
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Invoice Management Screen (`S-90`): invoice list, status (`Draft`, `Issued`, `Partially Paid`, `Paid`, `Void`), itemized breakdown, payment allocation history, Download Receipt button.
- **Backend Implementation**: `POST /invoices`, `GET /invoices`, `POST /invoices/:id/void`.
- **Database Implementation**: Tables: `invoices`, `invoice_items`. Unique index on `invoice_code`.
- **API Dependencies**: REQ-CS-10, REQ-SFA-07.
- **Role Permissions**: Admin: Full CRUD. Sales: View own order invoices. Customer: View own invoices and receipts.
- **Business Rules**: Invoices generated from accepted quotation BOM after order confirmation. Balances derived strictly from ledger: `outstanding = order_total - verified_payments`. If verified payments > total, UI displays "Overpaid — review required" rather than negative balance.
- **Validation & Error Handling**: Voiding an invoice requires Admin reason.
- **Audit Requirements**: Invoice issuance and voiding audited.
- **Test Cases**: `T-22` (order outstanding balance accurately reflects advance and balance payments).
- **Acceptance Criteria**: Transparent billing and automated receipting tied directly to verified transactions.
- **Dependencies on Other Modules**: REQ-SFA-07.

---

### REQ-SFA-10: Project Profitability & Financial Health Analytics
- **Exact Feature Name**: Project-Wise Real-Time Profit & Loss (P/L) Engine
- **Specification Section**: §7.7, §10.2 (Stage 24), §11.4 (`S-94`), §16.5
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Project Profitability Screen (`S-94`): contract revenue, breakdown of Material Cost, Labor Cost, Other Direct Costs, Service/Warranty Costs, Net Profit, Margin %. Clear visual labels for **Actual** vs **Estimate**.
- **Backend Implementation**: `GET /projects/:id/profitability`, `GET /reports/profitability`.
- **Database Implementation**: Aggregates from `orders`, `serial_items.unit_cost_paise`, `job_time_entries`, `expenses`, `service_charges`.
- **API Dependencies**: REQ-OPS-01, REQ-OPS-10, REQ-SFA-03, REQ-SFA-07.
- **Role Permissions**: Admin only.
- **Business Rules**: Formula:
  `Project Profit = Contract Revenue - (Material Cost + Labor Cost + Other Direct Costs + Unbilled Service Costs)`.
  `Margin % = Project Profit / Contract Revenue`.
  Material cost = sum of unit costs of dispatched items minus returns. Labor cost = sum of approved technician hours * technician cost rate. Estimates (at quotation) and actuals (from receipts/timesheets) are strictly segregated and labeled. Overheads excluded by default [NC].
- **Validation & Error Handling**: Gracefully handles projects with incomplete timesheets by showing labor cost as "Pending Timesheet Approval".
- **Audit Requirements**: Access to financial profitability reports logged.
- **Test Cases**: `T-23` / `AC-12` (project profitability math reconciles against manual test calculation using §7.7 formula).
- **Acceptance Criteria**: Crystal-clear financial visibility showing exact profitability for every single solar installation.
- **Dependencies on Other Modules**: REQ-OPS-01, REQ-OPS-10, REQ-SFA-07.

---

### REQ-SFA-11: Secondary Financial Records: Expenses, Timesheets & Subsidy Tracker
- **Exact Feature Name**: Project Expense Logging, Technician Timesheet Approvals & Subsidy Paperwork Tracker
- **Specification Section**: §7.7, §11.4 (`S-91`, `S-92`, `S-93`), §15.2, §16.5
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Expense Management (`S-91`), Technician Pay Records (`S-92`), Subsidy Tracker (`S-93`): document checklist, status progression (`Not Applicable → Documents Pending → Submitted → Under Review → Approved → Disbursed`).
- **Backend Implementation**: `POST /expenses`, `POST /timesheets/:id/approve`, `PATCH /subsidy/:projectId`.
- **Database Implementation**: Tables: `expenses`, `technician_pay_records`, `subsidy_applications`.
- **API Dependencies**: REQ-FND-03, REQ-OPS-10.
- **Role Permissions**: Admin: Approve expenses, timesheets, and pay records. Sales: Upload subsidy documents. Technician: View own hours.
- **Business Rules**: Expenses only count toward project costs after Admin approval. Timesheets lock upon approval. Subsidy tracker tracks document status and receivable amounts only; **NO statutory subsidy eligibility computation** is performed [NC]. Statutory payroll deductions are out of scope.
- **Validation & Error Handling**: Non-negative amounts. Disbursed subsidy requires disbursement date.
- **Audit Requirements**: Timesheet approvals and expense authorizations audited.
- **Test Cases**: `T-FIN-01` (unapproved expense excluded from project P/L; approved expense included).
- **Acceptance Criteria**: Comprehensive auxiliary cost control and government subsidy document tracking.
- **Dependencies on Other Modules**: REQ-OPS-10.

---

### REQ-SFA-12: Role-Aware Dashboards & Executive Analytics
- **Exact Feature Name**: Role-Tailored Operational Dashboards with Authoritative Metric Reconciliation
- **Specification Section**: §11.4 (`S-01`), §13.1, §13.2, §13.3, §16.5
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Role-Aware Dashboard (`S-01`) rendering role-specific widgets using Recharts:
  - **Admin**: Revenue, verified payments, outstanding, conversion funnel, inventory alerts, crew utilization, warranty claims, P1 queue, and **authoritative reconciliation widget** (`dashboard total - sum(verified payments) = 0`).
  - **Sales**: Lead funnel, pending surveys, quotations awaiting customer, orders awaiting payment.
  - **Warehouse**: Projects ready to reserve/dispatch, shortage alerts, serial scans pending.
  - **Technician**: Today's schedule, pending signatures, approved hours.
  - **Support**: Open cases queue, P1 safety alerts, warranty expiries upcoming.
- **Backend Implementation**: `GET /dashboard/:role`.
- **Database Implementation**: SQL aggregation queries against underlying transactional tables.
- **API Dependencies**: All modules.
- **Role Permissions**: Enforced dynamically per authenticated user's role.
- **Business Rules**: All metrics computed server-side. Every metric provides a drill-down link to the exact underlying record set. Payment figures reconcile 100% with verified payments ledger. Seeded demo data carries global "Demo data — fictional" banner.
- **Validation & Error Handling**: Server filters enforce role scopes strictly.
- **Audit Requirements**: Dashboard loads logged.
- **Test Cases**: `T-24` / `AC-9` (dashboard payment totals reconcile perfectly against verified payments table with 0 discrepancy).
- **Acceptance Criteria**: High-density, real-time command center tailored to each specific team member's responsibilities.
- **Dependencies on Other Modules**: All functional modules.

---

### REQ-SFA-13: AI Assistance Layer: Core Architecture & Guardrails
- **Exact Feature Name**: Sandboxed AI Assistance Layer with Permission Scoping & Deterministic Fallbacks
- **Specification Section**: §8.1, §8.3, §16.10, §19
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**: Labeled AI Panel component (`--color-ai` purple tint, "AI-generated" badge, source record links, timestamp, Regenerate button, Demo template banner when in mock mode, error fallback banner).
- **Backend Implementation**: Internal `ai` module (Context Builder, Prompt Templates, Provider Adapter, Output Validator, Safety Interceptor, AI Audit). Endpoints: `/ai/...`.
- **Database Implementation**: Table `ai_requests` (user_id, feature, entity_refs, provider_mode, status, latency_ms, input_hash, output_hash, fallback_used). No raw prompts stored.
- **API Dependencies**: REQ-FND-03, REQ-FND-04.
- **Role Permissions**: Runs strictly under caller's identity; retrieval functions enforce identical row scopes and permissions as REST API.
- **Business Rules**:
  1. Default provider is `mock` (deterministic templates). External provider requires documented privacy decision [NC] and `AI_EXTERNAL_ALLOWED=true`.
  2. No customer PII, financial details, private photos, or signatures sent to external models.
  3. AI CANNOT execute consequential actions (payments, stock changes, warranty coverage, approvals, closures). Suggested actions returned as `proposed_actions` buttons that invoke standard API endpoints under user authorization.
  4. Output validator verifies cited IDs and numbers against context; falls back to template on mismatch.
- **Validation & Error Handling**: Timeouts or model errors return deterministic rule-based template with `fallbackUsed: true`.
- **Audit Requirements**: Every AI request logged to `ai_requests` with input/output hashes and latency.
- **Test Cases**: `T-35` (output citations grounded in context), `T-36` (missing data stated clearly), `T-37` (asking about unauthorized record returns neutral refusal), `T-38` (provider failure returns graceful fallback), `T-39` (suggested action requires user click and backend validation).
- **Acceptance Criteria**: Safe, grounded, permission-aware AI assistance that enhances productivity without compromising data integrity.
- **Dependencies on Other Modules**: REQ-FND-03, REQ-FND-04.

---

### REQ-SFA-14: AI MVP Capabilities: Summaries, Missing Info, Explanations & Triage
- **Exact Feature Name**: Concrete AI MVP Implementations (AI-A1, AI-A2, AI-D1, AI-E1, AI-G1)
- **Specification Section**: §8.2, §8.4, §9.2, §16.10
- **Classification**: Mandatory [SRC]
- **Frontend Implementation**:
  1. Enquiry Detail: "Summarize this record" (AI-A1) & "Check missing info" (AI-A2).
  2. Support Case Detail: "Summarize case" & link relevant serials (AI-D1).
  3. Warranty Detail: "Explain this warranty" (AI-E1) with separate System Result panel and AI Plain-Language panel.
  4. Customer Issue Form: Guided triage conversation & approved help article suggestions (AI-G1).
- **Backend Implementation**: `POST /ai/enquiries/:id/summary`, `POST /ai/enquiries/:id/missing-info`, `POST /ai/cases/:id/summary`, `POST /ai/warranties/:id/explain`, `POST /ai/cases/:id/triage`.
- **Database Implementation**: Table `help_articles` (curated admin-approved guidance). Queries existing entity tables.
- **API Dependencies**: REQ-SFA-13.
- **Role Permissions**: Respective module read permissions required.
- **Business Rules**:
  - Missing info check (AI-A2) is 100% deterministic based on required field rules.
  - Warranty explanation (AI-E1) never contradicts backend eligibility result; output validator asserts agreement.
  - Guided triage (AI-G1) provides troubleshooting guidance ONLY from approved help articles (`help_articles.status = 'Approved'`).
- **Validation & Error Handling**: Output validator rejects hallucinated dates or numbers.
- **Audit Requirements**: Invocations logged to `ai_requests`.
- **Test Cases**: `T-20` (inverter warranty explained in plain language alongside WITHIN_PERIOD badge), `T-CASE-01` (AI triage guides basic issue using approved article).
- **Acceptance Criteria**: Verified intelligence layer operational across core sales, warranty, and customer support workflows.
- **Dependencies on Other Modules**: REQ-SFA-13.

---

## 5. Optional Features & Out of Scope Boundary (Explicit Tracking)

### Optional Features (§4.2)
- **OPT-01: Camera-Based Barcode/QR Scanning** (§4.2, §7.3, §14.1) — Browser-based scanning via html5-qrcode. Assigned to Member 3. Fallback: manual keyboard/USB scanner.
- **OPT-02: Interactive Site Maps** (§4.2, §14.1) — Leaflet with OpenStreetMap tiles for site location on surveys/jobs. Assigned to Member 2 / Member 3. Fallback: textual address.
- **OPT-03: External Communication Delivery** (§4.2, §18) — SMTP email, Twilio SMS, WhatsApp Business API. Assigned to Member 1 / Member 4. Fallback: in-app notifications and simulated outbox (`S-109`).
- **OPT-04: Lightweight Partner Coordination** (§3 Problem 8, §4.2, §6.5, §11.6 `S-110`, §15.2) — Minimal `partners` and `partner_assignments` tables with restricted external partner role. Assigned to Member 3 / Member 1. Fallback: omit partner module.
- **OPT-05: Customer OTP Authentication** (§4.2, §14.5) — SMS/email one-time password login for portal. Assigned to Member 1. Fallback: password login.
- **OPT-06: CSV/PDF Report & Document Exports** (§4.2, §7.2, §7.7) — Downloadable quotation PDFs and financial CSV exports. Assigned to Member 2 / Member 4. Fallback: on-screen view and browser print.
- **OPT-07: Offline Technician Mode** (§4.2, §7.4) — Service worker / local storage caching for unstable site connections. Assigned to Member 3. Fallback: online-first with upload retry queue.
- **OPT-08: Follow-Up Draft Assistant (AI-A3)** (§8.2, §8.4) — Drafts customer follow-up message. Assigned to Member 4.
- **OPT-09: Survey Consistency Review Assistant (AI-B1)** (§8.2, §8.4) — Flags survey contradictions. Assigned to Member 4.
- **OPT-10: Material Readiness Assistant (AI-C1)** (§8.2, §8.4) — Summarizes project BOM readiness. Assigned to Member 4.
- **OPT-11: Installation History Summary (AI-D3)** (§8.2, §8.4) — Summarizes historical job notes. Assigned to Member 4.
- **OPT-12: Executive Profitability Summary (AI-F1)** (§8.2, §8.4) — Summarizes P/L in natural language. Assigned to Member 4.

---

### Out of Scope Features (§4.3)
- **OOS-01: Separate Partner Platform or Nationwide Network** (§4.3 `X-01`) — No distinct multi-tenant partner system; only lightweight partner role if OPT-04 chosen.
- **OOS-02: Live Production Razorpay Payments** (§4.3 `X-02`) — System operates strictly in Razorpay TEST MODE. No real bank accounts or money movement.
- **OOS-03: Statutory Tax/GST, Payroll & Subsidy Compliance Computation** (§4.3 `X-03`) — No automated GST filing, statutory payroll deductions, or government subsidy eligibility determination.
- **OOS-04: Legal / Regulatory Standards Certification** (§4.3 `X-04`) — Case study does not claim formal compliance with DISCOM, CEIG, or statutory grid standards.
- **OOS-05: Native Mobile Applications (iOS / Android)** (§4.3 `X-05`) — Platform is a responsive web application (SPA) optimized for mobile viewports.
- **OOS-06: IoT Inverter Telemetry & Live Smart Meter Streaming** (§4.3 `X-06`) — No real-time MQTT/WebSocket inverter hardware streaming or generation telemetry.
- **OOS-07: Consequential Autonomous AI Decision Making** (§4.3 `X-07`) — AI is strictly barred from approving surveys, modifying stock, issuing binding quotes, deciding warranty claims, or closing cases.
- **OOS-08: Uncontrolled External AI Data Transmission** (§4.3 `X-08`) — No customer PII, financial ledgers, signatures, or photos sent to external LLMs without explicit configuration and privacy approval.
- **OOS-09: Enterprise ERP / Accounting Package Integration** (§4.3 `X-09`) — No integration with SAP, Tally, Zoho Books, or QuickBooks. System contains its own internal project ledger.
