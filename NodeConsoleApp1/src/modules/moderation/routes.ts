import { Router } from 'express';
import { moderationController } from './controller';
import { authenticate, authorize } from '@/middleware/auth';
import { UserRole } from '@/types';

const router = Router();

// Public endpoint
router.post('/', authenticate, (req, res, next) =>
  moderationController.createReport(req, res).catch(next),
);

router.get('/:id', authenticate, (req, res, next) =>
  moderationController.getReport(req, res).catch(next),
);

// Moderator endpoints
router.get(
  '/moderation/queue',
  authenticate,
  authorize(UserRole.SENIOR_MODERATOR, UserRole.ADMIN),
  (req, res, next) => moderationController.getModertionQueue(req, res).catch(next),
);

router.post(
  '/:id/resolve',
  authenticate,
  authorize(UserRole.SENIOR_MODERATOR, UserRole.ADMIN),
  (req, res, next) => moderationController.resolveReport(req, res).catch(next),
);

router.post(
  '/:id/appeal',
  authenticate,
  (req, res, next) => moderationController.submitAppeal(req, res).catch(next),
);

router.post(
  '/:id/appeals/:appealId/review',
  authenticate,
  authorize(UserRole.SENIOR_MODERATOR, UserRole.ADMIN),
  (req, res, next) => moderationController.reviewAppeal(req, res).catch(next),
);

export default router;
