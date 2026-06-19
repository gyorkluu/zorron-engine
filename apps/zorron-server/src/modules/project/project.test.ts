import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { like } from 'drizzle-orm';
import { createApp } from '../../app';
import { db } from '../../config/database';
import { users, projects } from '../../db/schema';

const app = createApp();

function testEmail(): string {
  return `project-test-${randomUUID()}@test.zorron.io`;
}

async function registerAndLogin(email: string) {
  const registerResponse = await app.handle(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', nickname: 'Tester' }),
    }),
  );
  const body = await registerResponse.json();
  return body.token as string;
}

async function createProject(token: string, title: string) {
  const response = await app.handle(
    new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description: 'Test project' }),
    }),
  );
  return { response, body: await response.json() };
}

describe('Project API', () => {
  afterAll(async () => {
    await db.delete(projects).where(
      like(projects.title, 'project-test-%'),
    );
    await db.delete(users).where(like(users.email, 'project-test-%@test.zorron.io'));
  });

  it('POST /api/projects creates a project', async () => {
    const token = await registerAndLogin(testEmail());
    const title = `project-test-${randomUUID()}`;

    const { response, body } = await createProject(token, title);

    expect(response.status).toBe(201);
    expect(body.title).toBe(title);
    expect(body.data).toBeDefined();
    expect(body.data.nodes).toEqual([]);
  });

  it('GET /api/projects lists projects with pagination', async () => {
    const token = await registerAndLogin(testEmail());
    const title = `project-test-${randomUUID()}`;
    await createProject(token, title);

    const response = await app.handle(
      new Request('http://localhost/api/projects?page=1&pageSize=10', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
    expect(body.meta.page).toBe(1);
  });

  it('GET /api/projects/:id returns project details', async () => {
    const token = await registerAndLogin(testEmail());
    const { body: created } = await createProject(token, `project-test-${randomUUID()}`);

    const response = await app.handle(
      new Request(`http://localhost/api/projects/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.id).toBe(created.id);
  });

  it('PATCH /api/projects/:id updates project data', async () => {
    const token = await registerAndLogin(testEmail());
    const { body: created } = await createProject(token, `project-test-${randomUUID()}`);

    const updateData = {
      data: {
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
        ],
        edges: [],
        variables: { score: 0 },
        settings: {},
      },
    };

    const response = await app.handle(
      new Request(`http://localhost/api/projects/${created.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.nodes).toHaveLength(1);
    expect(body.data.nodes[0].id).toBe('start-1');
  });

  it('DELETE /api/projects/:id removes the project', async () => {
    const token = await registerAndLogin(testEmail());
    const { body: created } = await createProject(token, `project-test-${randomUUID()}`);

    const response = await app.handle(
      new Request(`http://localhost/api/projects/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    expect(response.status).toBe(204);

    const getResponse = await app.handle(
      new Request(`http://localhost/api/projects/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(getResponse.status).toBe(404);
  });

  it('GET /api/projects/:id/export returns project detail shape', async () => {
    const token = await registerAndLogin(testEmail());
    const { body: created } = await createProject(token, `project-test-${randomUUID()}`);

    const response = await app.handle(
      new Request(`http://localhost/api/projects/${created.id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.id).toBe(created.id);
    expect(body.data).toBeDefined();
  });

  it('POST /api/projects/import creates a project from FlowData', async () => {
    const token = await registerAndLogin(testEmail());

    const importData = {
      title: `project-test-${randomUUID()}`,
      data: {
        nodes: [
          {
            id: 'scene-1',
            type: 'scene',
            position: { x: 100, y: 100 },
            data: { label: 'Scene' },
          },
        ],
        edges: [],
        variables: {},
        settings: {},
      },
    };

    const response = await app.handle(
      new Request('http://localhost/api/projects/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(importData),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.title).toBe(importData.title);
    expect(body.data.nodes).toHaveLength(1);
  });

  it('GET /api/projects/:id returns 403 for non-owner', async () => {
    const ownerToken = await registerAndLogin(testEmail());
    const otherToken = await registerAndLogin(testEmail());
    const { body: created } = await createProject(ownerToken, `project-test-${randomUUID()}`);

    const response = await app.handle(
      new Request(`http://localhost/api/projects/${created.id}`, {
        headers: { Authorization: `Bearer ${otherToken}` },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.code).toBe('PROJECT_002');
  });
});
