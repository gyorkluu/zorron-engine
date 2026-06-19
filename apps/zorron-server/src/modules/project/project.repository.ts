import { eq, and, desc, asc, sql, count } from 'drizzle-orm';
import { db } from '../../config/database';
import { projects, type Project, type NewProject } from '../../db/schema';
import type { FlowData } from './flow-data.schema';

/**
 * Creates a new project for the given owner.
 */
export async function createProject(
  ownerId: string,
  values: Omit<NewProject, 'ownerId' | 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Project> {
  const [project] = await db
    .insert(projects)
    .values({ ...values, ownerId })
    .returning();
  return project;
}

/**
 * Finds a project by id without ownership check.
 */
export async function findProjectById(
  id: string,
): Promise<Project | undefined> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));
  return project;
}

/**
 * Finds a project by id that belongs to the given owner.
 */
export async function findProjectByIdAndOwner(
  id: string,
  ownerId: string,
): Promise<Project | undefined> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
  return project;
}

/**
 * Lists projects owned by the user with optional keyword, pagination, and sorting.
 */
export async function listProjectsByOwner(
  ownerId: string,
  options: {
    page: number;
    pageSize: number;
    keyword?: string;
    sortBy: 'createdAt' | 'updatedAt' | 'title';
    sortOrder: 'asc' | 'desc';
  },
): Promise<{ data: Project[]; total: number }> {
  const { page, pageSize, keyword, sortBy, sortOrder } = options;
  const offset = (page - 1) * pageSize;

  const filters = [eq(projects.ownerId, ownerId)];
  if (keyword) {
    filters.push(
      sql`${projects.title} ILIKE ${`%${keyword}%`}`,
    );
  }

  const whereClause = and(...filters);

  const orderColumn =
    sortBy === 'title' ? projects.title : sortBy === 'createdAt' ? projects.createdAt : projects.updatedAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(projects)
      .where(whereClause),
  ]);

  return { data: items, total: totalResult[0]?.count ?? 0 };
}

/**
 * Updates a project by id.
 */
export async function updateProject(
  id: string,
  values: Partial<Omit<NewProject, 'id' | 'ownerId' | 'createdAt'>>,
): Promise<Project | undefined> {
  const [project] = await db
    .update(projects)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project;
}

/**
 * Deletes a project by id.
 */
export async function deleteProject(id: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}

/**
 * Helper to build the default empty FlowData payload.
 */
export function defaultFlowData(): FlowData {
  return {
    nodes: [],
    edges: [],
    variables: {},
    settings: {
      vectorSpace: {
        enabled: false,
        dimensions: { x: '处世', y: '立场', z: '性情' },
      },
    },
    version: '1.0.0',
  };
}
