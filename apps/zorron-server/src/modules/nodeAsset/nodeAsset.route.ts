/**
 * Node asset routes — catalogue CRUD plus instantiation.
 */

import { Elysia, t } from 'elysia';
import * as service from './nodeAsset.service';
import { authPlugin, requireAuth } from '../../middleware/auth';

const CreateBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  description: t.Optional(t.Union([t.String(), t.Null()])),
  nodeType: t.String({ minLength: 1, maxLength: 40 }),
  data: t.Record(t.String(), t.Unknown()),
  category: t.Optional(t.Union([t.String(), t.Null()])),
  tags: t.Optional(t.Array(t.String())),
  isPublic: t.Optional(t.Boolean()),
});

const ListQuery = t.Object({
  nodeType: t.Optional(t.String()),
  q: t.Optional(t.String()),
});

export const nodeAssetRoute = new Elysia({ prefix: '/api/node-assets' })
  // Mounted first so the public listing can still see the caller (if any).
  .use(authPlugin)
  .get(
    '/',
    async ({ query, user }) =>
      service.listNodeAssets({
        ownerId: user?.id ?? null,
        nodeType: query.nodeType,
        query: query.q,
      }),
    { query: ListQuery },
  )
  .post(
    '/',
    async ({ body, user, set }) => {
      requireAuth({ user });
      set.status = 201;
      return service.createNodeAsset(user!.id, body as service.CreateNodeAssetRequest);
    },
    { body: CreateBody },
  )
  .post('/:id/instantiate', async ({ params, user }) => {
    requireAuth({ user });
    return service.instantiateNodeAsset(params.id);
  })
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      requireAuth({ user });
      await service.deleteNodeAsset(user!.id, params.id);
      set.status = 204;
    },
  );
