import { describe, it, expect } from '@jest/globals';
import { userRepository } from '@/modules/user/repository';
import { userService } from '@/modules/user/service';
import { hashPassword } from '@/auth/security';
import prisma from '@/database/client';

describe('User Service', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    displayName: 'Test User',
  };

  beforeEach(async () => {
    // Clean up test user before each test
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.$disconnect();
  });

  describe('Registration', () => {
    it('should register a new user', async () => {
      const result = await userService.register({
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
        displayName: testUser.displayName,
      });

      expect(result.user.email).toBe(testUser.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should not allow duplicate email registration', async () => {
      await userService.register({
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
        displayName: testUser.displayName,
      });

      await expect(
        userService.register({
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
          displayName: 'Another User',
        }),
      ).rejects.toThrow('Email already registered');
    });

    it('should reject weak password', async () => {
      await expect(
        userService.register({
          email: 'new@example.com',
          password: 'weak',
          confirmPassword: 'weak',
          displayName: 'Test',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Login', () => {
    beforeEach(async () => {
      await userService.register({
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
        displayName: testUser.displayName,
      });
    });

    it('should login with correct credentials', async () => {
      const result = await userService.login({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.user.email).toBe(testUser.email);
      expect(result.accessToken).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      await expect(
        userService.login({
          email: testUser.email,
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      await expect(
        userService.login({
          email: 'nonexistent@example.com',
          password: testUser.password,
        }),
      ).rejects.toThrow();
    });
  });
});
