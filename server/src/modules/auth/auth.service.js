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
   * Public Seller / Partner Registration - Enforces Sales role
   */
  static async registerSeller({ fullName, email, password, phone, businessName, address }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = $1;`,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError('An account with this email address already exists. Please log in.');
    }

    const passwordHash = await hashPassword(password);
    const role = ROLES.SALES;

    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, phone, is_active, created_at;`,
      [normalizedEmail, passwordHash, fullName, role, phone]
    );

    const newUser = userRes.rows[0];

    await recordAuditLog({
      userId: newUser.id,
      action: 'PUBLIC_SELLER_REGISTERED',
      entity: 'AUTH',
      entityId: newUser.id,
      newValues: { email: newUser.email, role: newUser.role, businessName, address },
    });

    const accessToken = signAccessToken(newUser);
    const refreshToken = signRefreshToken(newUser);

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3);`,
      [newUser.id, tokenHash, expiresAt]
    );

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
   * Public Customer Registration - Strictly sets role to Customer
   * Automatically creates user record and linked customer profile with installation requirement
   */
  static async registerCustomer({
    fullName,
    email,
    password,
    phone,
    addressStreet = null,
    addressCity = 'Ahmedabad',
    addressState = 'Gujarat',
    addressPincode = null,
    installationLocation = null,
    solarRequirement = 'Residential',
    requiredCapacityKw = 3.0,
    electricityConsumerNumber = null,
    businessName = null,
    address = null,
  }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = $1;`,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError('An account with this email address already exists. Please log in.');
    }

    const passwordHash = await hashPassword(password);
    // STRICT SECURITY: Public registration is locked exclusively to Customer role
    const role = ROLES.CUSTOMER;

    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, phone, is_active, created_at;`,
      [normalizedEmail, passwordHash, fullName, role, phone]
    );

    const newUser = userRes.rows[0];

    // Generate unique Customer Code
    const customerCode = `CUST-${Date.now().toString().slice(-6)}`;
    const effectiveStreet = addressStreet || address || 'Installation Site';
    const effectiveLocation = installationLocation || addressCity || 'Rooftop';
    const capacityNum = parseFloat(requiredCapacityKw) || 3.0;

    // Find active Warehouse to assign customer to
    const whRes = await db.query(
      `SELECT id FROM users WHERE role = 'Warehouse' AND is_active = true ORDER BY created_at ASC LIMIT 1;`
    );
    const assignedWarehouseId = whRes.rows[0]?.id || null;
    const assignmentStatus = assignedWarehouseId ? 'ASSIGNED' : 'PENDING_ASSIGNMENT';

    // Create linked Customer Profile
    const custRes = await db.query(
      `INSERT INTO customers (
         customer_code, full_name, email, phone, 
         address_street, address_city, address_state, address_pincode, 
         electricity_consumer_number, sanctioned_load_kw, user_id, created_by,
         assigned_warehouse_id, assignment_status, assigned_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
       RETURNING id, customer_code;`,
      [
        customerCode,
        fullName,
        normalizedEmail,
        phone,
        effectiveStreet,
        addressCity || 'Ahmedabad',
        addressState || 'Gujarat',
        addressPincode || '380001',
        electricityConsumerNumber || null,
        capacityNum,
        newUser.id,
        newUser.id,
        assignedWarehouseId,
        assignmentStatus,
      ]
    );

    const newCustomer = custRes.rows[0];

    if (assignedWarehouseId) {
      await db.query(
        `INSERT INTO customer_assignments (
           customer_id, assigned_by, warehouse_id, assignment_notes
         ) VALUES ($1, $2, $3, 'Auto-assigned to Warehouse on Registration');`,
        [newCustomer.id, newUser.id, assignedWarehouseId]
      );
    }

    // Create initial Installation Requirement record
    const fullAddress = [effectiveStreet, addressCity, addressState, addressPincode].filter(Boolean).join(', ');
    await db.query(
      `INSERT INTO customer_installation_requirements (
         customer_id, user_id, property_type, preferred_system_type, 
         required_capacity_kw, electricity_consumer_number, 
         full_installation_address, installation_location, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED');`,
      [
        newCustomer.id,
        newUser.id,
        solarRequirement || 'Residential',
        'On-Grid',
        capacityNum,
        electricityConsumerNumber || null,
        fullAddress,
        effectiveLocation,
      ]
    );

    // Record timeline entry
    await db.query(
      `INSERT INTO customer_timeline (customer_id, event_type, title, description, created_by)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        newCustomer.id,
        'CUSTOMER_REGISTERED',
        'Customer Account Registered',
        `Customer signed up via Customer Portal with ${capacityNum} kW ${solarRequirement} requirement.`,
        newUser.id,
      ]
    );

    await recordAuditLog({
      userId: newUser.id,
      action: 'PUBLIC_CUSTOMER_REGISTERED',
      entity: 'CUSTOMER',
      entityId: newCustomer.id,
      newValues: {
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.full_name,
        customerCode: newCustomer.customer_code,
        capacityKw: capacityNum,
        solarRequirement,
        businessName,
      },
    });

    return {
      id: newUser.id,
      customerId: newCustomer.id,
      customerCode: newCustomer.customer_code,
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
      {
        email: 'customer@sunpower.com',
        password: 'Customer@12345',
        fullName: 'Ramesh Patel (Customer)',
        role: ROLES.CUSTOMER,
        phone: '+91 98765 11111',
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
        const newUser = insertRes.rows[0];
        seeded.push(newUser);

        // If Customer, link a customer profile and initial requirements
        if (acc.role === ROLES.CUSTOMER) {
          const custCode = `CUST-${Date.now().toString().slice(-6)}`;
          const custRes = await db.query(
            `INSERT INTO customers (
               customer_code, full_name, email, phone, 
               address_street, address_city, address_state, address_pincode, 
               electricity_consumer_number, sanctioned_load_kw, user_id, created_by
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id;`,
            [
              custCode,
              acc.fullName,
              acc.email.toLowerCase(),
              acc.phone,
              'Plot 42, Sunrise Enclave, Bodakdev',
              'Ahmedabad',
              'Gujarat',
              '380054',
              '100293847',
              5.0,
              newUser.id,
              newUser.id,
            ]
          );
          const custId = custRes.rows[0].id;

          await db.query(
            `INSERT INTO customer_installation_requirements (
               customer_id, user_id, property_type, preferred_system_type, 
               required_capacity_kw, electricity_consumer_number, 
               full_installation_address, installation_location, status
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED');`,
            [
              custId,
              newUser.id,
              'Residential',
              'On-Grid',
              5.0,
              '100293847',
              'Plot 42, Sunrise Enclave, Bodakdev, Ahmedabad, Gujarat - 380054',
              'Main Rooftop (RCC Flat)',
            ]
          );
        }
      }
    }

    if (seeded.length > 0) {
      console.log(`[Auth Seeder] Successfully seeded ${seeded.length} default user(s).`);
    }

    return seeded;
  }
}
