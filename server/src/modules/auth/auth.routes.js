import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/rbac.middleware.js';
import { loginSchema, refreshTokenSchema, createUserSchema, registerSchema, updateUserStatusSchema } from './auth.validators.js';

const router = Router();

// Public auth endpoints
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Protected endpoints
router.get('/me', authenticate, AuthController.getMe);

// Admin-only user management
router.get('/users', authenticate, requireAdmin, AuthController.listUsers);
router.post('/users', authenticate, requireAdmin, validate(createUserSchema), AuthController.createUser);
router.patch('/users/:id/status', authenticate, requireAdmin, validate(updateUserStatusSchema), AuthController.toggleUserStatus);

export default router;

