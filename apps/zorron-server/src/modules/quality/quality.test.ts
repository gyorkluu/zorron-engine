/**
 * SCALE-002: Quality & A/B testing module tests.
 *
 * Tests the service business logic with a mocked repository to verify:
 * - recordEvent rejects unknown projects.
 * - createVariant enforces ownership and variantKey uniqueness.
 * - getMetrics computes completion/abandonment rates correctly.
 * - compareVariants determines a winner only with sufficient data.
 * - assignVariant distributes traffic deterministically.
 * - getSuggestions emits the right heuristics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  Project,
  ScenarioVariant,
  SessionEvent,
} from '../../db/schema';

vi.mock('./quality.repository', () => ({
  findProjectById: vi.fn(),
  createEvent: vi.fn(),
  createVariant: vi.fn(),
  findVariantById: vi.fn(),
  findVariantByProjectAndKey: vi.fn(),
  listVariants: vi.fn(),
  listActiveVariants: vi.fn(),
  updateVariant: vi.fn(),
  countEvents: vi.fn(),
  countTotalEvents: vi.fn(),
  getNodeDropoffs: vi.fn(),
  getAvgCompleteDuration: vi.fn(),
  getVariantStats: vi.fn(),
}));

import * as service from './quality.service';
import * as repo from './quality.repository';
import { AppError } from '../../shared/errors';

// ── Helpers ──

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-uuid',
    ownerId: 'owner-1',
    title: 'Test Scenario',
    description: null,
    coverUrl: null,
    isPublished: true,
    publishedData: null,
    publishedAt: null,
    data: {},
    forkedFromId: null,
    forkedAt: null,
    tenantId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

function makeVariant(overrides: Partial<ScenarioVariant> = {}): ScenarioVariant {
  return {
    id: 'var-uuid',
    projectId: 'proj-uuid',
    variantKey: 'A',
    label: 'Variant A',
    description: null,
    weight: 1,
    isControl: true,
    isActive: true,
    tenantId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

function makeEvent(overrides: Partial<SessionEvent> = {}): SessionEvent {
  return {
    id: 'evt-uuid',
    projectId: 'proj-uuid',
    variantId: null,
    sessionId: null,
    userIdentifier: 'user-1',
    eventType: 'enter',
    nodeId: null,
    eventData: {},
    tenantId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ── recordEvent ──

describe('QualityService.recordEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records an event when the project exists', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findProjectById.mockResolvedValue(makeProject());
    mockRepo.createEvent.mockResolvedValue(
      makeEvent({ eventType: 'enter', userIdentifier: 'u1' }),
    );

    const result = await service.recordEvent({
      projectId: 'proj-uuid',
      userIdentifier: 'u1',
      eventType: 'enter',
    });

    expect(result.eventType).toBe('enter');
    expect(result.userIdentifier).toBe('u1');
    expect(mockRepo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-uuid', eventType: 'enter' }),
    );
  });

  it('throws PROJECT_001 when the project does not exist', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findProjectById.mockResolvedValue(undefined);

    await expect(
      service.recordEvent({
        projectId: 'unknown',
        userIdentifier: 'u1',
        eventType: 'enter',
      }),
    ).rejects.toThrow(AppError);
  });
});

// ── createVariant ──

describe('QualityService.createVariant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a variant when the user owns the project', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findProjectById.mockResolvedValue(
      makeProject({ ownerId: 'user-1' }),
    );
    mockRepo.findVariantByProjectAndKey.mockResolvedValue(undefined);
    mockRepo.createVariant.mockResolvedValue(
      makeVariant({ variantKey: 'B' }),
    );

    const result = await service.createVariant(
      { id: 'user-1', email: 'a@b.c' },
      'proj-uuid',
      { variantKey: 'B', weight: 2, isControl: false },
    );

    expect(result.variantKey).toBe('B');
    expect(mockRepo.createVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-uuid',
        variantKey: 'B',
        weight: 2,
        isControl: false,
        isActive: true,
      }),
    );
  });

  it('throws AUTH_003 when the user does not own the project', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findProjectById.mockResolvedValue(
      makeProject({ ownerId: 'other-user' }),
    );

    await expect(
      service.createVariant(
        { id: 'user-1', email: 'a@b.c' },
        'proj-uuid',
        { variantKey: 'B', weight: 1, isControl: false },
      ),
    ).rejects.toThrow(AppError);
  });

  it('throws QUALITY_001 when the variantKey already exists', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findProjectById.mockResolvedValue(
      makeProject({ ownerId: 'user-1' }),
    );
    mockRepo.findVariantByProjectAndKey.mockResolvedValue(
      makeVariant({ variantKey: 'A' }),
    );

    await expect(
      service.createVariant(
        { id: 'user-1', email: 'a@b.c' },
        'proj-uuid',
        { variantKey: 'A', weight: 1, isControl: false },
      ),
    ).rejects.toThrow(/already exists/);
  });
});

// ── updateVariant ──

describe('QualityService.updateVariant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates a variant when the user owns the project', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findVariantById.mockResolvedValue(
      makeVariant({ projectId: 'proj-uuid' }),
    );
    mockRepo.findProjectById.mockResolvedValue(
      makeProject({ ownerId: 'user-1' }),
    );
    mockRepo.updateVariant.mockResolvedValue(
      makeVariant({ weight: 5, isActive: false }),
    );

    const result = await service.updateVariant(
      { id: 'user-1', email: 'a@b.c' },
      'var-uuid',
      { weight: 5, isActive: false },
    );

    expect(result.weight).toBe(5);
    expect(result.isActive).toBe(false);
  });

  it('throws QUALITY_002 when the variant does not exist', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.findVariantById.mockResolvedValue(undefined);

    await expect(
      service.updateVariant(
        { id: 'user-1', email: 'a@b.c' },
        'unknown',
        { weight: 5 },
      ),
    ).rejects.toThrow(AppError);
  });
});

// ── getMetrics ──

describe('QualityService.getMetrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('computes completion and abandonment rates', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.countTotalEvents.mockResolvedValue(150);
    mockRepo.countEvents
      // enter
      .mockResolvedValueOnce(100)
      // step
      .mockResolvedValueOnce(200)
      // complete
      .mockResolvedValueOnce(60)
      // abandon
      .mockResolvedValueOnce(40);
    mockRepo.getAvgCompleteDuration.mockResolvedValue(120000);
    mockRepo.getNodeDropoffs.mockResolvedValue([
      { nodeId: 'node-3', count: 20 },
      { nodeId: 'node-7', count: 15 },
    ]);

    const result = await service.getMetrics('proj-uuid', {});

    expect(result.totalEvents).toBe(150);
    expect(result.enterCount).toBe(100);
    expect(result.completeCount).toBe(60);
    expect(result.abandonCount).toBe(40);
    expect(result.completionRate).toBe(0.6);
    expect(result.abandonmentRate).toBe(0.4);
    expect(result.avgDurationMs).toBe(120000);
    expect(result.nodeDropoffs).toHaveLength(2);
    expect(result.nodeDropoffs[0].nodeId).toBe('node-3');
    expect(result.nodeDropoffs[0].rate).toBe(0.2); // 20 / 100
  });

  it('returns zero rates when there are no enter events', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.countTotalEvents.mockResolvedValue(0);
    mockRepo.countEvents.mockResolvedValue(0);
    mockRepo.getAvgCompleteDuration.mockResolvedValue(null);
    mockRepo.getNodeDropoffs.mockResolvedValue([]);

    const result = await service.getMetrics('proj-uuid', {});

    expect(result.completionRate).toBe(0);
    expect(result.abandonmentRate).toBe(0);
    expect(result.avgDurationMs).toBeNull();
    expect(result.nodeDropoffs).toHaveLength(0);
  });
});

// ── compareVariants ──

describe('QualityService.compareVariants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('declares a winner when one variant has >5% lead with enough data', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.getVariantStats.mockResolvedValue([
      {
        variantId: 'var-A',
        variantKey: 'A',
        label: 'Control',
        isControl: true,
        enterCount: 100,
        completeCount: 60,
        abandonCount: 40,
        avgDurationMs: 120000,
      },
      {
        variantId: 'var-B',
        variantKey: 'B',
        label: 'Treatment',
        isControl: false,
        enterCount: 100,
        completeCount: 75,
        abandonCount: 25,
        avgDurationMs: 90000,
      },
    ]);

    const result = await service.compareVariants('proj-uuid');

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].completionRate).toBe(0.6);
    expect(result.variants[1].completionRate).toBe(0.75);
    expect(result.winner).toBe('var-B');
  });

  it('returns null winner when lead is less than 5%', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.getVariantStats.mockResolvedValue([
      {
        variantId: 'var-A',
        variantKey: 'A',
        label: null,
        isControl: true,
        enterCount: 100,
        completeCount: 60,
        abandonCount: 40,
        avgDurationMs: null,
      },
      {
        variantId: 'var-B',
        variantKey: 'B',
        label: null,
        isControl: false,
        enterCount: 100,
        completeCount: 63,
        abandonCount: 37,
        avgDurationMs: null,
      },
    ]);

    const result = await service.compareVariants('proj-uuid');
    // Difference is 3%, below the 5% threshold.
    expect(result.winner).toBeNull();
  });

  it('returns null winner when sample size is too small', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.getVariantStats.mockResolvedValue([
      {
        variantId: 'var-A',
        variantKey: 'A',
        label: null,
        isControl: true,
        enterCount: 3,
        completeCount: 1,
        abandonCount: 2,
        avgDurationMs: null,
      },
      {
        variantId: 'var-B',
        variantKey: 'B',
        label: null,
        isControl: false,
        enterCount: 4,
        completeCount: 4,
        abandonCount: 0,
        avgDurationMs: null,
      },
    ]);

    const result = await service.compareVariants('proj-uuid');
    // Both under the 5-enter threshold.
    expect(result.winner).toBeNull();
  });
});

// ── assignVariant ──

describe('QualityService.assignVariant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no active variants exist', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.listActiveVariants.mockResolvedValue([]);

    const result = await service.assignVariant('proj-uuid', 'user-1');

    expect(result.variantId).toBeNull();
    expect(result.variant).toBeNull();
  });

  it('assigns the single variant when only one exists', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.listActiveVariants.mockResolvedValue([makeVariant()]);

    const result = await service.assignVariant('proj-uuid', 'user-1');

    expect(result.variantId).toBe('var-uuid');
    expect(result.variantKey).toBe('A');
    expect(result.variant).not.toBeNull();
  });

  it('assigns deterministically (same user → same variant)', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    const varA = makeVariant({ id: 'var-A', variantKey: 'A', weight: 1 });
    const varB = makeVariant({
      id: 'var-B',
      variantKey: 'B',
      weight: 1,
      isControl: false,
    });
    mockRepo.listActiveVariants.mockResolvedValue([varA, varB]);

    const r1 = await service.assignVariant('proj-uuid', 'user-1');
    const r2 = await service.assignVariant('proj-uuid', 'user-1');

    expect(r1.variantId).toBe(r2.variantId);
  });

  it('distributes users across variants based on weight', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    const varA = makeVariant({ id: 'var-A', variantKey: 'A', weight: 1 });
    const varB = makeVariant({
      id: 'var-B',
      variantKey: 'B',
      weight: 1,
      isControl: false,
    });
    mockRepo.listActiveVariants.mockResolvedValue([varA, varB]);

    // Run many users and verify both variants get some assignments.
    const assignments = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const r = await service.assignVariant('proj-uuid', `user-${i}`);
      assignments.add(r.variantId!);
    }

    expect(assignments.size).toBe(2);
    expect(assignments.has('var-A')).toBe(true);
    expect(assignments.has('var-B')).toBe(true);
  });
});

// ── getSuggestions ──

describe('QualityService.getSuggestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits insufficient-data when enterCount < 30', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.countTotalEvents.mockResolvedValue(10);
    mockRepo.countEvents.mockResolvedValue(10);
    mockRepo.getAvgCompleteDuration.mockResolvedValue(null);
    mockRepo.getNodeDropoffs.mockResolvedValue([]);
    mockRepo.getVariantStats.mockResolvedValue([]);

    const result = await service.getSuggestions('proj-uuid');

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].type).toBe('insufficient-data');
    expect(result.suggestions[0].severity).toBe('info');
  });

  it('emits low-completion-rate when completionRate < 50%', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.countTotalEvents.mockResolvedValue(100);
    mockRepo.countEvents
      .mockResolvedValueOnce(100) // enter
      .mockResolvedValueOnce(50) // step
      .mockResolvedValueOnce(20) // complete (20% completion)
      .mockResolvedValueOnce(80); // abandon
    mockRepo.getAvgCompleteDuration.mockResolvedValue(null);
    mockRepo.getNodeDropoffs.mockResolvedValue([]);
    mockRepo.getVariantStats.mockResolvedValue([]);

    const result = await service.getSuggestions('proj-uuid');

    const suggestion = result.suggestions.find(
      (s) => s.type === 'low-completion-rate',
    );
    expect(suggestion).toBeDefined();
    expect(suggestion!.severity).toBe('critical'); // < 30%
  });

  it('emits high-dropoff-node when a node has >30% dropoff', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.countTotalEvents.mockResolvedValue(100);
    mockRepo.countEvents
      .mockResolvedValueOnce(100) // enter
      .mockResolvedValueOnce(50) // step
      .mockResolvedValueOnce(80) // complete
      .mockResolvedValueOnce(20); // abandon
    mockRepo.getAvgCompleteDuration.mockResolvedValue(null);
    mockRepo.getNodeDropoffs.mockResolvedValue([
      { nodeId: 'node-5', count: 35 }, // 35% dropoff
    ]);
    mockRepo.getVariantStats.mockResolvedValue([]);

    const result = await service.getSuggestions('proj-uuid');

    const suggestion = result.suggestions.find(
      (s) => s.type === 'high-dropoff-node',
    );
    expect(suggestion).toBeDefined();
    expect(suggestion!.nodeId).toBe('node-5');
  });

  it('emits long-duration when avgDuration > 5 minutes', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.countTotalEvents.mockResolvedValue(100);
    mockRepo.countEvents
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(90)
      .mockResolvedValueOnce(10);
    mockRepo.getAvgCompleteDuration.mockResolvedValue(360000); // 6 min
    mockRepo.getNodeDropoffs.mockResolvedValue([]);
    mockRepo.getVariantStats.mockResolvedValue([]);

    const result = await service.getSuggestions('proj-uuid');

    const suggestion = result.suggestions.find(
      (s) => s.type === 'long-duration',
    );
    expect(suggestion).toBeDefined();
    expect(suggestion!.value).toBe(360000);
  });

  it('emits variant-outperforms when A/B winner beats control', async () => {
    const mockRepo = repo as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockRepo.countTotalEvents.mockResolvedValue(200);
    mockRepo.countEvents
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(140)
      .mockResolvedValueOnce(60);
    mockRepo.getAvgCompleteDuration.mockResolvedValue(null);
    mockRepo.getNodeDropoffs.mockResolvedValue([]);
    mockRepo.getVariantStats.mockResolvedValue([
      {
        variantId: 'var-A',
        variantKey: 'A',
        label: 'Control',
        isControl: true,
        enterCount: 100,
        completeCount: 50,
        abandonCount: 50,
        avgDurationMs: null,
      },
      {
        variantId: 'var-B',
        variantKey: 'B',
        label: 'Treatment',
        isControl: false,
        enterCount: 100,
        completeCount: 90,
        abandonCount: 10,
        avgDurationMs: null,
      },
    ]);

    const result = await service.getSuggestions('proj-uuid');

    const suggestion = result.suggestions.find(
      (s) => s.type === 'variant-outperforms',
    );
    expect(suggestion).toBeDefined();
    expect(suggestion!.message).toContain('B');
  });
});
