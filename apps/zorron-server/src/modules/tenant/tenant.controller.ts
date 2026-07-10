/**
 * Tenant controller (SCALE-001).
 */

import * as service from './tenant.service';
import type {
  CreateTenantRequest,
  UpdateTenantRequest,
} from './tenant.schema';

/** POST /api/tenants */
export async function createTenant(body: CreateTenantRequest) {
  return service.createTenant(body);
}

/** GET /api/tenants */
export async function listTenants() {
  return service.listTenants();
}

/** GET /api/tenants/:id */
export async function getTenant(id: string) {
  return service.getTenant(id);
}

/** PATCH /api/tenants/:id */
export async function updateTenant(
  id: string,
  body: UpdateTenantRequest,
) {
  return service.updateTenant(id, body);
}
