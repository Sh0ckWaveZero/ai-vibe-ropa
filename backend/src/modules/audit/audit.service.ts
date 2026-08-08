import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  createdFrom?: Date;
  createdTo?: Date;
  page: number;
  pageSize: number;
}

export async function listAuditLogs(filters: AuditLogFilters) {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
      ...(filters.createdTo ? { lte: filters.createdTo } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page: filters.page, pageSize: filters.pageSize };
}

export async function listDistinctEntityTypes(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    distinct: ['entityType'],
    select: { entityType: true },
    orderBy: { entityType: 'asc' },
  });
  return rows.map((r) => r.entityType);
}
