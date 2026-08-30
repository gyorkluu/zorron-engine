/**
 * NodePalette - Grouped & Searchable Node Palette for Zorron Editor.
 *
 * Categorizes all 15 node types into 5 intuitive functional groups:
 *  1. 🎬 叙事与展示 (Narrative & Presentation)
 *  2. ⚡ 交互与输入 (Interaction & Input)
 *  3. 🔀 逻辑与控制 (Logic & Flow Control)
 *  4. 🎮 玩法与特殊 (Minigame & Gameplay)
 *  5. 🏆 产出与结算 (Settlement & Output)
 *
 * Supports native HTML5 drag-and-drop, category accordion toggles,
 * category pill filtering, and instant keyword searching.
 */

import { memo, useMemo, useState } from 'react';
import {
  Blocks,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  Layers,
  Wand2,
  X,
} from 'lucide-react';
import { type NodeType } from '@/types/flow';
import {
  getAllNodeDefinitions,
  NODE_CATEGORIES,
  type NodeCategory,
  type NodeDefinition,
} from '@/engine/nodeRegistry';
import { useT } from '@/i18n/useT';
import { NodeIcon } from '@/components/brand/NodeIcon';
import { cn } from '@/lib/utils';

export interface NodePaletteProps {
  onCreateNode?: (type: NodeType) => void;
  className?: string;
}

function PaletteItem({
  def,
  onCreate,
}: {
  def: NodeDefinition;
  onCreate?: (type: NodeType) => void;
}) {
  const { t } = useT();
  const accent = def.accent;
  const label = t(def.labelKey);

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/zorron-node-type', def.type);
        e.dataTransfer.setData('text/plain', def.type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onCreate?.(def.type)}
      className="group relative flex w-full cursor-grab items-start gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/35 p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-black/40 active:cursor-grabbing active:scale-[0.98]"
    >
      <div
        className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 12px ${accent}15, inset 0 1px 0 ${accent}25`,
        }}
      >
        <NodeIcon type={def.type} size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-white">
            {label}
          </p>
          <span className="font-mono text-[9px] text-slate-500 opacity-60 group-hover:opacity-100">
            {def.type}
          </span>
        </div>
        <p className="line-clamp-1 text-[10px] text-slate-400 mt-0.5 leading-tight group-hover:text-slate-300">
          {t(def.descKey)}
        </p>
      </div>

      <div
        className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
      />
    </button>
  );
}

function NodePaletteImpl({ onCreateNode, className }: NodePaletteProps) {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | 'all'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const allDefs = useMemo(() => getAllNodeDefinitions(), []);

  // Filter definitions based on search query and selected category pill
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

  // Group filtered nodes by category
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

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-slate-800/60 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950/40 backdrop-blur-xl select-none',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800/50 px-3.5 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 shadow-sm shadow-cyan-500/10">
          <Blocks size={13} className="text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t('palette.title')}
          </h2>
        </div>
        <span className="rounded-full bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400 border border-slate-700/50">
          {allDefs.length}
        </span>
      </div>

      {/* Search Input */}
      <div className="border-b border-slate-800/40 p-2.5">
        <div className="relative">
          <Search
            size={12}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('palette.search')}
            className="w-full rounded-lg border border-slate-800/80 bg-slate-900/60 py-1.5 pl-7 pr-7 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-900/90 focus:ring-1 focus:ring-cyan-500/20"
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
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800/40 px-2.5 py-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-all',
            selectedCategory === 'all'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent',
          )}
        >
          {t('category.all')}
        </button>
        {NODE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-all',
                isSelected
                  ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent',
              )}
            >
              {t(cat.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Grouped Node List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-2.5 scrollbar-thin">
        {filteredDefs.length === 0 ? (
          <div className="py-8 text-center">
            <Layers size={20} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-400">{t('palette.empty')}</p>
            <p className="text-[10px] text-slate-600 mt-1">尝试更换关键词或筛选标签</p>
          </div>
        ) : (
          NODE_CATEGORIES.map((cat) => {
            const nodesInCat = groupedCategories.get(cat.id) ?? [];
            if (nodesInCat.length === 0) return null;
            const isCollapsed = collapsedCategories[cat.id] ?? false;

            return (
              <div key={cat.id} className="space-y-1.5">
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center justify-between px-1.5 py-1 text-left group"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shadow-sm"
                      style={{ backgroundColor: cat.color, boxShadow: `0 0 6px ${cat.color}80` }}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">
                      {t(cat.labelKey)}
                    </span>
                    <span className="rounded-full bg-slate-800/80 px-1.5 py-0.2 font-mono text-[9px] text-slate-500">
                      {nodesInCat.length}
                    </span>
                  </div>
                  <div className="text-slate-500 group-hover:text-slate-300">
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </div>
                </button>

                {/* Category Node Items */}
                {!isCollapsed && (
                  <div className="space-y-1.5 pl-0.5">
                    {nodesInCat.map((def) => (
                      <PaletteItem key={def.type} def={def} onCreate={onCreateNode} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint / AI assistant trigger */}
      <div className="m-2.5 mt-0 flex items-center gap-2 rounded-xl border border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-indigo-500/5 to-purple-500/10 p-2.5">
        <Sparkles size={13} className="text-cyan-400 flex-shrink-0 animate-pulse" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-cyan-200">支持画布任意位置右键添加</p>
          <p className="text-[9px] text-slate-400 leading-tight">或拖拽节点至目标坐标</p>
        </div>
      </div>
    </aside>
  );
}

export const NodePalette = memo(NodePaletteImpl);
