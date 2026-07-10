/**
 * CloudProjectList - dashboard page listing all cloud projects.
 *
 * Professional dashboard design with:
 * - Branded header with navigation
 * - Welcome banner & statistics cards
 * - Search & filter bar
 * - Beautiful project card grid with gradient covers
 * - Elegant empty & loading states
 * - Smooth interactions & hover effects
 *
 * Feature-flagged: only rendered when `VITE_FEATURE_CLOUD_SYNC` is enabled.
 * When the user is not authenticated, shows a sign-in prompt instead.
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  FolderOpen,
  Trash2,
  Loader2,
  CloudOff,
  FileText,
  Calendar,
  Share2,
  MoreHorizontal,
  Sparkles,
  Clock,
  CheckCircle2,
  LayoutGrid,
  ArrowRight,
  LogIn,
  Users,
  HardDrive,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { featureFlags } from '@/lib/featureFlags';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { EmptyStateIllustration } from '@/components/brand/EmptyStateIllustration';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';
import type { ListProjectsQuery, ProjectDetail } from '@/types/project';

/** Props for the CloudProjectList. */
export interface CloudProjectListProps {
  className?: string;
}

/** Generate a deterministic gradient from project ID/title for card covers. */
function getProjectGradient(seed: string): { from: string; via: string; to: string } {
  const palettes = [
    { from: '#06b6d4', via: '#3b82f6', to: '#8b5cf6' },
    { from: '#8b5cf6', via: '#ec4899', to: '#f97316' },
    { from: '#10b981', via: '#06b6d4', to: '#3b82f6' },
    { from: '#f59e0b', via: '#ef4444', to: '#ec4899' },
    { from: '#6366f1', via: '#8b5cf6', to: '#a855f7' },
    { from: '#14b8a6', via: '#22c55e', to: '#84cc16' },
    { from: '#f43f5e', via: '#ec4899', to: '#d946ef' },
    { from: '#0ea5e9', via: '#06b6d4', to: '#14b8a6' },
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
}

/** Format relative time. */
function formatRelativeTime(dateStr: string, t: ReturnType<typeof useT>['t']): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString();
}

/** Project card component. */
const ProjectCard = memo(function ProjectCard({
  project,
  onOpen,
  onDelete,
  t,
}: {
  project: ProjectDetail;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useT>['t'];
}) {
  const gradient = useMemo(() => getProjectGradient(project.id + project.title), [project.id, project.title]);
  const [menuOpen, setMenuOpen] = useState(false);

  const nodeCount = project.data?.nodes?.length ?? 0;
  const edgeCount = project.data?.edges?.length ?? 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-2xl hover:shadow-cyan-500/5">
      {/* Gradient cover */}
      <div className="relative h-32 overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.via}, ${gradient.to})`,
          }}
        />
        {/* Decorative pattern overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 50%),
                              radial-gradient(circle at 70% 80%, rgba(255,255,255,0.15) 0%, transparent 40%)`,
          }}
        />
        {/* Glow effect */}
        <div
          className="absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full blur-2xl opacity-40"
          style={{ background: gradient.to }}
        />
        {/* Project icon */}
        <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
          <FileText size={20} className="text-white" />
        </div>
        {/* Published badge */}
        {project.isPublished && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30 backdrop-blur-sm">
            <CheckCircle2 size={10} />
            {t('cloud.published')}
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4">
        <h3 className="mb-1 truncate text-base font-semibold text-slate-100 transition-colors group-hover:text-white">
          {project.title}
        </h3>
        <p className="mb-3 line-clamp-2 text-sm text-slate-400">
          {project.description ?? t('cloud.noDesc')}
        </p>

        {/* Meta info */}
        <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatRelativeTime(project.updatedAt, t)}
          </span>
          <span className="text-slate-700">·</span>
          <span>{nodeCount} 节点</span>
          {edgeCount > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span>{edgeCount} 连接</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(project.id)}
            className="group/btn flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 px-3 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-500/30 transition-all duration-200 hover:from-cyan-500/30 hover:to-indigo-500/30 hover:text-cyan-100 hover:ring-cyan-400/50"
            data-testid={`open-project-${project.id}`}
          >
            <FolderOpen size={14} className="transition-transform group-hover/btn:scale-110" />
            {t('cloud.open')}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-700/60 hover:text-slate-200"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-4 top-[180px] z-30 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(project.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10"
                  data-testid={`delete-project-${project.id}`}
                >
                  <Trash2 size={14} />
                  {t('cloud.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

function CloudProjectListImpl({ className }: CloudProjectListProps) {
  const { t } = useT();
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
      if (!confirm(t('cloud.deleteConfirm'))) return;
      try {
        await deleteProject(id);
      } catch {
        // Error is surfaced via the project store.
      }
    },
    [deleteProject, t],
  );

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const detail = await createProject(t('cloud.untitled'));
      navigate(`/projects/${detail.id}`);
    } catch {
      // Error is surfaced via the project store.
    } finally {
      setCreating(false);
    }
  }, [createProject, navigate, t]);

  const handleSearch = useCallback(() => {
    setPage(1);
    loadList();
  }, [loadList]);

  // Calculate statistics
  const stats = useMemo(() => {
    const published = list.filter((p) => p.isPublished).length;
    const recent = list.filter((p) => {
      const date = new Date(p.updatedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date > weekAgo;
    }).length;
    return { total: list.length, published, recent };
  }, [list]);

  // Feature flag off: render nothing.
  if (!featureFlags.cloudSync) return null;

  // Not authenticated: show sign-in prompt.
  if (!isAuthenticated) {
    return (
      <div
        className={cn('flex min-h-screen items-center justify-center bg-slate-950', className)}
        data-testid="cloud-list-unauth"
      >
        {/* Background decoration */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-md rounded-2xl border border-slate-800/60 bg-slate-900/60 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-cyan-500/30">
            <CloudOff size={32} className="text-cyan-300" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-100">{t('cloud.signinTitle')}</h1>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            {t('cloud.signinDesc')}
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
      className={cn('relative min-h-screen bg-slate-950 text-slate-100', className)}
      data-testid="cloud-project-list"
    >
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -right-40 top-60 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <BrandLogo size={32} />
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <h1 className="text-sm font-semibold text-slate-200">{t('cloud.title')}</h1>
                <p className="text-xs text-slate-500">管理您的所有互动叙事项目</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher />
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/30 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                data-testid="new-project-button"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} className="transition-transform group-hover:rotate-90" />
                )}
                {creating ? t('cloud.creating') : t('cloud.new')}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Welcome banner + Stats */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <span className="text-xs font-medium uppercase tracking-wider text-amber-300">
                    欢迎回来
                  </span>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-slate-100">
                  开始创作您的互动故事
                </h2>
                <p className="text-sm text-slate-400">
                  创建分支剧情、设计角色人格、模拟玩家选择，打造沉浸式互动叙事体验。
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4">
                  <div className="mb-1 flex items-center gap-2">
                    <HardDrive size={14} className="text-cyan-400" />
                    <span className="text-xs text-cyan-300">总项目</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">{stats.total}</div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Share2 size={14} className="text-emerald-400" />
                    <span className="text-xs text-emerald-300">已发布</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-200">{stats.published}</div>
                </div>
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Calendar size={14} className="text-violet-400" />
                    <span className="text-xs text-violet-300">本周活跃</span>
                  </div>
                  <div className="text-2xl font-bold text-violet-200">{stats.recent}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder={t('cloud.search')}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2.5 pl-11 pr-4 text-sm text-slate-100 outline-none ring-0 transition-all placeholder:text-slate-500 focus:border-cyan-500/40 focus:bg-slate-900 focus:ring-2 focus:ring-cyan-500/20"
                data-testid="project-search-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <LayoutGrid size={14} />
                {t('cloud.searchBtn')}
              </button>
            </div>
          </div>

          {/* Project grid / states */}
          {listLoading && list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" data-testid="list-loading">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-cyan-500/30">
                <Loader2 size={28} className="animate-spin text-cyan-400" />
              </div>
              <p className="text-sm text-slate-400">{t('cloud.loading')}</p>
            </div>
          ) : list.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/60 bg-gradient-to-b from-slate-900/20 to-transparent py-16 text-center"
              data-testid="list-empty"
            >
              <div className="mb-6 w-full max-w-xs">
                <EmptyStateIllustration
                  illustration="empty-projects"
                  alt="No projects"
                  aspectRatio="square"
                  className="mx-auto opacity-80"
                />
              </div>
              <h3 className="mb-2 bg-gradient-to-r from-cyan-200 to-indigo-200 bg-clip-text text-xl font-bold text-transparent">
                {keyword ? '没有找到匹配的项目' : '开始你的第一个项目'}
              </h3>
              <p className="mb-8 max-w-sm text-sm text-slate-500">
                {keyword ? '试试其他关键词，或创建一个新项目开始创作。' : t('cloud.empty')}
              </p>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/30 active:scale-[0.98]"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} className="transition-transform group-hover:rotate-90" />
                )}
                {creating ? t('cloud.creating') : t('cloud.new')}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="project-list-items">
                {list.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    t={t}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-between">
                <span className="text-sm text-slate-500">{t('cloud.page', { n: page })}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800/40"
                  >
                    {t('cloud.prev')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  >
                    {t('cloud.next')}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export const CloudProjectList = memo(CloudProjectListImpl);
