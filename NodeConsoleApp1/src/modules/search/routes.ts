import { Router } from 'express';
import { searchController } from './controller';
import { advancedSearchController } from './advanced';
import { authenticate, optionalAuth } from '@/middleware/auth';

const router = Router();

// Basic search
router.get('/', optionalAuth, (req, res, next) => searchController.search(req, res).catch(next));

// Advanced searches
router.get('/advanced/posts', optionalAuth, (req, res, next) =>
  advancedSearchController.advancedSearch(req, res).catch(next),
);

router.get('/advanced/users', optionalAuth, (req, res, next) =>
  advancedSearchController.searchUsers(req, res).catch(next),
);

router.get('/advanced/journals', authenticate, (req, res, next) =>
  advancedSearchController.searchJournals(req, res).catch(next),
);

router.get('/advanced/workshops', optionalAuth, (req, res, next) =>
  advancedSearchController.searchWorkshops(req, res).catch(next),
);

// Trending
router.get('/trending/topics', optionalAuth, (req, res, next) =>
  advancedSearchController.getTrendingTopics(req, res).catch(next),
);

// Suggestions
router.get('/suggestions', optionalAuth, (req, res, next) =>
  advancedSearchController.getSuggestions(req, res).catch(next),
);

export default router;
