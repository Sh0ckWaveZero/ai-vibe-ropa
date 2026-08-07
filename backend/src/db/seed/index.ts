import { prisma } from '../prisma.js';
import { PERMISSIONS, DEFAULT_ROLES, DEFAULT_DEPARTMENTS } from '../../constants/permissions.js';
import { hashPassword } from '../../utils/password.js';
import { env } from '../../config/env.js';

async function main() {
  console.log('Seeding permissions...');
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

  console.log('Seeding roles + permission matrix...');
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

  console.log('Seeding departments...');
  for (const d of DEFAULT_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { nameTh: d.nameTh, nameEn: d.nameEn, nameZh: d.nameZh },
      create: d,
    });
  }

  console.log('Seeding bootstrap admin user...');
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  const hq = await prisma.department.findUnique({ where: { code: 'HQ' } });
  if (!superAdminRole || !hq) throw new Error('Expected role/department seed to exist before creating admin user');

  const existingAdmin = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL } });
  if (!existingAdmin) {
    const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: env.ADMIN_EMAIL,
        passwordHash,
        fullName: 'System Administrator',
        roleId: superAdminRole.id,
        departmentId: hq.id,
        localePref: 'en',
      },
    });
    console.log(`Created bootstrap admin user: ${env.ADMIN_EMAIL}`);
  } else {
    console.log(`Admin user ${env.ADMIN_EMAIL} already exists, skipping.`);
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
