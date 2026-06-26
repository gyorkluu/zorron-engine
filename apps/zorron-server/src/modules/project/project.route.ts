import { Elysia } from 'elysia';
import * as controller from './project.controller';
import { authPlugin } from '../../middleware/auth';
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ImportProjectRequestSchema,
  ProjectDetailSchema,
  ListProjectsResponseSchema,
  ListProjectsQuerySchema,
  ProjectIdParamSchema,
} from './project.schema';

/**
 * [Elysia]: project routes (all require authentication via derive plugin).
 */
export const projectRoute = new Elysia({ prefix: '/api/projects' })
  .get(
    '/:id/play',
    ({ params }) => controller.getPlayableProject({ params }),
    {
      params: ProjectIdParamSchema,
      response: ProjectDetailSchema,
    },
  )
  .use(authPlugin)
  .post(
    '/',
    ({ body, user, set }) => {
      set.status = 201;
      return controller.createProject({ user, body });
    },
    {
      body: CreateProjectRequestSchema,
      response: ProjectDetailSchema,
    },
  )
  .get(
    '/',
    ({ query, user }) => controller.listProjects({ user, query }),
    {
      query: ListProjectsQuerySchema,
      response: ListProjectsResponseSchema,
    },
  )
  .get(
    '/:id',
    ({ params, user }) => controller.getProject({ user, params }),
    {
      params: ProjectIdParamSchema,
      response: ProjectDetailSchema,
    },
  )
  .patch(
    '/:id',
    ({ params, body, user }) => controller.updateProject({ user, params, body }),
    {
      params: ProjectIdParamSchema,
      body: UpdateProjectRequestSchema,
      response: ProjectDetailSchema,
    },
  )
  .delete(
    '/:id',
    async ({ params, user }) => {
      await controller.deleteProject({ user, params });
      return new Response(null, { status: 204 });
    },
    {
      params: ProjectIdParamSchema,
    },
  )
  .get(
    '/:id/export',
    ({ params, user }) => controller.exportProject({ user, params }),
    {
      params: ProjectIdParamSchema,
      response: ProjectDetailSchema,
    },
  )
  .post(
    '/import',
    ({ body, user, set }) => {
      set.status = 201;
      return controller.importProject({ user, body });
    },
    {
      body: ImportProjectRequestSchema,
      response: ProjectDetailSchema,
    },
  );
