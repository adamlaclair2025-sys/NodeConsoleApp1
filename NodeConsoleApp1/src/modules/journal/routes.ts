import { Router } from 'express';
import { journalController } from './controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All journal endpoints require authentication
router.post('/', authenticate, (req, res, next) =>
  journalController.createEntry(req, res).catch(next),
);
router.get('/', authenticate, (req, res, next) =>
  journalController.getEntries(req, res).catch(next),
);
router.get('/stats', authenticate, (req, res, next) =>
  journalController.getMoodStats(req, res).catch(next),
);
router.get('/:id', authenticate, (req, res, next) =>
  journalController.getEntry(req, res).catch(next),
);
router.patch('/:id', authenticate, (req, res, next) =>
  journalController.updateEntry(req, res).catch(next),
);
router.delete('/:id', authenticate, (req, res, next) =>
  journalController.deleteEntry(req, res).catch(next),
);

export default router;
