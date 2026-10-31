# INTEGRATION REQUEST (IR) — MEMBER 2 (CUSTOMER & SALES)

**To:** Member 1 (Platform Foundation Lead)  
**From:** Member 2 (Customer & Sales Lead)  
**Date:** October 31, 2026  
**Status:** READY FOR PLATFORM INTEGRATION  
**Topic:** Route Registration & Dashboard Mounting for Customer & Sales Module  
**Strict Policy Reference:** `docs/planning/member-ownership.md` (§3.1 & §3.4)

---

## 1. Overview

Member 2 has fully implemented and verified the Customer & Sales module across all 5 phases:
1. Customer Management & 360° Timeline (`CustomerManagement.jsx`, `customer.service.js`)
2. Omnichannel Enquiries & Duplicate Merge (`EnquiryManagement.jsx`, `enquiry.service.js`)
3. Site Survey Audit & Engineering Gate (`SiteSurveyManagement.jsx`, `survey.service.js`)
4. 10 Solar Packages, Dynamic BOM & Digital Quote Portal (`QuotationManagement.jsx`, `PublicQuotePortal.jsx`, `quotation.service.js`)
5. Order Creation, Frozen BOM & Handover Gate (`OrderFulfilmentHandover.jsx`, `order.service.js`)

In accordance with strict architectural governance (`docs/planning/member-ownership.md`), Member 2 **does not overwrite or claim ownership of shared platform files** (`server/src/app.js`, `client/src/App.jsx`, `client/src/components/dashboard/Dashboard.jsx`).

This document provides the exact integration instructions and line-by-line diffs for Member 1 to mount the Customer & Sales subsystem into the platform monolith.

---

## 2. Server Integration: `server/src/app.js`

### Target File
`server/src/app.js` (Owned by Member 1)

### Required Change
Import `customerSalesRouter` from `./modules/customer-sales/customer-sales.routes.js` and mount it under `/customer-sales` on the `apiRouter`.

### Exact Diff
```diff
--- a/server/src/app.js
+++ b/server/src/app.js
@@ -9,6 +9,7 @@ import { notFoundHandler } from './middleware/notFoundHandler.js';
 import { errorHandler } from './middleware/errorHandler.js';
 import authRouter from './modules/auth/auth.routes.js';
 import mediaRouter from './shared/routes/media.routes.js';
+import customerSalesRouter from './modules/customer-sales/customer-sales.routes.js';
 
 const app = express();
 
@@ -68,6 +69,9 @@ apiRouter.use('/auth', authRouter);
 // Mount Platform Foundation Shared Media Upload module
 apiRouter.use('/media', mediaRouter);
 
+// Mount Member 2 Customer & Sales module
+apiRouter.use('/customer-sales', customerSalesRouter);
+
 // Mount API router
 app.use('/api/v1', apiRouter);
```

### Impact & Safety
* Prefixes all Customer & Sales routes under `/api/v1/customer-sales/`.
* Inherits Platform Foundation security headers (`helmet`), `cors`, JWT authentication (`authenticate`), role-based authorization (`authorize`), and centralized error handling (`errorHandler`).
* Safe to merge; does not interfere with existing `/api/v1/auth` or `/api/v1/media` routes.

---

## 3. Client Dashboard Integration: `client/src/components/dashboard/Dashboard.jsx`

### Target File
`client/src/components/dashboard/Dashboard.jsx` (Owned by Member 1)

### Required Change
Mount `CustomerSalesModule` when `activeTab === 'leads'` or `activeTab === 'quotes'`.

### Exact Diff
```diff
--- a/client/src/components/dashboard/Dashboard.jsx
+++ b/client/src/components/dashboard/Dashboard.jsx
@@ -1,5 +1,6 @@
 import React from 'react';
 import { useAuth } from '../../shared/context/AuthContext';
+import CustomerSalesModule from '../../features/customer-sales/CustomerSalesModule';
 import {
   ShieldCheck,
   Database,
@@ -15,6 +16,10 @@ export default function Dashboard({ activeTab }) {
   const { user } = useAuth();
 
+  if (activeTab === 'leads' || activeTab === 'quotes') {
+    return <CustomerSalesModule initialTab={activeTab} />;
+  }
+
   return (
     <div className="space-y-8">
```

### Impact & Safety
* When authenticated users click "Leads & Enquiries" (`leads`) or "Surveys & Quotes" (`quotes`) in the sidebar, `CustomerSalesModule` renders seamlessly.
* For all other tabs (`dashboard`, `jobs`, `inventory`, `finance`, `audit`), the standard layout and existing cards continue rendering without modification.

---

## 4. Public Proposal Portal: `client/src/App.jsx`

### Target File
`client/src/App.jsx` (Owned by Member 1)

### Required Change
Allow prospective solar customers to view and digitally sign their solar quotations via `/portal/quotes/:token` without requiring staff authentication.

### Exact Diff
```diff
--- a/client/src/App.jsx
+++ b/client/src/App.jsx
@@ -3,6 +3,7 @@ import { AuthProvider, useAuth } from './shared/context/AuthContext';
 import Login from './components/auth/Login';
 import Layout from './components/layout/Layout';
 import Dashboard from './components/dashboard/Dashboard';
+import PublicQuotePortal from './features/customer-sales/components/PublicQuotePortal';
 import { Sun } from 'lucide-react';
 
 function MainApp() {
@@ -17,6 +18,11 @@ function MainApp() {
     );
   }
 
+  // Allow public quote review and digital signing without authentication
+  if (window.location.pathname.includes('/portal/quotes/')) {
+    return <PublicQuotePortal />;
+  }
+
   if (!isAuthenticated) {
     return <Login />;
   }
```

### Impact & Safety
* Intercepts public customer proposal links generated by sales reps (e.g., `http://localhost:5173/portal/quotes/6d09c31441c09fe54ba165ca4a5c53be415f33668748df92`).
* Renders the customer-facing `PublicQuotePortal` with itemized BOM, GST calculation, subsidy information, and digital acceptance signature pad.
* Does not bypass authentication for any internal dashboard routes.

---

## 5. Verification Status

| Component | Test Status | Details |
|---|:---:|---|
| **Backend Integration Suite** | **PASS (20/20)** | `npx vitest run src/modules/customer-sales/customer-sales.test.js` (passes in 300-500ms using self-contained test harness). |
| **Client Production Build** | **PASS** | `npm run build --workspace=client` (1642 modules transformed cleanly in Vite, 0 errors). |
| **Database Migration** | **VERIFIED** | `server/src/db/migrations/101_customer_sales.sql` validated for DDL constraints, non-conflicting table names, and foreign keys referencing Member 1's `users`. |
| **Needs Confirmation [NC] Policies** | **GUARDED** | All unconfirmed business rules (12% GST `[NC-006]`, PM Surya Ghar subsidy `[NC-007]`, 15-day validity `[NC-011]`, 10% discount cap `[NC-012]`, 25% advance `[NC-004]`, 23° tilt `[NC-015]`, 5 survey photos `[NC-016]`) are configurable defaults. |
