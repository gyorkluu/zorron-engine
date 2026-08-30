import { describe, it, expect } from 'vitest';
import { createApp } from '../../app';
import { randomUUID } from 'node:crypto';

const app = createApp();

async function createTestUserAndProject() {
  const email = `slot-test-${randomUUID()}@test.zorron.io`;
  const regRes = await app.handle(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', nickname: 'Tester' }),
    }),
  );
  const { token, user } = await regRes.json();

  const projRes = await app.handle(
    new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: 'Test GalGame' }),
    }),
  );
  const proj = await projRes.json();

  return { token, user, projectId: proj.id };
}

describe('SaveSlot API', () => {
  it('saves game snapshot to slot 0, retrieves it, lists slots, and deletes it', async () => {
    const { token, projectId } = await createTestUserAndProject();

    // 1. Initial list: 10 empty slots
    const listRes1 = await app.handle(
      new Request(`http://localhost/api/projects/${projectId}/slots`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(listRes1.status).toBe(200);
    const list1 = await listRes1.json();
    expect(list1.length).toBe(10);
    expect(list1[0].isOccupied).toBe(false);

    // 2. Save snapshot to slot 0
    const snapshotData = {
      schemaVersion: '2.0.0' as const,
      timestamp: Date.now(),
      currentNodeId: 'stage_sword',
      variables: { love: 85, sect: 'sword' },
      fragments: ['sword_key'],
      history: ['start_0', 'stage_intro', 'stage_sword'],
      backlog: [
        {
          id: 'bl-1',
          nodeId: 'stage_intro',
          speaker: 'Guider',
          text: 'Welcome.',
          timestamp: Date.now(),
        },
      ],
      bgmUrl: 'https://example.com/bgm.mp3',
      bgmPositionSec: 15.2,
    };

    const saveRes = await app.handle(
      new Request(`http://localhost/api/projects/${projectId}/slots/0`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          snapshotData,
          chapterTitle: 'Chapter 1: Sword Peak',
        }),
      }),
    );
    expect(saveRes.status).toBe(200);
    const saved = await saveRes.json();
    expect(saved.slotIndex).toBe(0);
    expect(saved.chapterTitle).toBe('Chapter 1: Sword Peak');
    expect(saved.snapshotData.variables.love).toBe(85);

    // 3. Get single slot 0
    const getRes = await app.handle(
      new Request(`http://localhost/api/projects/${projectId}/slots/0`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(getRes.status).toBe(200);
    const slot0 = await getRes.json();
    expect(slot0.snapshotData.currentNodeId).toBe('stage_sword');

    // 4. Delete slot 0
    const delRes = await app.handle(
      new Request(`http://localhost/api/projects/${projectId}/slots/0`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(delRes.status).toBe(200);

    // 5. Query deleted slot should 404
    const getResAfter = await app.handle(
      new Request(`http://localhost/api/projects/${projectId}/slots/0`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(getResAfter.status).toBe(404);
  });
});
