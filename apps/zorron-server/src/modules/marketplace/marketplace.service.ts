/**
 * Marketplace service (ECO-004).
 *
 * Business logic for listing published scenarios and forking them.
 * A fork copies the source project's flow data into a new unpublished project
 * owned by the forker, with forkedFromId tracking the derivation.
 */

import { AppError } from '../../shared/errors';
import * as repo from './marketplace.repository';
import type { ListMarketplaceQuery, ForkRequest } from './marketplace.schema';

interface AuthUser {
  id: string;
  email: string;
}

/** List published scenarios available in the marketplace. */
export async function listMarketplace(query: ListMarketplaceQuery) {
  const { data, total } = await repo.listPublishedProjects(query);
  const totalPages = Math.ceil(total / query.pageSize);

  return {
    data: data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      coverUrl: row.coverUrl,
      ownerId: row.ownerId,
      ownerNickname: row.ownerNickname,
      forkedFromId: row.forkedFromId,
      forkCount: row.forkCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
}

/** Fork a published scenario into the caller's workspace. */
export async function forkScenario(
  user: AuthUser,
  sourceId: string,
  req: ForkRequest,
): Promise<{ projectId: string; forkedFromId: string; title: string; isPublished: boolean }> {
  // 1. Verify the source project exists and is published.
  const source = await repo.findPublishedProject(sourceId);
  if (!source) {
    throw new AppError('MARKET_001', 'Source scenario not found or not published', 404);
  }

  // 2. Prevent forking one's own unpublished draft (a published own project is fine to fork).
  if (source.ownerId === user.id) {
    throw new AppError('MARKET_002', 'Cannot fork your own scenario; edit it directly instead', 400);
  }

  // 3. Create the fork.
  const forked = await repo.createFork(source, user.id, {
    title: req.title,
    description: req.description,
  });

  return {
    projectId: forked.id,
    forkedFromId: source.id,
    title: forked.title,
    isPublished: forked.isPublished,
  };
}

/** List all forks of a given source project. */
export async function listForks(sourceId: string, page: number, pageSize: number) {
  // Verify the source exists (published or not — forks are visible either way).
  const { data, total } = await repo.listForksBySource(sourceId, page, pageSize);
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: data.map((row) => ({
      id: row.id,
      title: row.title,
      ownerId: row.ownerId,
      ownerNickname: row.ownerNickname,
      forkedAt: (row.forkedAt ?? new Date()).toISOString(),
    })),
    meta: { page, pageSize, total, totalPages },
  };
}
