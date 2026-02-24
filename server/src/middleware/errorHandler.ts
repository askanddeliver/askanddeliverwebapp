import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  error.isOperational = true;
  return error;
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Cannot find ${req.originalUrl} on this server`, 404);
  next(error);
};

export const errorHandler = (
  err: AppError & { code?: number; errors?: unknown },
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // Mongoose validation / duplicate key errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 400;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      ...(err.code && { code: err.code }),
    });
  }

  // Send response
  res.status(statusCode).json({
    status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Async handler wrapper to catch errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
};
