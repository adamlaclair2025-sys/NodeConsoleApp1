import { Router } from 'express';
import { workshopController } from './controller';
import { authenticate, optionalAuth } from '@/middleware/auth';

const router = Router();

// Public endpoints
router.get('/', optionalAuth, (req, res, next) =>
  workshopController.listWorkshops(req, res).catch(next),
);
router.get('/:id', optionalAuth, (req, res, next) =>
  workshopController.getWorkshop(req, res).catch(next),
);

// Protected endpoints
router.post('/:id/start', authenticate, (req, res, next) =>
  workshopController.startWorkshop(req, res).catch(next),
);
router.patch('/:id/progress', authenticate, (req, res, next) =>
  workshopController.updateProgress(req, res).catch(next),
);
router.get('/progress', authenticate, (req, res, next) =>
  workshopController.getUserProgress(req, res).catch(next),
);

export default router;
