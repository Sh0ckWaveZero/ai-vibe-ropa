import { describe, it, expect, beforeAll } from 'vitest';
import { createTestDepartment, createAuthenticatedUser, validRopaPayload } from './helpers.js';

describe('ROPA attachments', () => {
  let deptA: { id: string };
  let deptB: { id: string };
  let editor: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let otherDeptEditor: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let viewer: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let admin: Awaited<ReturnType<typeof createAuthenticatedUser>>;

  beforeAll(async () => {
    deptA = await createTestDepartment('ATA');
    deptB = await createTestDepartment('ATB');
    editor = await createAuthenticatedUser({ roleCode: 'dept_editor', departmentId: deptA.id });
    otherDeptEditor = await createAuthenticatedUser({ roleCode: 'dept_editor', departmentId: deptB.id });
    viewer = await createAuthenticatedUser({ roleCode: 'viewer' });
    admin = await createAuthenticatedUser({ roleCode: 'super_admin', departmentId: deptA.id });
  });

  it('uploads a file to a DRAFT record and lists it back', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const id = created.body.record.id;

    const uploadRes = await editor.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('hello world'), 'notes.txt');
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.attachment.fileName).toBe('notes.txt');
    expect(uploadRes.body.attachment.sizeBytes).toBe(11);

    const listRes = await editor.agent.get(`/api/ropa/${id}/attachments`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.attachments).toHaveLength(1);
  });

  it('downloads the uploaded file with its original content and filename', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const id = created.body.record.id;
    const uploadRes = await editor.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('some content'), 'report.pdf');
    const attachmentId = uploadRes.body.attachment.id;

    const downloadRes = await editor.agent.get(`/api/ropa/${id}/attachments/${attachmentId}/download`);
    expect(downloadRes.status).toBe(200);
    expect(Buffer.from(downloadRes.body).toString()).toBe('some content');
    expect(downloadRes.headers['content-disposition']).toContain('report.pdf');
    expect(downloadRes.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects disallowed file extensions', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const id = created.body.record.id;

    const res = await editor.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('MZ...'), 'malware.exe');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('a viewer (read_all, no update) can list and download but not upload or delete', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const id = created.body.record.id;
    const uploadRes = await editor.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('viewer test'), 'viewer.txt');
    const attachmentId = uploadRes.body.attachment.id;

    const listRes = await viewer.agent.get(`/api/ropa/${id}/attachments`);
    expect(listRes.status).toBe(200);

    const downloadRes = await viewer.agent.get(`/api/ropa/${id}/attachments/${attachmentId}/download`);
    expect(downloadRes.status).toBe(200);

    const uploadAttemptRes = await viewer.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('nope'), 'nope.txt');
    expect(uploadAttemptRes.status).toBe(403);

    const deleteAttemptRes = await viewer.agent.delete(`/api/ropa/${id}/attachments/${attachmentId}`);
    expect(deleteAttemptRes.status).toBe(403);
  });

  it('a dept_editor from a different department cannot access another department\'s attachments', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const id = created.body.record.id;
    const uploadRes = await editor.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('private'), 'private.txt');
    const attachmentId = uploadRes.body.attachment.id;

    const listRes = await otherDeptEditor.agent.get(`/api/ropa/${id}/attachments`);
    expect(listRes.status).toBe(403);

    const downloadRes = await otherDeptEditor.agent.get(`/api/ropa/${id}/attachments/${attachmentId}/download`);
    expect(downloadRes.status).toBe(403);
  });

  it('uploading to a SUBMITTED record is blocked for a non-update_all holder but allowed for update_all', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const id = created.body.record.id;
    await editor.agent.post(`/api/ropa/${id}/submit`);

    const blockedRes = await editor.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('locked'), 'locked.txt');
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe('RECORD_LOCKED');

    const allowedRes = await admin.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('admin override'), 'admin.txt');
    expect(allowedRes.status).toBe(201);
  });

  it('deleting an attachment removes it and the file becomes unreachable, and writes an audit entry', async () => {
    const created = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const id = created.body.record.id;
    const uploadRes = await editor.agent
      .post(`/api/ropa/${id}/attachments`)
      .attach('file', Buffer.from('delete me'), 'todelete.txt');
    const attachmentId = uploadRes.body.attachment.id;

    const deleteRes = await editor.agent.delete(`/api/ropa/${id}/attachments/${attachmentId}`);
    expect(deleteRes.status).toBe(200);

    const downloadRes = await editor.agent.get(`/api/ropa/${id}/attachments/${attachmentId}/download`);
    expect(downloadRes.status).toBe(404);

    const auditRes = await admin.agent.get(`/api/audit?action=ropa.attachment_delete&pageSize=5`);
    const entry = auditRes.body.logs.find((log: { entityId: string }) => log.entityId === attachmentId);
    expect(entry).toBeTruthy();
  });

  it('an attachment cannot be downloaded through a different record\'s URL', async () => {
    const recordA = await editor.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const recordB = await admin.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    const uploadRes = await editor.agent
      .post(`/api/ropa/${recordA.body.record.id}/attachments`)
      .attach('file', Buffer.from('cross-record'), 'cross.txt');
    const attachmentId = uploadRes.body.attachment.id;

    const crossRes = await admin.agent.get(
      `/api/ropa/${recordB.body.record.id}/attachments/${attachmentId}/download`
    );
    expect(crossRes.status).toBe(404);
  });
});
