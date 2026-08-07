import { prisma } from '../prisma.js';
import { seedBaseData } from './seedBaseData.js';
import { hashPassword } from '../../utils/password.js';
import { env } from '../../config/env.js';

async function main() {
  console.log('Seeding permissions, roles, and departments...');
  await seedBaseData();

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
