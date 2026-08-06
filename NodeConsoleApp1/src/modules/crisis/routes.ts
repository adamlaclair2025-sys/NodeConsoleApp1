import { Router } from 'express';
import { crisisResourceController } from './controller';
import { optionalAuth } from '@/middleware/auth';

const router = Router();

// Public endpoints (no auth required for crisis resources)
router.get('/emergency', optionalAuth, (req, res, next) =>
  crisisResourceController.getEmergencyResources(req, res).catch(next),
);

router.get('/featured', optionalAuth, (req, res, next) =>
  crisisResourceController.getFeaturedResources(req, res).catch(next),
);

router.get('/by-location', optionalAuth, (req, res, next) =>
  crisisResourceController.getByLocation(req, res).catch(next),
);

router.get('/by-category', optionalAuth, (req, res, next) =>
  crisisResourceController.getByCategory(req, res).catch(next),
);

router.get('/search', optionalAuth, (req, res, next) =>
  crisisResourceController.search(req, res).catch(next),
);

router.get('/categories', optionalAuth, (req, res, next) =>
  crisisResourceController.getCategories(req, res).catch(next),
);

router.get('/countries', optionalAuth, (req, res, next) =>
  crisisResourceController.getCountries(req, res).catch(next),
);

router.get('/', optionalAuth, (req, res, next) =>
  crisisResourceController.listAll(req, res).catch(next),
);

export default router;
