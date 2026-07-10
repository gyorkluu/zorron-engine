/**
 * VectorEditor - edit an N-dimensional vector.
 *
 * Renders one number field per axis. The set of axes is driven by `labels`
 * (a `Record<AxisId, string>`); when omitted, the editor falls back to the
 * keys present on `value`, or the legacy `x/y/z` triplet for an empty vector.
 */

import { memo } from 'react';
import { Field, NumberField } from './Field';
import type { AxisId, Vector } from '@/types/flow';

/** Props for the VectorEditor. */
export interface VectorEditorProps {
  value: Vector;
  onChange: (value: Vector) => void;
  /**
   * Axis id → human-readable label. The keys define which axes are rendered
   * and their display order. When omitted, the editor derives axes from
   * `value`'s own keys, falling back to `{x,y,z}` for an empty vector.
   */
  labels?: Record<AxisId, string>;
}

/** Default axis set used when neither `labels` nor `value` provide axes. */
const DEFAULT_AXES: ReadonlyArray<readonly [AxisId, string]> = [
  ['x', 'X'],
  ['y', 'Y'],
  ['z', 'Z'],
] as const;

function VectorEditorImpl({ value, onChange, labels }: VectorEditorProps) {
  const axisEntries: ReadonlyArray<readonly [AxisId, string]> = labels
    ? Object.entries(labels)
    : Object.keys(value).length > 0
      ? Object.keys(value).map((k) => [k, k] as const)
      : DEFAULT_AXES;

  return (
    <div className="flex flex-wrap gap-2">
      {axisEntries.map(([axisId, label]) => (
        <Field key={axisId} label={label}>
          <NumberField
            value={value[axisId] ?? 0}
            onChange={(n) => onChange({ ...value, [axisId]: n })}
            step={0.5}
          />
        </Field>
      ))}
    </div>
  );
}

export const VectorEditor = memo(VectorEditorImpl);
