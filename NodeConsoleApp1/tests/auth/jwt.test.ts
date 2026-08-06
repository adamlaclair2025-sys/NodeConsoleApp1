import { describe, it, expect, beforeEach } from '@jest/globals';
import { signToken, verifyToken, extractBearerToken, signRefreshToken } from '@/auth/jwt';
import { UserRole } from '@/types';

describe('JWT Module', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testRoles = [UserRole.USER];

  describe('Token Signing', () => {
    it('should sign a valid token', () => {
      const token = signToken(testUserId, testEmail, testRoles);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });

    it('should include user information in token payload', () => {
      const token = signToken(testUserId, testEmail, testRoles);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
      expect(decoded?.roles).toEqual(testRoles);
    });

  });

  describe('Token Verification', () => {
    it('should verify a valid token', () => {
      const token = signToken(testUserId, testEmail, testRoles);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
    });

    it('should reject invalid token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should reject malformed token', () => {
      const decoded = verifyToken('not.a.valid.jwt');
      expect(decoded).toBeNull();
    });

    it('should reject empty token', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });
  });

  describe('Bearer Token Extraction', () => {
    it('should extract valid bearer token', () => {
      const token = 'some-test-token';
      const authHeader = `Bearer ${token}`;

      const extracted = extractBearerToken(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for missing authorization header', () => {
      const extracted = extractBearerToken(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for malformed authorization header', () => {
      const extracted = extractBearerToken('InvalidFormat token');
      expect(extracted).toBeNull();
    });

    it('should return null for empty string', () => {
      const extracted = extractBearerToken('');
      expect(extracted).toBeNull();
    });
  });

  describe('Refresh Token', () => {
    it('should generate a refresh token', () => {
      const token = signRefreshToken(testUserId, testEmail, testRoles);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should be verifiable', () => {
      const token = signRefreshToken(testUserId, testEmail, testRoles);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
    });
  });
});
