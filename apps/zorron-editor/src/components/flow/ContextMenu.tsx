/**
 * ContextMenu - Modern categorized & searchable right-click context menu for FlowCanvas.
 *
 * Renders:
 *  1. Node-scoped menu (copy/paste/duplicate/delete) when `state.nodeId` is set.
 *  2. Rich Quick-Add Node Dialog when right-clicking on empty canvas:
 *     - Top search bar with auto-focus
 *     - Category pills (全部, 🎬 叙事, ⚡ 交互, 🔀 逻辑, 🎮 玩法, 🏆 结算)
 *     - Grouped node items with icons, descriptions, and accent tags
 *     - Creates node at exact flow coordinates (`state.flowPosition`).
 */

import { useEffect, useMemo, useRef, useState, memo, type ReactNode } from 'react';
import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  Search,
  Sparkles,
  X,
  Layers,
} from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useEditorStore } from '@/stores/editorStore';
import {
  getAllNodeDefinitions,
  NODE_CATEGORIES,
  type NodeCategory,
  type NodeDefinition,
} from '@/engine/nodeRegistry';
import { NodeIcon } from '@/components/brand/NodeIcon';
import type { NodeType } from '@/types/flow';
import { cn } from '@/lib/utils';

/** Context menu position and target. */
export interface ContextMenuState {
  /** Viewport X (clientX) for fixed positioning. */
  x: number;
  /** Viewport Y (clientY) for fixed positioning. */
  y: number;
  /** Projected canvas/flow coordinates where the node should be spawned. */
  flowPosition?: { x: number; y: number };
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

/** A single clickable menu row for node actions. */
interface MenuItemProps {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({ label, icon: Icon, shortcut, onClick, danger, disabled }: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition-colors rounded-md mx-0.5',
        disabled
          ? 'cursor-not-allowed text-slate-600'
          : danger
            ? 'text-rose-300 hover:bg-rose-500/15 hover:text-rose-200'
            : 'text-slate-200 hover:bg-slate-800 hover:text-white',
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className={danger ? 'text-rose-400' : 'text-slate-400'} />}
        <span>{label}</span>
      </div>
      {shortcut ? (
        <span className="font-mono text-[9px] uppercase tracking-wide text-slate-500">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-slate-800/80" />;
}

function ContextMenuImpl({ state, onClose }: ContextMenuProps) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | 'all'>('all');

  const copyNode = useEditorStore((s) => s.copyNode);
  const pasteNode = useEditorStore((s) => s.pasteNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const addNode = useEditorStore((s) => s.addNode);
  const hasClipboard = useEditorStore((s) => s.clipboard !== null);

  const isNodeMenu = state.nodeId !== null;
  const nodeId = state.nodeId;

  // Auto-focus search input when opening canvas menu
  useEffect(() => {
    if (!isNodeMenu) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isNodeMenu]);

  // Close on outside click and Escape.
  useEffect(() => {
    function onPointerDown(e: MouseEvent | PointerEvent) {
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
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Keep menu within viewport bounds
  const style = useMemo<React.CSSProperties>(() => {
    const width = isNodeMenu ? 200 : 340;
    const height = isNodeMenu ? 160 : 420;
    const padding = 16;
    const maxX = window.innerWidth - width - padding;
    const maxY = window.innerHeight - height - padding;

    const posX = Math.max(padding, Math.min(state.x, maxX));
    const posY = Math.max(padding, Math.min(state.y, maxY));

    return {
      position: 'fixed',
      left: posX,
      top: posY,
      zIndex: 100,
    };
  }, [state.x, state.y, isNodeMenu]);

  const allDefs = useMemo(() => getAllNodeDefinitions(), []);

  const filteredDefs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allDefs.filter((def) => {
      if (selectedCategory !== 'all' && (def.category ?? 'narrative') !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const label = t(def.labelKey).toLowerCase();
      const desc = t(def.descKey).toLowerCase();
      const type = def.type.toLowerCase();
      return label.includes(q) || desc.includes(q) || type.includes(q);
    });
  }, [allDefs, search, selectedCategory, t]);

  const groupedCategories = useMemo(() => {
    const map = new Map<NodeCategory, NodeDefinition[]>();
    for (const cat of NODE_CATEGORIES) {
      map.set(cat.id, []);
    }
    for (const def of filteredDefs) {
      const cat = def.category ?? 'narrative';
      const list = map.get(cat) ?? [];
      list.push(def);
      map.set(cat, list);
    }
    return map;
  }, [filteredDefs]);

  function handleAddNode(type: NodeType) {
    const targetPos = state.flowPosition ?? { x: state.x, y: state.y };
    addNode(type, targetPos);
    onClose();
  }

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
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-2xl shadow-black/80 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150',
        isNodeMenu ? 'w-52 p-1.5' : 'w-80 p-0',
      )}
    >
      {isNodeMenu && nodeId !== null ? (
        /* Node Scope Actions Menu */
        <div className="space-y-0.5">
          <MenuItem
            label={t('ctx.copy')}
            icon={Copy}
            shortcut="Ctrl+C"
            onClick={run(() => copyNode(nodeId))}
          />
          <MenuItem
            label={t('ctx.paste')}
            icon={ClipboardPaste}
            shortcut="Ctrl+V"
            disabled={!hasClipboard}
            onClick={run(() => {
              const pos = state.flowPosition ?? { x: state.x + 20, y: state.y + 20 };
              pasteNode(pos);
            })}
          />
          <MenuItem
            label={t('ctx.duplicate')}
            icon={CopyPlus}
            shortcut="Ctrl+D"
            onClick={run(() => duplicateNode(nodeId))}
          />
          <MenuDivider />
          <MenuItem
            label={t('ctx.delete')}
            icon={Trash2}
            shortcut="Del"
            danger
            onClick={run(() => removeNode(nodeId))}
          />
        </div>
      ) : (
        /* Canvas Scope Quick Add Node Dialog */
        <div className="flex flex-col max-h-[460px]">
          {/* Header & Search */}
          <div className="border-b border-slate-800/60 p-2.5 bg-slate-900/40">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-400"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('ctx.searchNode')}
                className="w-full rounded-xl border border-slate-800/90 bg-slate-900/80 py-1.5 pl-8 pr-7 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="mt-2 flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'flex-shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-all',
                  selectedCategory === 'all'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent',
                )}
              >
                全部
              </button>
              {NODE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex-shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-all',
                    selectedCategory === cat.id
                      ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent',
                  )}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Paste Action if clipboard exists */}
          {hasClipboard && (
            <div className="border-b border-slate-800/40 px-2 py-1.5 bg-cyan-500/5">
              <button
                type="button"
                onClick={run(() => {
                  const pos = state.flowPosition ?? { x: state.x, y: state.y };
                  pasteNode(pos);
                })}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/15"
              >
                <div className="flex items-center gap-2">
                  <ClipboardPaste size={13} />
                  <span>{t('ctx.paste')}</span>
                </div>
                <span className="font-mono text-[9px] text-cyan-400/70">Ctrl+V</span>
              </button>
            </div>
          )}

          {/* Node Category Grid / List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-2.5 scrollbar-thin">
            {filteredDefs.length === 0 ? (
              <div className="py-6 text-center">
                <Layers size={18} className="mx-auto text-slate-600 mb-1.5" />
                <p className="text-xs text-slate-400">未找到匹配的节点</p>
              </div>
            ) : (
              NODE_CATEGORIES.map((cat) => {
                const nodesInCat = groupedCategories.get(cat.id) ?? [];
                if (nodesInCat.length === 0) return null;

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-1 py-0.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t(cat.labelKey)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                      {nodesInCat.map((def) => {
                        const accent = def.accent;
                        return (
                          <button
                            key={def.type}
                            type="button"
                            onClick={() => handleAddNode(def.type)}
                            className="group relative flex w-full items-center gap-2.5 rounded-xl border border-slate-800/40 bg-slate-900/40 p-1.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-800/70 hover:shadow-md"
                          >
                            <div
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                              style={{
                                background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
                                border: `1px solid ${accent}40`,
                              }}
                            >
                              <NodeIcon type={def.type} size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                                  {t(def.labelKey)}
                                </span>
                                <span className="font-mono text-[9px] text-slate-500">
                                  {def.type}
                                </span>
                              </div>
                              <p className="line-clamp-1 text-[10px] text-slate-400 group-hover:text-slate-300">
                                {t(def.descKey)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Tip Footer */}
          <div className="border-t border-slate-800/40 px-3 py-1.5 bg-slate-900/40 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Sparkles size={10} className="text-cyan-400" />
              <span>点击直接在光标处创建</span>
            </span>
            <span className="font-mono text-[9px]">Esc 关闭</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const ContextMenu = memo(ContextMenuImpl);
