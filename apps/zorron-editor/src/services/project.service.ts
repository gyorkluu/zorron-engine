/**
 * Project service: CRUD, import, export via the backend Project API.
 */

import { http } from './api';
import type { PaginatedResponse } from '@/types/asset';
import type {
  CreateProjectPayload,
  ImportProjectPayload,
  ListProjectsQuery,
  ProjectDetail,
  ProjectListItem,
  UpdateProjectPayload,
} from '@/types/project';

/** List projects with pagination, keyword and sort options. */
export function listProjects(
  query: ListProjectsQuery = {},
): Promise<PaginatedResponse<ProjectListItem>> {
  return http.get<PaginatedResponse<ProjectListItem>>('/api/projects', {
    params: query,
  });
}

/** Create a new project. */
export function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectDetail> {
  return http.post<ProjectDetail>('/api/projects', payload);
}

/** Fetch a project by id. */
export function getProject(id: string): Promise<ProjectDetail> {
  return http.get<ProjectDetail>(`/api/projects/${id}`);
}

/** Update a project (partial). */
export function updateProject(
  id: string,
  payload: UpdateProjectPayload,
): Promise<ProjectDetail> {
  return http.patch<ProjectDetail>(`/api/projects/${id}`, payload);
}

/** Delete a project. */
export function deleteProject(id: string): Promise<void> {
  return http.delete<void>(`/api/projects/${id}`);
}

/** Export a project as JSON (server returns the full ProjectDetail). */
export function exportProject(id: string): Promise<ProjectDetail> {
  return http.get<ProjectDetail>(`/api/projects/${id}/export`);
}

/** Import a project from a FlowData payload. */
export function importProject(
  payload: ImportProjectPayload,
): Promise<ProjectDetail> {
  return http.post<ProjectDetail>('/api/projects/import', payload);
}
