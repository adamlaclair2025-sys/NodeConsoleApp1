import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { JWTPayload, UserRole } from '@/types';

/**
 * Sign a JWT token
 */
export function signToken(
  userId: string,
  email: string,
  roles: UserRole[],
  expiresIn: string = config.jwt.expiresIn,
): string {
  return jwt.sign(
    {
      userId,
      email,
      roles,
    },
    config.jwt.secret,
    {
      expiresIn,
      issuer: 'mental-health-platform',
      subject: userId,
    },
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: 'mental-health-platform',
    }) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

/**
 * Generate refresh token
 */
export function signRefreshToken(userId: string, email: string, roles: UserRole[]): string {
  return signToken(userId, email, roles, config.jwt.refreshExpiresIn);
}
