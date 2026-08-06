import { Router } from 'express';
import { safetyController } from './controller';
import { optionalAuth } from '@/middleware/auth';

const router = Router();

router.get('/quick-exit', optionalAuth, (req, res) => safetyController.getQuickExit(req, res));

export default router;
