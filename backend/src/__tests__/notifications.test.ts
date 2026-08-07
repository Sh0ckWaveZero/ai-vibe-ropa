import { describe, it, expect, beforeAll } from 'vitest';
import { createTestDepartment, createAuthenticatedUser, validRopaPayload } from './helpers.js';

describe('Notifications', () => {
  let dept: { id: string };
  let editor: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let dpo: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let secondDpo: Awaited<ReturnType<typeof createAuthenticatedUser>>;

  beforeAll(async () => {
    dept = await createTestDepartment('NTF');
    editor = await createAuthenticatedUser({ roleCode: 'dept_editor', departmentId: dept.id });
    dpo = await createAuthenticatedUser({ roleCode: 'dpo' });
    secondDpo = await createAuthenticatedUser({ roleCode: 'dpo' });
  });

  it('submitting a record notifies every user who holds ropa.approve', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;

    await editor.agent.post(`/api/ropa/${id}/submit`);

    const dpoNotifications = await dpo.agent.get('/api/notifications');
    const match = dpoNotifications.body.notifications.find(
      (n: { entityId: string; type: string }) => n.entityId === id && n.type === 'ropa.submitted'
    );
    expect(match).toBeTruthy();

    const secondDpoNotifications = await secondDpo.agent.get('/api/notifications');
    expect(
      secondDpoNotifications.body.notifications.some((n: { entityId: string }) => n.entityId === id)
    ).toBe(true);

    const editorNotifications = await editor.agent.get('/api/notifications');
    expect(editorNotifications.body.notifications.some((n: { entityId: string }) => n.entityId === id)).toBe(false);
  });

  it('approving a record notifies its creator, and unread count / mark-read work', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    const beforeCount = await editor.agent.get('/api/notifications/unread-count');

    await dpo.agent.post(`/api/ropa/${id}/review`).send({ decision: 'approve' });

    const afterCount = await editor.agent.get('/api/notifications/unread-count');
    expect(afterCount.body.count).toBe(beforeCount.body.count + 1);

    const listRes = await editor.agent.get('/api/notifications');
    const notification = listRes.body.notifications.find(
      (n: { entityId: string; type: string }) => n.entityId === id && n.type === 'ropa.approved'
    );
    expect(notification).toBeTruthy();

    await editor.agent.post(`/api/notifications/${notification.id}/read`);
    const afterRead = await editor.agent.get('/api/notifications/unread-count');
    expect(afterRead.body.count).toBe(beforeCount.body.count);
  });

  it('rejecting a record notifies its creator with the rejection reason', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    await dpo.agent.post(`/api/ropa/${id}/review`).send({ decision: 'reject', rejectionReason: 'Needs more detail' });

    const listRes = await editor.agent.get('/api/notifications');
    const notification = listRes.body.notifications.find(
      (n: { entityId: string; type: string }) => n.entityId === id && n.type === 'ropa.rejected'
    );
    expect(notification).toBeTruthy();
    expect(notification.metadata.rejectionReason).toBe('Needs more detail');
  });

  it('mark-all-read clears the unread count and a user cannot mark another user\'s notification read', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    const dpoListBefore = await dpo.agent.get('/api/notifications');
    const dpoNotification = dpoListBefore.body.notifications.find((n: { entityId: string }) => n.entityId === id);

    await secondDpo.agent.post(`/api/notifications/${dpoNotification.id}/read`);
    const dpoUnreadAfterOthersAttempt = await dpo.agent.get('/api/notifications/unread-count');
    expect(dpoUnreadAfterOthersAttempt.body.count).toBeGreaterThan(0);

    await dpo.agent.post('/api/notifications/read-all');
    const dpoUnreadAfter = await dpo.agent.get('/api/notifications/unread-count');
    expect(dpoUnreadAfter.body.count).toBe(0);
  });
});
