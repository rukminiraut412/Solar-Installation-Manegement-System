import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { generateUploadSignature } from '../utils/cloudinary.js';
import { successResponse } from '../utils/response.js';

const router = Router();

const signUploadSchema = z.object({
  folder: z.enum(['surveys', 'installations', 'signatures', 'receipts', 'tickets', 'general']).default('general'),
  resourceType: z.enum(['image', 'raw', 'video', 'auto']).default('image'),
  tags: z.string().optional(),
});

/**
 * POST /api/v1/media/sign-upload
 * Generates temporary cryptographic signed upload parameters for Cloudinary direct client uploads.
 * Requires authenticated session.
 */
router.post('/sign-upload', authenticate, validate(signUploadSchema), (req, res, next) => {
  try {
    const { folder, resourceType, tags } = req.body;
    const signedParams = generateUploadSignature({ folder, resourceType, tags });
    return successResponse(res, signedParams, 'Upload signature generated successfully', 200);
  } catch (err) {
    next(err);
  }
});

export default router;
