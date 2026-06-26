/**
 * EditorToolbar - top bar showing project title, save status and actions.
 *
 * Actions: Save (manual), Export JSON, Import JSON, New Project.
 * Save status is reflected as a colored badge (saved / saving / unsaved / error).
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { buildCurrentFlowData } from '@/hooks/useAutoSave';
import { exportProjectJson, pickJsonFile } from '@/utils/fileIO';
import { SyncStatusIndicator } from '@/components/cloud/SyncStatusIndicator';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { featureFlags } from '@/lib/featureFlags';
import { sampleFlowData, sampleProjectMeta } from '@/data/sampleProject';
import { useT } from '@/i18n/useT';
import { useLocaleStore } from '@/i18n/localeStore';
import type { ProjectDetail } from '@/types/project';
import type { FlowData } from '@/types/flow';
import { cn } from '@/lib/utils';

/** Status badge color mapping. */
const STATUS_STYLES: Record<string, string> = {
  saved: 'bg-emerald-500/20 text-emerald-300',
  saving: 'bg-amber-500/20 text-amber-300',
  unsaved: 'bg-slate-500/20 text-slate-300',
  error: 'bg-rose-500/20 text-rose-300',
};

/** Props for the EditorToolbar. */
export interface EditorToolbarProps {
  className?: string;
}

function EditorToolbarImpl({ className }: EditorToolbarProps) {
  const { t } = useT();
  const toggleLocale = useLocaleStore((s) => s.toggle);
  const locale = useLocaleStore((s) => s.locale);
  const navigate = useNavigate();
  const title = useProjectStore((s) => s.title);
  const saveStatus = useProjectStore((s) => s.saveStatus);
  const id = useProjectStore((s) => s.id);
  const save = useProjectStore((s) => s.save);
  const importProject = useProjectStore((s) => s.importProject);
  const setTitle = useProjectStore((s) => s.setTitle);
  const loadFlow = useEditorStore((s) => s.loadFlow);

  const handleSave = useCallback(() => {
    void save(buildCurrentFlowData());
  }, [save]);

  const handleExport = useCallback(() => {
    // Build a ProjectDetail-like payload from the current state.
    const flowData = buildCurrentFlowData();
    const project: ProjectDetail = {
      id: id ?? 'local',
      title,
      description: null,
      coverUrl: null,
      isPublished: false,
      data: flowData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    exportProjectJson(project);
  }, [id, title]);

  const handleImport = useCallback(async () => {
    const parsed = await pickJsonFile<{ data?: FlowData; title?: string } | FlowData>();
    if (!parsed) return;
    // Accept both { data, title } and a bare FlowData payload.
    const flowData: FlowData =
      parsed && typeof parsed === 'object' && 'data' in parsed && parsed.data
        ? (parsed as { data: FlowData }).data
        : (parsed as FlowData);
    const flowTitle =
      parsed && typeof parsed === 'object' && 'title' in parsed
        ? (parsed as { title?: string }).title
        : undefined;
    try {
      const detail = await importProject(flowData, flowTitle ?? title);
      loadFlow(detail.data.nodes ?? [], detail.data.edges ?? []);
    } catch {
      // Error surfaced via projectStore.error.
    }
  }, [importProject, loadFlow, title]);

  /** Load the built-in sample project into the editor (local mode). */
  const handleLoadSample = useCallback(() => {
    useProjectStore.getState().reset();
    useProjectStore.setState({
      title: sampleProjectMeta.title,
      description: sampleProjectMeta.description,
      variables: sampleFlowData.variables,
      settings: sampleFlowData.settings,
      version: sampleFlowData.version,
      lastSavedSnapshot: sampleFlowData,
      lastSavedAt: new Date().toISOString(),
      saveStatus: 'saved',
    });
    loadFlow(sampleFlowData.nodes, sampleFlowData.edges);
  }, [loadFlow]);

  const statusLabel: Record<string, string> = {
    saved: t('toolbar.save.saved'),
    saving: t('toolbar.save.saving'),
    unsaved: t('toolbar.save.unsaved'),
    error: t('toolbar.save.error'),
  };

  return (
    <header
      className={cn(
        'flex h-12 items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/60 px-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex-shrink-0 text-sm font-bold tracking-tight text-cyan-300">
          {t('brand.name')}
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('toolbar.untitled')}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-100 outline-none hover:border-slate-700 focus:border-cyan-500/60 focus:bg-slate-900/60"
        />
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Cloud sync status indicator (feature-flagged). */}
        {featureFlags.cloudSync && <SyncStatusIndicator />}

        {/* Save status badge. */}
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            STATUS_STYLES[saveStatus] ?? STATUS_STYLES.unsaved,
          )}
          data-testid="save-status"
        >
          {statusLabel[saveStatus] ?? saveStatus}
        </span>

        {/* Workspace mode switcher (feature-flagged). */}
        {featureFlags.cloudSync && <WorkspaceSwitcher />}

        {featureFlags.cloudSync && (
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
            title={t('toolbar.projects.tip')}
          >
            {t('toolbar.projects')}
          </button>
        )}

        {/* Language toggle. */}
        <button
          type="button"
          onClick={toggleLocale}
          className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
          title={t('toolbar.lang.tip')}
        >
          {locale === 'zh' ? '中 / EN' : 'EN / 中'}
        </button>

        <button
          type="button"
          onClick={handleLoadSample}
          className="rounded-md border border-violet-600/50 bg-violet-600/20 px-2.5 py-1 text-xs font-medium text-violet-100 hover:bg-violet-600/30"
          title={t('toolbar.sample.tip')}
        >
          {t('toolbar.sample')}
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          {t('toolbar.import')}
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          {t('toolbar.export')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md border border-cyan-600/50 bg-cyan-600/20 px-3 py-1 text-xs font-medium text-cyan-100 hover:bg-cyan-600/30"
        >
          {t('toolbar.save')}
        </button>
      </div>
    </header>
  );
}

export const EditorToolbar = memo(EditorToolbarImpl);
