/**
 * Authentication and RBAC Compatibility Bridge for Member 4
 * Bridges:
 * - server/src/middleware/auth.middleware.js (authenticate)
 * - server/src/middleware/rbac.middleware.js (authorize on main)
 * - Legacy requireRole on feature branch
 */

import { authenticate as baseAuthenticate } from '../../middleware/auth.middleware.js';

let rbacAuthorize = null;
try {
  const rbac = await import('../../middleware/rbac.middleware.js');
  rbacAuthorize = rbac.authorize;
} catch {
  // Legacy / fallback mode
}

export const authenticate = baseAuthenticate;

export function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles.flat() : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const userRole = req.user.role;
    const isAllowed =
      allowed.includes(userRole) ||
      (allowed.includes('Admin/Owner') && (userRole === 'Admin/Owner' || userRole === 'Admin')) ||
      (allowed.includes('Admin') && (userRole === 'Admin/Owner' || userRole === 'Admin'));

    if (!isAllowed) {
      return res.status(403).json({
        status: 'ERROR',
        code: 'FORBIDDEN',
        message: `Role '${userRole}' is not authorized to access this resource`,
        error: {
          code: 'FORBIDDEN',
          message: `Role '${userRole}' is not authorized to access this resource`
        }
      });
    }

    next();
  };
}
