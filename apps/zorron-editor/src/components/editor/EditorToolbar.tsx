/**
 * EditorToolbar - top bar showing project title, save status and actions.
 *
 * Actions: Save (manual), Export JSON, Import JSON, New Project.
 * Save status is reflected as a colored badge (saved / saving / unsaved / error).
 */

import { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Download, Upload, FolderOpen, Languages, Sparkles, Swords, Clapperboard, Check, Loader2, AlertCircle, LogIn, LogOut, User, type LucideIcon } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useAuthStore } from '@/stores/authStore';
import { useAIStore } from '@/stores/aiStore';
import { buildCurrentFlowData } from '@/hooks/useAutoSave';
import { exportProjectJson, pickJsonFile } from '@/utils/fileIO';
import { SyncStatusIndicator } from '@/components/cloud/SyncStatusIndicator';
import { LayoutTools } from './LayoutTools';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { AuthModal } from '@/components/auth/AuthModal';
import { featureFlags } from '@/lib/featureFlags';
import { sampleFlowData, sampleProjectMeta } from '@/data/sampleProject';
import { buildJx3CardFlowData } from '@/data/jx3CardFlowData';
import { fullDemoFlowData, fullDemoProjectMeta } from '@/data/fullDemoProject';
import { useT } from '@/i18n/useT';
import { useLocaleStore } from '@/i18n/localeStore';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { ProjectDetail } from '@/types/project';
import type { FlowData } from '@/types/flow';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: LucideIcon }> = {
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
  icon: LucideIcon;
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
  // Drives the align/distribute affordances in the toolbar.
  const selectedCount = useEditorStore(
    (s) => s.nodes.filter((n) => n.selected).length,
  );
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  // 加载 JX3 社交名片工程：每次构建独立实例，避免跨实例状态污染
  const handleLoadJx3 = useCallback(() => {
    const jx3Flow = buildJx3CardFlowData();
    useProjectStore.getState().reset();
    useProjectStore.setState({
      title: jx3Flow.settings?.title ?? '剑网3游戏社交名片',
      description: jx3Flow.settings?.description ?? '',
      variables: jx3Flow.variables,
      settings: jx3Flow.settings,
      version: jx3Flow.version,
      lastSavedSnapshot: jx3Flow,
      lastSavedAt: new Date().toISOString(),
      saveStatus: 'saved',
    });
    loadFlow(jx3Flow.nodes, jx3Flow.edges);
  }, [loadFlow]);

  // 加载全节点互动影游综合 Demo
  const handleLoadFullDemo = useCallback(() => {
    useProjectStore.getState().reset();
    useProjectStore.setState({
      title: fullDemoProjectMeta.title,
      description: fullDemoProjectMeta.description,
      variables: {},
      settings: {},
      version: fullDemoProjectMeta.version,
      lastSavedSnapshot: fullDemoFlowData,
      lastSavedAt: new Date().toISOString(),
      saveStatus: 'saved',
    });
    loadFlow(fullDemoFlowData.nodes, fullDemoFlowData.edges);
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
        <LayoutTools selectedCount={selectedCount} />
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
          onClick={handleLoadFullDemo}
          icon={Clapperboard}
          label="全节点Demo"
          variant="accent"
          title="加载《风起稻香》AI 互动影游全节点演示工程"
        />
        <ToolbarButton
          onClick={handleLoadSample}
          icon={Sparkles}
          label={t('toolbar.sample')}
          variant="accent"
          title={t('toolbar.sample.tip')}
        />
        <ToolbarButton
          onClick={handleLoadJx3}
          icon={Swords}
          label={t('toolbar.jx3')}
          variant="accent"
          title={t('toolbar.jx3.tip')}
        />
        <ToolbarButton onClick={handleImport} icon={Upload} label={t('toolbar.import')} />
        <ToolbarButton onClick={handleExport} icon={Download} label={t('toolbar.export')} />
        <ToolbarButton onClick={handleSave} icon={Save} label={t('toolbar.save')} variant="primary" />

        {/* User Auth Profile / Login Button */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300">
            <User size={12} className="text-cyan-400" />
            <span className="max-w-[80px] truncate font-medium text-[11px]">
              {user?.nickname || user?.email || '已登录'}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
              title="退出登录"
              data-testid="toolbar-logout-btn"
            >
              <LogOut size={11} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-150 active:scale-95"
            data-testid="toolbar-login-btn"
            title="登录云端账号"
          >
            <LogIn size={13} />
            <span>登录</span>
          </button>
        )}

        {/* AI Copilot Panel Toggle */}
        <button
          type="button"
          onClick={() => useAIStore.getState().togglePanel()}
          className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-600/30 hover:border-purple-400 shadow-lg shadow-purple-500/10 transition-all duration-150 active:scale-95"
          title="打开/关闭 AI Copilot 对话助手"
        >
          <Sparkles size={13} className="text-purple-300 animate-pulse" />
          <span>AI 助手</span>
        </button>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
}

export const EditorToolbar = memo(EditorToolbarImpl);
