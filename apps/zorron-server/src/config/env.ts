import { z } from 'zod';

/**
 * [Zod]: server-side environment variable schema.
 *
 * Validates all required configuration at startup so the server fails fast
 * on misconfiguration rather than at runtime.
 *
 * Security note: `JWT_SECRET` has NO default. The server will refuse to boot
 * if it is missing or shorter than 32 characters. This prevents accidental
 * deployment with a known weak secret.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  REQUEST_ID_HEADER: z.string().default('x-request-id'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().startsWith('postgresql://'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT secret: required, minimum 32 chars. No insecure default.
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  STORAGE_PROVIDER: z.enum(['local', 's3', 'r2']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./uploads'),
  STORAGE_BASE_URL: z.string().url().default('http://localhost:3000/uploads'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),

  ASSET_MAX_SIZE_MB: z.coerce.number().default(50),
  ASSET_ALLOWED_MIMES: z.string().default('image/*,audio/*,video/*,font/*'),

  FEATURE_VECTOR_3D: z.coerce.boolean().default(false),
  VECTOR_SECT_COUNT: z.coerce.number().default(20),
  FEATURE_CLOUD_SYNC: z.coerce.boolean().default(true),
});

/**
 * Parsed and validated server environment configuration.
 */
export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
