/**
 * ChoicesEditor - edit the choices array of a scene node.
 *
 * Supports the three interaction types (tap/hold/slash) and their per-type
 * parameters (holdDuration, slashDirection).
 */

import { memo } from 'react';
import { nanoid } from 'nanoid';
import { Field, TextField, SelectField, NumberField } from './Field';
import { useT } from '@/i18n/useT';
import type { SceneChoice, InteractionType, SlashDirection } from '@/types/flow';

/** Props for the ChoicesEditor. */
export interface ChoicesEditorProps {
  choices: SceneChoice[];
  onChange: (choices: SceneChoice[]) => void;
}

function ChoicesEditorImpl({ choices, onChange }: ChoicesEditorProps) {
  const { t } = useT();

  const INTERACTION_OPTIONS: ReadonlyArray<{ value: InteractionType; label: string }> = [
    { value: 'tap', label: t('interaction.tap') },
    { value: 'hold', label: t('interaction.hold') },
    { value: 'slash', label: t('interaction.slash') },
  ];

  const SLASH_OPTIONS: ReadonlyArray<{ value: SlashDirection; label: string }> = [
    { value: 'left', label: t('dir.left') },
    { value: 'right', label: t('dir.right') },
    { value: 'up', label: t('dir.up') },
    { value: 'down', label: t('dir.down') },
  ];

  const update = (id: string, patch: Partial<SceneChoice>) => {
    onChange(choices.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const remove = (id: string) => onChange(choices.filter((c) => c.id !== id));
  const add = () =>
    onChange([
      ...choices,
      { id: `choice_${nanoid(6)}`, text: t('choices.newDefault'), interaction: 'tap' },
    ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {t('choices.title', { n: choices.length })}
        </span>
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/30"
        >
          {t('choices.add')}
        </button>
      </div>
      {choices.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
          {t('choices.empty')}
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
                placeholder={t('choices.textPh')}
              />
              <button
                type="button"
                onClick={() => remove(choice.id)}
                className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                {t('choices.del')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('choices.interaction')}>
                <SelectField
                  value={choice.interaction}
                  onChange={(interaction) => update(choice.id, { interaction })}
                  options={INTERACTION_OPTIONS}
                />
              </Field>
              {choice.interaction === 'hold' && (
                <Field label={t('choices.holdMs')}>
                  <NumberField
                    value={choice.holdDuration ?? 1500}
                    onChange={(holdDuration) => update(choice.id, { holdDuration })}
                    step={100}
                    min={100}
                  />
                </Field>
              )}
              {choice.interaction === 'slash' && (
                <Field label={t('choices.direction')}>
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
