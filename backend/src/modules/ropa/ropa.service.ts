import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type { AuthUser } from '../../types/express.js';

const EDITABLE_STATUSES = ['DRAFT', 'REJECTED'] as const;

function hasScope(user: AuthUser, code: 'ropa.read_all' | 'ropa.update_all') {
  return user.permissions.includes(code);
}

async function generateReferenceNo(departmentId: string): Promise<string> {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw AppError.badRequest('Department not found');

  const year = new Date().getFullYear();
  const prefix = `ROPA-${dept.code}-${year}-`;
  const count = await prisma.ropaRecord.count({ where: { referenceNo: { startsWith: prefix } } });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

function assertDepartmentAccess(user: AuthUser, departmentId: string, scopeCode: 'ropa.read_all' | 'ropa.update_all') {
  if (hasScope(user, scopeCode)) return;
  if (user.departmentId !== departmentId) {
    throw AppError.forbidden('You do not have access to this department’s records');
  }
}

export interface RopaListFilters {
  departmentId?: string;
  status?: string;
  search?: string;
}

export async function listRopaRecords(user: AuthUser, filters: RopaListFilters) {
  const where: Record<string, unknown> = {};

  if (hasScope(user, 'ropa.read_all')) {
    if (filters.departmentId) where.departmentId = filters.departmentId;
  } else {
    where.departmentId = user.departmentId ?? '__none__';
  }

  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { activityName: { contains: filters.search, mode: 'insensitive' } },
      { referenceNo: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.ropaRecord.findMany({
    where,
    include: {
      department: { select: { id: true, code: true, nameTh: true, nameEn: true, nameZh: true } },
      createdBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getRopaRecord(user: AuthUser, id: string) {
  const record = await prisma.ropaRecord.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, code: true, nameTh: true, nameEn: true, nameZh: true } },
      createdBy: { select: { id: true, fullName: true } },
      updatedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
  });
  if (!record) throw AppError.notFound('ROPA record not found');
  assertDepartmentAccess(user, record.departmentId, 'ropa.read_all');
  return record;
}

export interface RopaInput {
  departmentId: string;
  activityName: string;
  purpose: string;
  legalBasis: string;
  controllerName: string;
  jointController?: string | null;
  dataSubjectCategories: string[];
  dataCategories: string[];
  sensitiveDataCategories: string[];
  collectionSource: string;
  recipients: string[];
  hasCrossBorderTransfer: boolean;
  crossBorderDestination?: string | null;
  crossBorderSafeguards?: string | null;
  retentionPeriod: string;
  disposalMethod: string;
  securityMeasures: string;
  dpoContact?: string | null;
  remarks?: string | null;
}

export async function createRopaRecord(user: AuthUser, input: RopaInput) {
  assertDepartmentAccess(user, input.departmentId, 'ropa.update_all');
  const referenceNo = await generateReferenceNo(input.departmentId);

  return prisma.ropaRecord.create({
    data: {
      ...input,
      referenceNo,
      createdById: user.id,
    },
  });
}

export async function updateRopaRecord(user: AuthUser, id: string, input: Partial<RopaInput>) {
  const record = await prisma.ropaRecord.findUnique({ where: { id } });
  if (!record) throw AppError.notFound('ROPA record not found');

  assertDepartmentAccess(user, record.departmentId, 'ropa.update_all');

  if (!hasScope(user, 'ropa.update_all') && !EDITABLE_STATUSES.includes(record.status as typeof EDITABLE_STATUSES[number])) {
    throw AppError.forbidden('Record is locked for editing at its current status', 'RECORD_LOCKED');
  }

  return prisma.ropaRecord.update({
    where: { id },
    data: { ...input, updatedById: user.id },
  });
}

export async function deleteRopaRecord(user: AuthUser, id: string) {
  const record = await prisma.ropaRecord.findUnique({ where: { id } });
  if (!record) throw AppError.notFound('ROPA record not found');
  assertDepartmentAccess(user, record.departmentId, 'ropa.update_all');

  if (!EDITABLE_STATUSES.includes(record.status as typeof EDITABLE_STATUSES[number])) {
    throw AppError.conflict('Only draft or rejected records can be deleted', 'RECORD_NOT_DELETABLE');
  }

  await prisma.ropaRecord.delete({ where: { id } });
}

export async function submitRopaRecord(user: AuthUser, id: string) {
  const record = await prisma.ropaRecord.findUnique({ where: { id } });
  if (!record) throw AppError.notFound('ROPA record not found');
  assertDepartmentAccess(user, record.departmentId, 'ropa.update_all');

  if (!EDITABLE_STATUSES.includes(record.status as typeof EDITABLE_STATUSES[number])) {
    throw AppError.conflict('Only draft or rejected records can be submitted', 'RECORD_NOT_SUBMITTABLE');
  }

  return prisma.ropaRecord.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date(), rejectionReason: null, updatedById: user.id },
  });
}

export async function reviewRopaRecord(
  user: AuthUser,
  id: string,
  decision: 'approve' | 'reject',
  rejectionReason?: string
) {
  const record = await prisma.ropaRecord.findUnique({ where: { id } });
  if (!record) throw AppError.notFound('ROPA record not found');

  if (record.status !== 'SUBMITTED') {
    throw AppError.conflict('Only submitted records can be reviewed', 'RECORD_NOT_SUBMITTED');
  }

  if (decision === 'approve') {
    return prisma.ropaRecord.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedById: user.id, rejectionReason: null },
    });
  }

  if (!rejectionReason) throw AppError.badRequest('rejectionReason is required when rejecting');

  return prisma.ropaRecord.update({
    where: { id },
    data: { status: 'REJECTED', approvedAt: null, approvedById: user.id, rejectionReason },
  });
}
