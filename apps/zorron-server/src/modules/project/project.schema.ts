import { z } from 'zod';
import { FlowDataSchema } from './flow-data.schema';

export const UuidSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();

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

export const ProjectIdParamSchema = z.object({
  id: UuidSchema,
});

export const ListProjectsQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ProjectListItemSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  isPublished: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ProjectDetailSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  isPublished: z.boolean(),
  data: FlowDataSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ListProjectsResponseSchema = z.object({
  data: z.array(ProjectListItemSchema),
  meta: PaginationMetaSchema,
});

export const CreateProjectRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  data: FlowDataSchema.optional(),
});

export const UpdateProjectRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  isPublished: z.boolean().optional(),
  data: FlowDataSchema.optional(),
});

export const ImportProjectRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: FlowDataSchema,
});

export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ImportProjectRequest = z.infer<typeof ImportProjectRequestSchema>;
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
