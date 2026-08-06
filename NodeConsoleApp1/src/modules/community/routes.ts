import { Router } from 'express';
import { communityController } from './controller';
import { authenticate, optionalAuth } from '@/middleware/auth';

const router = Router();

// Public endpoints
router.get('/', optionalAuth, (req, res, next) =>
  communityController.listCommunities(req, res).catch(next),
);
router.get('/:id', optionalAuth, (req, res, next) =>
  communityController.getCommunity(req, res).catch(next),
);
router.get('/:id/members', (req, res, next) =>
  communityController.getMembers(req, res).catch(next),
);

// Protected endpoints
router.post('/', authenticate, (req, res, next) =>
  communityController.createCommunity(req, res).catch(next),
);
router.post('/:id/join', authenticate, (req, res, next) =>
  communityController.joinCommunity(req, res).catch(next),
);
router.post('/:id/block', authenticate, (req, res, next) =>
  communityController.blockCommunityUser(req, res).catch(next),
);
router.post('/:id/mute', authenticate, (req, res, next) =>
  communityController.muteCommunityUser(req, res).catch(next),
);
router.post('/posts/:postId/block', authenticate, (req, res, next) =>
  communityController.blockPostUser(req, res).catch(next),
);
router.post('/posts/:postId/mute', authenticate, (req, res, next) =>
  communityController.mutePostUser(req, res).catch(next),
);
router.delete('/:id/leave', authenticate, (req, res, next) =>
  communityController.leaveCommunity(req, res).catch(next),
);

export default router;
