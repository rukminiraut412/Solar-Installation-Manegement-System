/**
 * Customer Management Validation Schemas
 * Ownership: Customer Management Subsystem
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & System Contracts
 */

import { z } from 'zod';

// Helper for phone validation (Indian 10-digit mobile or standard format)
const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  addressStreet: z.string().trim().optional().or(z.literal('')),
  addressCity: z.string().trim().default('Ahmedabad'),
  addressState: z.string().trim().default('Gujarat'),
  addressPincode: z.string().trim().max(10).optional().or(z.literal('')),
  electricityConsumerNumber: z.string().trim().optional().or(z.literal('')),
  sanctionedLoadKw: z.coerce.number().positive().optional(),
  installationLocation: z.string().trim().optional().or(z.literal('')),
  solarRequirement: z.string().trim().default('On-Grid Solar System'),
  requiredCapacityKw: z.coerce.number().positive().default(3.0),
  additionalNotes: z.string().trim().optional().or(z.literal('')),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const assignCustomerSchema = z.object({
  sellerId: z.string().uuid().optional().nullable().or(z.literal('')),
  technicianId: z.string().uuid().optional().nullable().or(z.literal('')),
  warehouseId: z.string().uuid().optional().nullable().or(z.literal('')),
  supportId: z.string().uuid().optional().nullable().or(z.literal('')),
  notes: z.string().trim().optional().nullable().or(z.literal('')),
});

export const installationRequirementsSchema = z.object({
  customerId: z.string().uuid().optional(),
  // Section 1: Property Information
  propertyType: z.enum(['Residential', 'Commercial', 'Industrial']).default('Residential'),
  ownershipStatus: z.enum(['Owned', 'Rented', 'Leased']).default('Owned'),
  installationLocation: z.string().trim().min(2, 'Installation location required').default('Rooftop'),
  roofType: z.string().trim().default('RCC Flat'),
  roofAreaSqft: z.coerce.number().positive().optional().nullable(),
  floorsCount: z.coerce.number().int().min(1).default(1),
  roofRestrictions: z.string().trim().optional().nullable(),

  // Section 2: Electricity & Connection Details
  discomName: z.string().trim().optional().nullable(),
  electricityConsumerNumber: z.string().trim().optional().nullable(),
  avgMonthlyBill: z.coerce.number().nonnegative().optional().nullable(),
  monthlyUnits: z.coerce.number().nonnegative().optional().nullable(),
  connectionType: z.string().trim().default('Single Phase'),
  existingMeterDetails: z.string().trim().optional().nullable(),

  // Section 3: Solar System Requirements
  preferredSystemType: z.enum(['On-Grid', 'Off-Grid', 'Hybrid']).default('On-Grid'),
  requiredCapacityKw: z.coerce.number().positive().default(3.0),
  installationPurpose: z.string().trim().optional().nullable(),
  preferredTimeline: z.string().trim().default('Immediate (Within 1 Month)'),
  batteryRequired: z.string().trim().default('No'),

  // Section 4: Site & Access Details
  fullInstallationAddress: z.string().trim().min(5, 'Full installation address is required'),
  parkingAccess: z.string().trim().optional().nullable(),
  roofAccessibility: z.string().trim().optional().nullable(),
  nearbyObstacles: z.string().trim().optional().nullable(),
  specialRequirements: z.string().trim().optional().nullable(),

  // Section 5: Documents JSON
  documentsJson: z.record(z.any()).optional().default({}),
});

export const reviewRequirementsSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  adminNotes: z.string().trim().optional(),
});
