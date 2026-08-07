import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/AppError.js';

export async function listDepartments() {
  return prisma.department.findMany({
    include: { _count: { select: { users: true, ropaRecords: true } } },
    orderBy: { code: 'asc' },
  });
}

export async function createDepartment(input: {
  code: string;
  nameTh: string;
  nameEn: string;
  nameZh: string;
}) {
  const existing = await prisma.department.findUnique({ where: { code: input.code } });
  if (existing) throw AppError.conflict('Department code already exists', 'DEPT_CODE_TAKEN');
  return prisma.department.create({ data: input });
}

export async function updateDepartment(
  id: string,
  input: Partial<{ nameTh: string; nameEn: string; nameZh: string; isActive: boolean }>
) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw AppError.notFound('Department not found');
  return prisma.department.update({ where: { id }, data: input });
}

export async function deleteDepartment(id: string) {
  const dept = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { users: true, ropaRecords: true } } },
  });
  if (!dept) throw AppError.notFound('Department not found');
  if (dept._count.users > 0 || dept._count.ropaRecords > 0) {
    throw AppError.conflict('Department still has users or ROPA records', 'DEPT_IN_USE');
  }
  await prisma.department.delete({ where: { id } });
}
