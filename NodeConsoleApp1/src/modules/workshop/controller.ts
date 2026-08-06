import { Request, Response } from 'express';
import { workshopService } from './service';
import { logger } from '@/config/logger';

export class WorkshopController {
  /**
   * GET /workshops
   */
  async listWorkshops(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const workshops = await workshopService.listWorkshops(
      {
        difficulty: req.query.difficulty as string,
        category: req.query.category as string,
      },
      limit,
      offset,
    );

    res.json({
      success: true,
      data: workshops,
      pagination: { limit, offset },
    });
  }

  /**
   * GET /workshops/:id
   */
  async getWorkshop(req: Request, res: Response): Promise<void> {
    const workshop = await workshopService.getWorkshop(req.params.id);

    if (!workshop) {
      res.status(404).json({ error: 'Workshop not found' });
      return;
    }

    res.json({
      success: true,
      data: workshop,
    });
  }

  /**
   * POST /workshops/:id/start
   */
  async startWorkshop(req: Request, res: Response): Promise<void> {
    const progress = await workshopService.startWorkshop(req.params.id, req.auth!.userId);

    logger.info(
      { workshopId: req.params.id, userId: req.auth!.userId },
      'Workshop started via API',
    );

    res.status(201).json({
      success: true,
      data: progress,
    });
  }

  /**
   * PATCH /workshops/:id/progress
   */
  async updateProgress(req: Request, res: Response): Promise<void> {
    const { progressPercent } = req.body;

    if (typeof progressPercent !== 'number' || progressPercent < 0 || progressPercent > 100) {
      res.status(400).json({ error: 'Progress must be between 0 and 100' });
      return;
    }

    const progress = await workshopService.updateProgress(
      req.params.id,
      req.auth!.userId,
      progressPercent,
    );

    res.json({
      success: true,
      data: progress,
    });
  }

  /**
   * GET /workshops/progress
   */
  async getUserProgress(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const progress = await workshopService.getUserProgress(req.auth!.userId, limit, offset);

    res.json({
      success: true,
      data: progress,
      pagination: { limit, offset },
    });
  }
}

export const workshopController = new WorkshopController();
