/**
 * PreviewOverlay - full-screen in-editor preview player.
 *
 * Supports switching between Mobile Portrait (390x844), Mobile Landscape (844x390),
 * and Desktop PC (16:9 widescreen) viewports for thorough multi-device testing.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { Smartphone, Monitor, RotateCw, X, Sparkles, Laptop } from 'lucide-react';
import { PlayerShell } from '@/components/player/PlayerShell';
import { buildCurrentFlowData } from '@/hooks/useAutoSave';
import { useEditorStore } from '@/stores/editorStore';
import { useT } from '@/i18n/useT';
import type { FlowData } from '@/types/flow';
import { cn } from '@/lib/utils';

export type DeviceViewportMode = 'mobile-portrait' | 'mobile-landscape' | 'desktop';

/** Props for PreviewOverlay. */
export interface PreviewOverlayProps {
  /** Called when the user exits the preview. */
  onExit: () => void;
}

function PreviewOverlayImpl({ onExit }: PreviewOverlayProps) {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  const [deviceMode, setDeviceMode] = useState<DeviceViewportMode>('mobile-portrait');

  // Snapshot the flow once on mount so preview isn't disrupted by background edits.
  const [flowData, setFlowData] = useState<FlowData>(() => buildCurrentFlowData());

  // If the snapshot was initialized empty, but the canvas now has nodes, update it.
  useEffect(() => {
    if (flowData.nodes.length === 0 && nodes.length > 0) {
      setFlowData(buildCurrentFlowData());
    }
  }, [nodes, flowData.nodes.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none">
      {/* Title bar */}
      <header className="flex h-13 flex-shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
            <Sparkles size={16} className="text-cyan-400" />
            <span>{t('preview.title')}</span>
          </div>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-400">
            {flowData.meta?.title || '未命名工程'}
          </span>
        </div>

        {/* Device Switcher Controls */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => setDeviceMode('mobile-portrait')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all',
              deviceMode === 'mobile-portrait'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200',
            )}
            data-testid="device-mobile-portrait"
            title="切换至移动端竖屏 (390 x 844)"
          >
            <Smartphone size={14} />
            <span>移动端 (竖屏)</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceMode('mobile-landscape')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all',
              deviceMode === 'mobile-landscape'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200',
            )}
            data-testid="device-mobile-landscape"
            title="切换至移动端横屏 (844 x 390)"
          >
            <Smartphone size={14} className="rotate-90" />
            <span>移动端 (横屏)</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceMode('desktop')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all',
              deviceMode === 'desktop'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200',
            )}
            data-testid="device-desktop"
            title="切换至电脑端 16:9 宽屏"
          >
            <Monitor size={14} />
            <span>电脑端 (16:9)</span>
          </button>
        </div>

        {/* Exit Button */}
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-all shadow"
        >
          <X size={14} />
          <span>{t('preview.exit')}</span>
        </button>
      </header>

      {/* Stage Container */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 overflow-hidden">
        {nodes.length === 0 ? (
          <p className="text-sm text-slate-400">{t('preview.empty')}</p>
        ) : deviceMode === 'mobile-portrait' ? (
          /* Mobile Portrait Shell with Phone Frame */
          <div
            data-testid="stage-shell-mobile-portrait"
            style={{ width: '100%', maxWidth: '390px', maxHeight: '844px', height: '100%' }}
            className="relative flex flex-col items-center justify-center rounded-[40px] border-[10px] border-slate-900 bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-slate-800 overflow-hidden"
          >
            {/* Dynamic Island / Notch */}
            <div className="absolute top-2 z-40 h-4 w-24 rounded-full bg-slate-900/90 shadow-inner" />
            <div className="h-full w-full overflow-hidden">
              <PlayerShell flowData={flowData} />
            </div>
            {/* Home Indicator */}
            <div className="absolute bottom-1 z-40 h-1 w-28 rounded-full bg-white/20 pointer-events-none" />
          </div>
        ) : deviceMode === 'mobile-landscape' ? (
          /* Mobile Landscape Shell */
          <div
            data-testid="stage-shell-mobile-landscape"
            style={{ width: '100%', maxWidth: '844px', maxHeight: '420px', height: '100%' }}
            className="relative flex flex-col items-center justify-center rounded-[32px] border-[8px] border-slate-900 bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-slate-800 overflow-hidden"
          >
            <div className="h-full w-full overflow-hidden">
              <PlayerShell flowData={flowData} />
            </div>
          </div>
        ) : (
          /* Desktop Cinema Widescreen Shell (16:9) */
          <div
            data-testid="stage-shell-desktop"
            style={{ width: '94%', maxWidth: '1280px', maxHeight: '85vh', aspectRatio: '16/9' }}
            className="relative flex flex-col rounded-2xl border border-slate-800 bg-black shadow-[0_0_60px_rgba(0,0,0,0.9)] ring-1 ring-cyan-500/20 overflow-hidden"
          >
            <div className="h-full w-full overflow-hidden">
              <PlayerShell flowData={flowData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const PreviewOverlay = memo(PreviewOverlayImpl);
