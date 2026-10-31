import { db } from '../../db/index.js';
import { hashPassword, comparePassword, hashToken } from '../../shared/utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.js';
import { UnauthorizedError, BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';
import { ROLES } from '../../shared/constants/roles.js';

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login({ email, password, ipAddress = null, userAgent = null }) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch user by email
    const res = await db.query(
      `SELECT id, email, password_hash, full_name, role, phone, is_active, created_at 
       FROM users 
       WHERE LOWER(email) = $1;`,
      [normalizedEmail]
    );

    if (res.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = res.rows[0];

    // 2. Verify account is active
    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated. Please contact an administrator.');
    }

    // 3. Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Audit failed login attempt
      await recordAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'AUTH',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // 4. Generate JWT Access and Refresh tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // 5. Hash and persist refresh token in database (7 days validity)
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3);`,
      [user.id, tokenHash, expiresAt]
    );

    // 6. Record successful login audit log
    await recordAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'AUTH',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        isActive: user.is_active,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate refresh token and issue new access token
   */
  static async refreshToken({ refreshToken, ipAddress = null, userAgent = null }) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    // 1. Verify token cryptographic signature
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.sub) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(refreshToken);

    // 2. Query token record in PostgreSQL with row-level lock
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `SELECT id, user_id, token_hash, expires_at, revoked_at 
         FROM refresh_tokens 
         WHERE token_hash = $1 FOR UPDATE;`,
        [tokenHash]
      );

      if (tokenRes.rows.length === 0) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const storedToken = tokenRes.rows[0];

      // Detect reuse of revoked token (potential theft)
      if (storedToken.revoked_at) {
        // Invalidate all tokens for this user as a security measure
        await client.query(
          `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1;`,
          [storedToken.user_id]
        );
        await client.query('COMMIT');
        throw new UnauthorizedError('Revoked refresh token detected. Please log in again.');
      }

      if (new Date(storedToken.expires_at) < new Date()) {
        throw new UnauthorizedError('Refresh token has expired');
      }

      // 3. Mark current refresh token as revoked (rotation)
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [storedToken.id]
      );

      // 4. Fetch user
      const userRes = await client.query(
        `SELECT id, email, full_name, role, phone, is_active FROM users WHERE id = $1;`,
        [storedToken.user_id]
      );

      if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
        throw new UnauthorizedError('User account not found or deactivated');
      }

      const user = userRes.rows[0];

      // 5. Issue new access token and new refresh token
      const newAccessToken = signAccessToken(user);
      const newRefreshToken = signRefreshToken(user);
      const newTokenHash = hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3);`,
        [user.id, newTokenHash, expiresAt]
      );

      await client.query('COMMIT');

      // 6. Record audit log
      await recordAuditLog({
        userId: user.id,
        action: 'TOKEN_REFRESH',
        entity: 'AUTH',
        entityId: user.id,
        ipAddress,
        userAgent,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
          isActive: user.is_active,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Log out user and revoke refresh token
   */
  static async logout({ refreshToken, userId = null, ipAddress = null, userAgent = null }) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await db.query(
        `UPDATE refresh_tokens 
         SET revoked_at = CURRENT_TIMESTAMP 
         WHERE token_hash = $1 AND revoked_at IS NULL;`,
        [tokenHash]
      );
    }

    if (userId) {
      await recordAuditLog({
        userId,
        action: 'LOGOUT',
        entity: 'AUTH',
        entityId: userId,
        ipAddress,
        userAgent,
      });
    }

    return true;
  }

  /**
   * Get user profile by ID
   */
  static async getProfile(userId) {
    const res = await db.query(
      `SELECT id, email, full_name, role, phone, is_active, created_at, updated_at 
       FROM users 
       WHERE id = $1;`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = res.rows[0];
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Public Seller Registration - Strictly defaults role to Sales
   * Never trusts client-supplied roles.
   */
  static async registerSeller({ fullName, email, password, phone = null, businessName = null, address = null }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = $1;`,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError('An account with this email address already exists. Please log in.');
    }

    const passwordHash = await hashPassword(password);
    // STRICT SECURITY: Public registration is locked to ROLES.SALES
    const role = ROLES.SALES;

    const res = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, phone, is_active, created_at;`,
      [normalizedEmail, passwordHash, fullName, role, phone]
    );

    const newUser = res.rows[0];

    await recordAuditLog({
      userId: newUser.id,
      action: 'PUBLIC_SELLER_REGISTERED',
      entity: 'USER',
      entityId: newUser.id,
      newValues: {
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.full_name,
        businessName,
        address,
      },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      phone: newUser.phone,
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
    };
  }

  /**
   * List all users (Admin/Owner restricted)
   */
  static async listUsers() {
    const res = await db.query(
      `SELECT id, email, full_name, role, phone, is_active, created_at 
       FROM users 
       ORDER BY created_at DESC;`
    );

    return res.rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      phone: row.phone,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  }

  /**
   * Activate or deactivate user account (Admin/Owner restricted)
   */
  static async toggleUserStatus({ userId, isActive, adminId }) {
    if (userId === adminId && !isActive) {
      throw new BadRequestError('Administrators cannot deactivate their own account.');
    }

    const res = await db.query(
      `UPDATE users 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, full_name, role, phone, is_active;`,
      [isActive, userId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = res.rows[0];

    await recordAuditLog({
      userId: adminId,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'USER',
      entityId: updatedUser.id,
      newValues: { isActive: updatedUser.is_active },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.full_name,
      role: updatedUser.role,
      phone: updatedUser.phone,
      isActive: updatedUser.is_active,
    };
  }

  /**
   * Create a new user (strictly Admin/Owner controlled)
   */
  static async createUser({ email, password, fullName, role, phone = null, creatorId = null }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    const existing = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = $1;`,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(password);

    const res = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, phone, is_active, created_at;`,
      [normalizedEmail, passwordHash, fullName, role, phone]
    );

    const newUser = res.rows[0];

    await recordAuditLog({
      userId: creatorId,
      action: 'USER_CREATED',
      entity: 'USER',
      entityId: newUser.id,
      newValues: { email: newUser.email, role: newUser.role, fullName: newUser.full_name },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      phone: newUser.phone,
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
    };
  }

  /**
   * Seed all 5 standard demo/project roles if not already present
   */
  static async seedDefaultUsers() {
    const defaultAccounts = [
      {
        email: 'admin@sunpower.com',
        password: 'Admin@12345',
        fullName: 'Rajesh Sharma (Director)',
        role: ROLES.ADMIN,
        phone: '+91 98765 00001',
      },
      {
        email: 'sales@sunpower.com',
        password: 'Sales@12345',
        fullName: 'Priya Verma (Sales Lead)',
        role: ROLES.SALES,
        phone: '+91 98765 00002',
      },
      {
        email: 'warehouse@sunpower.com',
        password: 'Warehouse@12345',
        fullName: 'Amit Patel (Warehouse Manager)',
        role: ROLES.WAREHOUSE,
        phone: '+91 98765 00003',
      },
      {
        email: 'technician@sunpower.com',
        password: 'Technician@12345',
        fullName: 'Vikram Singh (Lead Technician)',
        role: ROLES.TECHNICIAN,
        phone: '+91 98765 00004',
      },
      {
        email: 'support@sunpower.com',
        password: 'Support@12345',
        fullName: 'Sneha Kulkarni (Customer Support)',
        role: ROLES.SUPPORT,
        phone: '+91 98765 00005',
      },
    ];

    const seeded = [];
    for (const acc of defaultAccounts) {
      const res = await db.query('SELECT id FROM users WHERE LOWER(email) = $1;', [acc.email.toLowerCase()]);
      if (res.rows.length === 0) {
        const passwordHash = await hashPassword(acc.password);
        const insertRes = await db.query(
          `INSERT INTO users (email, password_hash, full_name, role, phone)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, email, full_name, role;`,
          [acc.email.toLowerCase(), passwordHash, acc.fullName, acc.role, acc.phone]
        );
        seeded.push(insertRes.rows[0]);
      }
    }

    if (seeded.length > 0) {
      console.log(`[Auth Seeder] Successfully seeded ${seeded.length} default user(s) for the 5 project roles.`);
    }

    return seeded;
  }
}
