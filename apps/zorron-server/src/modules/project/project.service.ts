import { AppError } from '../../shared/errors';
import type { Project } from '../../db/schema';
import * as repository from './project.repository';
import type {
  CreateProjectRequest,
  ImportProjectRequest,
  ListProjectsQuery,
  ProjectDetail,
  UpdateProjectRequest,
} from './project.schema';

function toProjectDetail(project: Project): ProjectDetail {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    coverUrl: project.coverUrl,
    isPublished: project.isPublished,
    data: project.data as ProjectDetail['data'],
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Creates a new project owned by the authenticated user.
 */
export async function createProject(
  ownerId: string,
  payload: CreateProjectRequest,
): Promise<ProjectDetail> {
  const project = await repository.createProject(ownerId, {
    title: payload.title,
    description: payload.description ?? null,
    data: payload.data ?? repository.defaultFlowData(),
  });

  return toProjectDetail(project);
}

/**
 * Lists projects owned by the user with pagination, keyword, and sorting.
 */
export async function listProjects(
  ownerId: string,
  query: ListProjectsQuery,
): Promise<{ data: ProjectDetail[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const { data, total } = await repository.listProjectsByOwner(ownerId, {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  return {
    data: data.map(toProjectDetail),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/**
 * Returns a single project if the user owns it.
 */
export async function getProject(
  ownerId: string,
  projectId: string,
): Promise<ProjectDetail> {
  const project = await repository.findProjectById(projectId);

  if (!project) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }

  if (project.ownerId !== ownerId) {
    throw new AppError('PROJECT_002', 'Forbidden', 403);
  }

  return toProjectDetail(project);
}

/**
 * Returns a project for the standalone player without requiring ownership.
 * Requires the project to be published.
 */
export async function getPlayableProject(projectId: string): Promise<ProjectDetail> {
  const project = await repository.findProjectById(projectId);

  if (!project) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }

  if (!project.isPublished) {
    throw new AppError('PROJECT_003', 'Project is not published', 403);
  }

  return toProjectDetail(project);
}

/**
 * Updates a project that the user owns.
 */
export async function updateProject(
  ownerId: string,
  projectId: string,
  payload: UpdateProjectRequest,
): Promise<ProjectDetail> {
  const existing = await repository.findProjectById(projectId);

  if (!existing) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }

  if (existing.ownerId !== ownerId) {
    throw new AppError('PROJECT_002', 'Forbidden', 403);
  }

  const updated = await repository.updateProject(projectId, {
    title: payload.title,
    description: payload.description,
    coverUrl: payload.coverUrl,
    isPublished: payload.isPublished,
    data: payload.data,
  });

  if (!updated) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }

  return toProjectDetail(updated);
}

/**
 * Deletes a project that the user owns.
 */
export async function deleteProject(
  ownerId: string,
  projectId: string,
): Promise<void> {
  const existing = await repository.findProjectById(projectId);

  if (!existing) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }

  if (existing.ownerId !== ownerId) {
    throw new AppError('PROJECT_002', 'Forbidden', 403);
  }

  await repository.deleteProject(projectId);
}

/**
 * Imports an existing FlowData payload as a new project.
 */
export async function importProject(
  ownerId: string,
  payload: ImportProjectRequest,
): Promise<ProjectDetail> {
  const title = payload.title ?? 'Imported Project';
  const project = await repository.createProject(ownerId, {
    title,
    description: null,
    data: payload.data,
  });

  return toProjectDetail(project);
}
