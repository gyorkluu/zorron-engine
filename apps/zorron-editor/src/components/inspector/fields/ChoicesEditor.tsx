/**
 * ChoicesEditor - edit the choices array of a scene node.
 *
 * Supports the three interaction types (tap/hold/slash) and their per-type
 * parameters (holdDuration, slashDirection).
 */

import { memo } from 'react';
import { nanoid } from 'nanoid';
import { Field, TextField, SelectField, NumberField } from './Field';
import type { SceneChoice, InteractionType, SlashDirection } from '@/types/flow';

/** Props for the ChoicesEditor. */
export interface ChoicesEditorProps {
  choices: SceneChoice[];
  onChange: (choices: SceneChoice[]) => void;
}

const INTERACTION_OPTIONS: ReadonlyArray<{ value: InteractionType; label: string }> = [
  { value: 'tap', label: '点击' },
  { value: 'hold', label: '长按' },
  { value: 'slash', label: '滑动' },
];

const SLASH_OPTIONS: ReadonlyArray<{ value: SlashDirection; label: string }> = [
  { value: 'left', label: '左' },
  { value: 'right', label: '右' },
  { value: 'up', label: '上' },
  { value: 'down', label: '下' },
];

function ChoicesEditorImpl({ choices, onChange }: ChoicesEditorProps) {
  const update = (id: string, patch: Partial<SceneChoice>) => {
    onChange(choices.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const remove = (id: string) => onChange(choices.filter((c) => c.id !== id));
  const add = () =>
    onChange([
      ...choices,
      { id: `choice_${nanoid(6)}`, text: '新选项', interaction: 'tap' },
    ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          选项 ({choices.length})
        </span>
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/30"
        >
          + 添加
        </button>
      </div>
      {choices.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
          暂无选项。添加一个以让玩家继续。
        </p>
      )}
      <div className="space-y-2">
        {choices.map((choice, index) => (
          <div
            key={choice.id}
            className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">#{index + 1}</span>
              <TextField
                value={choice.text}
                onChange={(text) => update(choice.id, { text })}
                placeholder="选项文本"
              />
              <button
                type="button"
                onClick={() => remove(choice.id)}
                className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                删除
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="交互方式">
                <SelectField
                  value={choice.interaction}
                  onChange={(interaction) => update(choice.id, { interaction })}
                  options={INTERACTION_OPTIONS}
                />
              </Field>
              {choice.interaction === 'hold' && (
                <Field label="长按（毫秒）">
                  <NumberField
                    value={choice.holdDuration ?? 1500}
                    onChange={(holdDuration) => update(choice.id, { holdDuration })}
                    step={100}
                    min={100}
                  />
                </Field>
              )}
              {choice.interaction === 'slash' && (
                <Field label="方向">
                  <SelectField
                    value={choice.slashDirection ?? 'right'}
                    onChange={(slashDirection) => update(choice.id, { slashDirection })}
                    options={SLASH_OPTIONS}
                  />
                </Field>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ChoicesEditor = memo(ChoicesEditorImpl);
