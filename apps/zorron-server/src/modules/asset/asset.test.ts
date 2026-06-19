import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { like } from 'drizzle-orm';
import { createApp } from '../../app';
import { db } from '../../config/database';
import { users, assets } from '../../db/schema';

const app = createApp();

function testEmail(): string {
  return `asset-test-${randomUUID()}@test.zorron.io`;
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

async function uploadImage(token: string, name = 'test.png') {
  const formData = new FormData();
  const file = new File(['fake-image-bytes'], name, { type: 'image/png' });
  formData.append('file', file);

  const response = await app.handle(
    new Request('http://localhost/api/assets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }),
  );

  return { response, body: await response.json() };
}

describe('Asset API', () => {
  afterAll(async () => {
    await db.delete(assets).where(like(assets.name, 'asset-test-%'));
    await db.delete(users).where(like(users.email, 'asset-test-%@test.zorron.io'));
  });

  it('POST /api/assets uploads an image asset', async () => {
    const token = await registerAndLogin(testEmail());
    const name = `asset-test-${randomUUID()}.png`;

    const { response, body } = await uploadImage(token, name);

    expect(response.status).toBe(201);
    expect(body.name).toBe(name);
    expect(body.type).toBe('image');
    expect(body.mimeType).toBe('image/png');
    expect(body.url).toContain('/uploads/');
  });

  it('POST /api/assets rejects oversized files', async () => {
    const token = await registerAndLogin(testEmail());
    const formData = new FormData();
    const bigFile = new File([new Uint8Array(51 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    formData.append('file', bigFile);

    const response = await app.handle(
      new Request('http://localhost/api/assets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(413);
    expect(body.code).toBe('ASSET_002');
  });

  it('POST /api/assets rejects unsupported MIME types', async () => {
    const token = await registerAndLogin(testEmail());
    const formData = new FormData();
    const file = new File(['malicious'], 'evil.exe', {
      type: 'application/x-msdownload',
    });
    formData.append('file', file);

    const response = await app.handle(
      new Request('http://localhost/api/assets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(415);
    expect(body.code).toBe('ASSET_003');
  });

  it('GET /api/assets lists assets with pagination', async () => {
    const token = await registerAndLogin(testEmail());
    await uploadImage(token, `asset-test-${randomUUID()}.png`);

    const response = await app.handle(
      new Request('http://localhost/api/assets?page=1&pageSize=10', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/assets/:id returns asset details', async () => {
    const token = await registerAndLogin(testEmail());
    const { body: created } = await uploadImage(token, `asset-test-${randomUUID()}.png`);

    const response = await app.handle(
      new Request(`http://localhost/api/assets/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.id).toBe(created.id);
  });

  it('DELETE /api/assets/:id removes the asset', async () => {
    const token = await registerAndLogin(testEmail());
    const { body: created } = await uploadImage(token, `asset-test-${randomUUID()}.png`);

    const response = await app.handle(
      new Request(`http://localhost/api/assets/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    expect(response.status).toBe(204);

    const getResponse = await app.handle(
      new Request(`http://localhost/api/assets/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(getResponse.status).toBe(404);
  });

  it('GET /api/assets/:id/url returns a direct URL', async () => {
    const token = await registerAndLogin(testEmail());
    const { body: created } = await uploadImage(token, `asset-test-${randomUUID()}.png`);

    const response = await app.handle(
      new Request(`http://localhost/api/assets/${created.id}/url?expires=3600`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.url).toContain('/uploads/');
  });
});
