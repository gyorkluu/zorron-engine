import type { AuthUser } from '../../middleware/auth';
import { AppError } from '../../shared/errors';
import * as service from './project.service';
import type {
  CreateProjectRequest,
  ImportProjectRequest,
  ListProjectsQuery,
  UpdateProjectRequest,
  ProjectDetail,
} from './project.schema';

interface Context {
  user: AuthUser | null;
}

interface BodyContext<T> extends Context {
  body: T;
}

interface QueryContext<T> extends Context {
  query: T;
}

interface ParamsContext extends Context {
  params: { id: string };
}

interface BodyParamsContext<T> extends Context {
  params: { id: string };
  body: T;
}

/**
 * Creates a new project.
 */
function ensureAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new AppError('AUTH_001', 'Unauthorized', 401);
  return user;
}

export async function createProject(
  ctx: BodyContext<CreateProjectRequest>,
): Promise<ProjectDetail> {
  const auth = ensureAuth(ctx.user);
  return service.createProject(auth.id, ctx.body);
}

/**
 * Lists projects owned by the authenticated user.
 */
export async function listProjects(
  ctx: QueryContext<ListProjectsQuery>,
): Promise<{ data: ProjectDetail[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const auth = ensureAuth(ctx.user);
  return service.listProjects(auth.id, ctx.query);
}

/**
 * Gets a single project by id.
 */
export async function getProject(ctx: ParamsContext): Promise<ProjectDetail> {
  const auth = ensureAuth(ctx.user);
  return service.getProject(auth.id, ctx.params.id);
}

/**
 * Gets a published project for the public player.
 */
export async function getPlayableProject(ctx: ParamsContext): Promise<ProjectDetail> {
  return service.getPlayableProject(ctx.params.id);
}

/**
 * Updates a project by id.
 */
export async function updateProject(
  ctx: BodyParamsContext<UpdateProjectRequest>,
): Promise<ProjectDetail> {
  const auth = ensureAuth(ctx.user);
  return service.updateProject(auth.id, ctx.params.id, ctx.body);
}

/**
 * Deletes a project by id.
 */
export async function deleteProject(ctx: ParamsContext): Promise<void> {
  const auth = ensureAuth(ctx.user);
  return service.deleteProject(auth.id, ctx.params.id);
}

/**
 * Exports a project by id (same response shape as detail).
 */
export async function exportProject(ctx: ParamsContext): Promise<ProjectDetail> {
  const auth = ensureAuth(ctx.user);
  return service.getProject(auth.id, ctx.params.id);
}

/**
 * Imports a project JSON payload.
 */
export async function importProject(
  ctx: BodyContext<ImportProjectRequest>,
): Promise<ProjectDetail> {
  const auth = ensureAuth(ctx.user);
  return service.importProject(auth.id, ctx.body);
}
