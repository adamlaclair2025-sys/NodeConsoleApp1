import { prisma } from '@/database/client';
import { logger } from '@/config/logger';
import { ConversationType, ConversationRole } from '@prisma/client';
import {
  CreateConversationInput,
  UpdateConversationInput,
  AddConversationMemberInput,
  GetConversationsInput,
  SearchConversationInput,
  MuteConversationInput,
} from './schemas';

export class ConversationService {
  /**
   * Create a new conversation (1-to-1 or group)
   */
  async createConversation(
    userId: string,
    input: CreateConversationInput
  ): Promise<any> {
    logger.info(
      { userId, type: input.type, participantCount: input.participantIds.length },
      'Creating conversation'
    );

    // Validate: user cannot create conversation with self
    if (input.participantIds.includes(userId)) {
      throw new Error('Cannot create conversation with yourself');
    }

    // For direct messages, find or create existing conversation
    if (input.type === 'direct' && input.participantIds.length === 1) {
      const existingConversation = await this.findDirectConversation(
        userId,
        input.participantIds[0]
      );
      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: input.type as ConversationType,
        name: input.name,
        description: input.description,
        createdBy: userId,
        isEncrypted: false, // Default; enable E2E encryption in future
        lastMessageAt: null,
        members: {
          create: [
            {
              userId,
              role: 'owner' as ConversationRole,
            },
            ...input.participantIds.map((participantId) => ({
              userId: participantId,
              role: 'member' as ConversationRole,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
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
          },
        },
      },
    });

    logger.info(
      { conversationId: conversation.id, memberCount: conversation.members.length },
      'Conversation created successfully'
    );

    return this.formatConversation(conversation, userId);
  }

  /**
   * Get conversation by ID with member details
   */
  async getConversation(conversationId: string, userId: string): Promise<any> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
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
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify user is a member
    const isMember = conversation.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new Error('Access denied');
    }

    return this.formatConversation(conversation, userId);
  }

  /**
   * List user's conversations with pagination
   */
  async getConversations(userId: string, input: GetConversationsInput): Promise<any> {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId,
            leftAt: null,
          },
        },
        archivedAt: input.includeArchived ? undefined : null,
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      skip: input.offset,
      take: input.limit,
      include: {
        members: {
          where: { leftAt: null },
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
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                profile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return conversations.map((conv) => this.formatConversation(conv, userId));
  }

  /**
   * Search conversations by name or participants
   */
  async searchConversations(userId: string, input: SearchConversationInput): Promise<any> {
    const conversations = await prisma.conversation.findMany({
      where: {
        AND: [
          {
            members: {
              some: {
                userId,
                leftAt: null,
              },
            },
          },
          {
            OR: [
              {
                name: {
                  contains: input.query,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: input.query,
                  mode: 'insensitive',
                },
              },
              {
                members: {
                  some: {
                    user: {
                      profile: {
                        displayName: {
                          contains: input.query,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      take: input.limit,
      include: {
        members: {
          where: { leftAt: null },
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

    return conversations.map((conv) => this.formatConversation(conv, userId));
  }

  /**
   * Update conversation (name, description)
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    input: UpdateConversationInput
  ): Promise<any> {
    // Verify user is owner/moderator
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member || member.role === 'member' || member.leftAt) {
      throw new Error('Only moderators can update conversation');
    }

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        name: input.name,
        description: input.description,
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    logger.info(
      { conversationId, userId },
      'Conversation updated'
    );

    return this.formatConversation(conversation, userId);
  }

  /**
   * Add members to group conversation
   */
  async addMembers(
    conversationId: string,
    userId: string,
    input: AddConversationMemberInput
  ): Promise<any> {
    // Verify user is moderator
    const memberRecord = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!memberRecord || memberRecord.role === 'member' || memberRecord.leftAt) {
      throw new Error('Only moderators can add members');
    }

    // Add new members
    const existing = await prisma.conversationMember.findMany({
      where: {
        conversationId,
        userId: { in: input.userIds },
      },
    });

    const newUserIds = input.userIds.filter(
      (id) => !existing.some((m) => m.userId === id)
    );

    if (newUserIds.length > 0) {
      await prisma.conversationMember.createMany({
        data: newUserIds.map((newUserId) => ({
          conversationId,
          userId: newUserId,
          role: input.role as ConversationRole,
        })),
        skipDuplicates: true,
      });

      logger.info(
        { conversationId, addedCount: newUserIds.length },
        'Members added to conversation'
      );
    }

    return this.getConversation(conversationId, userId);
  }

  /**
   * Remove member from conversation
   */
  async removeMember(
    conversationId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    // Verify user is moderator
    const memberRecord = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!memberRecord || memberRecord.role === 'member' || memberRecord.leftAt) {
      throw new Error('Only moderators can remove members');
    }

    // Cannot remove owner
    if (memberRecord.role === 'owner' && userId !== targetUserId) {
      const targetMember = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: targetUserId,
          },
        },
      });

      if (targetMember?.role === 'owner') {
        throw new Error('Cannot remove conversation owner');
      }
    }

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    logger.info(
      { conversationId, removedUserId: targetUserId },
      'Member removed from conversation'
    );
  }

  /**
   * Leave conversation (user perspective)
   */
  async leaveConversation(conversationId: string, userId: string): Promise<void> {
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    logger.info(
      { conversationId, userId },
      'User left conversation'
    );
  }

  /**
   * Mute conversation for user
   */
  async muteConversation(
    conversationId: string,
    userId: string,
    input: MuteConversationInput
  ): Promise<void> {
    if (input.mute === false) {
      // Unmute
      await prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: {
          mutedUntil: null,
        },
      });
    } else {
      // Mute until specified time
      await prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: {
          mutedUntil: input.mutedUntil ? new Date(input.mutedUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    logger.info(
      { conversationId, userId, mutedUntil: input.mutedUntil },
      'Conversation mute status updated'
    );
  }

  /**
   * Archive conversation (soft-delete)
   */
  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member || member.role !== 'owner') {
      throw new Error('Only owner can archive conversation');
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        archivedAt: new Date(),
      },
    });

    logger.info(
      { conversationId, userId },
      'Conversation archived'
    );
  }

  /**
   * Find existing direct conversation between two users
   */
  private async findDirectConversation(userId1: string, userId2: string): Promise<any | null> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        type: 'direct',
        members: {
          every: {
            userId: { in: [userId1, userId2] },
          },
        },
      },
      include: {
        members: {
          where: { leftAt: null },
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

    return conversation ? this.formatConversation(conversation, userId1) : null;
  }

  /**
   * Format conversation response
   */
  private formatConversation(conversation: any, userId: string): any {
    const otherMembers = conversation.members.filter((m: any) => m.userId !== userId);

    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name || (conversation.type === 'direct'
        ? otherMembers[0]?.user?.profile?.displayName
        : 'Group Conversation'
      ),
      description: conversation.description,
      avatar: conversation.type === 'direct'
        ? otherMembers[0]?.user?.profile?.avatar
        : null,
      members: conversation.members.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        displayName: m.user?.profile?.displayName,
        avatar: m.user?.profile?.avatar,
        joinedAt: m.joinedAt,
        isMuted: m.mutedUntil && new Date(m.mutedUntil) > new Date(),
      })),
      lastMessage: conversation.messages?.[0] || null,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      isArchived: !!conversation.archivedAt,
    };
  }
}

export const conversationService = new ConversationService();
