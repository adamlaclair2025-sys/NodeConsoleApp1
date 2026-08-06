import { Request, Response } from 'express';
import { journalService } from './service';
import { logger } from '@/config/logger';

export class JournalController {
  /**
   * POST /journal
   */
  async createEntry(req: Request, res: Response): Promise<void> {
    const { content, moodTags } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const entry = await journalService.createEntry({
      userId: req.auth!.userId,
      content,
      moodTags,
    });

    res.status(201).json({
      success: true,
      data: entry,
    });
  }

  /**
   * GET /journal
   */
  async getEntries(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const entries = await journalService.getUserEntries(req.auth!.userId, limit, offset);

    res.json({
      success: true,
      data: entries,
      pagination: { limit, offset },
    });
  }

  /**
   * GET /journal/stats
   */
  async getMoodStats(req: Request, res: Response): Promise<void> {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);

    const stats = await journalService.getMoodStats(req.auth!.userId, days);

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * GET /journal/:id
   */
  async getEntry(req: Request, res: Response): Promise<void> {
    const entry = await journalService.getEntry(req.params.id);

    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }

    if (entry.userId !== req.auth!.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    res.json({
      success: true,
      data: entry,
    });
  }

  /**
   * PATCH /journal/:id
   */
  async updateEntry(req: Request, res: Response): Promise<void> {
    const { content, moodTags } = req.body;

    try {
      const entry = await journalService.updateEntry(req.params.id, req.auth!.userId, {
        content,
        moodTags,
      });

      res.json({
        success: true,
        data: entry,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Cannot edit another user\'s entry' });
      } else {
        throw error;
      }
    }
  }

  /**
   * DELETE /journal/:id
   */
  async deleteEntry(req: Request, res: Response): Promise<void> {
    try {
      await journalService.deleteEntry(req.params.id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Cannot delete another user\'s entry' });
      } else {
        throw error;
      }
    }
  }
}

export const journalController = new JournalController();
