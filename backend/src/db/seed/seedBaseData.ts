import { prisma } from '../prisma.js';
import { PERMISSIONS, DEFAULT_ROLES, DEFAULT_DEPARTMENTS } from '../../constants/permissions.js';

export async function seedBaseData() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {
        module: p.module,
        action: p.action,
        descriptionTh: p.descriptionTh,
        descriptionEn: p.descriptionEn,
        descriptionZh: p.descriptionZh,
      },
      create: p,
    });
  }

  for (const r of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { nameTh: r.nameTh, nameEn: r.nameEn, nameZh: r.nameZh, isSystem: r.isSystem },
      create: { code: r.code, nameTh: r.nameTh, nameEn: r.nameEn, nameZh: r.nameZh, isSystem: r.isSystem },
    });

    const permissions = await prisma.permission.findMany({ where: { code: { in: r.permissions as string[] } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  for (const d of DEFAULT_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { nameTh: d.nameTh, nameEn: d.nameEn, nameZh: d.nameZh },
      create: d,
    });
  }
}
