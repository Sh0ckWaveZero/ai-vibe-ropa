import { describe, it, expect, beforeAll } from 'vitest';
import { createTestDepartment, createAuthenticatedUser, validRopaPayload } from './helpers.js';

describe('ROPA status workflow', () => {
  let dept: { id: string };
  let editor: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let dpo: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let admin: Awaited<ReturnType<typeof createAuthenticatedUser>>;

  beforeAll(async () => {
    dept = await createTestDepartment('WF');
    editor = await createAuthenticatedUser({ roleCode: 'dept_editor', departmentId: dept.id });
    dpo = await createAuthenticatedUser({ roleCode: 'dpo' });
    // dept_editor has no ropa.delete (only super_admin does, by design) — use
    // an admin for delete-permission tests below.
    admin = await createAuthenticatedUser({ roleCode: 'super_admin', departmentId: dept.id });
  });

  it('new records start as DRAFT', async () => {
    const res = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    expect(res.body.record.status).toBe('DRAFT');
  });

  it('a DRAFT record can be edited by its department editor', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;

    const edited = await editor.agent.patch(`/api/ropa/${id}`).send({ activityName: 'Updated activity' });
    expect(edited.status).toBe(200);
    expect(edited.body.record.activityName).toBe('Updated activity');
  });

  it('editing a record writes a field-level before/after diff to the audit log', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    const originalName = created.body.record.activityName;

    await editor.agent.patch(`/api/ropa/${id}`).send({ activityName: 'Diff-tracked activity' });

    const auditRes = await admin.agent.get('/api/audit?take=10');
    const entry = auditRes.body.logs.find((log: { action: string; entityId: string }) => log.action === 'ropa.update' && log.entityId === id);
    expect(entry).toBeTruthy();
    expect(entry.metadata.changes.activityName).toEqual({ old: originalName, new: 'Diff-tracked activity' });
  });

  it('audit log supports filtering by entity type, action, and pagination', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.patch(`/api/ropa/${id}`).send({ activityName: 'Filter-tested activity' });

    const byEntityType = await admin.agent.get('/api/audit?entityType=RopaRecord&pageSize=5');
    expect(byEntityType.status).toBe(200);
    expect(byEntityType.body.logs.length).toBeGreaterThan(0);
    expect(byEntityType.body.logs.every((log: { entityType: string }) => log.entityType === 'RopaRecord')).toBe(true);

    const byAction = await admin.agent.get('/api/audit?action=ropa.update&pageSize=5');
    expect(byAction.body.logs.every((log: { action: string }) => log.action.includes('ropa.update'))).toBe(true);

    const page1 = await admin.agent.get('/api/audit?pageSize=1&page=1');
    const page2 = await admin.agent.get('/api/audit?pageSize=1&page=2');
    expect(page1.body.logs).toHaveLength(1);
    expect(page2.body.logs).toHaveLength(1);
    expect(page1.body.logs[0].id).not.toBe(page2.body.logs[0].id);
    expect(page1.body.total).toBeGreaterThan(1);

    const entityTypesRes = await admin.agent.get('/api/audit/entity-types');
    expect(entityTypesRes.status).toBe(200);
    expect(entityTypesRes.body.entityTypes).toContain('RopaRecord');
  });

  it('dept_editor lacks ropa.delete — cannot delete even their own draft', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;

    const deleted = await editor.agent.delete(`/api/ropa/${id}`);
    expect(deleted.status).toBe(403);
  });

  it('a holder of ropa.delete can delete a DRAFT record, but not once SUBMITTED', async () => {
    const created = await admin.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;

    const deleted = await admin.agent.delete(`/api/ropa/${id}`);
    expect(deleted.status).toBe(200);
    const getAfterDelete = await admin.agent.get(`/api/ropa/${id}`);
    expect(getAfterDelete.status).toBe(404);

    const created2 = await admin.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id2 = created2.body.record.id;
    await admin.agent.post(`/api/ropa/${id2}/submit`);
    const deleteAttempt = await admin.agent.delete(`/api/ropa/${id2}`);
    expect(deleteAttempt.status).toBe(409);
  });

  it('submitting moves DRAFT -> SUBMITTED and locks it from further edits by the editor', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;

    const submitted = await editor.agent.post(`/api/ropa/${id}/submit`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.record.status).toBe('SUBMITTED');
    expect(submitted.body.record.submittedAt).not.toBeNull();

    const editAttempt = await editor.agent.patch(`/api/ropa/${id}`).send({ activityName: 'should fail' });
    expect(editAttempt.status).toBe(403);
  });

  it('dept_editor cannot submit twice (already SUBMITTED)', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    const secondSubmit = await editor.agent.post(`/api/ropa/${id}/submit`);
    expect(secondSubmit.status).toBe(409);
  });

  it('a DPO can approve a SUBMITTED record', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    const approved = await dpo.agent.post(`/api/ropa/${id}/review`).send({ decision: 'approve' });
    expect(approved.status).toBe(200);
    expect(approved.body.record.status).toBe('APPROVED');
    expect(approved.body.record.approvedAt).not.toBeNull();
  });

  it('a DPO rejecting requires a rejectionReason and unlocks the record for editing again', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    const rejectNoReason = await dpo.agent.post(`/api/ropa/${id}/review`).send({ decision: 'reject' });
    expect(rejectNoReason.status).toBe(400);

    const rejected = await dpo.agent
      .post(`/api/ropa/${id}/review`)
      .send({ decision: 'reject', rejectionReason: 'Missing legal basis' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.record.status).toBe('REJECTED');
    expect(rejected.body.record.rejectionReason).toBe('Missing legal basis');

    // Rejected records go back to being editable by the owning department.
    const editAfterReject = await editor.agent.patch(`/api/ropa/${id}`).send({ activityName: 'fixed now' });
    expect(editAfterReject.status).toBe(200);
  });

  it('an editor without ropa.approve cannot review a submitted record', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    const res = await editor.agent.post(`/api/ropa/${id}/review`).send({ decision: 'approve' });
    expect(res.status).toBe(403);
  });

  it('only DRAFT/REJECTED records can be submitted (not APPROVED)', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(dept.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);
    await dpo.agent.post(`/api/ropa/${id}/review`).send({ decision: 'approve' });

    const resubmit = await editor.agent.post(`/api/ropa/${id}/submit`);
    expect(resubmit.status).toBe(409);
  });
});
