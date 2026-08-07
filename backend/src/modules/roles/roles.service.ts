import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { PERMISSIONS } from '../../constants/permissions.js';

export async function listPermissions() {
  return PERMISSIONS;
}

export async function listRoles() {
  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return roles.map((role) => ({
    id: role.id,
    code: role.code,
    nameTh: role.nameTh,
    nameEn: role.nameEn,
    nameZh: role.nameZh,
    isSystem: role.isSystem,
    userCount: role._count.users,
    permissionCodes: role.rolePermissions.map((rp) => rp.permission.code),
  }));
}

export async function createRole(input: {
  code: string;
  nameTh: string;
  nameEn: string;
  nameZh: string;
  permissionCodes: string[];
}) {
  const existing = await prisma.role.findUnique({ where: { code: input.code } });
  if (existing) throw AppError.conflict('Role code already exists', 'ROLE_CODE_TAKEN');

  const permissions = await prisma.permission.findMany({ where: { code: { in: input.permissionCodes } } });

  return prisma.role.create({
    data: {
      code: input.code,
      nameTh: input.nameTh,
      nameEn: input.nameEn,
      nameZh: input.nameZh,
      isSystem: false,
      rolePermissions: {
        create: permissions.map((p) => ({ permissionId: p.id })),
      },
    },
    include: { rolePermissions: { include: { permission: true } } },
  });
}

export async function updateRole(
  id: string,
  input: Partial<{ nameTh: string; nameEn: string; nameZh: string; permissionCodes: string[] }>
) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw AppError.notFound('Role not found');

  return prisma.$transaction(async (tx) => {
    if (input.permissionCodes) {
      const permissions = await tx.permission.findMany({ where: { code: { in: input.permissionCodes } } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: id, permissionId: p.id })),
      });
    }

    return tx.role.update({
      where: { id },
      data: {
        nameTh: input.nameTh,
        nameEn: input.nameEn,
        nameZh: input.nameZh,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
  });
}

export async function deleteRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw AppError.notFound('Role not found');
  if (role.isSystem) throw AppError.forbidden('System roles cannot be deleted', 'SYSTEM_ROLE_PROTECTED');
  if (role._count.users > 0) throw AppError.conflict('Role still has users assigned', 'ROLE_IN_USE');

  await prisma.role.delete({ where: { id } });
}
