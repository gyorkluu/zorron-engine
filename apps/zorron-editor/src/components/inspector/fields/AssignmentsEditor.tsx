/**
 * AssignmentsEditor - edit the assignments array of a setter node.
 */

import { memo } from 'react';
import { Field, TextField, NumberField, SelectField } from './Field';
import type { SetterAssignment } from '@/types/flow';

/** Props for the AssignmentsEditor. */
export interface AssignmentsEditorProps {
  assignments: SetterAssignment[];
  onChange: (assignments: SetterAssignment[]) => void;
}

const OPERATOR_OPTIONS: ReadonlyArray<{ value: SetterAssignment['operator']; label: string }> = [
  { value: 'set', label: '= set' },
  { value: 'add', label: '+= add' },
  { value: 'sub', label: '-= sub' },
];

function AssignmentsEditorImpl({ assignments, onChange }: AssignmentsEditorProps) {
  const update = (index: number, patch: Partial<SetterAssignment>) => {
    onChange(assignments.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };
  const remove = (index: number) =>
    onChange(assignments.filter((_, i) => i !== index));
  const add = () =>
    onChange([
      ...assignments,
      { variable: 'var', value: 0, operator: 'set' },
    ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Assignments ({assignments.length})
        </span>
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/30"
        >
          + Add
        </button>
      </div>
      {assignments.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
          No assignments yet.
        </p>
      )}
      <div className="space-y-2">
        {assignments.map((assignment, index) => (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label="Variable">
                <TextField
                  value={assignment.variable}
                  onChange={(variable) => update(index, { variable })}
                  placeholder="score"
                />
              </Field>
              <Field label="Operator">
                <SelectField
                  value={assignment.operator}
                  onChange={(operator) => update(index, { operator })}
                  options={OPERATOR_OPTIONS}
                />
              </Field>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="Value">
                  <NumberField
                    value={Number(assignment.value) || 0}
                    onChange={(value) => update(index, { value })}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="flex-shrink-0 rounded-md px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const AssignmentsEditor = memo(AssignmentsEditorImpl);
