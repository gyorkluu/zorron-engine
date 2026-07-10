/**
 * SCALE-003: Webhook subscription module tests.
 *
 * Tests the service business logic with a mocked repository to verify:
 * - createSubscription generates a secret and persists correctly.
 * - listSubscriptions omits the secret.
 * - updateSubscription / deleteSubscription enforce ownership.
 * - listDeliveries enforces ownership and paginates.
 * - dispatchEvent creates deliveries and sends webhooks.
 * - sendTestEvent returns the right result on success/failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebhookSubscription, WebhookDelivery } from '../../db/schema';

vi.mock('./subscription.repository', () => ({
  createSubscription: vi.fn(),
  findSubscriptionById: vi.fn(),
  listSubscriptionsByOwner: vi.fn(),
  updateSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  findMatchingSubscriptions: vi.fn(),
  createDelivery: vi.fn(),
  updateDeliveryStatus: vi.fn(),
  listDeliveries: vi.fn(),
  findDeliveriesPendingRetry: vi.fn(),
}));

// Mock global fetch so webhook dispatch doesn't hit the network.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import * as service from './subscription.service';
import * as repo from './subscription.repository';
import { AppError } from '../../shared/errors';

// ── Helpers ──

function makeSubscription(
  overrides: Partial<WebhookSubscription> = {},
): WebhookSubscription {
  return {
    id: 'sub-uuid',
    ownerId: 'user-1',
    callbackUrl: 'https://example.com/webhook',
    secret: 'test-secret',
    eventTypes: ['session.completed'],
    projectId: null,
    isActive: true,
    tenantId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

function makeDelivery(
  overrides: Partial<WebhookDelivery> = {},
): WebhookDelivery {
  return {
    id: 'del-uuid',
    subscriptionId: 'sub-uuid',
    sessionId: 'sess-uuid',
    eventType: 'session.completed',
    payload: {},
    status: 'pending',
    attempts: 0,
    responseStatus: null,
    lastError: null,
    deliveredAt: null,
    nextRetryAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ── createSubscription ──

describe('SubscriptionService.createSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it('generates a secret and creates the subscription', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.createSubscription.mockResolvedValue(makeSubscription());

    const result = await service.createSubscription(
      { id: 'user-1', email: 'a@b.c' },
      {
        callbackUrl: 'https://example.com/webhook',
        eventTypes: ['session.completed'],
      },
    );

    expect(result.id).toBe('sub-uuid');
    expect(result.secret).toBeDefined();
    expect(mockRepo.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'user-1',
        callbackUrl: 'https://example.com/webhook',
        isActive: true,
      }),
    );
  });
});

// ── listSubscriptions ──

describe('SubscriptionService.listSubscriptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns subscriptions without secrets', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.listSubscriptionsByOwner.mockResolvedValue([
      makeSubscription({ id: 'sub-1' }),
      makeSubscription({ id: 'sub-2' }),
    ]);

    const result = await service.listSubscriptions({ id: 'user-1', email: 'a@b.c' });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('sub-1');
    // SubscriptionListItem should not have a secret field.
    expect('secret' in result.data[0]).toBe(false);
  });
});

// ── updateSubscription ──

describe('SubscriptionService.updateSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates when the user owns the subscription', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'user-1' }),
    );
    mockRepo.updateSubscription.mockResolvedValue(
      makeSubscription({ isActive: false }),
    );

    const result = await service.updateSubscription(
      { id: 'user-1', email: 'a@b.c' },
      'sub-uuid',
      { isActive: false },
    );

    expect(result.isActive).toBe(false);
  });

  it('throws AUTH_003 when the user does not own the subscription', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'other-user' }),
    );

    await expect(
      service.updateSubscription(
        { id: 'user-1', email: 'a@b.c' },
        'sub-uuid',
        { isActive: false },
      ),
    ).rejects.toThrow(AppError);
  });

  it('throws SUB_001 when the subscription does not exist', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(undefined);

    await expect(
      service.updateSubscription(
        { id: 'user-1', email: 'a@b.c' },
        'unknown',
        { isActive: false },
      ),
    ).rejects.toThrow(AppError);
  });
});

// ── deleteSubscription ──

describe('SubscriptionService.deleteSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes when the user owns the subscription', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'user-1' }),
    );
    mockRepo.deleteSubscription.mockResolvedValue(undefined);

    await service.deleteSubscription({ id: 'user-1', email: 'a@b.c' }, 'sub-uuid');

    expect(mockRepo.deleteSubscription).toHaveBeenCalledWith('sub-uuid');
  });

  it('throws AUTH_003 when the user does not own the subscription', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'other-user' }),
    );

    await expect(
      service.deleteSubscription({ id: 'user-1', email: 'a@b.c' }, 'sub-uuid'),
    ).rejects.toThrow(AppError);
  });
});

// ── listDeliveries ──

describe('SubscriptionService.listDeliveries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated delivery logs for the owner', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'user-1' }),
    );
    mockRepo.listDeliveries.mockResolvedValue({
      data: [makeDelivery({ id: 'del-1', status: 'success' })],
      total: 1,
    });

    const result = await service.listDeliveries(
      { id: 'user-1', email: 'a@b.c' },
      'sub-uuid',
      { page: 1, pageSize: 20 },
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('del-1');
    expect(result.data[0].status).toBe('success');
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('throws AUTH_003 when the user does not own the subscription', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'other-user' }),
    );

    await expect(
      service.listDeliveries(
        { id: 'user-1', email: 'a@b.c' },
        'sub-uuid',
        { page: 1, pageSize: 20 },
      ),
    ).rejects.toThrow(AppError);
  });
});

// ── dispatchEvent ──

describe('SubscriptionService.dispatchEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it('does nothing when no subscriptions match', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findMatchingSubscriptions.mockResolvedValue([]);

    await service.dispatchEvent({
      eventType: 'session.completed',
      projectId: 'proj-uuid',
      sessionId: 'sess-uuid',
      payload: {
        eventType: 'session.completed',
        sessionId: 'sess-uuid',
        projectId: 'proj-uuid',
        userIdentifier: 'u1',
        settlementResult: {},
        timestamp: new Date().toISOString(),
      },
    });

    expect(mockRepo.createDelivery).not.toHaveBeenCalled();
  });

  it('creates a delivery and marks success on 2xx response', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findMatchingSubscriptions.mockResolvedValue([makeSubscription()]);
    mockRepo.createDelivery.mockResolvedValue(makeDelivery());
    fetchMock.mockResolvedValue({ status: 200 });

    await service.dispatchEvent({
      eventType: 'session.completed',
      projectId: 'proj-uuid',
      sessionId: 'sess-uuid',
      payload: {
        eventType: 'session.completed',
        sessionId: 'sess-uuid',
        projectId: 'proj-uuid',
        userIdentifier: 'u1',
        settlementResult: {},
        timestamp: new Date().toISOString(),
      },
    });

    expect(mockRepo.createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub-uuid',
        status: 'pending',
      }),
    );
    expect(mockRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      'del-uuid',
      expect.objectContaining({ status: 'success', responseStatus: 200 }),
    );
  });

  it('schedules a retry on non-2xx response', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findMatchingSubscriptions.mockResolvedValue([makeSubscription()]);
    mockRepo.createDelivery.mockResolvedValue(makeDelivery());
    fetchMock.mockResolvedValue({ status: 500 });

    await service.dispatchEvent({
      eventType: 'session.completed',
      projectId: 'proj-uuid',
      sessionId: 'sess-uuid',
      payload: {
        eventType: 'session.completed',
        sessionId: 'sess-uuid',
        projectId: 'proj-uuid',
        userIdentifier: 'u1',
        settlementResult: {},
        timestamp: new Date().toISOString(),
      },
    });

    expect(mockRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      'del-uuid',
      expect.objectContaining({
        status: 'retry',
        lastError: 'HTTP 500',
      }),
    );
  });

  it('marks as failed after exhausting retries', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findMatchingSubscriptions.mockResolvedValue([makeSubscription()]);
    // Simulate a delivery that already has 4 attempts (one more = 5 = max).
    mockRepo.createDelivery.mockResolvedValue(
      makeDelivery({ attempts: 4 }),
    );
    fetchMock.mockResolvedValue({ status: 500 });

    await service.dispatchEvent({
      eventType: 'session.completed',
      projectId: 'proj-uuid',
      sessionId: 'sess-uuid',
      payload: {
        eventType: 'session.completed',
        sessionId: 'sess-uuid',
        projectId: 'proj-uuid',
        userIdentifier: 'u1',
        settlementResult: {},
        timestamp: new Date().toISOString(),
      },
    });

    expect(mockRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      'del-uuid',
      expect.objectContaining({ status: 'failed' }),
    );
  });
});

// ── sendTestEvent ──

describe('SubscriptionService.sendTestEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it('returns delivered=true on 2xx response', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'user-1' }),
    );
    fetchMock.mockResolvedValue({ status: 200 });

    const result = await service.sendTestEvent(
      { id: 'user-1', email: 'a@b.c' },
      'sub-uuid',
    );

    expect(result.delivered).toBe(true);
    expect(result.responseStatus).toBe(200);
    expect(result.error).toBeNull();
  });

  it('returns delivered=false on non-2xx response', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'user-1' }),
    );
    fetchMock.mockResolvedValue({ status: 404 });

    const result = await service.sendTestEvent(
      { id: 'user-1', email: 'a@b.c' },
      'sub-uuid',
    );

    expect(result.delivered).toBe(false);
    expect(result.responseStatus).toBe(404);
    expect(result.error).toBe('HTTP 404');
  });

  it('returns delivered=false on network error', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'user-1' }),
    );
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.sendTestEvent(
      { id: 'user-1', email: 'a@b.c' },
      'sub-uuid',
    );

    expect(result.delivered).toBe(false);
    expect(result.responseStatus).toBeNull();
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('throws AUTH_003 when the user does not own the subscription', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findSubscriptionById.mockResolvedValue(
      makeSubscription({ ownerId: 'other-user' }),
    );

    await expect(
      service.sendTestEvent({ id: 'user-1', email: 'a@b.c' }, 'sub-uuid'),
    ).rejects.toThrow(AppError);
  });
});
