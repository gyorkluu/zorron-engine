import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { like } from 'drizzle-orm';
import { createApp } from '../../app';
import { db } from '../../config/database';
import { users } from '../../db/schema';

const app = createApp();

function testEmail(): string {
  return `auth-test-${randomUUID()}@test.zorron.io`;
}

async function registerUser(email: string, password = 'password123') {
  const response = await app.handle(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname: 'Tester' }),
    }),
  );

  const body = await response.json();
  const cookies = response.headers.get('set-cookie') ?? '';
  const refreshTokenMatch = /refreshToken=([^;]+)/.exec(cookies);
  const refreshToken = refreshTokenMatch?.[1] ?? null;

  return { response, body, refreshToken };
}

async function loginUser(email: string, password = 'password123') {
  const response = await app.handle(
    new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  );

  const body = await response.json();
  const cookies = response.headers.get('set-cookie') ?? '';
  const refreshTokenMatch = /refreshToken=([^;]+)/.exec(cookies);
  const refreshToken = refreshTokenMatch?.[1] ?? null;

  return { response, body, refreshToken };
}

describe('Auth API', () => {
  afterAll(async () => {
    await db.delete(users).where(like(users.email, 'auth-test-%@test.zorron.io'));
  });

  it('POST /api/auth/register creates a user and issues tokens', async () => {
    const email = testEmail();
    const { response, body, refreshToken } = await registerUser(email);

    expect(response.status).toBe(201);
    expect(body.user.email).toBe(email);
    expect(body.user.nickname).toBe('Tester');
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.token).toBeDefined();
    expect(refreshToken).toBeTruthy();
  });

  it('POST /api/auth/register returns 409 for duplicate email', async () => {
    const email = testEmail();
    await registerUser(email);

    const { response, body } = await registerUser(email);

    expect(response.status).toBe(409);
    expect(body.code).toBe('AUTH_004');
  });

  it('POST /api/auth/login succeeds with valid credentials', async () => {
    const email = testEmail();
    await registerUser(email);

    const { response, body, refreshToken } = await loginUser(email);

    expect(response.status).toBe(200);
    expect(body.user.email).toBe(email);
    expect(body.token).toBeDefined();
    expect(refreshToken).toBeTruthy();
  });

  it('POST /api/auth/login returns 401 for invalid credentials', async () => {
    const email = testEmail();
    await registerUser(email);

    const { response, body } = await loginUser(email, 'wrongpassword');

    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTH_003');
  });

  it('POST /api/auth/refresh rotates the refresh token', async () => {
    const email = testEmail();
    const { refreshToken: oldToken } = await registerUser(email);

    const response = await app.handle(
      new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${oldToken}`,
        },
      }),
    );

    const body = await response.json();
    const cookies = response.headers.get('set-cookie') ?? '';
    const newRefreshTokenMatch = /refreshToken=([^;]+)/.exec(cookies);

    expect(response.status).toBe(200);
    expect(body.token).toBeDefined();
    expect(newRefreshTokenMatch?.[1]).toBeTruthy();
    expect(newRefreshTokenMatch?.[1]).not.toBe(oldToken);
  });

  it('POST /api/auth/refresh returns 401 without cookie', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTH_002');
  });

  it('POST /api/auth/logout revokes the refresh token', async () => {
    const email = testEmail();
    const { refreshToken } = await registerUser(email);

    const response = await app.handle(
      new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${refreshToken}`,
        },
      }),
    );

    const cookies = response.headers.get('set-cookie') ?? '';
    expect(response.status).toBe(204);
    expect(cookies).toContain('refreshToken=');
    expect(cookies).toContain('Max-Age=0');

    // Token should no longer rotate
    const refreshResponse = await app.handle(
      new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${refreshToken}`,
        },
      }),
    );
    expect(refreshResponse.status).toBe(401);
  });

  it('GET /api/auth/me returns current user with valid access token', async () => {
    const email = testEmail();
    const { body: authBody } = await registerUser(email);

    const response = await app.handle(
      new Request('http://localhost/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authBody.token}`,
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.email).toBe(email);
  });

  it('GET /api/auth/me returns 401 without token', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/auth/me'),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTH_001');
  });
});
