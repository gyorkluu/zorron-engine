import { Elysia } from 'elysia';
import * as controller from './saveslot.controller';
import { authPlugin, requireAuth } from '../../middleware/auth';
import {
  SaveSlotParamsSchema,
  SaveSlotBodySchema,
} from './saveslot.schema';

export const saveslotRoute = new Elysia({ prefix: '/api/projects' })
  .use(authPlugin)
  .get('/:id/slots', async ({ params, user }) => {
    requireAuth({ user });
    return controller.listSlots(user!.id, params.id);
  })
  .get(
    '/:id/slots/:slotIndex',
    async ({ params, user }) => {
      requireAuth({ user });
      const slotIndex = parseInt(params.slotIndex, 10);
      return controller.getSlot(user!.id, params.id, slotIndex);
    },
  )
  .put(
    '/:id/slots/:slotIndex',
    async ({ params, body, user }) => {
      requireAuth({ user });
      const slotIndex = parseInt(params.slotIndex, 10);
      return controller.saveSlot(user!.id, params.id, slotIndex, body);
    },
    {
      body: SaveSlotBodySchema,
    },
  )
  .delete(
    '/:id/slots/:slotIndex',
    async ({ params, user }) => {
      requireAuth({ user });
      const slotIndex = parseInt(params.slotIndex, 10);
      return controller.clearSlot(user!.id, params.id, slotIndex);
    },
  );
