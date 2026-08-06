import { Router } from 'express';
import { postController } from './controller';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import commentRoutes from '@/modules/comment/routes';
import reactionRoutes from '@/modules/reaction/routes';
import { createPostSchema } from './schemas';

const router = Router();

// Public endpoints
router.get('/feed', optionalAuth, (req, res, next) => postController.getFeed(req, res).catch(next));
router.get('/:id', optionalAuth, (req, res, next) => postController.getPost(req, res).catch(next));

// Nested routes
router.use('/:postId/comments', commentRoutes);
router.use('/:postId/reactions', reactionRoutes);

// Protected endpoints
router.post('/', authenticate, validateBody(createPostSchema), (req, res, next) => postController.createPost(req, res).catch(next));
router.delete('/:id', authenticate, (req, res, next) => postController.deletePost(req, res).catch(next));

export default router;
