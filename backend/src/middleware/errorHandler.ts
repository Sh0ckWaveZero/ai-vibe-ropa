import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { isProd } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten() },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Internal server error' : String((err as Error)?.message ?? err),
    },
  });
}
