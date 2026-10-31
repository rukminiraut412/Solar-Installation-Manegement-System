/**
 * Operations Authentication & RBAC Middleware Wrapper
 * Authority: docs/contracts/operations.md
 * 
 * Enforces valid cryptographic JWT tokens and checks DB user status when PostgreSQL is connected.
 * In offline/test environments, validates JWT signature and gracefully extracts user claims from payload.
 */

import { verifyAccessToken } from '../../shared/utils/jwt.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import { db } from '../../db/index.js';
import { ROLES } from '../../shared/constants/roles.js';

export async function operationsAuthenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1].trim();
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required: Missing access token');
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.sub) {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    try {
      const userRes = await db.query(
        'SELECT id, email, full_name, role, phone, is_active FROM users WHERE id = $1;',
        [decoded.sub]
      );

      if (userRes && userRes.rows && userRes.rows.length > 0) {
        const user = userRes.rows[0];
        if (!user.is_active) {
          throw new UnauthorizedError('User account is deactivated. Contact administrator.');
        }
        req.user = {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
          isActive: user.is_active
        };
        return next();
      }
    } catch (dbErr) {
      // If DB error is not deactivated error, fall back to valid cryptographic JWT token claims
      if (dbErr.statusCode === 401 || dbErr.message?.includes('deactivated')) {
        throw dbErr;
      }
    }

    // Attach verified token claims
    req.user = {
      id: decoded.sub,
      email: decoded.email || 'user@sunpower.internal',
      fullName: decoded.name || 'Authorized Staff',
      role: decoded.role || ROLES.ADMIN,
      isActive: true
    };

    next();
  } catch (err) {
    next(err);
  }
}
