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

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address format'),
  phone: z.string().trim().min(6, 'Mobile number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // Address details
  addressStreet: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().optional(),
  addressPincode: z.string().trim().optional(),
  // Solar system requirements
  installationLocation: z.string().trim().optional(),
  solarRequirement: z.string().trim().optional(),
  requiredCapacityKw: z.union([z.number(), z.string()]).optional(),
  electricityConsumerNumber: z.string().trim().optional(),
  // Backward compatibility fields
  businessName: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive boolean is required' }),
});

