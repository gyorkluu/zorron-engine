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
  { value: 'tap', label: 'Tap' },
  { value: 'hold', label: 'Hold' },
  { value: 'slash', label: 'Slash' },
];

const SLASH_OPTIONS: ReadonlyArray<{ value: SlashDirection; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
];

function ChoicesEditorImpl({ choices, onChange }: ChoicesEditorProps) {
  const update = (id: string, patch: Partial<SceneChoice>) => {
    onChange(choices.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const remove = (id: string) => onChange(choices.filter((c) => c.id !== id));
  const add = () =>
    onChange([
      ...choices,
      { id: `choice_${nanoid(6)}`, text: 'New choice', interaction: 'tap' },
    ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Choices ({choices.length})
        </span>
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/30"
        >
          + Add
        </button>
      </div>
      {choices.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
          No choices yet. Add one to let the player advance.
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
                placeholder="Choice text"
              />
              <button
                type="button"
                onClick={() => remove(choice.id)}
                className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                Del
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Interaction">
                <SelectField
                  value={choice.interaction}
                  onChange={(interaction) => update(choice.id, { interaction })}
                  options={INTERACTION_OPTIONS}
                />
              </Field>
              {choice.interaction === 'hold' && (
                <Field label="Hold (ms)">
                  <NumberField
                    value={choice.holdDuration ?? 1500}
                    onChange={(holdDuration) => update(choice.id, { holdDuration })}
                    step={100}
                    min={100}
                  />
                </Field>
              )}
              {choice.interaction === 'slash' && (
                <Field label="Direction">
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
