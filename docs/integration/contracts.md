# Shared Integration Contracts & Architecture Guidelines
**Project:** Solar Installation Management System (SunPower Solutions)  
**Author:** Member 1 (Platform Foundation Lead)  
**Target Audience:** Members 2, 3, and 4  
**Version:** 2.0.0  

---

## 1. Authentication Endpoints & Token Lifecycle

### Endpoints
| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/v1/auth/login` | POST | Public | Authenticates user; returns `accessToken` (15m) and `refreshToken` (7d) in body & HTTP-only cookies |
| `/api/v1/auth/refresh` | POST | Public | Rotates refresh token and returns a fresh `accessToken` |
| `/api/v1/auth/logout` | POST | Public / Auth | Revokes refresh token in database & clears cookies |
| `/api/v1/auth/me` | GET | Protected | Returns current authenticated user profile |
| `/api/v1/auth/users` | POST | Admin/Owner | Provisions a new staff user with one of the 5 project roles |

### Default Seeded Test Accounts (Dev/Test Environment)
| Role | Email | Password | Scope / Responsibility |
|---|---|---|---|
| **Admin/Owner** | `admin@sunpower.com` | `Admin@12345` | Unrestricted visibility, profit margins, technician payroll |
| **Sales** | `sales@sunpower.com` | `Sales@12345` | Leads, site survey scheduling, quotations, customer portal |
| **Warehouse** | `warehouse@sunpower.com` | `Warehouse@12345` | Stock ledger, receipts, reservations, dispatch & barcode scanning |
| **Technician** | `technician@sunpower.com` | `Technician@12345` | Assigned roof surveys, rooftop installation jobs, generation testing |
| **Support** | `support@sunpower.com` | `Support@12345` | Customer lookup, warranty validation, service complaints & tickets |

---

## 2. JWT Claims & Request Context (`req.user`)

When a route is protected with `authenticate` middleware, `req.user` is guaranteed to be available with the following shape:

```typescript
interface AuthenticatedUser {
  id: string;        // UUID v4
  email: string;     // E.g. 'sales@sunpower.com'
  fullName: string;  // E.g. 'Priya Verma (Sales Lead)'
  role: 'Admin/Owner' | 'Sales' | 'Warehouse' | 'Technician' | 'Support';
  phone?: string;
  isActive: boolean;
}
```

---

## 3. Five-Role Permission Matrix

| Granular Permission | Admin/Owner | Sales | Warehouse | Technician | Support |
|---|:---:|:---:|:---:|:---:|:---:|
| `leads:view` / `leads:create` / `leads:update` | ✅ | ✅ | ❌ | ❌ | ✅ (view) |
| `survey:schedule` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `survey:conduct` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `quotes:view` / `quotes:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `inventory:view` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `inventory:manage` / `inventory:dispatch` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `serial:scan` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `jobs:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `jobs:execute` / `jobs:sign_off` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `tickets:view` / `tickets:manage` | ✅ | ❌ | ❌ | ❌ | ✅ |
| **`finance:view_profit_margins`** | ✅ *(CONFIDENTIAL)* | ❌ | ❌ | ❌ | ❌ |
| **`finance:view_tech_payroll`** | ✅ *(CONFIDENTIAL)* | ❌ | ❌ | ❌ | ❌ |
| `users:manage` / `audit_logs:view` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Middleware Usage Examples for Members 2, 3 & 4

### A. Protecting a Route with Authentication & Role Check
```javascript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize, requirePermission, requireAdmin } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createLeadSchema } from './sales.validators.js';

const router = Router();

// Only Sales and Admin can create a lead
router.post(
  '/leads',
  authenticate,
  authorize('Admin/Owner', 'Sales'),
  validate(createLeadSchema),
  salesController.createLead
);

// Only Admin can approve extra discount
router.patch(
  '/quotes/:id/approve-discount',
  authenticate,
  requirePermission('quotes:approve_discount'), // or requireAdmin
  salesController.approveDiscount
);
```

### B. Enforcing Row-Level Scopes
```javascript
import { getRowScope } from '../../shared/utils/rowScope.js';
import { db } from '../../db/index.js';

// Sales rep only views their assigned leads; Admin views all
export async function getLeads(req, res, next) {
  try {
    const { clause, params } = getRowScope(req.user, 'leads', 1);
    const sql = `SELECT * FROM leads WHERE ${clause} ORDER BY created_at DESC;`;
    const result = await db.query(sql, params);
    return successResponse(res, result.rows);
  } catch (err) {
    next(err);
  }
}
```

### C. Automatic Confidential Data Sanitization
If returning quotation or job data that contains `profitMargin`, `costPrice`, or `technicianCost`, use `sanitizeFinancialResponse`:
```javascript
import { sanitizeFinancialResponse } from '../../middleware/rbac.middleware.js';

router.get(
  '/projects/:id',
  authenticate,
  sanitizeFinancialResponse, // Automatically strips margins for non-admins!
  projectController.getProject
);
```

---

## 5. Audit Logging Interface

Every major state mutation (approvals, dispatch, sign-off, payments) MUST be logged via `recordAuditLog`:

```javascript
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

await recordAuditLog({
  userId: req.user.id,
  action: 'QUOTE_ACCEPTED',
  entity: 'QUOTATION',
  entityId: quote.id,
  oldValues: { status: 'SENT' },
  newValues: { status: 'ACCEPTED', advancePaid: true },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

---

## 6. Database Transactions Interface

Always wrap multi-table modifications inside atomic PostgreSQL transactions:

```javascript
import { db } from '../../db/index.js';

const client = await db.getClient();
try {
  await client.query('BEGIN');
  
  // Step 1: Reserve stock
  await client.query('UPDATE stock SET reserved = reserved + $1 WHERE product_id = $2', [qty, productId]);
  
  // Step 2: Create dispatch note
  await client.query('INSERT INTO dispatch_notes ...');
  
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err; // Central error handler catches and formats response
} finally {
  client.release();
}
```

---

## 7. Standardized Error Handling

Never invoke `res.status(500).json(...)`. Throw standard AppError classes from `server/src/shared/errors/AppError.js`:

```javascript
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors/AppError.js';

if (!survey) throw new NotFoundError('Site survey not found');
if (!isApproved) throw new BadRequestError('Cannot generate quote before survey approval');
```

---

## 8. Cloudinary Shared File Upload Interface (For Members 2 & 3)

Direct client uploads allow mobile phones (site surveys, roof completion photos, customer screen signatures) to upload directly to Cloudinary without streaming high-bandwidth binary through the backend Express server.

### A. Obtain Signed Upload Parameters
Make an authenticated request from frontend or API client:
- **Endpoint:** `POST /api/v1/media/sign-upload`
- **Request Body:**
  ```json
  {
    "folder": "surveys | installations | signatures | receipts | tickets",
    "resourceType": "image" // or "raw" for PDF documents
  }
  ```
- **Response Data:**
  ```json
  {
    "success": true,
    "data": {
      "cloudName": "your_cloud_name",
      "apiKey": "your_api_key",
      "timestamp": 1730370000,
      "folder": "installations",
      "signature": "3b2f56789...",
      "uploadUrl": "https://api.cloudinary.com/v1_1/your_cloud_name/image/upload",
      "maxFileSize": 10485760,
      "allowedFormats": ["jpg", "jpeg", "png", "webp", "pdf"],
      "isMock": false
    }
  }
  ```

### B. Client Direct Upload Code Example (Browser / Mobile)
```javascript
// 1. Get signature from backend
const { data: signData } = await api.post('/media/sign-upload', {
  folder: 'installations',
});

// 2. Upload file directly to Cloudinary
const formData = new FormData();
formData.append('file', fileObject);
formData.append('api_key', signData.data.apiKey);
formData.append('timestamp', signData.data.timestamp);
formData.append('signature', signData.data.signature);
formData.append('folder', signData.data.folder);

const cloudinaryRes = await axios.post(signData.data.uploadUrl, formData);
const secureUrl = cloudinaryRes.data.secure_url; // Store this in your PostgreSQL table
```

### C. Backend Direct Upload Validation Utility
```javascript
import { validateMediaMetadata } from '../../shared/utils/cloudinary.js';

// Validate file metadata before saving to DB
validateMediaMetadata({ format: 'png', bytes: 2048576 });
```

---

## 9. Data Sanitization & Privacy Guards

### A. Stripping Confidential Financial Figures (For Non-Admins)
Use `filterConfidentialData(recordOrArray, req.user.role)` or `sanitizeFinancialResponse` middleware to prevent non-admins from viewing:
- `profit_margin`, `net_profit`, `gross_margin`
- `cost_price`, `internal_cost`
- `technician_cost`, `technician_payout`, `hourly_rate`

### B. Stripping Internal Data for Customer-Facing Views
Use `filterCustomerFacingData(recordOrArray)` to prevent customers from viewing:
- `internal_notes`, `internalNotes`
- `risk_score`, `fraud_check_flags`
- All confidential pricing and profit margins
