import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { PermissionCode } from '../constants/permissions.js';

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.ropa_at;
  if (!token) throw AppError.unauthorized('Missing access token', 'NO_TOKEN');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Access token expired or invalid', 'TOKEN_INVALID');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });

  if (!user || !user.isActive) {
    throw AppError.unauthorized('User no longer active', 'USER_INACTIVE');
  }

  req.user = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roleId: user.roleId,
    roleCode: user.role.code,
    departmentId: user.departmentId,
    localePref: user.localePref,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.code) as PermissionCode[],
  };

  next();
});
