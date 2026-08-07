import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import type { PermissionCode } from '../constants/permissions.js';

export function requireAnyPermission(...codes: PermissionCode[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();
    const hasPermission = codes.some((code) => req.user!.permissions.includes(code));
    if (!hasPermission) {
      throw AppError.forbidden(`Missing required permission: ${codes.join(' or ')}`);
    }
    next();
  };
}
