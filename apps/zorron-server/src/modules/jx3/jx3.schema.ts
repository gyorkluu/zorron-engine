/**
 * jx3.schema.ts
 *
 * Zod schemas for the JX3 lookup endpoint.
 */

import { z } from 'zod';

/** Request body: POST /api/jx3/lookup. */
export const Jx3LookupRequestSchema = z.object({
  /** 推栏号 (numeric string, 1-32 chars). */
  tuilanId: z
    .string()
    .trim()
    .min(1, '推栏号不能为空')
    .max(32, '推栏号长度不能超过 32 字符'),
});

export type Jx3LookupRequest = z.infer<typeof Jx3LookupRequestSchema>;
