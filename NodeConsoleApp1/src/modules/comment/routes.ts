import { Router } from 'express';
import { commentController } from './controller';
import { authenticate, optionalAuth } from '@/middleware/auth';
import reactionRoutes from '@/modules/reaction/routes';

const router = Router({ mergeParams: true });

// Public endpoints
router.get('/', optionalAuth, (req, res, next) =>
  commentController.getPostComments(req, res).catch(next),
);
router.get('/:id', optionalAuth, (req, res, next) =>
  commentController.getComment(req, res).catch(next),
);

// Nested reactions
router.use('/:commentId/reactions', reactionRoutes);

// Protected endpoints
router.post('/', authenticate, (req, res, next) =>
  commentController.createComment(req, res).catch(next),
);
router.patch('/:id', authenticate, (req, res, next) =>
  commentController.updateComment(req, res).catch(next),
);
router.patch('/:id/moderation', authenticate, (req, res, next) =>
  commentController.updateCommentModeration(req, res).catch(next),
);
router.delete('/:id', authenticate, (req, res, next) =>
  commentController.deleteComment(req, res).catch(next),
);

export default router;
