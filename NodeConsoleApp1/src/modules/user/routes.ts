import { Router } from 'express';
import { userController } from './controller';
import { authenticate } from '@/middleware/auth';
import { authRateLimit } from '@/middleware/rateLimiting';

const router = Router();

// Authentication routes (public) - with rate limiting
router.post('/register', authRateLimit(), (req, res, next) => userController.register(req, res).catch(next));
router.post('/login', authRateLimit(), (req, res, next) => userController.login(req, res).catch(next));

// User routes (protected)
router.get('/me', authenticate, (req, res, next) => userController.getMe(req, res).catch(next));
router.patch('/me/profile', authenticate, (req, res, next) =>
  userController.updateProfile(req, res).catch(next),
);
router.delete('/me', authenticate, (req, res, next) =>
  userController.deleteAccount(req, res).catch(next),
);

export default router;
