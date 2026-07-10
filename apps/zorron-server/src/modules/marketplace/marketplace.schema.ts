import { z } from 'zod';

/**
 * Marketplace schemas (ECO-004).
 *
 * The marketplace lists published scenarios that any logged-in creator can
 * fork into their own workspace, adapt, and re-publish.
 */

const UuidSchema = z.string().uuid();
const TimestampSchema = z.string().datetime();

/** Query params for listing published scenarios in the marketplace. */
export const ListMarketplaceQuerySchema = z.object({
  keyword: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** A marketplace listing card (subset of project fields). */
export const MarketplaceItemSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  ownerId: UuidSchema,
  ownerNickname: z.string().nullable(),
  forkedFromId: UuidSchema.nullable(),
  forkCount: z.number().int(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ListMarketplaceResponseSchema = z.object({
  data: z.array(MarketplaceItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

/** Fork request body — the new title/description override. */
export const ForkRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

/** Response after forking. */
export const ForkResponseSchema = z.object({
  projectId: UuidSchema,
  forkedFromId: UuidSchema,
  title: z.string(),
  isPublished: z.boolean(),
});

/** Fork listing for a source project. */
export const ForkItemSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  ownerId: UuidSchema,
  ownerNickname: z.string().nullable(),
  forkedAt: TimestampSchema,
});

export const ListForksResponseSchema = z.object({
  data: z.array(ForkItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

// ── Types ──

export type ListMarketplaceQuery = z.infer<typeof ListMarketplaceQuerySchema>;
export type MarketplaceItem = z.infer<typeof MarketplaceItemSchema>;
export type ForkRequest = z.infer<typeof ForkRequestSchema>;
export type ForkResponse = z.infer<typeof ForkResponseSchema>;
export type ListForksResponse = z.infer<typeof ListForksResponseSchema>;
