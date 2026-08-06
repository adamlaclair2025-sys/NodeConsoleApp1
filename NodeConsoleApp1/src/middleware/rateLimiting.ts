import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

/**
 * Rate limiting middleware (simple in-memory implementation)
 * For production, use Redis-based solution
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 100,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      requestCounts.set(key, record);
      next();
      return;
    }

    record.count++;

    if (record.count > maxRequests) {
      logger.warn({ ip: key, count: record.count }, 'Rate limit exceeded');
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
      });
      return;
    }

    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    res.set('X-RateLimit-Reset', record.resetTime.toString());

    next();
  };
}

/**
 * Stricter rate limiting for auth endpoints
 */
export function authRateLimit() {
  return rateLimit(15 * 60 * 1000, 5); // 5 requests per 15 minutes
}
