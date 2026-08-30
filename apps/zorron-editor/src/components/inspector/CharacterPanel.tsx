/**
 * CharacterPanel — project-level character roster.
 *
 * Characters are assets: nodes reference them by id, so renaming a character
 * or swapping a sprite updates every scene that uses them at once.
 */

import { memo, useCallback, useState } from 'react';
import { Users, Plus, Trash2, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { Character, CharacterExpression } from '@/types/flow';
import { cn } from '@/lib/utils';

export interface CharacterPanelProps {
  className?: string;
}

/** Inline labelled text input sized for the narrow side panel. */
function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-700/60 bg-slate-900/60 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
      />
    </label>
  );
}

/** One expression row: id, label and sprite URL. */
function ExpressionRow({
  expression,
  onChange,
  onRemove,
}: {
  expression: CharacterExpression;
  onChange: (patch: Partial<CharacterExpression>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={expression.id}
          placeholder="id"
          onChange={(e) => onChange({ id: e.target.value })}
          className="w-16 rounded border border-slate-700/60 bg-slate-950/60 px-1.5 py-1 font-mono text-[10px] text-slate-300 focus:border-cyan-500/50 focus:outline-none"
        />
        <input
          type="text"
          value={expression.label}
          placeholder="名称"
          onChange={(e) => onChange({ label: e.target.value })}
          className="min-w-0 flex-1 rounded border border-slate-700/60 bg-slate-950/60 px-1.5 py-1 text-[10px] text-slate-300 focus:border-cyan-500/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={onRemove}
          title="删除表情"
          className="rounded p-1 text-slate-500 transition-colors hover:bg-rose-900/40 hover:text-rose-300"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <input
        type="text"
        value={expression.url}
        placeholder="立绘 URL"
        onChange={(e) => onChange({ url: e.target.value })}
        className="w-full rounded border border-slate-700/60 bg-slate-950/60 px-1.5 py-1 text-[10px] text-slate-400 focus:border-cyan-500/50 focus:outline-none"
      />
    </div>
  );
}

/** Expanded editor for a single character. */
function CharacterEditor({ character }: { character: Character }) {
  const updateCharacter = useProjectStore((s) => s.updateCharacter);
  const expressions = character.expressions ?? [];

  const patch = useCallback(
    (next: Partial<Character>) => updateCharacter(character.id, next),
    [character.id, updateCharacter],
  );

  const updateExpression = (index: number, next: Partial<CharacterExpression>) => {
    const copy = expressions.map((e, i) => (i === index ? { ...e, ...next } : e));
    patch({ expressions: copy });
  };

  return (
    <div className="space-y-2.5 border-t border-slate-800 px-2.5 py-2.5">
      <Field
        label="角色名"
        value={character.name}
        onChange={(name) => patch({ name })}
      />

      <label className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          主题色
        </span>
        <span className="flex items-center gap-1.5">
          <input
            type="color"
            value={character.color ?? '#22d3ee'}
            onChange={(e) => patch({ color: e.target.value })}
            className="h-6 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
          />
          <code className="font-mono text-[10px] text-slate-500">
            {character.color ?? '#22d3ee'}
          </code>
        </span>
      </label>

      <Field
        label="默认立绘"
        value={character.portraitUrl ?? ''}
        placeholder="https://..."
        onChange={(portraitUrl) => patch({ portraitUrl })}
      />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            表情差分 ({expressions.length})
          </span>
          <button
            type="button"
            onClick={() =>
              patch({
                expressions: [
                  ...expressions,
                  {
                    id: `expr-${expressions.length + 1}`,
                    label: `表情 ${expressions.length + 1}`,
                    url: '',
                  },
                ],
              })
            }
            className="flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 text-[10px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <Plus size={10} />
            添加
          </button>
        </div>
        {expressions.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-800 px-2 py-1.5 text-center text-[10px] text-slate-600">
            暂无表情差分，将始终使用默认立绘
          </p>
        ) : (
          expressions.map((expr, i) => (
            <ExpressionRow
              key={`${expr.id}-${i}`}
              expression={expr}
              onChange={(next) => updateExpression(i, next)}
              onRemove={() =>
                patch({ expressions: expressions.filter((_, idx) => idx !== i) })
              }
            />
          ))
        )}
      </div>

      <Field
        label="备注"
        value={character.description ?? ''}
        placeholder="给作者看的说明"
        onChange={(description) => patch({ description })}
      />
    </div>
  );
}

function CharacterPanelImpl({ className }: CharacterPanelProps) {
  const characters = useProjectStore((s) => s.characters);
  const addCharacter = useProjectStore((s) => s.addCharacter);
  const removeCharacter = useProjectStore((s) => s.removeCharacter);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    const id = addCharacter();
    setExpandedId(id);
  }, [addCharacter]);

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm',
        className,
      )}
      data-testid="character-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            角色库
          </h3>
          <span className="text-[10px] text-slate-500">节点按 id 引用，改一次全图生效</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-1 text-[11px] text-cyan-200 transition-colors hover:bg-cyan-500/30"
        >
          <Plus size={11} />
          新建
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {characters.length === 0 ? (
          <p className="m-1 rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
            还没有角色。新建一个，然后在舞台 / 场景节点里选择它。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {characters.map((character) => {
              const expanded = expandedId === character.id;
              return (
                <li
                  key={character.id}
                  className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/40"
                >
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : character.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {expanded ? (
                        <ChevronDown size={12} className="flex-shrink-0 text-slate-500" />
                      ) : (
                        <ChevronRight size={12} className="flex-shrink-0 text-slate-500" />
                      )}
                      <span
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border"
                        style={{
                          borderColor: `${character.color ?? '#22d3ee'}55`,
                          background: `${character.color ?? '#22d3ee'}18`,
                        }}
                      >
                        {character.portraitUrl ? (
                          <img
                            src={character.portraitUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={12} className="text-slate-500" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-100">
                          {character.name}
                        </span>
                        <span className="block truncate font-mono text-[9px] text-slate-500">
                          {character.id}
                          {(character.expressions?.length ?? 0) > 0
                            ? ` · ${character.expressions?.length} 表情`
                            : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCharacter(character.id)}
                      title="删除角色"
                      className="rounded p-1 text-slate-500 transition-colors hover:bg-rose-900/40 hover:text-rose-300"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {expanded ? <CharacterEditor character={character} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export const CharacterPanel = memo(CharacterPanelImpl);
export { Users as CharacterPanelIcon };
