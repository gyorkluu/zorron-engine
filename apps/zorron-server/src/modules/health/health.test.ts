import { describe, it, expect } from 'vitest';
import { createApp } from '../../app';

describe('Health endpoints', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const response = await app.handle(new Request('http://localhost/health'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /ready returns readiness status', async () => {
    const response = await app.handle(new Request('http://localhost/ready'));

    const body = await response.json();
    expect([200, 503]).toContain(response.status);
    expect(body.status).toMatch(/ready|not_ready/);
    expect(body.checks.database).toMatch(/ok|error/);
    expect(body.checks.redis).toMatch(/ok|error/);
  });
});
