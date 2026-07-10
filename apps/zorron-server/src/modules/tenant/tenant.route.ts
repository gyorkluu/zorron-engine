import { Elysia } from 'elysia';
import * as controller from './tenant.controller';
import { authPlugin } from '../../middleware/auth';
import {
  CreateTenantRequestSchema,
  UpdateTenantRequestSchema,
  TenantDetailSchema,
  ListTenantsResponseSchema,
} from './tenant.schema';

/**
 * [Elysia]: tenant management routes (SCALE-001).
 *
 * All tenant endpoints require authentication. In production, only platform
 * admins (tenantId == null) should be allowed to create/update tenants.
 * For now we require auth and the service enforces slug uniqueness.
 */
export const tenantRoute = new Elysia({ prefix: '/api/tenants' })
  .use(authPlugin)
  .get('/', () => controller.listTenants(), {
    response: ListTenantsResponseSchema,
  })
  .get(
    '/:id',
    ({ params }) => controller.getTenant(params.id),
    {
      response: TenantDetailSchema,
    },
  )
  .post(
    '/',
    ({ body, set }) => {
      set.status = 201;
      return controller.createTenant(body);
    },
    {
      body: CreateTenantRequestSchema,
      response: TenantDetailSchema,
    },
  )
  .patch(
    '/:id',
    ({ params, body }) => controller.updateTenant(params.id, body),
    {
      body: UpdateTenantRequestSchema,
      response: TenantDetailSchema,
    },
  );
