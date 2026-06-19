import { Elysia } from 'elysia';
import * as controller from './asset.controller';
import { authPlugin } from '../../middleware/auth';
import { createStorageProvider } from '../../shared/storage';
import {
  UploadAssetRequestSchema,
  ListAssetsQuerySchema,
  ListAssetsResponseSchema,
  AssetResponseSchema,
  AssetUrlQuerySchema,
  AssetUrlResponseSchema,
} from './asset.schema';

const storage = createStorageProvider();

/**
 * [Elysia]: asset routes (all require authentication via derive plugin).
 */
export const assetRoute = new Elysia({ prefix: '/api/assets' })
  .use(authPlugin)
  .post(
    '/',
    ({ body, user, set }) => {
      set.status = 201;
      return controller.uploadAsset({ user, body }, storage);
    },
    {
      body: UploadAssetRequestSchema,
      response: AssetResponseSchema,
    },
  )
  .get(
    '/',
    ({ query, user }) => controller.listAssets({ user, query }),
    {
      query: ListAssetsQuerySchema,
      response: ListAssetsResponseSchema,
    },
  )
  .get(
    '/:id',
    ({ params, user }) => controller.getAsset({ user, params }),
    {
      response: AssetResponseSchema,
    },
  )
  .delete('/:id', async ({ params, user }) => {
    await controller.deleteAsset({ user, params }, storage);
    return new Response(null, { status: 204 });
  })
  .get(
    '/:id/url',
    ({ params, query, user }) => controller.getAssetUrl({ user, params, query }, storage),
    {
      query: AssetUrlQuerySchema,
      response: AssetUrlResponseSchema,
    },
  );
