import { Request, Response } from 'express';
import { analyticsService } from './service';
import { authorize } from '@/middleware/auth';
import { UserRole } from '@/types';

export class AnalyticsController {
  /**
   * GET /analytics/dashboard
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    const metrics = await analyticsService.getDashboardMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }

  /**
   * GET /analytics/engagement
   */
  async getEngagement(req: Request, res: Response): Promise<void> {
    const metrics = await analyticsService.getUserEngagement();

    res.json({
      success: true,
      data: metrics,
    });
  }

  /**
   * GET /analytics/content
   */
  async getContent(req: Request, res: Response): Promise<void> {
    const metrics = await analyticsService.getContentMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }

  /**
   * GET /analytics/wellness
   */
  async getWellness(req: Request, res: Response): Promise<void> {
    const metrics = await analyticsService.getWellnessMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }

  /**
   * GET /analytics/safety
   */
  async getSafety(req: Request, res: Response): Promise<void> {
    const metrics = await analyticsService.getSafetyMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }

  /**
   * GET /analytics/health
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    const metrics = await analyticsService.getSystemHealth();

    res.json({
      success: true,
      data: metrics,
    });
  }

  /**
   * GET /analytics/retention
   */
  async getRetention(req: Request, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string) || 30;
    const metrics = await analyticsService.getRetentionMetrics(days);

    res.json({
      success: true,
      data: metrics,
    });
  }
}

export const analyticsController = new AnalyticsController();
