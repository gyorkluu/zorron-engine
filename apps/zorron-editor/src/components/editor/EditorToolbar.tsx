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
import type { ProjectDetail } from '@/types/project';
import type { FlowData } from '@/types/flow';
import { cn } from '@/lib/utils';

/** Status badge color mapping. */
const STATUS_STYLES: Record<string, string> = {
  saved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  saving: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  unsaved: 'bg-[hsl(28,14%,16%)] text-[hsl(35,15%,55%)] border-[hsl(28,14%,22%)]',
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

/** Props for the EditorToolbar. */
export interface EditorToolbarProps {
  className?: string;
}

function EditorToolbarImpl({ className }: EditorToolbarProps) {
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

  const statusLabel: Record<string, string> = {
    saved: '已保存',
    saving: '保存中...',
    unsaved: '未保存',
    error: '错误',
  };

  return (
    <header
      className={cn(
        'flex h-12 items-center justify-between gap-3 border-b border-[hsl(28,14%,18%)] bg-[hsl(22,16%,7%,0.6)] px-4 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display flex-shrink-0 text-base font-bold tracking-tight text-[hsl(38,92%,66%)]">
          Zorron
        </span>
        <span className="hidden text-[10px] font-medium tracking-widest text-[hsl(35,15%,40%)] sm:inline">
          叙事引擎
        </span>
        <div className="mx-1 h-4 w-px bg-[hsl(28,14%,18%)]" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="未命名项目"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-[hsl(40,30%,92%)] outline-none transition-colors hover:border-[hsl(28,14%,20%)] focus:border-[hsl(38,92%,56%,0.5)] focus:bg-[hsl(22,16%,10%,0.6)]"
        />
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {/* 云同步状态指示器（Feature Flag 控制） */}
        {featureFlags.cloudSync && <SyncStatusIndicator />}

        {/* 保存状态徽章 */}
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider',
            STATUS_STYLES[saveStatus] ?? STATUS_STYLES.unsaved,
          )}
          data-testid="save-status"
        >
          {statusLabel[saveStatus] ?? saveStatus}
        </span>

        {/* 工作区模式切换器（Feature Flag 控制） */}
        {featureFlags.cloudSync && <WorkspaceSwitcher />}

        {featureFlags.cloudSync && (
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-2.5 py-1 text-xs text-[hsl(40,30%,85%)] transition-colors hover:bg-[hsl(28,14%,14%)]"
            title="浏览云端项目"
          >
            项目
          </button>
        )}
        <button
          type="button"
          onClick={handleImport}
          className="rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-2.5 py-1 text-xs text-[hsl(40,30%,85%)] transition-colors hover:bg-[hsl(28,14%,14%)]"
        >
          导入
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-2.5 py-1 text-xs text-[hsl(40,30%,85%)] transition-colors hover:bg-[hsl(28,14%,14%)]"
        >
          导出
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg border border-[hsl(38,92%,56%,0.4)] bg-[hsl(38,92%,56%,0.12)] px-3 py-1 text-xs font-medium text-[hsl(38,92%,72%)] transition-all hover:bg-[hsl(38,92%,56%,0.2)] hover:shadow-[0_0_16px_-4px_hsl(38,92%,56%,0.4)]"
        >
          保存
        </button>
      </div>
    </header>
  );
}

export const EditorToolbar = memo(EditorToolbarImpl);
