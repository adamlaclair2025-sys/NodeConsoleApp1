import prisma from '@/database/client';
import { logger } from '@/config/logger';

export class AdvancedSearchService {
  /**
   * Advanced post search
   */
  async searchPosts(filters: {
    query?: string;
    type?: 'text' | 'image' | 'video';
    visibility?: 'public' | 'community';
    communityId?: string;
    authorId?: string;
    hasReactions?: boolean;
    hasComments?: boolean;
    postedAfter?: Date;
    postedBefore?: Date;
    tags?: string[];
  }): Promise<any[]> {
    const where: any = {
      status: 'published',
      visibility: filters.visibility || 'public',
    };

    if (filters.query) {
      where.content = {
        contains: filters.query,
        mode: 'insensitive',
      };
    }

    if (filters.communityId) {
      where.communityId = filters.communityId;
    }

    if (filters.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters.hasReactions) {
      where.reactions = { some: {} };
    }

    if (filters.hasComments) {
      where.comments = { some: {} };
    }

    if (filters.postedAfter || filters.postedBefore) {
      where.publishedAt = {};
      if (filters.postedAfter) {
        where.publishedAt.gte = filters.postedAfter;
      }
      if (filters.postedBefore) {
        where.publishedAt.lte = filters.postedBefore;
      }
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: { include: { profile: true } },
        media: true,
        _count: { select: { reactions: true, comments: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    logger.info(
      { query: filters.query, resultCount: posts.length },
      'Advanced post search performed',
    );

    return posts;
  }

  /**
   * Advanced user search
   */
  async searchUsers(filters: {
    query: string;
    status?: 'active' | 'suspended' | 'deactivated';
    isPublic?: boolean;
    interests?: string[];
  }): Promise<any[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              contains: filters.query,
              mode: 'insensitive',
            },
          },
          {
            profile: {
              displayName: {
                contains: filters.query,
                mode: 'insensitive',
              },
            },
          },
          {
            profile: {
              username: {
                contains: filters.query,
                mode: 'insensitive',
              },
            },
          },
        ],
        status: filters.status || 'active',
        profile: {
          isPublic: filters.isPublic !== false,
        },
      },
      include: { profile: true },
      take: 50,
    });

    return users;
  }

  /**
   * Advanced journal search (private, visible to owner only)
   */
  async searchJournalEntries(
    userId: string,
    filters: {
      query?: string;
      moodTags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<any[]> {
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (filters.query) {
      where.content = {
        contains: filters.query,
        mode: 'insensitive',
      };
    }

    if (filters.moodTags && filters.moodTags.length > 0) {
      where.moodTags = {
        hasSome: filters.moodTags,
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    return prisma.journalEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  /**
   * Search workshops
   */
  async searchWorkshops(filters: {
    query?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    categories?: string[];
    durationMin?: number;
    durationMax?: number;
  }): Promise<any[]> {
    const where: any = {
      isPublished: true,
    };

    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.categories && filters.categories.length > 0) {
      where.category = {
        hasSome: filters.categories,
      };
    }

    if (filters.durationMin !== undefined || filters.durationMax !== undefined) {
      where.duration = {};
      if (filters.durationMin !== undefined) {
        where.duration.gte = filters.durationMin;
      }
      if (filters.durationMax !== undefined) {
        where.duration.lte = filters.durationMax;
      }
    }

    return prisma.workshop.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Filtered trending topics
   */
  async getTrendingTopics(
    days: number = 7,
    limit: number = 20,
  ): Promise<any[]> {
    const sincDate = new Date();
    sincDate.setDate(sincDate.getDate() - days);

    // This would ideally use full-text search or a dedicated search engine
    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: sincDate },
      },
      select: { content: true, _count: { select: { reactions: true, comments: true } } },
      orderBy: { _count: { reactions: 'desc' } },
      take: limit,
    });

    return posts;
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(
    query: string,
    limit: number = 10,
  ): Promise<any[]> {
    const suggestions = await prisma.post.findMany({
      where: {
        content: {
          contains: query,
          mode: 'insensitive',
        },
        status: 'published',
      },
      select: {
        content: true,
      },
      distinct: ['content'],
      take: limit,
    });

    return suggestions.map(s => ({ text: s.content.substring(0, 100) }));
  }
}

export const advancedSearchService = new AdvancedSearchService();
