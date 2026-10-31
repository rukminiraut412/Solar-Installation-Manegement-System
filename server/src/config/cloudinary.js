import { env } from './env.js';

/**
 * Cloudinary Configuration
 * Reads credentials from validated environment variables.
 * Never expose CLOUDINARY_API_SECRET to the client.
 */
export const cloudinaryConfig = {
  cloudName: env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'demo_cloud',
  apiKey: env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || 'demo_key',
  apiSecret: env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET || null,
  isConfigured: !!(
    (env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME) &&
    (env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY) &&
    (env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET)
  ),
  allowedFolders: ['surveys', 'installations', 'signatures', 'receipts', 'tickets', 'general'],
  maxFileSize: 10 * 1024 * 1024, // 10MB limit
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
};
