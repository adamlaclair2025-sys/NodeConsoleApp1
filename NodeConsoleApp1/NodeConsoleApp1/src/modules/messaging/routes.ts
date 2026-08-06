import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { conversationService } from './conversation.service';
import { messageService } from './message.service';
import {
  CreateConversationSchema,
  UpdateConversationSchema,
  AddConversationMemberSchema,
  CreateMessageSchema,
  UpdateMessageSchema,
  GetMessagesSchema,
  ReportMessageSchema,
  GetConversationsSchema,
  MuteConversationSchema,
} from './schemas';
import { logger } from '@/config/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// CONVERSATION ROUTES
// ============================================================================

/**
 * GET /api/v1/messaging/conversations
 * Get list of user's conversations
 */
router.get(
  '/conversations',
  validateRequest(GetConversationsSchema, 'query'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const input = GetConversationsSchema.parse(req.query);

      const conversations = await conversationService.getConversations(userId, input);

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching conversations');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/messaging/conversations
 * Create new conversation
 */
router.post(
  '/conversations',
  validateRequest(CreateConversationSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const input = CreateConversationSchema.parse(req.body);

      const conversation = await conversationService.createConversation(userId, input);

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error({ error }, 'Error creating conversation');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/v1/messaging/conversations/:conversationId
 * Get conversation details
 */
router.get(
  '/conversations/:conversationId',
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId } = req.params;

      const conversation = await conversationService.getConversation(conversationId, userId);

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching conversation');
      res.status(404).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * PUT /api/v1/messaging/conversations/:conversationId
 * Update conversation
 */
router.put(
  '/conversations/:conversationId',
  validateRequest(UpdateConversationSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId } = req.params;
      const input = UpdateConversationSchema.parse(req.body);

      const conversation = await conversationService.updateConversation(
        conversationId,
        userId,
        input
      );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error({ error }, 'Error updating conversation');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/messaging/conversations/:conversationId/members
 * Add members to conversation
 */
router.post(
  '/conversations/:conversationId/members',
  validateRequest(AddConversationMemberSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId } = req.params;
      const input = AddConversationMemberSchema.parse(req.body);

      const conversation = await conversationService.addMembers(conversationId, userId, input);

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error({ error }, 'Error adding members');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * DELETE /api/v1/messaging/conversations/:conversationId/members/:userId
 * Remove member from conversation
 */
router.delete(
  '/conversations/:conversationId/members/:targetUserId',
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId, targetUserId } = req.params;

      await conversationService.removeMember(conversationId, userId, targetUserId);

      res.json({
        success: true,
        message: 'Member removed',
      });
    } catch (error) {
      logger.error({ error }, 'Error removing member');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/messaging/conversations/:conversationId/leave
 * Leave conversation
 */
router.post(
  '/conversations/:conversationId/leave',
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId } = req.params;

      await conversationService.leaveConversation(conversationId, userId);

      res.json({
        success: true,
        message: 'Left conversation',
      });
    } catch (error) {
      logger.error({ error }, 'Error leaving conversation');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/messaging/conversations/:conversationId/mute
 * Mute conversation
 */
router.post(
  '/conversations/:conversationId/mute',
  validateRequest(MuteConversationSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId } = req.params;
      const input = MuteConversationSchema.parse(req.body);

      await conversationService.muteConversation(conversationId, userId, input);

      res.json({
        success: true,
        message: 'Mute status updated',
      });
    } catch (error) {
      logger.error({ error }, 'Error muting conversation');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

// ============================================================================
// MESSAGE ROUTES
// ============================================================================

/**
 * GET /api/v1/messaging/conversations/:conversationId/messages
 * Get messages from conversation
 */
router.get(
  '/conversations/:conversationId/messages',
  validateRequest(GetMessagesSchema, 'query'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId } = req.params;
      const input = GetMessagesSchema.parse(req.query);

      const result = await messageService.getMessages(userId, conversationId, input);

      res.json({
        success: true,
        data: result.messages,
        pageInfo: result.pageInfo,
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching messages');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/messaging/conversations/:conversationId/messages
 * Send message to conversation
 */
router.post(
  '/conversations/:conversationId/messages',
  validateRequest(CreateMessageSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId } = req.params;

      const input = CreateMessageSchema.parse({
        ...req.body,
        conversationId,
      });

      const message = await messageService.sendMessage(userId, input);

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ error }, 'Error sending message');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * PUT /api/v1/messaging/conversations/:conversationId/messages/:messageId
 * Edit message
 */
router.put(
  '/conversations/:conversationId/messages/:messageId',
  validateRequest(UpdateMessageSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { messageId } = req.params;
      const input = UpdateMessageSchema.parse(req.body);

      const message = await messageService.updateMessage(messageId, userId, input);

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ error }, 'Error editing message');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * DELETE /api/v1/messaging/conversations/:conversationId/messages/:messageId
 * Delete message
 */
router.delete(
  '/conversations/:conversationId/messages/:messageId',
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { messageId } = req.params;

      await messageService.deleteMessage(messageId, userId);

      res.json({
        success: true,
        message: 'Message deleted',
      });
    } catch (error) {
      logger.error({ error }, 'Error deleting message');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/messaging/conversations/:conversationId/messages/:messageId/read
 * Mark message as read
 */
router.post(
  '/conversations/:conversationId/messages/:messageId/read',
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { conversationId, messageId } = req.params;

      await messageService.markAsRead(messageId, userId, conversationId);

      res.json({
        success: true,
        message: 'Marked as read',
      });
    } catch (error) {
      logger.error({ error }, 'Error marking as read');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/v1/messaging/conversations/:conversationId/messages/:messageId/read-receipts
 * Get read receipts for message
 */
router.get(
  '/conversations/:conversationId/messages/:messageId/read-receipts',
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;

      const receipts = await messageService.getReadReceipts(messageId);

      res.json({
        success: true,
        data: receipts,
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching read receipts');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/v1/messaging/conversations/:conversationId/messages/:messageId/report
 * Report message
 */
router.post(
  '/conversations/:conversationId/messages/:messageId/report',
  validateRequest(ReportMessageSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { messageId } = req.params;
      const input = ReportMessageSchema.parse(req.body);

      const report = await messageService.reportMessage(messageId, userId, input);

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error({ error }, 'Error reporting message');
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

export default router;
