/**
 * ContextMenu - right-click context menu for the FlowCanvas.
 *
 * Renders either a node-scoped menu (copy/paste/duplicate/delete) when
 * `state.nodeId` is set, or a pane-scoped menu (paste + add-node submenu)
 * when `state.nodeId` is null. Closes on outside click or Escape.
 *
 * @see P1-3 in the editor roadmap.
 */

import { useEffect, useMemo, useRef, memo, type ReactNode } from 'react';
import { useT } from '@/i18n/useT';
import { useEditorStore } from '@/stores/editorStore';
import {
  NODE_TYPES,
  NODE_TYPE_LABEL_KEYS,
  NODE_TYPE_ACCENTS,
  type NodeType,
} from '@/types/flow';

/** Context menu position and target. */
export interface ContextMenuState {
  /** Viewport X (clientX) for fixed positioning. */
  x: number;
  /** Viewport Y (clientY) for fixed positioning. */
  y: number;
  /** Target node id, or null for the pane background. */
  nodeId: string | null;
}

/** Props for the ContextMenu. */
export interface ContextMenuProps {
  /** Current menu state, or null when closed. */
  state: ContextMenuState;
  /** Close the menu. */
  onClose: () => void;
}

/** A single clickable menu row. */
interface MenuItemProps {
  /** Localized label. */
  label: string;
  /** Optional shortcut hint shown on the right. */
  shortcut?: string;
  /** Click handler. */
  onClick: () => void;
  /** When true, renders in a destructive style. */
  danger?: boolean;
  /** When true, dims and disables interaction. */
  disabled?: boolean;
}

function MenuItem({ label, shortcut, onClick, danger, disabled }: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-sm transition-colors',
        disabled
          ? 'cursor-not-allowed text-slate-600'
          : danger
            ? 'text-rose-300 hover:bg-rose-500/15'
            : 'text-slate-200 hover:bg-slate-700/60',
      ].join(' ')}
    >
      <span>{label}</span>
      {shortcut ? (
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

/** A thin divider between groups of items. */
function MenuDivider() {
  return <div className="my-1 h-px bg-slate-700/60" />;
}

/** A non-interactive section header. */
function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}

function ContextMenuImpl({ state, onClose }: ContextMenuProps) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);

  const copyNode = useEditorStore((s) => s.copyNode);
  const pasteNode = useEditorStore((s) => s.pasteNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const addNode = useEditorStore((s) => s.addNode);
  const hasClipboard = useEditorStore((s) => s.clipboard !== null);

  // Close on outside click and Escape.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Keep menu within viewport bounds.
  const style = useMemo<React.CSSProperties>(
    () => ({
      position: 'fixed',
      left: state.x,
      top: state.y,
      zIndex: 50,
    }),
    [state.x, state.y],
  );

  const isNodeMenu = state.nodeId !== null;
  const nodeId = state.nodeId;

  /** Run an action then close the menu. */
  function run(action: () => void) {
    return () => {
      action();
      onClose();
    };
  }

  return (
    <div
      ref={containerRef}
      role="menu"
      aria-label={t('ctx.add')}
      style={style}
      className="min-w-[180px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl"
    >
      {isNodeMenu && nodeId !== null ? (
        <>
          <MenuItem
            label={t('ctx.copy')}
            shortcut="Ctrl+C"
            onClick={run(() => copyNode(nodeId))}
          />
          <MenuItem
            label={t('ctx.paste')}
            shortcut="Ctrl+V"
            disabled={!hasClipboard}
            onClick={run(() => pasteNode({ x: state.x, y: state.y }))}
          />
          <MenuItem
            label={t('ctx.duplicate')}
            onClick={run(() => duplicateNode(nodeId))}
          />
          <MenuDivider />
          <MenuItem
            label={t('ctx.delete')}
            shortcut="Del"
            danger
            onClick={run(() => removeNode(nodeId))}
          />
        </>
      ) : (
        <>
          <MenuItem
            label={t('ctx.paste')}
            shortcut="Ctrl+V"
            disabled={!hasClipboard}
            onClick={run(() => pasteNode({ x: state.x, y: state.y }))}
          />
          <MenuDivider />
          <MenuLabel>{t('ctx.add')}</MenuLabel>
          <div className="flex flex-col">
            {NODE_TYPES.map((type: NodeType) => (
              <button
                key={type}
                type="button"
                onClick={run(() => addNode(type, { x: state.x, y: state.y }))}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/60"
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: NODE_TYPE_ACCENTS[type] }}
                />
                <span>{t(NODE_TYPE_LABEL_KEYS[type])}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export const ContextMenu = memo(ContextMenuImpl);
