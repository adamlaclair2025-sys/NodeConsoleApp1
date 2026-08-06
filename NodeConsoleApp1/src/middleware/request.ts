import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/config/logger';

/**
 * Request ID injection middleware
 */
export function injectRequestId(req: Request, res: Response, next: NextFunction): void {
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.auth?.userId,
      },
      'HTTP Request',
    );
  });

  next();
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
