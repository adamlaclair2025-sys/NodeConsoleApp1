import { Request, Response } from 'express';
import { moderationService } from './service';
import { createReportSchema } from '../community/schemas';
import { submitAppealSchema, reviewAppealSchema } from './schemas';
import { logger } from '@/config/logger';

export class ModerationController {
  /**
   * POST /reports
   */
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const input = createReportSchema.parse(req.body);
      const report = await moderationService.createReport({
        ...input,
        reporterId: req.auth!.userId,
      });

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * GET /moderation/queue
   */
  async getModertionQueue(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const reports = await moderationService.getOpenReports(limit, offset);

    res.json({
      success: true,
      data: reports,
      pagination: { limit, offset },
    });
  }

  /**
   * GET /reports/:id
   */
  async getReport(req: Request, res: Response): Promise<void> {
    const report = await moderationService.getReport(req.params.id);

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.json({
      success: true,
      data: report,
    });
  }

  /**
   * POST /reports/:id/resolve
   */
  async resolveReport(req: Request, res: Response): Promise<void> {
    const { resolution, action } = req.body;

    if (!resolution) {
      res.status(400).json({ error: 'Resolution is required' });
      return;
    }

    const report = await moderationService.resolveReport(
      req.params.id,
      req.auth!.userId,
      resolution,
      action,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      },
    );

    logger.info(
      {
        reportId: req.params.id,
        resolvedBy: req.auth!.userId,
        action,
      },
      'Report resolved via API',
    );

    res.json({
      success: true,
      data: report,
    });
  }

  async submitAppeal(req: Request, res: Response): Promise<void> {
    const input = submitAppealSchema.parse(req.body);
    const appeal = await moderationService.submitAppeal(
      req.params.id,
      req.auth!.userId,
      input.reason,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      },
    );

    res.status(201).json({ success: true, data: appeal });
  }

  async reviewAppeal(req: Request, res: Response): Promise<void> {
    const input = reviewAppealSchema.parse(req.body);
    const appeal = await moderationService.reviewAppeal(
      req.params.appealId,
      req.auth!.userId,
      input.decision,
      input.resolution,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      },
    );

    res.json({ success: true, data: appeal });
  }
}

export const moderationController = new ModerationController();
