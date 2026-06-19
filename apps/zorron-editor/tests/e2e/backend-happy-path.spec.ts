/**
 * Backend E2E: full happy-path through the Project API.
 *
 * Flow: Register → Login → Create Project → Update (Add Node) → Save → Load → Delete.
 *
 * Requires the backend to be running at http://localhost:3000.
 * Set `API_BASE_URL` env var to override.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

/** Unique email generator to avoid collisions between test runs. */
function uniqueEmail(): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-backend-${stamp}@test.zorron.io`;
}

interface AuthResponse {
  user: { id: string; email: string };
  token: string;
}

interface ProjectDetail {
  id: string;
  title: string;
  description: string | null;
  data: {
    nodes: unknown[];
    edges: unknown[];
    variables: Record<string, unknown>;
    settings: Record<string, unknown>;
  };
}

test.describe('Backend happy path: Register → Login → Project CRUD', () => {
  let token: string;
  let projectId: string;
  const email = uniqueEmail();
  const password = 'Sup3rSecret!pass';

  test('registers a new user', async ({ request }: { request: APIRequestContext }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/register`, {
      data: { email, password, nickname: 'E2E Tester' },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as AuthResponse;
    expect(body.user.email).toBe(email);
    expect(body.token).toBeTruthy();
    token = body.token;
  });

  test('logs in with the registered credentials', async ({ request }: { request: APIRequestContext }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email, password },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as AuthResponse;
    expect(body.user.email).toBe(email);
    expect(body.token).toBeTruthy();
    token = body.token;
  });

  test('creates a new project', async ({ request }: { request: APIRequestContext }) => {
    const res = await request.post(`${API_BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'E2E Happy Path Project', description: 'Created by Playwright' },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as ProjectDetail;
    expect(body.title).toBe('E2E Happy Path Project');
    expect(body.data.nodes).toEqual([]);
    projectId = body.id;
  });

  test('adds a start node via PATCH (save)', async ({ request }: { request: APIRequestContext }) => {
    const updatePayload = {
      data: {
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start', title: 'Beginning', intro: 'Welcome' },
          },
        ],
        edges: [],
        variables: { score: 0 },
        settings: {},
        version: '1.0.0',
      },
    };
    const res = await request.patch(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: updatePayload,
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as ProjectDetail;
    expect(body.data.nodes).toHaveLength(1);
    expect((body.data.nodes[0] as { id: string }).id).toBe('start-1');
  });

  test('loads the saved project and verifies the node', async ({ request }: { request: APIRequestContext }) => {
    const res = await request.get(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as ProjectDetail;
    expect(body.id).toBe(projectId);
    expect(body.data.nodes).toHaveLength(1);
    expect((body.data.nodes[0] as { id: string }).id).toBe('start-1');
  });

  test('deletes the project', async ({ request }: { request: APIRequestContext }) => {
    const res = await request.delete(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(204);

    // Verify it's gone.
    const verify = await request.get(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(verify.status()).toBe(404);
  });

  test('rejects unauthenticated project creation', async ({ request }: { request: APIRequestContext }) => {
    const res = await request.post(`${API_BASE_URL}/api/projects`, {
      data: { title: 'Should Fail' },
    });
    expect(res.status()).toBe(401);
  });
});
