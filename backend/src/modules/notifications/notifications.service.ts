import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function notifyUsers(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });
}

export async function findUserIdsWithPermission(code: string, excludeUserId?: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      role: { rolePermissions: { some: { permission: { code } } } },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function listNotifications(
  userId: string,
  opts: { page: number; pageSize: number; unreadOnly?: boolean }
) {
  const where = { userId, ...(opts.unreadOnly ? { isRead: false } : {}) };
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    prisma.notification.count({ where }),
  ]);
  return { notifications, total, page: opts.page, pageSize: opts.pageSize };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

/** Scoped by userId in the WHERE clause, not just the id — a user can never mark someone else's notification read. */
export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
