import { z } from 'zod';
import { ALL_ROLES } from '../../shared/constants/roles.js';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const createUserSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(ALL_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ALL_ROLES.join(', ')}` }),
  }),
  phone: z.string().optional(),
});
