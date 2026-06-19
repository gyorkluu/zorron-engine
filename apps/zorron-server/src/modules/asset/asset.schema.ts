import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();

export const AssetTypeSchema = z.enum([
  'image',
  'audio',
  'video',
  'font',
  'other',
]);

export const AssetMetadataSchema = z.object({
  type: AssetTypeSchema.default('other'),
  tags: z.array(z.string().max(50)).default([]),
});

export const UploadAssetRequestSchema = z.object({
  file: z.instanceof(File),
  projectId: UuidSchema.optional(),
  metadata: z.string().optional(),
});

export const AssetResponseSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  type: AssetTypeSchema,
  mimeType: z.string(),
  size: z.number().int(),
  url: z.string().url(),
  projectId: UuidSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const ListAssetsQuerySchema = PaginationQuerySchema.extend({
  projectId: UuidSchema.optional(),
  type: AssetTypeSchema.optional(),
  keyword: z.string().max(100).optional(),
});

export const ListAssetsResponseSchema = z.object({
  data: z.array(AssetResponseSchema),
  meta: PaginationMetaSchema,
});

export const AssetUrlQuerySchema = z.object({
  expires: z.coerce.number().int().min(60).max(86_400).optional().default(3600),
});

export const AssetUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: TimestampSchema.optional(),
});

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type UploadAssetRequest = z.infer<typeof UploadAssetRequestSchema>;
export type AssetResponse = z.infer<typeof AssetResponseSchema>;
export type ListAssetsQuery = z.infer<typeof ListAssetsQuerySchema>;
export type AssetUrlQuery = z.infer<typeof AssetUrlQuerySchema>;
