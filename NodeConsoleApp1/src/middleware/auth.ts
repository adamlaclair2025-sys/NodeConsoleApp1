import { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyToken } from './jwt';
import { AuthContext } from '@/types';
import { logger } from '@/config/logger';

/**
 * Extend Express Request to include auth context
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Authentication middleware
 * Extracts and validates JWT token from Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    logger.warn({ token: token.substring(0, 20) + '...' }, 'Invalid or expired token');
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.auth = {
    userId: payload.userId,
    email: payload.email,
    roles: payload.roles,
    verified: true,
  };

  next();
}

/**
 * Optional authentication middleware
 * Sets auth context if token is present and valid, but doesn't fail if missing
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.auth = {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles,
        verified: true,
      };
    }
  }

  next();
}

/**
 * Authorization middleware
 * Checks if user has required roles
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth?.verified) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasRole = req.auth.roles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      logger.warn(
        { userId: req.auth.userId, requiredRoles: allowedRoles, userRoles: req.auth.roles },
        'Authorization failed',
      );
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
