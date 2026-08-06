import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import { config } from '@/config';
import { logger } from '@/config/logger';
import { injectRequestId, requestLogger } from '@/middleware/request';
import { errorHandler, notFoundHandler } from '@/middleware/errors';
import healthRoutes from '@/modules/health/routes';
import userRoutes from '@/modules/user/routes';
import postRoutes from '@/modules/post/routes';
import searchRoutes from '@/modules/search/routes';
import communityRoutes from '@/modules/community/routes';
import moderationRoutes from '@/modules/moderation/routes';
import journalRoutes from '@/modules/journal/routes';
import workshopRoutes from '@/modules/workshop/routes';
import crisisRoutes from '@/modules/crisis/routes';
import notificationRoutes from '@/modules/notification/routes';
import analyticsRoutes from '@/modules/analytics/routes';
import messagingRoutes from '@/modules/messaging/routes';
import volunteerRoutes from '@/modules/volunteer/routes';
import safetyRoutes from '@/modules/safety/routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));

// Request middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(injectRequestId);
app.use(requestLogger);

// API v1 routes
const apiV1 = express.Router();

// Health & Status
apiV1.use('/', healthRoutes);

// User & Auth
apiV1.use('/auth', userRoutes);
apiV1.use('/users', userRoutes);

// Posts & Feed
apiV1.use('/posts', postRoutes);

// Communities
apiV1.use('/communities', communityRoutes);

// Search
apiV1.use('/search', searchRoutes);

// Moderation & Reporting
apiV1.use('/reports', moderationRoutes);

// Private Journal
apiV1.use('/journal', journalRoutes);

// Learning & Workshops
apiV1.use('/workshops', workshopRoutes);

// Crisis Resources
apiV1.use('/crisis', crisisRoutes);

// Notifications
apiV1.use('/notifications', notificationRoutes);

// Safety and quick exit
apiV1.use('/safety', safetyRoutes);

// Peer Support Volunteers
apiV1.use('/volunteer', volunteerRoutes);

// Analytics & Reporting
apiV1.use('/analytics', analyticsRoutes);

// Messaging & Real-time Communication
apiV1.use('/messaging', messagingRoutes);

// Mount API routes
app.use('/api/v1', apiV1);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
