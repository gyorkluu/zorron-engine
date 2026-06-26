/**
 * NodeSearch - Ctrl+P "Go to node" command palette.
 *
 * Full-screen overlay with a search input; filters the current canvas nodes
 * by label or scene dialogue. Supports keyboard navigation (↑/↓/Enter/Esc)
 * and mouse selection. Selecting a result calls `focusNode` and closes.
 *
 * @see P1-4 in the editor roadmap.
 */

import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { useT } from '@/i18n/useT';
import { useEditorStore } from '@/stores/editorStore';
import {
  NODE_TYPE_LABEL_KEYS,
  NODE_TYPE_ACCENTS,
  type FlowNode,
  type GameNodeData,
  type SceneNodeData,
  type NodeType,
} from '@/types/flow';

/** Props for the NodeSearch overlay. */
export interface NodeSearchProps {
  /** Close the search overlay. */
  onClose: () => void;
}

/** Maximum characters shown for dialogue previews. */
const DIALOGUE_PREVIEW_MAX = 50;

/**
 * Extract the dialogue string from a node's data, if it has one.
 * Only scene nodes carry a `dialogue` field.
 */
function getDialogue(node: FlowNode): string {
  const data = node.data as GameNodeData;
  if ('dialogue' in data) {
    return (data as SceneNodeData).dialogue ?? '';
  }
  return '';
}

/** Build a truncated preview of a node's dialogue. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/** A single search result row. */
interface SearchResult {
  node: FlowNode;
  label: string;
  dialogue: string;
  type: NodeType;
}

function NodeSearchImpl({ onClose }: NodeSearchProps) {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  const focusNode = useEditorStore((s) => s.focusNode);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Autofocus the input on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset active index when the result set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  /** Filtered and ranked search results. */
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const list: SearchResult[] = nodes.map((node) => {
      const flowNode = node as FlowNode;
      const data = flowNode.data as GameNodeData;
      const label = data.label ?? flowNode.id;
      const dialogue = getDialogue(flowNode);
      return {
        node: flowNode,
        label,
        dialogue,
        type: flowNode.type as NodeType,
      };
    });
    if (!q) return list;
    return list.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.dialogue.toLowerCase().includes(q) ||
        r.node.id.toLowerCase().includes(q),
    );
  }, [nodes, query]);

  /** Jump to a result by index. */
  function jumpTo(index: number) {
    const result = results[index];
    if (!result) return;
    focusNode(result.node.id);
    onClose();
  }

  /** Keyboard handler for navigation. */
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      jumpTo(activeIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  // Scroll the active item into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const child = list.children[activeIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-32"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label={t('search.title')}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-w-lg w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('search.title')}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
            Esc
          </span>
        </div>

        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-1"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              {t('search.empty')}
            </div>
          ) : (
            results.map((r, index) => {
              const isActive = index === activeIndex;
              const accent = NODE_TYPE_ACCENTS[r.type];
              return (
                <button
                  key={r.node.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => jumpTo(index)}
                  className={[
                    'flex w-full items-start gap-3 px-4 py-2 text-left transition-colors',
                    isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50',
                  ].join(' ')}
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-100">
                        {r.label || r.node.id}
                      </span>
                      <span
                        className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: `${accent}22`, color: accent }}
                      >
                        {t(NODE_TYPE_LABEL_KEYS[r.type])}
                      </span>
                    </div>
                    {r.dialogue ? (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {truncate(r.dialogue, DIALOGUE_PREVIEW_MAX)}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-700/60 px-4 py-2 text-[11px] text-slate-500">
          <span>{t('search.hint')}</span>
          {results.length > 0 ? (
            <span>{t('search.count', { n: results.length })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const NodeSearch = memo(NodeSearchImpl);
