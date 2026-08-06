import { Router } from 'express';
import { volunteerController } from './controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Volunteer endpoints
router.post('/apply', authenticate, (req, res, next) =>
  volunteerController.applyAsVolunteer(req, res).catch(next),
);

router.get('/profile', authenticate, (req, res, next) =>
  volunteerController.getVolunteerProfile(req, res).catch(next),
);

router.get('/matches', authenticate, (req, res, next) =>
  volunteerController.getMatches(req, res).catch(next),
);

router.get('/stats', authenticate, (req, res, next) =>
  volunteerController.getStats(req, res).catch(next),
);

router.post('/escalate', authenticate, (req, res, next) =>
  volunteerController.escalate(req, res).catch(next),
);

export default router;
