import { Router } from 'express';
import { reactionController } from './controller';
import { authenticate, optionalAuth } from '@/middleware/auth';

const router = Router({ mergeParams: true });

// Get reaction types
router.get('/types', optionalAuth, (req, res) =>
  reactionController.getReactionTypes(req, res)
);

// Get reactions on post/comment
router.get('/', optionalAuth, (req, res, next) =>
  reactionController.getReactions(req, res).catch(next),
);

// Add reaction
router.post('/', authenticate, (req, res, next) =>
  reactionController.addReaction(req, res).catch(next),
);

// Remove reaction
router.delete('/:id', authenticate, (req, res, next) =>
  reactionController.removeReaction(req, res).catch(next),
);

export default router;
