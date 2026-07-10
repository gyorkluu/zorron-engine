/**
 * EditorToolbar - top bar showing project title, save status and actions.
 *
 * Actions: Save (manual), Export JSON, Import JSON, New Project.
 * Save status is reflected as a colored badge (saved / saving / unsaved / error).
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Download, Upload, FolderOpen, Languages, Sparkles, Eye, Check, Loader2, AlertCircle } from 'lucide-react';
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
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { ProjectDetail } from '@/types/project';
import type { FlowData } from '@/types/flow';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Check }> = {
  saved: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', icon: Check },
  saving: { bg: 'bg-amber-500/15', text: 'text-amber-300', icon: Loader2 },
  unsaved: { bg: 'bg-slate-500/15', text: 'text-slate-300', icon: AlertCircle },
  error: { bg: 'bg-rose-500/15', text: 'text-rose-300', icon: AlertCircle },
};

export interface EditorToolbarProps {
  className?: string;
}

function ToolbarButton({
  onClick,
  icon: Icon,
  label,
  variant = 'default',
  title,
}: {
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label?: string;
  variant?: 'default' | 'primary' | 'accent';
  title?: string;
}) {
  const styles = {
    default: 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 hover:border-slate-600/60',
    primary: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 hover:border-cyan-400/50 hover:text-cyan-100 shadow-lg shadow-cyan-500/5',
    accent: 'border-violet-500/40 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25 hover:border-violet-400/50 hover:text-violet-100',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97]',
        styles[variant],
      )}
      title={title}
    >
      <Icon size={13} className={variant === 'primary' ? 'animate-pulse' : ''} />
      {label && <span>{label}</span>}
    </button>
  );
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

  const StatusIcon = STATUS_STYLES[saveStatus]?.icon ?? AlertCircle;

  return (
    <header
      className={cn(
        'flex h-12 items-center justify-between gap-3 border-b border-slate-800/50 bg-gradient-to-b from-slate-900/95 to-slate-950/95 px-4 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo size={26} />
        <div className="h-5 w-px bg-slate-700/50" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('toolbar.untitled')}
          className="min-w-0 flex-1 max-w-[200px] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-100 outline-none transition-colors hover:border-slate-700/50 focus:border-cyan-500/40 focus:bg-slate-800/50"
        />
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {featureFlags.cloudSync && <SyncStatusIndicator />}

        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            STATUS_STYLES[saveStatus]?.bg,
            STATUS_STYLES[saveStatus]?.text,
            saveStatus === 'saving' && '[&>svg]:animate-spin',
          )}
          data-testid="save-status"
        >
          <StatusIcon size={10} />
          {statusLabel[saveStatus] ?? saveStatus}
        </span>

        {featureFlags.cloudSync && <WorkspaceSwitcher />}

        {featureFlags.cloudSync && (
          <ToolbarButton
            onClick={() => navigate('/projects')}
            icon={FolderOpen}
            label={t('toolbar.projects')}
            title={t('toolbar.projects.tip')}
          />
        )}

        <ToolbarButton
          onClick={toggleLocale}
          icon={Languages}
          label={locale === 'zh' ? '中/EN' : 'EN/中'}
          title={t('toolbar.lang.tip')}
        />

        <ToolbarButton
          onClick={handleLoadSample}
          icon={Sparkles}
          label={t('toolbar.sample')}
          variant="accent"
          title={t('toolbar.sample.tip')}
        />
        <ToolbarButton onClick={handleImport} icon={Upload} label={t('toolbar.import')} />
        <ToolbarButton onClick={handleExport} icon={Download} label={t('toolbar.export')} />
        <ToolbarButton onClick={handleSave} icon={Save} label={t('toolbar.save')} variant="primary" />
      </div>
    </header>
  );
}

export const EditorToolbar = memo(EditorToolbarImpl);
