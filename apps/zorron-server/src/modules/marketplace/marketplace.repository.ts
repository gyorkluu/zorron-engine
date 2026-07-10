/**
 * Marketplace repository (ECO-004).
 *
 * Queries published projects for the marketplace listing and handles fork
 * creation. All reads are against published projects only.
 */

import { eq, and, desc, asc, sql, count } from 'drizzle-orm';
import { db } from '../../config/database';
import { projects, users, type Project } from '../../db/schema';
import type { ListMarketplaceQuery } from './marketplace.schema';

// ── Types ──

export interface MarketplaceRow {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  ownerId: string;
  ownerNickname: string | null;
  forkedFromId: string | null;
  forkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForkRow {
  id: string;
  title: string;
  ownerId: string;
  ownerNickname: string | null;
  forkedAt: Date | null;
}

// ── Queries ──

/** List published projects for the marketplace, with fork counts and owner names. */
export async function listPublishedProjects(
  query: ListMarketplaceQuery,
): Promise<{ data: MarketplaceRow[]; total: number }> {
  const { page, pageSize, keyword, sortBy, sortOrder } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(projects.isPublished, true)];
  if (keyword) {
    conditions.push(sql`${projects.title} ILIKE ${`%${keyword}%`}`);
  }
  const whereClause = and(...conditions);

  const orderColumn =
    sortBy === 'title' ? projects.title : sortBy === 'createdAt' ? projects.createdAt : projects.updatedAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  // Subquery for fork counts per source project.
  const forkCountExpr = sql<number>`(
    SELECT COUNT(*)::int FROM ${projects} AS fork
    WHERE fork.forked_from_id = ${projects.id}
  )`.as('fork_count');

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        coverUrl: projects.coverUrl,
        ownerId: projects.ownerId,
        ownerNickname: users.nickname,
        forkedFromId: projects.forkedFromId,
        forkCount: forkCountExpr,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(projects).where(whereClause),
  ]);

  return { data: items, total: totalResult[0]?.count ?? 0 };
}

/** Find a single published project by id. */
export async function findPublishedProject(id: string): Promise<Project | undefined> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.isPublished, true)));
  return project;
}

/** Create a fork of a source project for the given owner. */
export async function createFork(
  sourceProject: Project,
  ownerId: string,
  overrides: { title?: string; description?: string },
): Promise<Project> {
  const [forked] = await db
    .insert(projects)
    .values({
      ownerId,
      title: overrides.title ?? `${sourceProject.title} (副本)`,
      description: overrides.description ?? sourceProject.description ?? null,
      coverUrl: sourceProject.coverUrl,
      isPublished: false,
      data: sourceProject.data,
      forkedFromId: sourceProject.id,
      forkedAt: new Date(),
    })
    .returning();
  return forked;
}

/** List projects forked from a given source id. */
export async function listForksBySource(
  sourceId: string,
  page: number,
  pageSize: number,
): Promise<{ data: ForkRow[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const whereClause = eq(projects.forkedFromId, sourceId);

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: projects.id,
        title: projects.title,
        ownerId: projects.ownerId,
        ownerNickname: users.nickname,
        forkedAt: projects.forkedAt,
      })
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .where(whereClause)
      .orderBy(desc(projects.forkedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(projects).where(whereClause),
  ]);

  return { data: items, total: totalResult[0]?.count ?? 0 };
}
