import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import prisma from '@/database/client';
import { NotFoundError } from '@/middleware/errors';

export class SearchController {
  /**
   * Global search across posts, comments, communities
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, type, limit = 20, offset = 0 } = req.query;

      if (!q || typeof q !== 'string' || q.length < 2) {
        res.status(400).json({ error: 'Search query must be at least 2 characters' });
        return;
      }

      const pageLimit = Math.min(parseInt(limit as string) || 20, 100);
      const pageOffset = parseInt(offset as string) || 0;

      const results: {
        posts?: typeof posts;
        comments?: typeof comments;
        communities?: typeof communities;
      } = {};

      if (!type || type === 'posts') {
        const posts = await prisma.post.findMany({
          where: {
            AND: [
              { status: 'published' },
              { visibility: 'public' },
              {
                content: {
                  search: q.split(' ').join(' & '),
                },
              },
            ],
          },
          take: pageLimit,
          skip: pageOffset,
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                profile: { select: { displayName: true, avatar: true } },
              },
            },
          },
          orderBy: { publishedAt: 'desc' },
        });

        results.posts = posts;
      }

      if (!type || type === 'communities') {
        const communities = await prisma.community.findMany({
          where: {
            AND: [
              { visibility: 'public' },
              {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              },
            ],
          },
          take: pageLimit,
          skip: pageOffset,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatar: true,
            memberCount: true,
          },
        });

        results.communities = communities;
      }

      logger.info({ query: q, userId: req.auth?.userId }, 'Search performed');

      res.json({
        success: true,
        data: results,
        pagination: { limit: pageLimit, offset: pageOffset },
      });
    } catch (error) {
      throw error;
    }
  }
}

export const searchController = new SearchController();
