/**
 * Tenant repository (SCALE-001).
 */

import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { tenants, type Tenant, type NewTenant } from '../../db/schema';

/** Create a new tenant. */
export async function createTenant(
  values: Omit<NewTenant, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Tenant> {
  const [tenant] = await db
    .insert(tenants)
    .values({ ...values })
    .returning();
  return tenant;
}

/** Find a tenant by id. */
export async function findTenantById(id: string): Promise<Tenant | undefined> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
  return tenant;
}

/** Find a tenant by slug. */
export async function findTenantBySlug(
  slug: string,
): Promise<Tenant | undefined> {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug));
  return tenant;
}

/** List all tenants. */
export async function listTenants(): Promise<Tenant[]> {
  return db.select().from(tenants).orderBy(tenants.createdAt);
}

/** Update a tenant by id. */
export async function updateTenant(
  id: string,
  values: Partial<Omit<NewTenant, 'id' | 'createdAt'>>,
): Promise<Tenant | undefined> {
  const [tenant] = await db
    .update(tenants)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();
  return tenant;
}
