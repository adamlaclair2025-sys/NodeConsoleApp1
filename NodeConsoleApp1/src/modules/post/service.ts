import prisma from '@/database/client';
import { logger } from '@/config/logger';
import { Post } from '@prisma/client';

export class PostService {
  /**
   * Create a new post
   */
  async createPost(data: {
    authorId: string;
    communityId?: string;
    content: string;
    visibility?: string;
    audience?: string;
    isAnonymous?: boolean;
    anonymousAlias?: string;
    contentWarning?: string;
    triggerWarnings?: string[];
    allowComments?: boolean;
    allowReactions?: boolean;
    isDraft?: boolean;
  }): Promise<Post> {
    const post = await prisma.post.create({
      data: {
        authorId: data.authorId,
        communityId: data.communityId,
        content: data.content,
        visibility: data.visibility || 'public',
        audience: data.audience || 'everyone',
        isAnonymous: data.isAnonymous || false,
        anonymousAlias: data.anonymousAlias,
        contentWarning: data.contentWarning,
        triggerWarnings: data.triggerWarnings || [],
        allowComments: data.allowComments ?? true,
        allowReactions: data.allowReactions ?? true,
        status: data.isDraft ? 'draft' : 'published',
        publishedAt: data.isDraft ? null : new Date(),
      },
      include: {
        author: { include: { profile: true } },
        media: true,
        reactions: true,
      },
    });

    logger.info({ postId: post.id, authorId: data.authorId }, 'Post created');
    return post;
  }

  /**
   * Get post by ID
   */
  async getPostById(id: string): Promise<Post | null> {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: { include: { profile: true } },
        media: true,
        reactions: true,
        comments: true,
      },
    });
  }

  /**
   * Get feed (chronological)
   */
  async getFeed(limit: number = 20, offset: number = 0): Promise<Post[]> {
    return prisma.post.findMany({
      where: {
        status: 'published',
        visibility: 'public',
      },
      take: limit,
      skip: offset,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { include: { profile: true } },
        media: true,
        reactions: { take: 5 },
        _count: {
          select: { comments: true, reactions: true },
        },
      },
    });
  }

  /**
   * Delete post
   */
  async deletePost(id: string, authorId: string): Promise<void> {
    const post = await this.getPostById(id);

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== authorId) {
      throw new Error('Unauthorized');
    }

    await prisma.post.update({
      where: { id },
      data: { status: 'archived', deletedAt: new Date() },
    });

    logger.info({ postId: id }, 'Post deleted');
  }
}

export const postService = new PostService();
