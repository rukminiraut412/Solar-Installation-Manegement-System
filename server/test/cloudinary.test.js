import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { generateUploadSignature, validateMediaMetadata } from '../src/shared/utils/cloudinary.js';

describe('Phase 4: Cloudinary Shared Upload Interface', () => {
  let authToken;

  beforeAll(async () => {
    await AuthService.seedDefaultUsers();
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'technician@sunpower.com', password: 'Technician@12345' });

    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('1. Unit Tests: generateUploadSignature & validateMediaMetadata', () => {
    it('generates cryptographic signed upload parameters with correct fields', () => {
      const result = generateUploadSignature({ folder: 'surveys' });

      expect(result.signature).toBeDefined();
      expect(result.signature).toHaveLength(40); // SHA-1 hex string length
      expect(result.timestamp).toBeTypeOf('number');
      expect(result.folder).toBe('surveys');
      expect(result.uploadUrl).toContain('cloudinary.com');
      expect(result.uploadUrl).toContain('/image/upload');
      expect(result.maxFileSize).toBe(10485760); // 10MB
      expect(result.allowedFormats).toContain('jpg');
      expect(result.allowedFormats).toContain('png');

      // Crucial security check: apiSecret is NEVER exposed in the result
      expect(result.apiSecret).toBeUndefined();
    });

    it('rejects unapproved destination folder', () => {
      expect(() => generateUploadSignature({ folder: 'unauthorized_hack_folder' })).toThrow(
        /Invalid upload folder/
      );
    });

    it('validates file size limit (rejects >10MB)', () => {
      expect(() => validateMediaMetadata({ bytes: 15 * 1024 * 1024 })).toThrow(/exceeds maximum/);
      expect(validateMediaMetadata({ bytes: 5 * 1024 * 1024 })).toBe(true);
    });

    it('validates file extension/format', () => {
      expect(() => validateMediaMetadata({ format: 'exe' })).toThrow(/not supported/);
      expect(validateMediaMetadata({ format: 'png' })).toBe(true);
      expect(validateMediaMetadata({ format: 'pdf' })).toBe(true);
    });
  });

  describe('2. Integration Endpoint: POST /api/v1/media/sign-upload', () => {
    it('returns signed parameters for authenticated users', async () => {
      const res = await request(app)
        .post('/api/v1/media/sign-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folder: 'installations', resourceType: 'image' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signature).toBeDefined();
      expect(res.body.data.folder).toBe('installations');
      expect(res.body.data.timestamp).toBeDefined();
      expect(res.body.data.uploadUrl).toBeDefined();

      // Ensure secret is never exposed in response
      expect(res.body.data.apiSecret).toBeUndefined();
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/media/sign-upload')
        .send({ folder: 'installations' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid folder selection with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/media/sign-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folder: 'malicious_folder' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
