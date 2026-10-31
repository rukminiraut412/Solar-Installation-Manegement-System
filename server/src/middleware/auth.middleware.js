import { verifyAccessToken } from '../shared/utils/jwt.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';
import { db } from '../db/index.js';

/**
 * Authentication middleware
 * Verifies JWT access token and populates req.user from database
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1].trim();
    } else if (req.cookies && req.cookies.accessToken) {
      // 2. Check HTTP-only cookie
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required: Missing access token');
    }

    // 3. Verify JWT
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.sub) {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    // 4. Verify user exists and is active in database
    const userRes = await db.query(
      'SELECT id, email, full_name, role, phone, is_active FROM users WHERE id = $1;',
      [decoded.sub]
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedError('User account not found');
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedError('User account is deactivated. Contact administrator.');
    }

    // Attach sanitized user context to request
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active,
    };

    next();
  } catch (err) {
    next(err);
  }
}
