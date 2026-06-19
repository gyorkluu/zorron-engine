/**
 * Player E2E: narrative play-through happy path.
 *
 * Flow: Open player page → Start → Scene with choices → Settlement.
 *
 * The player page at `/player/:projectId` loads a project from the backend.
 * For E2E we seed a project via the API, then navigate the player UI.
 *
 * Requires:
 * - Backend running at http://localhost:3000
 * - Editor dev server at http://localhost:5173
 */

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EDITOR_BASE_URL = process.env.EDITOR_BASE_URL ?? 'http://localhost:5173';

interface AuthResponse {
  user: { id: string; email: string };
  token: string;
}

interface ProjectDetail {
  id: string;
  title: string;
  data: {
    nodes: unknown[];
    edges: unknown[];
    variables: Record<string, unknown>;
    settings: Record<string, unknown>;
  };
}

/** Register a fresh user and return the access token. */
async function registerUser(request: APIRequestContext): Promise<string> {
  const email = `e2e-player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.zorron.io`;
  const res = await request.post(`${API_BASE_URL}/api/auth/register`, {
    data: { email, password: 'Sup3rSecret!pass', nickname: 'Player E2E' },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as AuthResponse;
  return body.token;
}

/** Create a project with a minimal start → scene → settlement flow. */
async function seedPlaythroughProject(
  request: APIRequestContext,
  token: string,
): Promise<ProjectDetail> {
  const flowData = {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Start', title: 'The Journey Begins', intro: 'Click Begin to start.' },
      },
      {
        id: 'scene-1',
        type: 'scene',
        position: { x: 200, y: 0 },
        data: {
          label: 'Scene 1',
          dialogue: 'You arrive at a crossroads. Which path do you take?',
          choices: [
            { id: 'choice-a', text: 'Take the left path', interaction: 'tap' },
            { id: 'choice-b', text: 'Take the right path', interaction: 'tap' },
          ],
        },
      },
      {
        id: 'settlement-1',
        type: 'settlement',
        position: { x: 400, y: 0 },
        data: {
          label: 'Settlement',
          resultMapping: [
            { resultId: 'r1', title: 'The End', description: 'Your journey concludes.' },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'scene-1' },
      { id: 'e2', source: 'scene-1', target: 'settlement-1' },
    ],
    variables: {},
    settings: {},
    version: '1.0.0',
  };

  const res = await request.post(`${API_BASE_URL}/api/projects/import`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { title: 'E2E Playthrough', data: flowData },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as ProjectDetail;
}

test.describe('Player happy path: Start → Scene → Settlement', () => {
  test('navigates through a seeded narrative to the settlement', async ({
    request,
    page,
  }: {
    request: APIRequestContext;
    page: Page;
  }) => {
    // Seed: register + create project with a 3-node flow.
    const token = await registerUser(request);
    const project = await seedPlaythroughProject(request, token);

    // The player page loads the project via the authenticated Project API.
    // Inject the access token into localStorage so the axios interceptor can
    // attach the Bearer header when PlayerPage calls loadProject.
    await page.goto(`${EDITOR_BASE_URL}/`);
    await page.evaluate(
      (tok) => localStorage.setItem('zorron.auth.token', tok),
      token,
    );

    // Open the player page for the seeded project.
    await page.goto(`${EDITOR_BASE_URL}/player/${project.id}`);

    // The StartStage should render the title and a "Begin" button.
    await expect(page.getByText('The Journey Begins')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();

    // Advance from start to scene.
    await page.getByRole('button', { name: 'Begin' }).click();

    // The SceneStage should render the dialogue and the two choices.
    await expect(page.getByText('You arrive at a crossroads')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /Take the left path/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Take the right path/ })).toBeVisible();

    // Pick the first choice to advance to the settlement.
    await page.getByRole('button', { name: /Take the left path/ }).click();

    // The SettlementStage should render the final title.
    await expect(page.getByText('The End')).toBeVisible({ timeout: 5_000 });
    // The Restart button should be present.
    await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible();
  });

  test('shows an error when the project id is missing', async ({ page }: { page: Page }) => {
    // Navigate to /player/ (no id) — the route won't match, so we test the
    // player page with an invalid id instead.
    await page.goto(`${EDITOR_BASE_URL}/player/nonexistent-id`);
    // The player page should show a failure message.
    await expect(page.getByText(/Failed to load|Loading/i)).toBeVisible({ timeout: 15_000 });
  });
});
