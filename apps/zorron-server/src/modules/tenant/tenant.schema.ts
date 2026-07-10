import { z } from 'zod';

/**
 * Tenant schemas (SCALE-001).
 *
 * Tenants represent接入方 (e.g. 情缘杯, 招聘系统). Platform admins manage
 * tenants; regular users are assigned to a tenant at registration or via
 * admin invitation.
 */

const UuidSchema = z.string().uuid();
const TimestampSchema = z.string().datetime();

/** Create tenant request body. */
export const CreateTenantRequestSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().max(2000).optional(),
});

/** Update tenant request body. */
export const UpdateTenantRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
});

/** Tenant detail response. */
export const TenantDetailSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

/** List tenants response. */
export const ListTenantsResponseSchema = z.object({
  data: z.array(TenantDetailSchema),
});

// ── Types ──

export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;
export type UpdateTenantRequest = z.infer<typeof UpdateTenantRequestSchema>;
export type TenantDetail = z.infer<typeof TenantDetailSchema>;
