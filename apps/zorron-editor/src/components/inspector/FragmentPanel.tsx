/**
 * FragmentPanel - P2-2 fragment system visualization panel.
 *
 * Scans every scene node's choices for `dropFragmentId` values and every
 * logic node's `targetFragmentId` to build a derived index of fragment ids
 * with their source (drop) and check (logic) nodes. Clicking a fragment
 * selects its first source node on the canvas for quick navigation.
 */

import { memo, useMemo, useCallback } from 'react';
import { useT } from '@/i18n/useT';
import { useEditorStore } from '@/stores/editorStore';
import type { FlowNode, SceneNodeData, LogicNodeData } from '@/types/flow';
import { cn } from '@/lib/utils';

/** Props for the FragmentPanel. */
export interface FragmentPanelProps {
  /** Optional class name. */
  className?: string;
}

/** A derived fragment entry: id + referencing node ids. */
interface FragmentEntry {
  /** The fragment id (from `dropFragmentId` or `targetFragmentId`). */
  id: string;
  /** Scene node ids that drop this fragment via a choice. */
  sourceNodeIds: string[];
  /** Logic node ids that check for this fragment. */
  checkNodeIds: string[];
}

/**
 * Walk the canvas nodes and build a fragment index.
 *
 * @param nodes - The current canvas nodes.
 * @returns Fragment entries keyed by fragment id (sorted by id).
 */
function buildFragmentIndex(nodes: FlowNode[]): FragmentEntry[] {
  const map = new Map<string, FragmentEntry>();

  const ensure = (id: string): FragmentEntry => {
    let entry = map.get(id);
    if (!entry) {
      entry = { id, sourceNodeIds: [], checkNodeIds: [] };
      map.set(id, entry);
    }
    return entry;
  };

  for (const node of nodes) {
    if (node.type === 'scene') {
      const data = node.data as SceneNodeData;
      const choices = data.choices ?? [];
      const droppedIds = new Set<string>();
      for (const choice of choices) {
        if (choice.dropFragmentId) droppedIds.add(choice.dropFragmentId);
      }
      for (const fragId of droppedIds) {
        ensure(fragId).sourceNodeIds.push(node.id);
      }
    } else if (node.type === 'logic') {
      const data = node.data as LogicNodeData;
      if (data.targetFragmentId) {
        ensure(data.targetFragmentId).checkNodeIds.push(node.id);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function FragmentPanelImpl({ className }: FragmentPanelProps) {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  const selectNode = useEditorStore((s) => s.selectNode);

  const fragments = useMemo(() => buildFragmentIndex(nodes), [nodes]);

  /** Select the first source node (or first check node) for a fragment. */
  const handleSelect = useCallback(
    (entry: FragmentEntry) => {
      const targetId = entry.sourceNodeIds[0] ?? entry.checkNodeIds[0];
      if (targetId) selectNode(targetId);
    },
    [selectNode],
  );

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm',
        className,
      )}
      data-testid="fragment-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t('frag.title')}
          </h3>
          <span className="text-[10px] text-slate-500">{t('frag.tip')}</span>
        </div>
        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-200">
          {t('frag.count', { n: fragments.length })}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {fragments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
            {t('frag.empty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {fragments.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(entry)}
                  className="w-full rounded-lg border border-slate-700/60 bg-slate-900/40 p-2 text-left transition-colors hover:border-violet-500/40 hover:bg-slate-900/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-violet-200">
                      {entry.id}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-slate-500">
                      {t('history.nodes', { n: entry.sourceNodeIds.length + entry.checkNodeIds.length })}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-200">
                      {t('frag.sources')}: {entry.sourceNodeIds.length}
                    </span>
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-200">
                      {t('frag.checks')}: {entry.checkNodeIds.length}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const FragmentPanel = memo(FragmentPanelImpl);
