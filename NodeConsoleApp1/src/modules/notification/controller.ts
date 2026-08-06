import { Request, Response } from 'express';
import { notificationService } from './service';
import { logger } from '@/config/logger';

export class NotificationController {
  /**
   * GET /notifications
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const { notifications, unreadCount } = await notificationService.getUserNotifications(
      req.auth!.userId,
      limit,
      offset,
      unreadOnly,
    );

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { limit, offset },
    });
  }

  /**
   * GET /notifications/unread-count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    const count = await notificationService.getUnreadCount(req.auth!.userId);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  }

  /**
   * PATCH /notifications/:id/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const notification = await notificationService.markAsRead(
        req.params.id,
        req.auth!.userId,
      );

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Unauthorized' });
      } else {
        throw error;
      }
    }
  }

  /**
   * PATCH /notifications/read-all
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    const count = await notificationService.markAllAsRead(req.auth!.userId);

    logger.info({ userId: req.auth!.userId, count }, 'All notifications marked as read via API');

    res.json({
      success: true,
      data: { markedAsRead: count },
    });
  }

  /**
   * DELETE /notifications/:id
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      await notificationService.deleteNotification(req.params.id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Unauthorized' });
      } else {
        throw error;
      }
    }
  }
}

export const notificationController = new NotificationController();
