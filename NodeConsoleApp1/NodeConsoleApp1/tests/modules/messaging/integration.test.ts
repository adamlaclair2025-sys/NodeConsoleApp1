import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '@/app';
import { prisma } from '@/database/client';
import { signToken } from '@/auth/jwt';

let testUserId1: string;
let testUserId2: string;
let testUserId3: string;
let token1: string;
let token2: string;
let testConversationId: string;
let testMessageId: string;

describe('Messaging Module - Integration Tests', () => {
  beforeAll(async () => {
    // Create test users
    testUserId1 = 'test-user-1';
    testUserId2 = 'test-user-2';
    testUserId3 = 'test-user-3';

    token1 = signToken({
      userId: testUserId1,
      email: 'user1@test.com',
      displayName: 'Test User 1',
    });

    token2 = signToken({
      userId: testUserId2,
      email: 'user2@test.com',
      displayName: 'Test User 2',
    });

    // Setup users in database
    await prisma.user.createMany({
      data: [
        {
          id: testUserId1,
          email: 'user1@test.com',
          password: 'hashed-password',
          profile: {
            create: {
              displayName: 'Test User 1',
            },
          },
        },
        {
          id: testUserId2,
          email: 'user2@test.com',
          password: 'hashed-password',
          profile: {
            create: {
              displayName: 'Test User 2',
            },
          },
        },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.conversation.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/v1/messaging/conversations', () => {
    it('should create a direct message conversation', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'direct',
          participantIds: [testUserId2],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('direct');
      expect(res.body.data.members).toHaveLength(2);

      testConversationId = res.body.data.id;
    });

    it('should create a group conversation', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'group',
          participantIds: [testUserId2, testUserId3],
          name: 'Test Group',
          description: 'A test group conversation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('group');
      expect(res.body.data.name).toBe('Test Group');
      expect(res.body.data.members).toHaveLength(3);
    });

    it('should NOT create conversation with self', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'direct',
          participantIds: [testUserId1],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return existing DM conversation', async () => {
      // Create first DM
      const res1 = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'direct',
          participantIds: [testUserId2],
        });

      // Try to create same DM again
      const res2 = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'direct',
          participantIds: [testUserId2],
        });

      expect(res2.body.data.id).toBe(res1.body.data.id);
    });
  });

  describe('GET /api/v1/messaging/conversations', () => {
    it('should list user conversations', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${token1}`)
        .query({ limit: 10, offset: 0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/messaging/conversations/:conversationId', () => {
    it('should get conversation details', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${testConversationId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testConversationId);
      expect(res.body.data.members).toBeDefined();
    });

    it('should deny access to non-members', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${testConversationId}`)
        .set('Authorization', `Bearer ${token2}`);

      // User2 is actually a member, so let's create a conversation user3 is not in
      const newConv = await prisma.conversation.create({
        data: {
          type: 'direct',
          createdBy: testUserId1,
          members: {
            create: [
              { userId: testUserId1, role: 'owner' },
              { userId: testUserId2, role: 'member' },
            ],
          },
        },
      });

      const token3 = signToken({
        userId: testUserId3,
        email: 'user3@test.com',
        displayName: 'Test User 3',
      });

      const denialRes = await request(app)
        .get(`/api/v1/messaging/conversations/${newConv.id}`)
        .set('Authorization', `Bearer ${token3}`);

      expect(denialRes.status).toBe(404);
    });
  });

  describe('POST /api/v1/messaging/conversations/:conversationId/messages', () => {
    it('should send a message', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'Hello, this is a test message!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Hello, this is a test message!');
      expect(res.body.data.author.id).toBe(testUserId1);

      testMessageId = res.body.data.id;
    });

    it('should reject empty messages', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: '',
        });

      expect(res.status).toBe(400);
    });

    it('should reject messages exceeding 5000 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'x'.repeat(5001),
        });

      expect(res.status).toBe(400);
    });

    it('should enforce rate limiting', async () => {
      // Try to send 25 messages rapidly
      let successCount = 0;
      let rateLimitHit = false;

      for (let i = 0; i < 25; i++) {
        const res = await request(app)
          .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
          .set('Authorization', `Bearer ${token1}`)
          .send({
            content: `Message ${i}`,
          });

        if (res.status === 201) {
          successCount++;
        } else if (res.status === 400 && res.body.error.includes('too quickly')) {
          rateLimitHit = true;
        }
      }

      expect(rateLimitHit).toBe(true);
      expect(successCount).toBeLessThan(25);
    });
  });

  describe('PUT /api/v1/messaging/conversations/:conversationId/messages/:messageId', () => {
    it('should edit own message', async () => {
      const res = await request(app)
        .put(`/api/v1/messaging/conversations/${testConversationId}/messages/${testMessageId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'Updated message content',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Updated message content');
      expect(res.body.data.editedAt).toBeDefined();
    });

    it('should NOT edit someone else message', async () => {
      const res = await request(app)
        .put(`/api/v1/messaging/conversations/${testConversationId}/messages/${testMessageId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          content: 'Hacked!',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/messaging/conversations/:conversationId/messages/:messageId', () => {
    it('should delete own message', async () => {
      // First, send a message
      const sendRes = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'Message to delete',
        });

      const messageId = sendRes.body.data.id;

      // Delete it
      const deleteRes = await request(app)
        .delete(`/api/v1/messaging/conversations/${testConversationId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/messaging/conversations/:conversationId/messages/:messageId/read', () => {
    it('should mark message as read', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages/${testMessageId}/read`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/messaging/conversations/:conversationId/messages/:messageId/read-receipts', () => {
    it('should get read receipts', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${testConversationId}/messages/${testMessageId}/read-receipts`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/messaging/conversations/:conversationId/messages/:messageId/report', () => {
    it('should report a message', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages/${testMessageId}/report`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          reason: 'harassment',
          description: 'This message was inappropriate',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
    });

    it('should prevent duplicate reports', async () => {
      const res1 = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages/${testMessageId}/report`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          reason: 'harassment',
        });

      const res2 = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages/${testMessageId}/report`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          reason: 'abuse',
        });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(400);
    });
  });
});
