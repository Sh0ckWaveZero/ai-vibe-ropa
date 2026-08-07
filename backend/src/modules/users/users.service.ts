import { prisma } from '../../db/prisma.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { AppError } from '../../utils/AppError.js';
import { computeDiff } from '../../utils/diff.js';

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  isActive: true,
  localePref: true,
  totpEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  roleId: true,
  departmentId: true,
  role: { select: { id: true, code: true, nameTh: true, nameEn: true, nameZh: true } },
  department: { select: { id: true, code: true, nameTh: true, nameEn: true, nameZh: true } },
} as const;

export async function listUsers(pagination?: { page: number; pageSize: number }) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: userSummarySelect,
      orderBy: { createdAt: 'asc' },
      ...(pagination
        ? { skip: (pagination.page - 1) * pagination.pageSize, take: pagination.pageSize }
        : {}),
    }),
    prisma.user.count(),
  ]);

  return pagination ? { users, total, page: pagination.page, pageSize: pagination.pageSize } : { users, total };
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  roleId: string;
  departmentId?: string | null;
  localePref?: 'th' | 'en' | 'zh';
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('Email already in use', 'EMAIL_TAKEN');

  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) throw AppError.badRequest('Role not found');

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      roleId: input.roleId,
      departmentId: input.departmentId ?? null,
      localePref: input.localePref ?? 'th',
    },
    select: userSummarySelect,
  });
}

export async function updateUser(
  id: string,
  input: Partial<{
    fullName: string;
    roleId: string;
    departmentId: string | null;
    isActive: boolean;
  }>
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound('User not found');

  const changes = computeDiff(user, input);

  const updated = await prisma.user.update({
    where: { id },
    data: input,
    select: userSummarySelect,
  });

  return { user: updated, changes };
}

export async function resetPassword(id: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound('User not found');
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

export async function updateSelf(
  id: string,
  input: Partial<{ fullName: string; localePref: 'th' | 'en' | 'zh' }>
) {
  return prisma.user.update({
    where: { id },
    data: input,
    select: userSummarySelect,
  });
}

export async function changeOwnPassword(id: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound('User not found');
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw AppError.unauthorized('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}
