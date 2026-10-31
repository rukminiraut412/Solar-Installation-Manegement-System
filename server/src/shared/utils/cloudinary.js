import crypto from 'crypto';
import { cloudinaryConfig } from '../../config/cloudinary.js';
import { BadRequestError } from '../errors/AppError.js';

/**
 * Generate cryptographic signed upload parameters for Cloudinary direct client uploads.
 * This guarantees that the secret key never leaves the backend while enabling direct uploads.
 *
 * @param {Object} options
 * @param {string} options.folder - Destination folder: 'surveys' | 'installations' | 'signatures' | 'receipts' | 'tickets'
 * @param {string} [options.resourceType='image'] - 'image' or 'raw' (for PDF documents)
 * @param {string} [options.tags] - Optional comma-separated tags
 * @returns {Object} Signed parameters for direct POST upload
 */
export function generateUploadSignature({ folder = 'general', resourceType = 'image', tags = null } = {}) {
  // 1. Validate destination folder whitelist
  if (!cloudinaryConfig.allowedFolders.includes(folder)) {
    throw new BadRequestError(
      `Invalid upload folder '${folder}'. Allowed folders: ${cloudinaryConfig.allowedFolders.join(', ')}`
    );
  }

  // 2. Validate resource type
  if (!['image', 'raw', 'video', 'auto'].includes(resourceType)) {
    throw new BadRequestError(`Invalid resource type '${resourceType}'`);
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // 3. Cloudinary signing requires parameters sorted alphabetically
  const paramsToSign = {
    folder,
    timestamp,
  };
  if (tags) {
    paramsToSign.tags = tags;
  }

  const serializedParams = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  // 4. Compute cryptographic signature
  let signature;
  const secret = cloudinaryConfig.apiSecret || 'dev_mock_secret_for_local_testing';

  signature = crypto
    .createHash('sha1')
    .update(`${serializedParams}${secret}`)
    .digest('hex');

  return {
    cloudName: cloudinaryConfig.cloudName,
    apiKey: cloudinaryConfig.apiKey,
    timestamp,
    folder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`,
    maxFileSize: cloudinaryConfig.maxFileSize,
    allowedFormats: cloudinaryConfig.allowedFormats,
    isMock: !cloudinaryConfig.isConfigured,
  };
}

/**
 * Validate uploaded media metadata against allowed file sizes and extensions
 */
export function validateMediaMetadata({ format, bytes }) {
  if (bytes && bytes > cloudinaryConfig.maxFileSize) {
    throw new BadRequestError(
      `File size (${(bytes / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed limit of ${cloudinaryConfig.maxFileSize / 1024 / 1024} MB`
    );
  }

  if (format && !cloudinaryConfig.allowedFormats.includes(format.toLowerCase())) {
    throw new BadRequestError(
      `File format '${format}' is not supported. Allowed formats: ${cloudinaryConfig.allowedFormats.join(', ')}`
    );
  }

  return true;
}
