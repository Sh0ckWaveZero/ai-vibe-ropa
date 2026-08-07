import type { NextFunction, Request, Response } from 'express';
import { verifyPreAuthToken, type PreAuthStage } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

declare global {
  namespace Express {
    interface Request {
      preAuthUserId?: string;
    }
  }
}

export function requirePreAuth(stage: PreAuthStage) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.ropa_pre;
    if (!token) throw AppError.unauthorized('Missing pre-auth session', 'NO_PRE_AUTH');

    let payload;
    try {
      payload = verifyPreAuthToken(token);
    } catch {
      throw AppError.unauthorized('Pre-auth session expired or invalid', 'PRE_AUTH_INVALID');
    }

    if (payload.stage !== stage) {
      throw AppError.forbidden('Pre-auth session is not at the expected stage', 'PRE_AUTH_WRONG_STAGE');
    }

    req.preAuthUserId = payload.sub;
    next();
  };
}
