import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

/**
 * Generate a short-lived JWT access token (default 15 minutes)
 */
export function signAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
}

/**
 * Verify and decode a JWT access token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Generate a long-lived JWT refresh token (default 7 days)
 */
export function signRefreshToken(user) {
  const payload = {
    sub: user.id,
    tokenType: 'refresh',
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });
}

/**
 * Verify and decode a JWT refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}
