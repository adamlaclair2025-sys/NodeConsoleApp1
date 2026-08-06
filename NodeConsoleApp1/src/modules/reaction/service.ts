import prisma from '@/database/client';
import { logger } from '@/config/logger';

export const REACTION_TYPES = {
  support: 'Support',
  relate: 'I Relate',
  listening: 'I\'m Listening',
  hug: 'Hug',
  thankYou: 'Thank You',
  proud: 'Proud of You',
  strength: 'Sending Strength',
  thinking: 'Thinking of You',
  helpful: 'Helpful',
  understand: 'I Understand',
  notAlone: 'You\'re Not Alone',
};

export type ReactionType = keyof typeof REACTION_TYPES;

export class ReactionService {
  /**
   * Add a reaction
   */
  async addReaction(data: {
    userId: string;
    postId?: string;
    commentId?: string;
    reactionType: ReactionType;
  }): Promise<any> {
    if (!data.postId && !data.commentId) {
      throw new Error('Must specify either postId or commentId');
    }

    // Check if already reacted with this type
    const existing = await prisma.reaction.findUnique({
      where: {
        userId_postId_commentId_reactionType: {
          userId: data.userId,
          postId: data.postId || null,
          commentId: data.commentId || null,
          reactionType: data.reactionType,
        },
      },
    });

    if (existing) {
      // Remove existing reaction
      await prisma.reaction.delete({ where: { id: existing.id } });
      logger.info(
        { userId: data.userId, reactionType: data.reactionType },
        'Reaction removed',
      );
      return { removed: true, reactionId: existing.id };
    }

    // Add new reaction
    const reaction = await prisma.reaction.create({
      data: {
        userId: data.userId,
        postId: data.postId || undefined,
        commentId: data.commentId || undefined,
        reactionType: data.reactionType,
      },
    });

    logger.info(
      { userId: data.userId, reactionType: data.reactionType },
      'Reaction added',
    );

    return { added: true, reactionId: reaction.id };
  }

  /**
   * Get reactions on a post or comment
   */
  async getReactions(postId?: string, commentId?: string) {
    const reactions = await prisma.reaction.findMany({
      where: {
        ...(postId && { postId }),
        ...(commentId && { commentId }),
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by reaction type and count
    const summary: Record<string, number> = {};
    const byType: Record<string, any[]> = {};

    for (const reaction of reactions) {
      summary[reaction.reactionType] = (summary[reaction.reactionType] || 0) + 1;
      if (!byType[reaction.reactionType]) {
        byType[reaction.reactionType] = [];
      }
      byType[reaction.reactionType].push({
        userId: reaction.userId,
        displayName: reaction.user.profile?.displayName || 'Anonymous',
        avatar: reaction.user.profile?.avatar,
      });
    }

    return { summary, byType, total: reactions.length };
  }

  /**
   * Remove a reaction
   */
  async removeReaction(reactionId: string, userId: string): Promise<void> {
    const reaction = await prisma.reaction.findUnique({
      where: { id: reactionId },
    });

    if (!reaction || reaction.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.reaction.delete({ where: { id: reactionId } });
    logger.info({ reactionId }, 'Reaction deleted');
  }

  /**
   * Get user reactions
   */
  async getUserReactions(userId: string) {
    return prisma.reaction.findMany({
      where: { userId },
      include: {
        post: { select: { id: true } },
        comment: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const reactionService = new ReactionService();
