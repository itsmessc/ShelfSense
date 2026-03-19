import type { Request, Response, NextFunction } from 'express';

/**
 * Domain-specific HTTP error. Throw this in services/controllers to return
 * a structured error response without a stack trace in the logs.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Central Express error handler — must be registered LAST in app.ts.
 * All unhandled errors bubble up here.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
