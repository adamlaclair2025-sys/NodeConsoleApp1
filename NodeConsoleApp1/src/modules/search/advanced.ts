import { Request, Response } from 'express';
import { advancedSearchService } from './service';

export class AdvancedSearchController {
  /**
   * Advanced search endpoint
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    const {
      query,
      type,
      communityId,
      authorId,
      hasReactions,
      hasComments,
      postedAfter,
      postedBefore,
    } = req.query;

    if (!query) {
      res.status(400).json({ error: 'Search query required' });
      return;
    }

    const results = await advancedSearchService.searchPosts({
      query: query as string,
      type: type as 'text' | 'image' | 'video',
      communityId: communityId as string,
      authorId: authorId as string,
      hasReactions: hasReactions === 'true',
      hasComments: hasComments === 'true',
      postedAfter: postedAfter ? new Date(postedAfter as string) : undefined,
      postedBefore: postedBefore ? new Date(postedBefore as string) : undefined,
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  }

  /**
   * Search users
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    const { query, status, isPublic } = req.query;

    if (!query) {
      res.status(400).json({ error: 'Search query required' });
      return;
    }

    const results = await advancedSearchService.searchUsers({
      query: query as string,
      status: status as 'active' | 'suspended' | 'deactivated',
      isPublic: isPublic !== 'false',
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  }

  /**
   * Search private journals (authenticated user only)
   */
  async searchJournals(req: Request, res: Response): Promise<void> {
    const { query, moodTags, dateFrom, dateTo } = req.query;

    const results = await advancedSearchService.searchJournalEntries(
      req.auth!.userId,
      {
        query: query as string,
        moodTags: moodTags
          ? Array.isArray(moodTags)
            ? (moodTags as string[])
            : [(moodTags as string)]
          : undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      },
    );

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  }

  /**
   * Search workshops
   */
  async searchWorkshops(req: Request, res: Response): Promise<void> {
    const { query, difficulty, categories, durationMin, durationMax } = req.query;

    const results = await advancedSearchService.searchWorkshops({
      query: query as string,
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      categories: categories
        ? Array.isArray(categories)
          ? (categories as string[])
          : [(categories as string)]
        : undefined,
      durationMin: durationMin ? parseInt(durationMin as string) : undefined,
      durationMax: durationMax ? parseInt(durationMax as string) : undefined,
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(req: Request, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string) || 7;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const results = await advancedSearchService.getTrendingTopics(days, limit);

    res.json({
      success: true,
      data: results,
    });
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(req: Request, res: Response): Promise<void> {
    const { query } = req.query;

    if (!query || (query as string).length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const suggestions = await advancedSearchService.getSearchSuggestions(query as string);

    res.json({
      success: true,
      data: suggestions,
    });
  }
}

export const advancedSearchController = new AdvancedSearchController();
