import app from '@/app';
import { config } from '@/config';
import { logger } from '@/config/logger';
import prisma from '@/database/client';
import { initializeWebSocketServer } from '@/modules/messaging/websocket-server';

const PORT = config.node.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${config.node.env}`);
});

// Initialize WebSocket server
initializeWebSocketServer(server);

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', err => {
  logger.error(err, 'Uncaught Exception');
  process.exit(1);
});

export default server;
