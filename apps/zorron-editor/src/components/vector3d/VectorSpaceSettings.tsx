/**
 * VectorSpaceSettings - inspector section for editing the vector space config.
 *
 * Allows the user to:
 * - Toggle the vector space on/off.
 * - Edit the dimension labels (X/Y/Z).
 * - Add/remove/edit sect anchors (id, name, vector, title).
 *
 * Wired to `projectStore.setSettings` so changes flow into the project's
 * FlowData and are persisted on save.
 */

import { memo, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Field, TextField, SwitchField } from '@/components/inspector/fields/Field';
import { VectorEditor } from '@/components/inspector/fields/VectorEditor';
import type { SectAnchor, VectorSpaceConfig, ProjectSettings } from '@/types/flow';
import { nanoid } from 'nanoid';

/** Props for the VectorSpaceSettings. */
export interface VectorSpaceSettingsProps {
  /** Optional class name. */
  className?: string;
}

function VectorSpaceSettingsImpl({ className }: VectorSpaceSettingsProps) {
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
    (id: string, patch: Partial<SectAnchor>) => {
      const sects = (vectorSpace.sects ?? []).map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      );
      updateVectorSpace({ sects });
    },
    [vectorSpace.sects, updateVectorSpace],
  );

  /** Add a new sect anchor with a default vector. */
  const addSect = useCallback(() => {
    const sects = vectorSpace.sects ?? [];
    const newSect: SectAnchor = {
      id: `sect_${nanoid(6)}`,
      name: `宗派 ${sects.length + 1}`,
      vector: { x: 0, y: 0, z: 0 },
      title: `宗派 ${sects.length + 1}`,
    };
    updateVectorSpace({ sects: [...sects, newSect] });
  }, [vectorSpace.sects, updateVectorSpace]);

  /** Remove a sect anchor by id. */
  const removeSect = useCallback(
    (id: string) => {
      const sects = (vectorSpace.sects ?? []).filter((s) => s.id !== id);
      updateVectorSpace({ sects });
    },
    [vectorSpace.sects, updateVectorSpace],
  );

  return (
    <div className={className} data-testid="vector-space-settings">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          向量空间
        </h3>
      </div>

      <div className="space-y-3">
        <SwitchField
          checked={vectorSpace.enabled}
          onChange={(enabled) => updateVectorSpace({ enabled })}
          label="启用 3D 向量空间"
        />

        {vectorSpace.enabled && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Field label="X 轴">
                <TextField
                  value={vectorSpace.dimensions.x}
                  onChange={(x) =>
                    updateVectorSpace({
                      dimensions: { ...vectorSpace.dimensions, x },
                    })
                  }
                  placeholder="处世"
                />
              </Field>
              <Field label="Y 轴">
                <TextField
                  value={vectorSpace.dimensions.y}
                  onChange={(y) =>
                    updateVectorSpace({
                      dimensions: { ...vectorSpace.dimensions, y },
                    })
                  }
                  placeholder="立场"
                />
              </Field>
              <Field label="Z 轴">
                <TextField
                  value={vectorSpace.dimensions.z}
                  onChange={(z) =>
                    updateVectorSpace({
                      dimensions: { ...vectorSpace.dimensions, z },
                    })
                  }
                  placeholder="性情"
                />
              </Field>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  宗派锚点 ({vectorSpace.sects?.length ?? 0})
                </span>
                <button
                  type="button"
                  onClick={addSect}
                  className="rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/30"
                >
                  + 添加宗派
                </button>
              </div>

              {(vectorSpace.sects ?? []).length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
                  暂无宗派锚点。添加一个以定义人格原型。
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
                        placeholder="宗派名称"
                      />
                      <button
                        type="button"
                        onClick={() => removeSect(sect.id)}
                        className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                      >
                        删除
                      </button>
                    </div>
                    <Field label="标题">
                      <TextField
                        value={sect.title}
                        onChange={(title) => updateSect(sect.id, { title })}
                        placeholder="显示标题"
                      />
                    </Field>
                    <Field
                      label="锚点向量"
                      hint="此宗派在 3D 空间中的位置。"
                    >
                      <VectorEditor
                        value={sect.vector}
                        onChange={(vector) => updateSect(sect.id, { vector })}
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
