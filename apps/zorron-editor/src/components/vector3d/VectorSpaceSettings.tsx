/**
 * VectorSpaceSettings - inspector section for editing the vector space config.
 *
 * Allows the user to:
 * - Toggle the vector space on/off.
 * - Add/remove axes (changing vector space dimensionality: 2D, 3D, 4D, ...).
 * - Edit the label of each axis.
 * - Add/remove/edit sect anchors (id, name, vector, title).
 *
 * Wired to `projectStore.setSettings` so changes flow into the project's
 * FlowData and are persisted on save.
 */

import { memo, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useT, tt } from '@/i18n/useT';
import { Field, TextField, SwitchField } from '@/components/inspector/fields/Field';
import { VectorEditor } from '@/components/inspector/fields/VectorEditor';
import { createZeroVector } from '@/engine/vectorMath';
import type { AxisId, ResultAnchor, VectorSpaceConfig, ProjectSettings, Vector } from '@/types/flow';
import { nanoid } from 'nanoid';

/** Props for the VectorSpaceSettings. */
export interface VectorSpaceSettingsProps {
  /** Optional class name. */
  className?: string;
}

/** Strip a key from a vector, returning a new vector without that axis. */
function removeAxisFromVector(vector: Vector, axisId: AxisId): Vector {
  const out: Vector = { ...vector };
  delete out[axisId];
  return out;
}

function VectorSpaceSettingsImpl({ className }: VectorSpaceSettingsProps) {
  const { t } = useT();
  const settings = useProjectStore((s) => s.settings);
  const setSettings = useProjectStore((s) => s.setSettings);

  const vectorSpace = settings.vectorSpace;

  /** Patch the vector space config and push to the project store. */
  const updateVectorSpace = useCallback(
    (patch: Partial<VectorSpaceConfig>) => {
      const next: ProjectSettings = {
        ...settings,
        vectorSpace: { ...vectorSpace, ...patch },
      };
      setSettings(next);
    },
    [settings, vectorSpace, setSettings],
  );

  /** Update a single sect anchor by id. */
  const updateSect = useCallback(
    (id: string, patch: Partial<ResultAnchor>) => {
      const sects = (vectorSpace.sects ?? []).map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      );
      updateVectorSpace({ sects });
    },
    [vectorSpace.sects, updateVectorSpace],
  );

  /** Add a new sect anchor with a zero vector matching the current axes. */
  const addSect = useCallback(() => {
    const sects = vectorSpace.sects ?? [];
    const axisIds = Object.keys(vectorSpace.dimensions);
    const newSect: ResultAnchor = {
      id: `sect_${nanoid(6)}`,
      name: tt('vector3d.sects.default', { n: sects.length + 1 }),
      vector: createZeroVector(axisIds),
      title: tt('vector3d.sects.default', { n: sects.length + 1 }),
    };
    updateVectorSpace({ sects: [...sects, newSect] });
  }, [vectorSpace.sects, vectorSpace.dimensions, updateVectorSpace]);

  /** Remove a sect anchor by id. */
  const removeSect = useCallback(
    (id: string) => {
      const sects = (vectorSpace.sects ?? []).filter((s) => s.id !== id);
      updateVectorSpace({ sects });
    },
    [vectorSpace.sects, updateVectorSpace],
  );

  /** Add a new axis to the vector space (increments dimensionality). */
  const addAxis = useCallback(() => {
    const axisId = `axis_${nanoid(4)}`;
    const dimensions = { ...vectorSpace.dimensions, [axisId]: axisId };
    // Seed the new axis as 0 on every existing sect vector so the dimension
    // count stays consistent across anchors.
    const sects = (vectorSpace.sects ?? []).map((s) => ({
      ...s,
      vector: { ...s.vector, [axisId]: 0 },
    }));
    updateVectorSpace({ dimensions, sects });
  }, [vectorSpace.dimensions, vectorSpace.sects, updateVectorSpace]);

  /** Remove an axis from the vector space (decrements dimensionality). */
  const removeAxis = useCallback(
    (axisId: AxisId) => {
      const dimensions = { ...vectorSpace.dimensions };
      delete dimensions[axisId];
      const sects = (vectorSpace.sects ?? []).map((s) => ({
        ...s,
        vector: removeAxisFromVector(s.vector, axisId),
      }));
      updateVectorSpace({ dimensions, sects });
    },
    [vectorSpace.dimensions, vectorSpace.sects, updateVectorSpace],
  );

  /** Rename the label of an axis (keeps the axis id stable). */
  const renameAxis = useCallback(
    (axisId: AxisId, label: string) => {
      const dimensions = { ...vectorSpace.dimensions, [axisId]: label };
      updateVectorSpace({ dimensions });
    },
    [vectorSpace.dimensions, updateVectorSpace],
  );

  const axisEntries = Object.entries(vectorSpace.dimensions);

  return (
    <div className={className} data-testid="vector-space-settings">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('vector3d.settings')}
        </h3>
      </div>

      <div className="space-y-3">
        <SwitchField
          checked={vectorSpace.enabled}
          onChange={(enabled) => updateVectorSpace({ enabled })}
          label={t('vector3d.enable')}
        />

        {vectorSpace.enabled && (
          <>
            {/* Axis editor: add/remove axes to change dimensionality. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {t('vector3d.dimensions')}
                </span>
                <button
                  type="button"
                  onClick={addAxis}
                  className="rounded-md bg-cyan-500/20 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/30"
                >
                  {t('vector3d.axis.add')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {axisEntries.map(([axisId, label]) => (
                  <div
                    key={axisId}
                    className="flex items-end gap-1"
                    data-testid={`axis-editor-${axisId}`}
                  >
                    <Field label={axisId}>
                      <TextField
                        value={label}
                        onChange={(newLabel) => renameAxis(axisId, newLabel)}
                        placeholder={axisId}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => removeAxis(axisId)}
                      className="mb-1 flex-shrink-0 rounded-md px-1.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                      title={t('vector3d.axis.remove')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {t('vector3d.sects.title', { n: vectorSpace.sects?.length ?? 0 })}
                </span>
                <button
                  type="button"
                  onClick={addSect}
                  className="rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/30"
                >
                  {t('vector3d.sects.add')}
                </button>
              </div>

              {(vectorSpace.sects ?? []).length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
                  {t('vector3d.sects.empty')}
                </p>
              )}

              <div className="space-y-2">
                {(vectorSpace.sects ?? []).map((sect) => (
                  <div
                    key={sect.id}
                    className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <TextField
                        value={sect.name}
                        onChange={(name) => updateSect(sect.id, { name })}
                        placeholder={t('vector3d.sects.namePh')}
                      />
                      <button
                        type="button"
                        onClick={() => removeSect(sect.id)}
                        className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                      >
                        {t('vector3d.sects.del')}
                      </button>
                    </div>
                    <Field label={t('vector3d.sects.titleField')}>
                      <TextField
                        value={sect.title}
                        onChange={(title) => updateSect(sect.id, { title })}
                        placeholder={t('vector3d.sects.titlePh')}
                      />
                    </Field>
                    <Field
                      label={t('vector3d.sects.anchor')}
                      hint={t('vector3d.sects.anchor.hint')}
                    >
                      <VectorEditor
                        value={sect.vector}
                        onChange={(vector) => updateSect(sect.id, { vector })}
                        labels={vectorSpace.dimensions}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const VectorSpaceSettings = memo(VectorSpaceSettingsImpl);
