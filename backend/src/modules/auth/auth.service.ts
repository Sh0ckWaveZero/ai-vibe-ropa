import { prisma } from '../../db/prisma.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken, signPreAuthToken } from '../../utils/jwt.js';
import { AppError } from '../../utils/AppError.js';
import type { PermissionCode } from '../../constants/permissions.js';
import { buildQrCode, decryptSecret, encryptSecret, generateTotpSecret, verifyTotpCode } from '../../utils/totp.js';
import { consumeBackupCode, issueBackupCodes, looksLikeBackupCode } from '../../utils/backupCodes.js';

// Never reveals whether an email exists — comparing against a dummy hash
// keeps the response time (and outcome) the same as a real user with a
// wrong password.
const DUMMY_PASSWORD_HASH = await hashPassword('not-a-real-password-used-only-for-timing');

async function loadPermissions(roleId: string): Promise<PermissionCode[]> {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return rolePermissions.map((rp) => rp.permission.code) as PermissionCode[];
}

async function loadUserWithRole(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user || !user.isActive) throw AppError.unauthorized('User no longer active', 'USER_INACTIVE');
  return user;
}

async function issueFullSession(userId: string) {
  const user = await loadUserWithRole(userId);

  const accessToken = signAccessToken({ sub: user.id, roleCode: user.role.code });
  const { raw, hash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hash, expiresAt } });
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

export type LoginStage = 'setup_required' | 'verify_required';

export async function login(email: string, password: string): Promise<{ stage: LoginStage; preAuthToken: string }> {
  const user = await prisma.user.findUnique({ where: { email } });

  const valid = await comparePassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.isActive || !valid) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const stage: LoginStage = user.totpEnabled ? 'verify_required' : 'setup_required';
  const preAuthToken = signPreAuthToken(user.id, user.totpEnabled ? 'verify' : 'setup');
  return { stage, preAuthToken };
}

export async function startTotpSetup(userId: string) {
  const user = await loadUserWithRole(userId);
  if (user.totpEnabled) {
    throw AppError.conflict('Two-factor authentication is already enabled', 'TOTP_ALREADY_ENABLED');
  }

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { totpSecretEnc: encryptSecret(secret) } });

  const { qrCodeDataUrl } = await buildQrCode(secret, user.email);
  return { qrCodeDataUrl, secret };
}

export async function confirmTotpSetup(userId: string, code: string) {
  const user = await loadUserWithRole(userId);
  if (user.totpEnabled) {
    throw AppError.conflict('Two-factor authentication is already enabled', 'TOTP_ALREADY_ENABLED');
  }
  if (!user.totpSecretEnc) {
    throw AppError.badRequest('Call /2fa/setup first', 'TOTP_SETUP_NOT_STARTED');
  }

  const secret = decryptSecret(user.totpSecretEnc);
  if (!verifyTotpCode(secret, code)) {
    throw AppError.badRequest('Invalid verification code', 'INVALID_TOTP_CODE');
  }

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
  const backupCodes = await issueBackupCodes(userId);
  const session = await issueFullSession(userId);

  return { ...session, backupCodes };
}

export async function verifyTotpOrBackupCode(userId: string, code: string) {
  const user = await loadUserWithRole(userId);
  if (!user.totpEnabled || !user.totpSecretEnc) {
    throw AppError.conflict('Two-factor authentication is not set up for this account', 'TOTP_NOT_ENABLED');
  }

  let ok: boolean;
  if (looksLikeBackupCode(code)) {
    ok = await consumeBackupCode(userId, code);
  } else {
    ok = verifyTotpCode(decryptSecret(user.totpSecretEnc), code);
  }

  if (!ok) {
    throw AppError.badRequest('Invalid verification code', 'INVALID_TOTP_CODE');
  }

  return issueFullSession(userId);
}

export async function regenerateBackupCodes(userId: string) {
  const user = await loadUserWithRole(userId);
  if (!user.totpEnabled) {
    throw AppError.conflict('Two-factor authentication is not enabled', 'TOTP_NOT_ENABLED');
  }
  return issueBackupCodes(userId);
}

export async function adminResetTwoFactor(userId: string) {
  // Also revoke existing sessions: this endpoint exists for compromise
  // remediation, so an attacker who already completed 2FA verify must not
  // keep a live session (via /auth/refresh) after the reset.
  await prisma.$transaction([
    prisma.backupCode.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecretEnc: null } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
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
    totpEnabled: user.totpEnabled,
    permissions,
  };
}
