/**
 * ECO-004: Marketplace module tests.
 *
 * Tests the service business logic with a mocked repository to verify:
 * - listMarketplace maps rows and pagination correctly.
 * - forkScenario validates the source is published, blocks self-fork, and
 *   delegates to createFork with the right overrides.
 * - listForks maps fork rows.
 *
 * Route-level integration is covered by the typecheck + the fact that the
 * service is exercised through the controller (thin layer).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Project } from '../../db/schema';

// ── Mock the repository before importing the service ──

vi.mock('./marketplace.repository', () => {
  return {
    listPublishedProjects: vi.fn(),
    findPublishedProject: vi.fn(),
    createFork: vi.fn(),
    listForksBySource: vi.fn(),
  };
});

import * as service from './marketplace.service';
import * as repo from './marketplace.repository';
import { AppError } from '../../shared/errors';

// ── Helpers ──

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'src-uuid',
    ownerId: 'owner-uuid',
    title: 'Source Scenario',
    description: 'A great scenario',
    coverUrl: 'https://example.com/cover.png',
    isPublished: true,
    data: { nodes: [], edges: [] },
    forkedFromId: null,
    forkedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

// ── Tests ──

describe('MarketplaceService.listMarketplace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps repository rows to marketplace items with ISO timestamps', async () => {
    const mockedRepo = repo as unknown as {
      listPublishedProjects: ReturnType<typeof vi.fn>;
    };
    mockedRepo.listPublishedProjects.mockResolvedValue({
      data: [
        {
          id: 'p1',
          title: 'Scenario 1',
          description: 'desc',
          coverUrl: 'https://example.com/c.png',
          ownerId: 'owner-1',
          ownerNickname: 'Alice',
          forkedFromId: null,
          forkCount: 3,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
      total: 1,
    });

    const result = await service.listMarketplace({
      keyword: undefined,
      page: 1,
      pageSize: 20,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('p1');
    expect(result.data[0].forkCount).toBe(3);
    expect(result.data[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('computes totalPages across multiple pages', async () => {
    const mockedRepo = repo as unknown as {
      listPublishedProjects: ReturnType<typeof vi.fn>;
    };
    mockedRepo.listPublishedProjects.mockResolvedValue({ data: [], total: 45 });

    const result = await service.listMarketplace({
      keyword: undefined,
      page: 2,
      pageSize: 20,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    expect(result.meta.totalPages).toBe(3); // ceil(45/20) = 3
  });
});

describe('MarketplaceService.forkScenario', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws MARKET_001 when source is not found or unpublished', async () => {
    const mockedRepo = repo as unknown as {
      findPublishedProject: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findPublishedProject.mockResolvedValue(undefined);

    await expect(
      service.forkScenario(
        { id: 'user-1', email: 'a@b.c' },
        'nonexistent',
        {},
      ),
    ).rejects.toThrow(AppError);

    await expect(
      service.forkScenario(
        { id: 'user-1', email: 'a@b.c' },
        'nonexistent',
        {},
      ),
    ).rejects.toThrow(/not found or not published/);
  });

  it('throws MARKET_002 when forking own scenario', async () => {
    const mockedRepo = repo as unknown as {
      findPublishedProject: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findPublishedProject.mockResolvedValue(
      makeProject({ ownerId: 'user-1' }),
    );

    await expect(
      service.forkScenario({ id: 'user-1', email: 'a@b.c' }, 'src-uuid', {}),
    ).rejects.toThrow(/Cannot fork your own/);
  });

  it('creates a fork with title and description overrides', async () => {
    const mockedRepo = repo as unknown as {
      findPublishedProject: ReturnType<typeof vi.fn>;
      createFork: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findPublishedProject.mockResolvedValue(
      makeProject({ ownerId: 'other-user' }),
    );
    const forkedProject = makeProject({
      id: 'fork-uuid',
      ownerId: 'user-1',
      title: 'My Fork',
      forkedFromId: 'src-uuid',
      forkedAt: new Date('2026-01-03'),
      isPublished: false,
    });
    mockedRepo.createFork.mockResolvedValue(forkedProject);

    const result = await service.forkScenario(
      { id: 'user-1', email: 'a@b.c' },
      'src-uuid',
      { title: 'My Fork', description: 'Custom desc' },
    );

    expect(result.projectId).toBe('fork-uuid');
    expect(result.forkedFromId).toBe('src-uuid');
    expect(result.title).toBe('My Fork');
    expect(result.isPublished).toBe(false);
    // Verify createFork was called with the right overrides.
    expect(mockedRepo.createFork).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'src-uuid', ownerId: 'other-user' }),
      'user-1',
      { title: 'My Fork', description: 'Custom desc' },
    );
  });

  it('creates a fork without overrides (uses default title suffix)', async () => {
    const mockedRepo = repo as unknown as {
      findPublishedProject: ReturnType<typeof vi.fn>;
      createFork: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findPublishedProject.mockResolvedValue(
      makeProject({ ownerId: 'other-user', title: 'Original' }),
    );
    mockedRepo.createFork.mockResolvedValue(
      makeProject({ id: 'fork-uuid', title: 'Original (副本)' }),
    );

    const result = await service.forkScenario(
      { id: 'user-1', email: 'a@b.c' },
      'src-uuid',
      {},
    );

    expect(result.title).toBe('Original (副本)');
    // createFork should receive undefined overrides.
    expect(mockedRepo.createFork).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      { title: undefined, description: undefined },
    );
  });
});

describe('MarketplaceService.listForks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps fork rows with ISO timestamps', async () => {
    const mockedRepo = repo as unknown as {
      listForksBySource: ReturnType<typeof vi.fn>;
    };
    mockedRepo.listForksBySource.mockResolvedValue({
      data: [
        {
          id: 'fork-1',
          title: 'Fork 1',
          ownerId: 'user-2',
          ownerNickname: 'Bob',
          forkedAt: new Date('2026-01-04T00:00:00Z'),
        },
      ],
      total: 1,
    });

    const result = await service.listForks('src-uuid', 1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('fork-1');
    expect(result.data[0].forkedAt).toBe('2026-01-04T00:00:00.000Z');
    expect(result.meta.total).toBe(1);
  });
});
