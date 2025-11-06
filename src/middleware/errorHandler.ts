import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Global Error Handler Middleware
 * Handles all unhandled errors in the application
 */
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Global Error Handler:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Default error values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let code = error.code || 'INTERNAL_ERROR';
  let details = error.details;

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    code = prismaError.code;
    details = prismaError.details;
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    code = 'VALIDATION_ERROR';
    details = { type: 'prisma_validation' };
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Database connection error';
    code = 'DATABASE_CONNECTION_ERROR';
    details = { type: 'database_connection' };
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    code = 'TOKEN_EXPIRED';
  }

  // Handle validation errors (express-validator)
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  }

  // Handle async errors
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }

  // Construct error response
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message: process.env.NODE_ENV === 'production' ? 
        getSafeErrorMessage(statusCode, message) : message
    }
  };

  // Add details in development mode or for specific error types
  if (process.env.NODE_ENV === 'development' && details) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  code: string;
  details?: any;
} {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      return {
        statusCode: 409,
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        details: {
          field: error.meta?.target,
          constraint: 'unique'
        }
      };

    case 'P2025': // Record not found
      return {
        statusCode: 404,
        message: 'Resource not found',
        code: 'RESOURCE_NOT_FOUND',
        details: {
          cause: error.meta?.cause
        }
      };

    case 'P2003': // Foreign key constraint violation
      return {
        statusCode: 400,
        message: 'Invalid reference to related resource',
        code: 'FOREIGN_KEY_CONSTRAINT',
        details: {
          field: error.meta?.field_name
        }
      };

    case 'P2014': // Relation violation
      return {
        statusCode: 400,
        message: 'Invalid data: relation constraint violated',
        code: 'RELATION_CONSTRAINT',
        details: {
          relation: error.meta?.relation_name
        }
      };

    case 'P2021': // Table not found
      return {
        statusCode: 500,
        message: 'Database schema error',
        code: 'DATABASE_SCHEMA_ERROR',
        details: {
          table: error.meta?.table
        }
      };

    case 'P2022': // Column not found
      return {
        statusCode: 500,
        message: 'Database schema error',
        code: 'DATABASE_SCHEMA_ERROR',
        details: {
          column: error.meta?.column
        }
      };

    default:
      return {
        statusCode: 500,
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        details: {
          prismaCode: error.code,
          meta: error.meta
        }
      };
  }
}

/**
 * Return safe error messages for production
 */
function getSafeErrorMessage(statusCode: number, originalMessage: string): string {
  if (statusCode >= 500) {
    return 'Internal server error';
  }

  // Allow client errors (4xx) to show original message
  return originalMessage;
}

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error creator
 */
export class AppErrorClass extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: string = 'BAD_REQUEST', details?: any): AppErrorClass {
    return new AppErrorClass(message, 400, code, details);
  }

  static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED'): AppErrorClass {
    return new AppErrorClass(message, 401, code);
  }

  static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN', details?: any): AppErrorClass {
    return new AppErrorClass(message, 403, code, details);
  }

  static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND'): AppErrorClass {
    return new AppErrorClass(message, 404, code);
  }

  static conflict(message: string, code: string = 'CONFLICT', details?: any): AppErrorClass {
    return new AppErrorClass(message, 409, code, details);
  }

  static internal(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR'): AppErrorClass {
    return new AppErrorClass(message, 500, code);
  }
}

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = AppErrorClass.notFound(`Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND');
  next(error);
};