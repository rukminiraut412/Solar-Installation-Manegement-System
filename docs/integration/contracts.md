# Module Integration Contracts for Members 2, 3, and 4

## 1. Module Router Mounting Protocol
Each member's module must export an Express Router from an `index.js` or `<module>.routes.js` file:
```javascript
// server/src/modules/<module-name>/routes.js
import { Router } from 'express';
const router = Router();

// Define routes using shared middleware
router.get('/', authenticate, authorize(['Admin/Owner', 'Sales']), controllerFn);

export default router;
```

In `server/src/app.js`, Member 1 mounts each module router under `/api/v1/<prefix>`:
- Member 2: `/api/v1/leads`, `/api/v1/quotations`, `/api/v1/surveys`
- Member 3: `/api/v1/projects`, `/api/v1/inventory`, `/api/v1/tasks`
- Member 4: `/api/v1/tickets`, `/api/v1/payments`, `/api/v1/analytics`

## 2. Authentication Context (`req.user`)
After successful passage through the `authenticate` middleware, `req.user` is guaranteed to contain:
```typescript
interface RequestUser {
  id: string; // UUID v4
  email: string;
  name: string;
  role: 'Admin/Owner' | 'Sales' | 'Warehouse' | 'Technician' | 'Support';
  isActive: boolean;
}
```

## 3. Database Access and Transactions
Members must import the shared database pool from `server/src/db/index.js`:
```javascript
import { db } from '../../db/index.js';

// Simple queries
const result = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);

// Multi-step atomic transactions
const client = await db.getClient();
try {
  await client.query('BEGIN');
  // statements...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

## 4. Error Handling
Do not manually write `res.status(500).json(...)`. Throw standard AppError classes:
```javascript
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError.js';

if (!lead) {
  throw new NotFoundError('Lead not found');
}
```
The centralized error handler will automatically format the response envelope.
