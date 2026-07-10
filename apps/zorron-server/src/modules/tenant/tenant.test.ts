/**
 * SCALE-001: Tenant module tests.
 *
 * Tests the service business logic with a mocked repository to verify:
 * - createTenant enforces slug uniqueness.
 * - getTenant throws TENANT_002 when not found.
 * - listTenants maps rows.
 * - updateTenant throws when the tenant doesn't exist.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tenant } from '../../db/schema';

vi.mock('./tenant.repository', () => ({
  createTenant: vi.fn(),
  findTenantById: vi.fn(),
  findTenantBySlug: vi.fn(),
  listTenants: vi.fn(),
  updateTenant: vi.fn(),
}));

import * as service from './tenant.service';
import * as repo from './tenant.repository';
import { AppError } from '../../shared/errors';

// ── Helpers ──

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-uuid',
    name: 'Acme Inc',
    slug: 'acme',
    description: 'A test tenant',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

// ── Tests ──

describe('TenantService.createTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a tenant when slug is available', async () => {
    const mockedRepo = repo as unknown as {
      findTenantBySlug: ReturnType<typeof vi.fn>;
      createTenant: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantBySlug.mockResolvedValue(undefined);
    mockedRepo.createTenant.mockResolvedValue(makeTenant());

    const result = await service.createTenant({
      name: 'Acme Inc',
      slug: 'acme',
      description: 'A test tenant',
    });

    expect(result.slug).toBe('acme');
    expect(mockedRepo.createTenant).toHaveBeenCalledWith({
      name: 'Acme Inc',
      slug: 'acme',
      description: 'A test tenant',
    });
  });

  it('throws TENANT_001 when slug is already in use', async () => {
    const mockedRepo = repo as unknown as {
      findTenantBySlug: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantBySlug.mockResolvedValue(makeTenant());

    await expect(
      service.createTenant({ name: 'Acme', slug: 'acme' }),
    ).rejects.toThrow(AppError);

    await expect(
      service.createTenant({ name: 'Acme', slug: 'acme' }),
    ).rejects.toThrow(/Slug already in use/);
  });

  it('passes null description when omitted', async () => {
    const mockedRepo = repo as unknown as {
      findTenantBySlug: ReturnType<typeof vi.fn>;
      createTenant: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantBySlug.mockResolvedValue(undefined);
    mockedRepo.createTenant.mockResolvedValue(makeTenant({ description: null }));

    await service.createTenant({ name: 'No Desc', slug: 'no-desc' });

    expect(mockedRepo.createTenant).toHaveBeenCalledWith({
      name: 'No Desc',
      slug: 'no-desc',
      description: null,
    });
  });
});

describe('TenantService.getTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the tenant when found', async () => {
    const mockedRepo = repo as unknown as {
      findTenantById: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantById.mockResolvedValue(makeTenant());

    const result = await service.getTenant('tenant-uuid');
    expect(result.id).toBe('tenant-uuid');
  });

  it('throws TENANT_002 when not found', async () => {
    const mockedRepo = repo as unknown as {
      findTenantById: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantById.mockResolvedValue(undefined);

    await expect(service.getTenant('nonexistent')).rejects.toThrow(AppError);
    await expect(service.getTenant('nonexistent')).rejects.toThrow(
      /Tenant not found/,
    );
  });
});

describe('TenantService.listTenants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps all tenants to detail objects', async () => {
    const mockedRepo = repo as unknown as {
      listTenants: ReturnType<typeof vi.fn>;
    };
    mockedRepo.listTenants.mockResolvedValue([
      makeTenant({ id: 't1', slug: 'a' }),
      makeTenant({ id: 't2', slug: 'b', name: 'Beta' }),
    ]);

    const result = await service.listTenants();
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('t1');
    expect(result.data[1].name).toBe('Beta');
  });
});

describe('TenantService.updateTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the tenant when it exists', async () => {
    const mockedRepo = repo as unknown as {
      findTenantById: ReturnType<typeof vi.fn>;
      updateTenant: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantById.mockResolvedValue(makeTenant());
    mockedRepo.updateTenant.mockResolvedValue(
      makeTenant({ name: 'Updated Name' }),
    );

    const result = await service.updateTenant('tenant-uuid', {
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
  });

  it('throws TENANT_002 when the tenant does not exist', async () => {
    const mockedRepo = repo as unknown as {
      findTenantById: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantById.mockResolvedValue(undefined);

    await expect(
      service.updateTenant('nonexistent', { name: 'X' }),
    ).rejects.toThrow(AppError);
  });
});

describe('TenantService ISO timestamp mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('serializes Date objects to ISO strings', async () => {
    const mockedRepo = repo as unknown as {
      findTenantById: ReturnType<typeof vi.fn>;
    };
    mockedRepo.findTenantById.mockResolvedValue(
      makeTenant({
        createdAt: new Date('2026-03-15T08:30:00Z'),
        updatedAt: new Date('2026-03-16T09:45:00Z'),
      }),
    );

    const result = await service.getTenant('tenant-uuid');
    expect(result.createdAt).toBe('2026-03-15T08:30:00.000Z');
    expect(result.updatedAt).toBe('2026-03-16T09:45:00.000Z');
  });
});
