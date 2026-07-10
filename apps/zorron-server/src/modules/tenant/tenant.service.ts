/**
 * Tenant service (SCALE-001).
 */

import { AppError } from '../../shared/errors';
import * as repo from './tenant.repository';
import type {
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantDetail,
} from './tenant.schema';

/** Create a new tenant. */
export async function createTenant(
  req: CreateTenantRequest,
): Promise<TenantDetail> {
  // Verify slug uniqueness.
  const existing = await repo.findTenantBySlug(req.slug);
  if (existing) {
    throw new AppError('TENANT_001', `Slug already in use: ${req.slug}`, 409);
  }

  const tenant = await repo.createTenant({
    name: req.name,
    slug: req.slug,
    description: req.description ?? null,
  });

  return toDetail(tenant);
}

/** Get a tenant by id. */
export async function getTenant(id: string): Promise<TenantDetail> {
  const tenant = await repo.findTenantById(id);
  if (!tenant) {
    throw new AppError('TENANT_002', 'Tenant not found', 404);
  }
  return toDetail(tenant);
}

/** List all tenants. */
export async function listTenants(): Promise<{ data: TenantDetail[] }> {
  const tenants = await repo.listTenants();
  return { data: tenants.map(toDetail) };
}

/** Update a tenant. */
export async function updateTenant(
  id: string,
  req: UpdateTenantRequest,
): Promise<TenantDetail> {
  const existing = await repo.findTenantById(id);
  if (!existing) {
    throw new AppError('TENANT_002', 'Tenant not found', 404);
  }

  const updated = await repo.updateTenant(id, {
    name: req.name,
    description: req.description,
  });

  if (!updated) {
    throw new AppError('TENANT_003', 'Failed to update tenant', 500);
  }
  return toDetail(updated);
}

function toDetail(t: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TenantDetail {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
