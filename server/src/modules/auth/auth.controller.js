import { AuthService } from './auth.service.js';
import { successResponse } from '../../shared/utils/response.js';
import { env } from '../../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.login({
        email,
        password,
        ipAddress,
        userAgent,
      });

      // Set HTTP-only cookies
      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return successResponse(res, result, 'Login successful', 200);
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.refreshToken({
        refreshToken,
        ipAddress,
        userAgent,
      });

      // Update HTTP-only cookies
      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return successResponse(res, result, 'Token refreshed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      const userId = req.user?.id || null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await AuthService.logout({
        refreshToken,
        userId,
        ipAddress,
        userAgent,
      });

      // Clear cookies
      res.clearCookie('accessToken', COOKIE_OPTIONS);
      res.clearCookie('refreshToken', COOKIE_OPTIONS);

      return successResponse(res, null, 'Logged out successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      const profile = await AuthService.getProfile(req.user.id);
      return successResponse(res, profile, 'User profile retrieved successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async register(req, res, next) {
    try {
      const {
        fullName,
        email,
        password,
        phone,
        addressStreet,
        addressCity,
        addressState,
        addressPincode,
        installationLocation,
        solarRequirement,
        requiredCapacityKw,
        electricityConsumerNumber,
        businessName,
        address,
      } = req.body;

      if (businessName) {
        const result = await AuthService.registerSeller({
          fullName,
          email,
          password,
          phone,
          businessName,
          address: address || addressStreet,
        });
        return successResponse(res, result, 'Seller account registered successfully. You may now log in.', 201);
      }

      const newUser = await AuthService.registerCustomer({
        fullName,
        email,
        password,
        phone,
        addressStreet,
        addressCity,
        addressState,
        addressPincode,
        installationLocation,
        solarRequirement,
        requiredCapacityKw,
        electricityConsumerNumber,
        businessName,
        address,
      });

      return successResponse(res, newUser, 'Customer account registered successfully. You may now log in.', 201);
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(req, res, next) {
    try {
      const users = await AuthService.listUsers();
      return successResponse(res, users, 'Users retrieved successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  static async toggleUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const updatedUser = await AuthService.toggleUserStatus({
        userId: id,
        isActive,
        adminId: req.user.id,
      });

      return successResponse(res, updatedUser, `User ${isActive ? 'activated' : 'deactivated'} successfully`, 200);
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req, res, next) {
    try {
      const { email, password, fullName, role, phone } = req.body;
      const newUser = await AuthService.createUser({
        email,
        password,
        fullName,
        role,
        phone,
        creatorId: req.user.id,
      });

      return successResponse(res, newUser, 'User created successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}

