import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { NotFoundError } from '@/middleware/errors';

export class CommentService {
  /**
   * Create a comment on a post
   */
  async createComment(data: {
    authorId: string;
    postId: string;
    content: string;
    isAnonymous?: boolean;
    parentCommentId?: string;
  }): Promise<any> {
    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: data.postId } });
    if (!post) {
      throw new NotFoundError('Post');
    }

    // If replying to comment, verify parent exists
    if (data.parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentCommentId },
      });
      if (!parentComment) {
        throw new NotFoundError('Parent comment');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        authorId: data.authorId,
        postId: data.postId,
        parentCommentId: data.parentCommentId,
        content: data.content,
        isAnonymous: data.isAnonymous || false,
        status: 'published',
      },
      include: {
        author: { include: { profile: true } },
        replies: { take: 5 },
        reactions: true,
      },
    });

    logger.info(
      { commentId: comment.id, postId: data.postId, authorId: data.authorId },
      'Comment created',
    );

    return comment;
  }

  /**
   * Get comment thread
   */
  async getComment(id: string): Promise<any> {
    return prisma.comment.findUnique({
      where: { id },
      include: {
        author: { include: { profile: true } },
        replies: {
          include: {
            author: { include: { profile: true } },
            reactions: true,
          },
        },
        reactions: true,
      },
    });
  }

  /**
   * Get all comments on a post
   */
  async getPostComments(
    postId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any[]> {
    return prisma.comment.findMany({
      where: {
        postId,
        parentCommentId: null, // Only top-level comments
        status: 'published',
        deletedAt: null,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { include: { profile: true } },
        replies: {
          take: 3,
          orderBy: { createdAt: 'asc' },
          include: {
            author: { include: { profile: true } },
          },
        },
        reactions: true,
      },
    });
  }

  /**
   * Update comment
   */
  async updateComment(
    id: string,
    authorId: string,
    content: string,
  ): Promise<any> {
    const comment = await this.getComment(id);

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.authorId !== authorId) {
      throw new Error('Unauthorized');
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: { include: { profile: true } },
        replies: true,
        reactions: true,
      },
    });

    logger.info({ commentId: id }, 'Comment updated');
    return updated;
  }

  /**
   * Delete comment (soft delete)
   */
  async deleteComment(id: string, authorId: string): Promise<void> {
    const comment = await this.getComment(id);

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.authorId !== authorId) {
      throw new Error('Unauthorized');
    }

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'archived' },
    });

    logger.info({ commentId: id }, 'Comment deleted');
  }

  async setCommentModerationState(id: string, moderatorId: string, state: string, isLocked?: boolean): Promise<any> {
    const comment = await this.getComment(id);
    if (!comment) {
      throw new NotFoundError('Comment');
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: {
        moderationState: state,
        isLocked: isLocked ?? comment.isLocked,
      },
    });

    logger.info({ commentId: id, moderatorId, state, isLocked }, 'Comment moderation state updated');
    return updated;
  }

  /**
   * Count comments on post
   */
  async countPostComments(postId: string): Promise<number> {
    return prisma.comment.count({
      where: {
        postId,
        status: 'published',
        deletedAt: null,
      },
    });
  }
}

export const commentService = new CommentService();
