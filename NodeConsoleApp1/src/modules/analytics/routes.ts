import { Router } from 'express';
import { analyticsController } from './controller';
import { authenticate, authorize } from '@/middleware/auth';
import { UserRole } from '@/types';

const router = Router();

// All analytics endpoints require admin access
router.get('/dashboard', authenticate, authorize(UserRole.ADMIN), (req, res, next) =>
  analyticsController.getDashboard(req, res).catch(next),
);

router.get('/engagement', authenticate, authorize(UserRole.ADMIN), (req, res, next) =>
  analyticsController.getEngagement(req, res).catch(next),
);

router.get('/content', authenticate, authorize(UserRole.ADMIN), (req, res, next) =>
  analyticsController.getContent(req, res).catch(next),
);

router.get('/wellness', authenticate, authorize(UserRole.ADMIN), (req, res, next) =>
  analyticsController.getWellness(req, res).catch(next),
);

router.get('/safety', authenticate, authorize(UserRole.ADMIN), (req, res, next) =>
  analyticsController.getSafety(req, res).catch(next),
);

router.get('/health', authenticate, authorize(UserRole.ADMIN), (req, res, next) =>
  analyticsController.getHealth(req, res).catch(next),
);

router.get('/retention', authenticate, authorize(UserRole.ADMIN), (req, res, next) =>
  analyticsController.getRetention(req, res).catch(next),
);

export default router;
