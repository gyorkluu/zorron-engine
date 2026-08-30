/**
 * ScriptPanel — a screenplay view of the story.
 *
 * Writers draft in text, not in boxes. This panel exports the current graph to
 * readable script, and imports pasted script back as a node graph, with a live
 * scene breakdown so the author can see what will be built before committing.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { FileText, Download, Wand2, AlertTriangle } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useT } from '@/i18n/useT';
import { nodesToScript, parseScript, scriptToGraph } from '@/lib/scriptParser';
import { cn } from '@/lib/utils';

export interface ScriptPanelProps {
  className?: string;
}

function ScriptPanelImpl({ className }: ScriptPanelProps) {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const loadFlow = useEditorStore((s) => s.loadFlow);

  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);

  /** Live breakdown of whatever is in the textarea. */
  const preview = useMemo(() => {
    if (!text.trim()) return null;
    return parseScript(text);
  }, [text]);

  const handleExport = useCallback(() => {
    setText(nodesToScript(nodes as never, edges as never));
  }, [nodes, edges]);

  const handleApply = useCallback(() => {
    if (!preview || preview.scenes.length === 0) return;
    const graph = scriptToGraph(preview);
    // Cast: the script graph produces plain node objects matching FlowNode's
    // shape; React Flow fills in the rest on load.
    loadFlow(graph.nodes as never, graph.edges as never);
    setConfirming(false);
  }, [preview, loadFlow]);

  const sceneCount = preview?.scenes.length ?? 0;
  const choiceCount =
    preview?.scenes.reduce((sum, s) => sum + s.choices.length, 0) ?? 0;
  const lineCount =
    preview?.scenes.reduce((sum, s) => sum + s.lines.length, 0) ?? 0;

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm',
        className,
      )}
      data-testid="script-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t('script.title')}
          </h3>
          <span className="text-[10px] text-slate-500">{t('script.tip')}</span>
        </div>
        <button
          type="button"
          onClick={handleExport}
          data-testid="script-export"
          className="flex items-center gap-1 rounded-md bg-slate-800/70 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <Download size={11} />
          {t('script.export')}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('script.placeholder')}
          spellCheck={false}
          data-testid="script-input"
          className="min-h-[9rem] flex-1 resize-none rounded-lg border border-slate-700/60 bg-slate-900/60 p-2.5 font-mono text-[11px] leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
        />

        {preview ? (
          <div className="flex-shrink-0 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] text-slate-400">
              <FileText size={10} />
              <span>
                {t('script.scenes')}: {sceneCount}
              </span>
              <span>·</span>
              <span>
                {t('script.lines')}: {lineCount}
              </span>
              <span>·</span>
              <span>
                {t('script.choices')}: {choiceCount}
              </span>
            </div>
            <ul className="max-h-32 space-y-0.5 overflow-y-auto">
              {preview.scenes.map((scene) => (
                <li key={scene.id} className="truncate text-[10px] text-slate-500">
                  <span className="font-mono text-slate-600">{scene.id}</span>{' '}
                  {scene.title ?? scene.lines[0]?.text?.slice(0, 18) ?? '—'}
                  {scene.choices.length > 0 ? (
                    <span className="ml-1 text-amber-400/70">
                      [{scene.choices.length}]
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {confirming ? (
          <div className="flex-shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] text-amber-200">
              <AlertTriangle size={10} />
              {t('script.overwriteWarning')}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleApply}
                data-testid="script-confirm"
                className="flex-1 rounded bg-amber-500/25 px-2 py-1 text-[10px] font-medium text-amber-100 transition-colors hover:bg-amber-500/35"
              >
                {t('script.confirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded bg-slate-800/70 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:bg-slate-700"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!preview || sceneCount === 0}
            onClick={() => setConfirming(true)}
            data-testid="script-apply"
            className={cn(
              'flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              preview && sceneCount > 0
                ? 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                : 'cursor-not-allowed bg-slate-900/60 text-slate-600',
            )}
          >
            <Wand2 size={12} />
            {t('script.apply')}
          </button>
        )}
      </div>
    </div>
  );
}

export const ScriptPanel = memo(ScriptPanelImpl);
