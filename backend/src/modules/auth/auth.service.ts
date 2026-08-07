import { prisma } from '../../db/prisma.js';
import { comparePassword } from '../../utils/password.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../../utils/jwt.js';
import { AppError } from '../../utils/AppError.js';
import type { PermissionCode } from '../../constants/permissions.js';

async function loadPermissions(roleId: string): Promise<PermissionCode[]> {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return rolePermissions.map((rp) => rp.permission.code) as PermissionCode[];
}

export async function login(email: string, password: string, req?: { ip?: string; headers?: Record<string, unknown> }) {
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken({ sub: user.id, roleCode: user.role.code });
  const { raw, hash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const permissions = await loadPermissions(user.roleId);

  return {
    accessToken,
    refreshToken: raw,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleCode: user.role.code,
      departmentId: user.departmentId,
      localePref: user.localePref,
      permissions,
    },
  };
}

export async function refresh(rawRefreshToken: string) {
  const hash = hashRefreshToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token invalid or expired', 'REFRESH_INVALID');
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId }, include: { role: true } });
  if (!user || !user.isActive) {
    throw AppError.unauthorized('User no longer active', 'USER_INACTIVE');
  }

  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });

  const accessToken = signAccessToken({ sub: user.id, roleCode: user.role.code });
  const { raw, hash: newHash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: newHash, expiresAt } });

  return { accessToken, refreshToken: raw };
}

export async function logout(rawRefreshToken?: string) {
  if (!rawRefreshToken) return;
  const hash = hashRefreshToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, department: true },
  });
  if (!user) throw AppError.notFound('User not found');

  const permissions = await loadPermissions(user.roleId);

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roleCode: user.role.code,
    roleNameTh: user.role.nameTh,
    roleNameEn: user.role.nameEn,
    roleNameZh: user.role.nameZh,
    departmentId: user.departmentId,
    departmentNameTh: user.department?.nameTh ?? null,
    departmentNameEn: user.department?.nameEn ?? null,
    departmentNameZh: user.department?.nameZh ?? null,
    localePref: user.localePref,
    permissions,
  };
}
