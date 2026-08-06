import { Router } from 'express';
import { notificationController } from './controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All notification endpoints require authentication
router.get('/', authenticate, (req, res, next) =>
  notificationController.getNotifications(req, res).catch(next),
);

router.get('/unread-count', authenticate, (req, res, next) =>
  notificationController.getUnreadCount(req, res).catch(next),
);

router.patch('/:id/read', authenticate, (req, res, next) =>
  notificationController.markAsRead(req, res).catch(next),
);

router.patch('/read-all', authenticate, (req, res, next) =>
  notificationController.markAllAsRead(req, res).catch(next),
);

router.delete('/:id', authenticate, (req, res, next) =>
  notificationController.deleteNotification(req, res).catch(next),
);

export default router;
