import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError.js';
import { ROLES, hasPermission } from '../shared/constants/roles.js';
import { filterConfidentialData } from '../shared/utils/rowScope.js';

/**
 * Role-based access control middleware
 * Checks if authenticated user has one of the allowed roles
 * @param {string|string[]} roles - Allowed role or array of allowed roles
 */
export function authorize(...roles) {
  const allowed = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowed.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 * Checks if the user's role possesses the granular permission
 * @param {string} permission - e.g. 'quotes:approve_discount'
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Missing required permission '${permission}'`
        )
      );
    }

    next();
  };
}

/**
 * Admin-only shortcut middleware
 */
export const requireAdmin = authorize(ROLES.ADMIN);

/**
 * Middleware that automatically intercepts responses and sanitizes confidential financial margins
 * if the user is not an Admin/Owner
 */
export function sanitizeFinancialResponse(req, res, next) {
  const originalJson = res.json;

  res.json = function (body) {
    if (body && body.data && req.user) {
      body.data = filterConfidentialData(body.data, req.user.role);
    }
    return originalJson.call(this, body);
  };

  next();
}
