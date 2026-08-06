import { prisma } from '@/database/client';
import { logger } from '@/config/logger';
import {
  CreateMessageInput,
  UpdateMessageInput,
  GetMessagesInput,
  ReportMessageInput,
  GetUploadUrlInput,
} from './schemas';
import { MessageModerationService } from './moderation.service';

const RATE_LIMIT_MESSAGES_PER_MINUTE = 20;
const RATE_LIMIT_CONVERSATION_MESSAGES_PER_MINUTE = 5;

export class MessageService {
  private moderationService: MessageModerationService;

  constructor() {
    this.moderationService = new MessageModerationService();
  }

  /**
   * Send message to conversation
   */
  async sendMessage(
    userId: string,
    input: CreateMessageInput
  ): Promise<any> {
    logger.info(
      { userId, conversationId: input.conversationId, contentLength: input.content.length },
      'Sending message'
    );

    // Verify user is conversation member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: input.conversationId,
          userId,
        },
      },
    });

    if (!member || member.leftAt) {
      throw new Error('Not a member of this conversation');
    }

    // Rate limiting
    await this.checkRateLimit(userId, input.conversationId);

    // Content moderation (for safety keywords, harmful content)
    const moderationResult = await this.moderationService.screenMessage(
      input.content,
      userId,
      input.conversationId
    );

    if (moderationResult.flagged) {
      logger.warn(
        { userId, conversationId: input.conversationId, reason: moderationResult.reason },
        'Message flagged by moderation'
      );
      // Optionally reject or flag for review
      // For now, we allow it but mark for review
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: input.conversationId,
        authorId: userId,
        content: input.content,
        isEncrypted: false, // Enable E2E encryption in future
        attachments: input.attachments && input.attachments.length > 0
          ? {
              create: input.attachments.map((att) => ({
                fileUrl: att.fileUrl,
                fileName: att.fileName,
                mimeType: att.mimeType,
                size: att.size,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Create moderation record if flagged
    if (moderationResult.flagged) {
      await this.moderationService.createModerationEntry(
        input.conversationId,
        message.id,
        userId,
        moderationResult.reason
      );
    }

    logger.info(
      { messageId: message.id, conversationId: input.conversationId },
      'Message sent successfully'
    );

    return this.formatMessage(message);
  }

  /**
   * Get messages from conversation with pagination
   */
  async getMessages(
    userId: string,
    conversationId: string,
    input: GetMessagesInput
  ): Promise<any> {
    // Verify user is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new Error('Access denied');
    }

    // Build where clause for cursor-based pagination
    let where: any = {
      conversationId,
      isDeleted: false,
    };

    if (input.cursor) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: input.cursor },
      });

      if (!cursorMessage) {
        throw new Error('Invalid cursor');
      }

      // Pagination direction
      if (input.direction === 'before') {
        where.createdAt = { lt: cursorMessage.createdAt };
      } else {
        where.createdAt = { gt: cursorMessage.createdAt };
      }
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: input.direction === 'before' ? 'desc' : 'asc' },
      take: input.limit,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        attachments: true,
        readBy: {
          where: { userId },
        },
      },
    });

    return {
      messages: messages.map((m) => this.formatMessage(m)),
      pageInfo: {
        hasMore: messages.length === input.limit,
        cursor: messages.length > 0 ? messages[messages.length - 1].id : null,
      },
    };
  }

  /**
   * Update message
   */
  async updateMessage(
    messageId: string,
    userId: string,
    input: UpdateMessageInput
  ): Promise<any> {
    // Get message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.authorId !== userId) {
      throw new Error('Can only edit your own messages');
    }

    // Check if message is too old to edit (e.g., > 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (message.createdAt < oneHourAgo) {
      throw new Error('Cannot edit messages older than 1 hour');
    }

    // Re-screen content
    const moderationResult = await this.moderationService.screenMessage(
      input.content,
      userId,
      message.conversationId
    );

    // Update message
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: input.content,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    logger.info(
      { messageId, userId },
      'Message updated'
    );

    return this.formatMessage(updated);
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.authorId !== userId) {
      throw new Error('Can only delete your own messages');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    logger.info(
      { messageId, userId },
      'Message deleted'
    );
  }

  /**
   * Mark message as read
   */
  async markAsRead(
    messageId: string,
    userId: string,
    conversationId: string
  ): Promise<void> {
    // Get conversation member record
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      return; // Silently ignore if not a member
    }

    // Create or update read record
    await prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      create: {
        messageId,
        userId,
        conversationMemberId: member.id,
        readAt: new Date(),
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  /**
   * Get read receipts for message
   */
  async getReadReceipts(messageId: string): Promise<any[]> {
    const reads = await prisma.messageRead.findMany({
      where: { messageId },
      include: {
        conversationMember: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    displayName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return reads.map((r) => ({
      userId: r.conversationMember.user.id,
      displayName: r.conversationMember.user.profile?.displayName,
      avatar: r.conversationMember.user.profile?.avatar,
      readAt: r.readAt,
    }));
  }

  /**
   * Report message
   */
  async reportMessage(
    messageId: string,
    userId: string,
    input: ReportMessageInput
  ): Promise<any> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Prevent self-reporting
    if (message.authorId === userId) {
      throw new Error('Cannot report your own messages');
    }

    // Check for duplicate reports from same user
    const existing = await prisma.messageReport.findFirst({
      where: {
        messageId,
        reporterId: userId,
        status: { in: ['pending', 'reviewing'] },
      },
    });

    if (existing) {
      throw new Error('You have already reported this message');
    }

    // Create report
    const report = await prisma.messageReport.create({
      data: {
        messageId,
        reporterId: userId,
        reason: input.reason,
        description: input.description,
        status: 'pending',
      },
    });

    logger.info(
      { messageId, reporterId: userId, reason: input.reason },
      'Message reported'
    );

    // Create moderation queue entry
    await this.moderationService.createReportQueueEntry(
      messageId,
      userId,
      input.reason,
      input.description
    );

    return {
      id: report.id,
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  /**
   * Get upload URL for file attachment (future: S3 integration)
   */
  async getUploadUrl(userId: string, input: GetUploadUrlInput): Promise<any> {
    // Placeholder for S3 signed URL generation
    // In production, this would generate actual S3 presigned URLs

    logger.info(
      { userId, fileName: input.fileName, mimeType: input.mimeType },
      'Generate upload URL requested'
    );

    // For now, return a placeholder
    return {
      uploadUrl: `https://storage.example.com/uploads/${userId}/${Date.now()}-${input.fileName}`,
      fileUrl: `https://files.example.com/messages/${userId}/${Date.now()}-${input.fileName}`,
      expiresIn: 3600, // 1 hour
    };
  }

  /**
   * Rate limit check: max 20 messages/minute per user
   */
  private async checkRateLimit(userId: string, conversationId: string): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    // Global rate limit
    const userMessages = await prisma.message.count({
      where: {
        authorId: userId,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (userMessages >= RATE_LIMIT_MESSAGES_PER_MINUTE) {
      throw new Error('You are sending messages too quickly. Please wait a moment.');
    }

    // Per-conversation rate limit
    const conversationMessages = await prisma.message.count({
      where: {
        conversationId,
        authorId: userId,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (conversationMessages >= RATE_LIMIT_CONVERSATION_MESSAGES_PER_MINUTE) {
      throw new Error('You are sending too many messages to this conversation. Please slow down.');
    }
  }

  /**
   * Format message for API response
   */
  private formatMessage(message: any): any {
    return {
      id: message.id,
      conversationId: message.conversationId,
      author: {
        id: message.author.id,
        displayName: message.author.profile?.displayName,
        avatar: message.author.profile?.avatar,
      },
      content: message.content,
      attachments: message.attachments || [],
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      isDeleted: message.isDeleted,
      readCount: message.readBy?.length || 0,
    };
  }
}

export const messageService = new MessageService();
