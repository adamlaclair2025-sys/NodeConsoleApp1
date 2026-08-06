import { hash, verify } from 'argon2';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hash a password using Argon2id
 * Production-grade password hashing with Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: 2,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return uuidv4();
}

/**
 * Generate a secure random code (6 digits)
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(
  password: string,
  config: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize email for case-insensitive lookups
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
