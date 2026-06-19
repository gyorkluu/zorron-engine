/**
 * VectorEditor - edit a 3D personality vector (x/y/z).
 */

import { memo } from 'react';
import { Field, NumberField } from './Field';
import type { PersonalityVector } from '@/types/flow';

/** Props for the VectorEditor. */
export interface VectorEditorProps {
  value: PersonalityVector;
  onChange: (value: PersonalityVector) => void;
  labels?: { x: string; y: string; z: string };
}

function VectorEditorImpl({ value, onChange, labels }: VectorEditorProps) {
  const lbl = labels ?? { x: 'X', y: 'Y', z: 'Z' };
  return (
    <div className="grid grid-cols-3 gap-2">
      <Field label={lbl.x}>
        <NumberField
          value={value.x}
          onChange={(x) => onChange({ ...value, x })}
          step={0.5}
        />
      </Field>
      <Field label={lbl.y}>
        <NumberField
          value={value.y}
          onChange={(y) => onChange({ ...value, y })}
          step={0.5}
        />
      </Field>
      <Field label={lbl.z}>
        <NumberField
          value={value.z}
          onChange={(z) => onChange({ ...value, z })}
          step={0.5}
        />
      </Field>
    </div>
  );
}

export const VectorEditor = memo(VectorEditorImpl);
