/**
 * CloudProjectList - dashboard page listing all cloud projects.
 *
 * Fetches the project list from the backend on mount, supports keyword
 * search and pagination. Each row has "Open" (navigate to editor) and
 * "Delete" actions. Also shows a "New Project" button.
 *
 * Feature-flagged: only rendered when `VITE_FEATURE_CLOUD_SYNC` is enabled.
 * When the user is not authenticated, shows a sign-in prompt instead.
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { featureFlags } from '@/lib/featureFlags';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { cn } from '@/lib/utils';
import type { ListProjectsQuery } from '@/types/project';

/** Props for the CloudProjectList. */
export interface CloudProjectListProps {
  className?: string;
}

function CloudProjectListImpl({ className }: CloudProjectListProps) {
  const navigate = useNavigate();
  const list = useProjectStore((s) => s.list);
  const listLoading = useProjectStore((s) => s.listLoading);
  const fetchList = useProjectStore((s) => s.fetchList);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const createProject = useProjectStore((s) => s.createProject);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mode = useWorkspaceStore((s) => s.mode);

  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const loadList = useCallback(() => {
    const query: ListProjectsQuery = { page, pageSize: 20 };
    if (keyword.trim()) query.keyword = keyword.trim();
    void fetchList(query);
  }, [fetchList, keyword, page]);

  useEffect(() => {
    if (featureFlags.cloudSync && isAuthenticated && mode === 'cloud') {
      loadList();
    }
  }, [loadList, isAuthenticated, mode]);

  const handleOpen = useCallback(
    (id: string) => {
      navigate(`/projects/${id}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this project? This cannot be undone.')) return;
      try {
        await deleteProject(id);
      } catch {
        // Error is surfaced via the project store.
      }
    },
    [deleteProject],
  );

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const detail = await createProject('Untitled Project');
      navigate(`/projects/${detail.id}`);
    } catch {
      // Error is surfaced via the project store.
    } finally {
      setCreating(false);
    }
  }, [createProject, navigate]);

  const handleSearch = useCallback(() => {
    setPage(1);
    loadList();
  }, [loadList]);

  // Feature flag off: render nothing.
  if (!featureFlags.cloudSync) return null;

  // Not authenticated: show sign-in prompt.
  if (!isAuthenticated) {
    return (
      <div
        className={cn('flex min-h-screen items-center justify-center bg-slate-950', className)}
        data-testid="cloud-list-unauth"
      >
        <div className="max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-slate-100">Sign in required</h1>
          <p className="mb-4 text-sm text-slate-400">
            Cloud projects are only available after signing in. Switch to local mode to work
            without an account.
          </p>
          <div className="flex justify-center">
            <WorkspaceSwitcher />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('min-h-screen bg-slate-950 text-slate-100', className)}
      data-testid="cloud-project-list"
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h1 className="text-lg font-bold tracking-tight text-cyan-300">Cloud Projects</h1>
        <div className="flex items-center gap-3">
          <WorkspaceSwitcher />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="rounded-lg border border-cyan-600/50 bg-cyan-600/20 px-4 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-600/30 disabled:opacity-50"
            data-testid="new-project-button"
          >
            {creating ? 'Creating...' : 'New Project'}
          </button>
        </div>
      </header>

      {/* Search bar */}
      <div className="flex gap-2 border-b border-slate-800/60 px-6 py-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          placeholder="Search projects..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-500/60"
          data-testid="project-search-input"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          Search
        </button>
      </div>

      {/* Project list */}
      <div className="px-6 py-4">
        {listLoading && list.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500" data-testid="list-loading">
            Loading projects...
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500" data-testid="list-empty">
            No projects yet. Click "New Project" to create one.
          </div>
        ) : (
          <ul className="space-y-2" data-testid="project-list-items">
            {list.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 hover:border-slate-700"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-100">
                      {project.title}
                    </span>
                    {project.isPublished && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                        Published
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {project.description ?? 'No description'}
                    {' — Updated '}
                    {new Date(project.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpen(project.id)}
                    className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    data-testid={`open-project-${project.id}`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(project.id)}
                    className="rounded-md border border-rose-700/50 bg-rose-900/30 px-3 py-1 text-xs text-rose-200 hover:bg-rose-900/50"
                    data-testid={`delete-project-${project.id}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {list.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-700 px-3 py-1 disabled:opacity-30"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-700 px-3 py-1"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const CloudProjectList = memo(CloudProjectListImpl);
