import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handling middleware
 */
export function errorHandler(err: Error | ApiError, req: Request, res: Response, next: NextFunction): void {
  const statusCode = (err as ApiError).statusCode || 500;
  const code = (err as ApiError).code || 'INTERNAL_SERVER_ERROR';

  logger.error(
    {
      error: err.message,
      code,
      statusCode,
      path: req.path,
      method: req.method,
      userId: req.auth?.userId,
    },
    'API Error',
  );

  res.status(statusCode).json({
    error: {
      message: err.message || 'An unexpected error occurred',
      code,
      requestId: req.id,
    },
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: 'Not found',
      code: 'NOT_FOUND',
      path: req.path,
    },
  });
}

/**
 * Custom error class
 */
export class AppError extends Error implements ApiError {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, 'AUTHENTICATION_ERROR', message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, 'AUTHORIZATION_ERROR', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}
