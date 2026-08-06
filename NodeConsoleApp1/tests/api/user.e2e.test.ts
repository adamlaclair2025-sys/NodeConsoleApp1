import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '@/app';
import prisma from '@/database/client';

describe('User API Endpoints', () => {
  const testUser = {
    email: 'api-test@example.com',
    password: 'TestPassword123!',
    displayName: 'API Test User',
  };

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
        displayName: testUser.displayName,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: testUser.password,
        confirmPassword: testUser.password,
        displayName: testUser.displayName,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
        displayName: testUser.displayName,
      });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/me', () => {
    let token: string;

    beforeEach(async () => {
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
        displayName: testUser.displayName,
      });

      token = registerResponse.body.data.accessToken;
    });

    it('should return authenticated user profile', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should reject without token', async () => {
      const response = await request(app).get('/api/v1/users/me');

      expect(response.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
