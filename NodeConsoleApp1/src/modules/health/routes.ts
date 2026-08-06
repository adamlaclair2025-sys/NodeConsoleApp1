import { Router } from 'express';
import { optionalAuth } from '@/middleware/auth';

const router = Router();

// Health and status endpoints
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/status', optionalAuth, (req, res) => {
  res.json({
    status: 'operational',
    authenticated: !!req.auth?.verified,
    userId: req.auth?.userId || null,
    timestamp: new Date().toISOString(),
  });
});

export default router;
