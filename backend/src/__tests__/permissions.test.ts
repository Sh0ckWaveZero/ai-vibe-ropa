import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, createTestDepartment, createAuthenticatedUser, validRopaPayload } from './helpers.js';

describe('ROPA department scoping', () => {
  let deptA: { id: string };
  let deptB: { id: string };
  let editorA: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let editorB: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let viewer: Awaited<ReturnType<typeof createAuthenticatedUser>>;
  let recordInA: { id: string };

  beforeAll(async () => {
    deptA = await createTestDepartment('DEPT_A');
    deptB = await createTestDepartment('DEPT_B');
    editorA = await createAuthenticatedUser({ roleCode: 'dept_editor', departmentId: deptA.id });
    editorB = await createAuthenticatedUser({ roleCode: 'dept_editor', departmentId: deptB.id });
    viewer = await createAuthenticatedUser({ roleCode: 'viewer', departmentId: deptA.id });

    const res = await editorA.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    recordInA = res.body.record;
  });

  it('dept_editor can create a record in their own department', async () => {
    const res = await editorA.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    expect(res.status).toBe(201);
    expect(res.body.record.departmentId).toBe(deptA.id);
  });

  it('dept_editor cannot create a record in a foreign department', async () => {
    const res = await editorA.agent.post('/api/ropa').send(validRopaPayload(deptB.id));
    expect(res.status).toBe(403);
  });

  it('dept_editor cannot read a record belonging to another department', async () => {
    const res = await editorB.agent.get(`/api/ropa/${recordInA.id}`);
    expect(res.status).toBe(403);
  });

  it('dept_editor list only returns their own department, ignoring a foreign departmentId query param', async () => {
    const res = await editorB.agent.get(`/api/ropa?departmentId=${deptA.id}`);
    expect(res.status).toBe(200);
    for (const record of res.body.records) {
      expect(record.departmentId).toBe(deptB.id);
    }
  });

  it('viewer (ropa.read_all) can read a record in a department they do not belong to', async () => {
    const res = await viewer.agent.get(`/api/ropa/${recordInA.id}`);
    expect(res.status).toBe(200);
    expect(res.body.record.id).toBe(recordInA.id);
  });

  it('viewer without ropa.create cannot create a record', async () => {
    const res = await viewer.agent.post('/api/ropa').send(validRopaPayload(deptA.id));
    expect(res.status).toBe(403);
  });

  it('dept_editor cannot update a record belonging to another department', async () => {
    const res = await editorB.agent.patch(`/api/ropa/${recordInA.id}`).send({ activityName: 'hijacked' });
    expect(res.status).toBe(403);
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/ropa');
    expect(res.status).toBe(401);
  });
});
