import { AppError } from '../../shared/errors';
import type { AuthUser } from '../../middleware/auth';
import type { StorageProvider } from '../../shared/storage/provider';
import * as service from './asset.service';
import { AssetMetadataSchema } from './asset.schema';
import type {
  AssetResponse,
  ListAssetsQuery,
  UploadAssetRequest,
} from './asset.schema';

interface Context {
  user: AuthUser | null;
}

interface BodyContext<T> extends Context {
  body: T;
}

interface ParamsContext extends Context {
  params: { id: string };
}

interface QueryContext<T> extends Context {
  query: T;
}

function ensureAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new AppError('AUTH_001', 'Unauthorized', 401);
  return user;
}

/**
 * Uploads a file asset.
 */
export async function uploadAsset(
  ctx: BodyContext<UploadAssetRequest>,
  storage: StorageProvider,
): Promise<AssetResponse> {
  const auth = ensureAuth(ctx.user);
  const metadata = ctx.body.metadata
    ? AssetMetadataSchema.parse(JSON.parse(ctx.body.metadata))
    : undefined;
  return service.uploadAsset(
    auth.id,
    {
      file: ctx.body.file,
      projectId: ctx.body.projectId,
      metadata,
    },
    storage,
  );
}

/**
 * Lists assets owned by the user.
 */
export async function listAssets(
  ctx: QueryContext<ListAssetsQuery>,
): Promise<{ data: AssetResponse[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const auth = ensureAuth(ctx.user);
  return service.listAssets(auth.id, ctx.query);
}

/**
 * Gets a single asset by id.
 */
export async function getAsset(ctx: ParamsContext): Promise<AssetResponse> {
  const auth = ensureAuth(ctx.user);
  return service.getAsset(auth.id, ctx.params.id);
}

/**
 * Deletes an asset by id.
 */
export async function deleteAsset(
  ctx: ParamsContext,
  storage: StorageProvider,
): Promise<void> {
  const auth = ensureAuth(ctx.user);
  return service.deleteAsset(auth.id, ctx.params.id, storage);
}

/**
 * Generates a signed URL for an asset.
 */
export async function getAssetUrl(
  ctx: ParamsContext & QueryContext<{ expires: number }>,
  storage: StorageProvider,
): Promise<{ url: string; expiresAt?: string }> {
  const auth = ensureAuth(ctx.user);
  const result = await service.getAssetUrl(auth.id, ctx.params.id, ctx.query.expires, storage);
  return {
    url: result.url,
    expiresAt: result.expiresAt?.toISOString(),
  };
}
