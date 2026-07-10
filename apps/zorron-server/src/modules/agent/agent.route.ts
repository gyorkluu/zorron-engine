import { Elysia } from 'elysia';
import * as controller from './agent.controller';
import { authPlugin } from '../../middleware/auth';
import {
  CompileRequestSchema,
  CompileResponseSchema,
  IterateRequestSchema,
  PublishRequestSchema,
  PublishResponseSchema,
  SaveSessionRequestSchema,
  SessionDetailSchema,
  ListSessionsQuerySchema,
  ListSessionsResponseSchema,
} from './agent.schema';

/**
 * [Elysia]: agent routes.
 *
 * Discovery endpoints (scenario-types, node-capabilities) are public.
 * Compile/iterate/publish require authentication.
 * Session save/list are public (players submit, external systems query).
 */
export const agentRoute = new Elysia({ prefix: '/api/agent' })
  // ── Public discovery endpoints ──
  .get(
    '/scenario-types',
    () => controller.getScenarioTypes(),
  )
  .get(
    '/node-capabilities',
    () => controller.getNodeCapabilities(),
  )
  .get(
    '/presets',
    () => controller.getPresets(),
  )
  .get(
    '/presets/:id',
    ({ params, set }) => {
      const preset = controller.getPreset(params.id);
      if (!preset) {
        set.status = 404;
        return { code: 'PRESET_001', message: 'Preset not found' };
      }
      return preset;
    },
  )
  .get(
    '/visual-blocks',
    () => controller.getVisualBlocks(),
  )
  // ── Session endpoints (public for external consumption) ──
  .post(
    '/sessions',
    ({ body, set }) => {
      set.status = 201;
      return controller.saveSession(body);
    },
    {
      body: SaveSessionRequestSchema,
      response: SessionDetailSchema,
    },
  )
  .get(
    '/sessions',
    ({ query }) => controller.listSessions(query),
    {
      query: ListSessionsQuerySchema,
      response: ListSessionsResponseSchema,
    },
  )
  // ── Authenticated endpoints ──
  .use(authPlugin)
  .post(
    '/compile',
    ({ body, user }) => controller.compile({ user: user! }, body),
    {
      body: CompileRequestSchema,
      response: CompileResponseSchema,
    },
  )
  .post(
    '/compile/iterate',
    ({ body, user }) => controller.iterate({ user: user! }, body),
    {
      body: IterateRequestSchema,
      response: CompileResponseSchema,
    },
  )
  .post(
    '/projects/:id/publish',
    ({ params, user }) => controller.publish({ user: user! }, params.id),
    {
      response: PublishResponseSchema,
    },
  );
