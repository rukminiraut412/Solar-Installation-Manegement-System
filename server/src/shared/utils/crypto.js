import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../../config/env.js';

/**
 * Hash a plain-text password using bcrypt
 */
export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(env.SALT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare plain-text password against a bcrypt hash
 */
export async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a cryptographically secure random token string
 */
export function generateRandomToken(bytes = 40) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate SHA-256 hash of a string (used to index & store refresh tokens safely)
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
