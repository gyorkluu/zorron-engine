/**
 * Project type definitions, mirroring the backend ProjectDetailSchema.
 */

import type { FlowData } from './flow';

/** Project list item (without full flow data). */
export interface ProjectListItem {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full project detail including flow data. */
export interface ProjectDetail {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  data: FlowData;
  createdAt: string;
  updatedAt: string;
}

/** Query parameters for listing projects. */
export interface ListProjectsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/** Payload for creating a project. */
export interface CreateProjectPayload {
  title: string;
  description?: string;
  data?: FlowData;
}

/** Payload for updating a project. */
export interface UpdateProjectPayload {
  title?: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublished?: boolean;
  data?: FlowData;
}

/** Payload for importing a project. */
export interface ImportProjectPayload {
  title?: string;
  data: FlowData;
}
