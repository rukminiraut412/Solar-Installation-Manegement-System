/**
 * Customer & Sales Validation Schemas
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & docs/contracts/customer-sales.md
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


export const createEnquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
  email: z.string().trim().email().optional().or(z.literal('')),
  source: z.enum(['WEB', 'WHATSAPP', 'PHONE_CALL', 'REFERRAL', 'WALK_IN']).default('WEB'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  estimatedMonthlyBill: z.coerce.number().nonnegative().optional(),
  estimatedRoofAreaSqft: z.coerce.number().nonnegative().optional(),
  gridTypePreference: z.enum(['On-Grid', 'Off-Grid']).default('On-Grid'),
  interestedCapacityKw: z.coerce.number().min(1).max(5).optional(),
  notes: z.string().trim().optional().or(z.literal('')),
  addressCity: z.string().trim().default('Ahmedabad'),
});

export const publicEnquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
  email: z.string().trim().email().optional().or(z.literal('')),
  estimatedMonthlyBill: z.coerce.number().nonnegative().optional(),
  estimatedRoofAreaSqft: z.coerce.number().nonnegative().optional(),
  gridTypePreference: z.enum(['On-Grid', 'Off-Grid']).default('On-Grid'),
  notes: z.string().trim().optional().or(z.literal('')),
  addressCity: z.string().trim().default('Ahmedabad'),
});

export const qualifyEnquirySchema = z.object({
  estimatedRoofAreaSqft: z.coerce.number().min(50, 'Minimum 50 sq ft roof area required for initial consideration'),
  estimatedMonthlyBill: z.coerce.number().min(500, 'Minimum monthly bill required'),
  sanctionedLoadKw: z.coerce.number().positive().optional(),
  addressStreet: z.string().trim().optional(),
  addressCity: z.string().trim().default('Ahmedabad'),
  addressPincode: z.string().trim().optional(),
  electricityConsumerNumber: z.string().trim().optional(),
});

export const assignEnquirySchema = z.object({
  assignedTo: z.string().uuid('Invalid assigned user UUID'),
});

export const enquiryFollowUpSchema = z.object({
  callSummary: z.string().trim().min(5, 'Summary must be at least 5 characters'),
  outcome: z.string().trim().min(2, 'Outcome must be specified'),
  nextFollowUp: z.string().datetime().optional().or(z.literal('')),
});

export const mergeEnquirySchema = z.object({
  primaryEnquiryId: z.string().uuid('Invalid primary enquiry UUID'),
  notes: z.string().trim().optional(),
});

export const requestSurveySchema = z.object({
  enquiryId: z.string().uuid('Invalid enquiry UUID'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  timeSlot: z.string().min(2, 'Time slot must be provided'),
  technicianId: z.string().uuid('Invalid technician UUID').optional(),
});

export const executeSurveySchema = z.object({
  roofAreaSqft: z.coerce.number().positive('Roof area must be greater than 0'),
  shadowFreeSqft: z.coerce.number().nonnegative('Shadow free area must be non-negative'),
  roofType: z.string().trim().min(2, 'Roof type required (e.g. RCC, Metal, Tiled)'),
  azimuthDegrees: z.coerce.number().min(0).max(360, 'Azimuth must be between 0 and 360 degrees'),
  tiltAngleDegrees: z.coerce.number().min(0).max(90, 'Tilt angle must be between 0 and 90 degrees [NC-015]'),
  cableRunMeters: z.coerce.number().min(5).max(200, 'Cable run distance must be between 5m and 200m'),
  gridPhase: z.enum(['Single Phase', 'Three Phase']).default('Single Phase'),
  sanctionedLoadKw: z.coerce.number().positive().optional(),
  structuralCondition: z.string().trim().default('GOOD'),
  feederCode: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  photos: z
    .array(
      z.object({
        photoUrl: z.string().url('Must be a valid URL'),
        category: z.enum(['PANORAMA', 'OBSTACLES', 'METER_BOARD', 'DISTRIBUTION_BOARD', 'ROOF_SURFACE', 'OTHER']),
        notes: z.string().optional(),
      })
    )
    .min(2, 'At least 2 photos required: Panorama and Meter Board [NC-016]'),
});

export const surveyReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REWORK', 'REJECT']),
  reason: z.string().trim().optional(),
}).refine(
  (data) => {
    if (['REWORK', 'REJECT'].includes(data.decision)) {
      return data.reason && data.reason.trim().length >= 10;
    }
    return true;
  },
  {
    message: 'Reason with at least 10 characters is mandatory for REWORK or REJECT decisions',
    path: ['reason'],
  }
);

export const createQuotationSchema = z.object({
  surveyId: z.string().uuid('Invalid site survey UUID'),
  packageId: z.string().optional(),
  capacityKw: z.coerce.number().min(1).max(5, 'Capacity must be 1, 2, 3, 4, or 5 kW'),
  gridType: z.enum(['On-Grid', 'Off-Grid']).default('On-Grid'),
  laborCost: z.coerce.number().nonnegative().default(15000),
  discountAmount: z.coerce.number().nonnegative().default(0),
  validityDays: z.coerce.number().int().min(1).max(60).default(15), // [NC-011]
  customerNotes: z.string().trim().optional(),
});

export const acceptQuoteSchema = z.object({
  signature: z.string().min(3, 'Digital signature or signee name required'),
  customerNotes: z.string().trim().optional(),
});

export const declineQuoteSchema = z.object({
  reason: z.string().trim().min(5, 'Decline reason must be at least 5 characters'),
});

export const createOrderSchema = z.object({
  quotationId: z.string().uuid('Invalid quotation UUID'),
  advanceRequiredPercent: z.coerce.number().min(10).max(100).default(25.0), // [NC-001]
});
