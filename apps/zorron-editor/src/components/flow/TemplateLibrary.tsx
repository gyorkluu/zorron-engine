/**
 * TemplateLibrary (P2-3) - preset flow structures that can be inserted into the canvas.
 *
 * Each template declares a set of nodes (with relative offsets) and edges between
 * them. On insert, the template is appended to the bottom-right of the existing
 * canvas via `editorStore.addNode` / `editorStore.onConnect`.
 */

import { memo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import type { NodeType, GameNodeData } from '@/types/flow';
import type { TranslationKey } from '@/i18n/translations';
import { useT } from '@/i18n/useT';

/** Props for the TemplateLibrary. */
export interface TemplateLibraryProps {
  /** Optional extra className for the root element. */
  className?: string;
}

/** A node declared inside a template (position is relative to the insert origin). */
interface TemplateNode {
  type: NodeType;
  label: string;
  offset: { x: number; y: number };
  data?: Partial<GameNodeData>;
}

/** An edge declared inside a template, referencing node indices. */
interface TemplateEdge {
  /** Index into the template's `nodes` array (source). */
  from: number;
  /** Index into the template's `nodes` array (target). */
  to: number;
  /** Optional source handle id. */
  sourceHandle?: string;
}

/** A reusable flow template. */
interface Template {
  key: string;
  nameKey: TranslationKey;
  descKey: TranslationKey;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

/** The four built-in templates. */
const TEMPLATES: Template[] = [
  {
    key: 'start-scene',
    nameKey: 'tpl.empty.start',
    descKey: 'tpl.empty.start.desc',
    nodes: [
      { type: 'start', label: 'Start', offset: { x: 0, y: 0 } },
      { type: 'scene', label: 'Scene 1', offset: { x: 250, y: 0 } },
    ],
    edges: [{ from: 0, to: 1 }],
  },
  {
    key: 'branch',
    nameKey: 'tpl.branch',
    descKey: 'tpl.branch.desc',
    nodes: [
      { type: 'scene', label: 'Branch Scene', offset: { x: 0, y: 0 } },
      { type: 'scene', label: 'Path A', offset: { x: 300, y: -150 } },
      { type: 'scene', label: 'Path B', offset: { x: 300, y: 150 } },
    ],
    edges: [{ from: 0, to: 1 }, { from: 0, to: 2 }],
  },
  {
    key: 'loop',
    nameKey: 'tpl.loop',
    descKey: 'tpl.loop.desc',
    nodes: [
      { type: 'scene', label: 'Loop Scene', offset: { x: 0, y: 0 } },
      { type: 'logic', label: 'Check', offset: { x: 300, y: 0 } },
      { type: 'setter', label: 'Update', offset: { x: 600, y: 0 } },
    ],
    edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
  },
  {
    key: 'end',
    nameKey: 'tpl.end',
    descKey: 'tpl.end.desc',
    nodes: [
      { type: 'scene', label: 'Final Scene', offset: { x: 0, y: 0 } },
      { type: 'settlement', label: 'Ending', offset: { x: 300, y: 0 } },
    ],
    edges: [{ from: 0, to: 1 }],
  },
];

/**
 * Append a template's nodes and edges to the current canvas.
 *
 * New nodes are placed starting from `(maxX + 100, maxY + 100)` so they don't
 * overlap existing content. Node ids returned by `addNode` are used to wire up
 * the declared edges via `onConnect`.
 *
 * @param template - The template to insert.
 */
function insertTemplate(template: Template): void {
  const state = useEditorStore.getState();
  const nodes = state.nodes;
  // Calculate base position (bottom-right of existing nodes).
  const maxX = nodes.length > 0 ? Math.max(...nodes.map((n) => n.position?.x ?? 0)) : 0;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.position?.y ?? 0)) : 0;
  const baseX = maxX + 100;
  const baseY = maxY + 100;

  // Create nodes and collect their ids.
  const createdIds: string[] = [];
  for (const tplNode of template.nodes) {
    const id = state.addNode(tplNode.type, {
      x: baseX + tplNode.offset.x,
      y: baseY + tplNode.offset.y,
    });
    createdIds.push(id);
  }

  // Create edges between the freshly created nodes.
  for (const tplEdge of template.edges) {
    state.onConnect({
      source: createdIds[tplEdge.from],
      target: createdIds[tplEdge.to],
      sourceHandle: tplEdge.sourceHandle ?? null,
      targetHandle: null,
    });
  }
}

/** A single template card with name, description and an insert button. */
function TemplateItem({ template }: { template: Template }) {
  const { t } = useT();

  const handleInsert = () => {
    if (!window.confirm(t('tpl.confirm'))) return;
    insertTemplate(template);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-700/50 bg-slate-900/50 p-2.5 transition-colors hover:border-slate-500/70 hover:bg-slate-800/60">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-100">{t(template.nameKey)}</p>
        <button
          type="button"
          onClick={handleInsert}
          className="flex-shrink-0 rounded-md bg-cyan-500/20 px-2 py-1 text-xs text-cyan-200 transition-colors hover:bg-cyan-500/30"
        >
          {t('tpl.insert')}
        </button>
      </div>
      <p className="line-clamp-2 text-[11px] text-slate-400">{t(template.descKey)}</p>
    </div>
  );
}

function TemplateLibraryImpl({ className }: TemplateLibraryProps) {
  const { t } = useT();
  return (
    <aside
      className={[
        'flex h-full w-56 flex-col gap-2 overflow-y-auto border-r border-slate-800/60 bg-slate-950/40 p-3 backdrop-blur-sm',
        className ?? '',
      ].join(' ')}
    >
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {t('tpl.title')}
      </h2>
      <div className="flex flex-col gap-2">
        {TEMPLATES.map((tpl) => (
          <TemplateItem key={tpl.key} template={tpl} />
        ))}
      </div>
      <div className="mt-auto rounded-lg border border-slate-800/60 bg-slate-900/40 p-2 text-[10px] text-slate-500">
        {t('tpl.tip')}
      </div>
    </aside>
  );
}

export const TemplateLibrary = memo(TemplateLibraryImpl);
