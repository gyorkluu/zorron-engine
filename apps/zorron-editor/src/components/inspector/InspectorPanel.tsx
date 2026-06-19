/**
 * InspectorPanel - right panel that edits the selected node's fields.
 *
 * Dispatches to type-specific form sections based on the selected node's type.
 * All edits flow through `editorStore.updateNodeData` so the canvas stays in sync.
 */

import { memo, useCallback } from 'react';
import { useEditorStore, useSelectedNode } from '@/stores/editorStore';
import {
  NODE_TYPE_LABELS,
  NODE_TYPE_ACCENTS,
  type FlowNode,
  type StartNodeData,
  type SceneNodeData,
  type LogicNodeData,
  type SetterNodeData,
  type CalculatorNodeData,
  type SettlementNodeData,
  type VideoNodeData,
  type LinkNodeData,
} from '@/types/flow';
import { Field, TextField, TextAreaField, UrlField, SwitchField, SelectField, NumberField } from './fields/Field';
import { ChoicesEditor } from './fields/ChoicesEditor';
import { AssignmentsEditor } from './fields/AssignmentsEditor';
import { VectorEditor } from './fields/VectorEditor';
import { VectorSpaceSettings } from '@/components/vector3d/VectorSpaceSettings';
import { featureFlags } from '@/lib/featureFlags';

/** Empty state shown when no node is selected. */
function EmptyInspector() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-300">未选中节点</p>
        <p className="text-xs text-slate-500">
          在画布上点击节点以编辑其属性。
        </p>
      </div>
      {featureFlags.vector3d && (
        <div className="border-t border-slate-800 pt-3">
          <VectorSpaceSettings />
        </div>
      )}
    </div>
  );
}

/** Header showing the node type and id. */
function InspectorHeader({ node }: { node: FlowNode }) {
  const accent = NODE_TYPE_ACCENTS[node.type as keyof typeof NODE_TYPE_ACCENTS] ?? '#64748b';
  return (
    <div
      className="flex items-center justify-between border-b border-slate-800 px-4 py-3"
      style={{ background: `linear-gradient(90deg, ${accent}22, transparent)` }}
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-100">
          {NODE_TYPE_LABELS[node.type as keyof typeof NODE_TYPE_LABELS] ?? node.type}
        </h2>
        <p className="font-mono text-[10px] text-slate-500">{node.id}</p>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
        style={{ background: `${accent}33`, color: accent }}
      >
        {node.type}
      </span>
    </div>
  );
}

/** Form for a start node. */
function StartForm({ node, update }: { node: FlowNode; update: (data: Partial<StartNodeData>) => void }) {
  const d = node.data as StartNodeData;
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label="标题"><TextField value={d.title ?? ''} onChange={(title) => update({ title })} /></Field>
      <Field label="简介"><TextAreaField value={d.intro ?? ''} onChange={(intro) => update({ intro })} /></Field>
      <Field label="封面地址" hint="拖拽图片资源到此处。"><UrlField value={d.coverUrl ?? ''} onChange={(coverUrl) => update({ coverUrl })} /></Field>
    </div>
  );
}

/** Form for a scene node. */
function SceneForm({ node, update }: { node: FlowNode; update: (data: Partial<SceneNodeData>) => void }) {
  const d = node.data as SceneNodeData;
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label="说话人"><TextField value={d.speaker ?? ''} onChange={(speaker) => update({ speaker })} /></Field>
      <Field label="对话"><TextAreaField value={d.dialogue ?? ''} onChange={(dialogue) => update({ dialogue })} rows={4} /></Field>
      <Field label="背景地址" hint="拖拽图片资源到此处。"><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label="角色地址" hint="拖拽图片资源到此处。"><UrlField value={d.characterUrl ?? ''} onChange={(characterUrl) => update({ characterUrl })} /></Field>
      <Field label="背景音乐地址"><UrlField value={d.bgm ?? ''} onChange={(bgm) => update({ bgm })} /></Field>
      <ChoicesEditor choices={d.choices ?? []} onChange={(choices) => update({ choices })} />
    </div>
  );
}

/** Form for a logic node. */
function LogicForm({ node, update }: { node: FlowNode; update: (data: Partial<LogicNodeData>) => void }) {
  const d = node.data as LogicNodeData;
  const operators: ReadonlyArray<{ value: NonNullable<LogicNodeData['operator']>; label: string }> = [
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: '==', label: '==' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
  ];
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label="检查类型">
        <SelectField
          value={d.checkType ?? 'variable'}
          onChange={(checkType) => update({ checkType })}
          options={[
            { value: 'variable', label: '变量' },
            { value: 'count', label: '碎片数量' },
            { value: 'has-specific', label: '拥有碎片' },
          ]}
        />
      </Field>
      {d.checkType === 'variable' && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="变量"><TextField value={d.varName ?? ''} onChange={(varName) => update({ varName })} /></Field>
          <Field label="运算符">
            <SelectField value={d.operator ?? '>='} onChange={(operator) => update({ operator })} options={operators} />
          </Field>
          <Field label="值"><NumberField value={d.value ?? 0} onChange={(value) => update({ value })} /></Field>
        </div>
      )}
      {d.checkType === 'count' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="运算符">
            <SelectField value={d.operator ?? '>='} onChange={(operator) => update({ operator })} options={operators} />
          </Field>
          <Field label="阈值"><NumberField value={d.countThreshold ?? 0} onChange={(countThreshold) => update({ countThreshold })} /></Field>
        </div>
      )}
      {d.checkType === 'has-specific' && (
        <Field label="碎片 ID"><TextField value={d.targetFragmentId ?? ''} onChange={(targetFragmentId) => update({ targetFragmentId })} /></Field>
      )}
    </div>
  );
}

/** Form for a setter node. */
function SetterForm({ node, update }: { node: FlowNode; update: (data: Partial<SetterNodeData>) => void }) {
  const d = node.data as SetterNodeData;
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <AssignmentsEditor assignments={d.assignments ?? []} onChange={(assignments) => update({ assignments })} />
    </div>
  );
}

/** Form for a calculator node. */
function CalculatorForm({ node, update }: { node: FlowNode; update: (data: Partial<CalculatorNodeData>) => void }) {
  const d = node.data as CalculatorNodeData;
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label="描述"><TextAreaField value={d.description ?? ''} onChange={(description) => update({ description })} rows={2} /></Field>
      <Field label="向量增量" hint="在遍历时应用到人格向量。">
        <VectorEditor value={d.vector ?? { x: 0, y: 0, z: 0 }} onChange={(vector) => update({ vector })} />
      </Field>
      <Field label="目标变量" hint="可选：将向量长度存入此变量。">
        <TextField value={d.targetVariable ?? ''} onChange={(targetVariable) => update({ targetVariable })} placeholder="向量长度" />
      </Field>
    </div>
  );
}

/** Form for a settlement node. */
function SettlementForm({ node, update }: { node: FlowNode; update: (data: Partial<SettlementNodeData>) => void }) {
  const d = node.data as SettlementNodeData;
  const mappings = d.resultMapping ?? [];
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            结果 ({mappings.length})
          </span>
          <button
            type="button"
            onClick={() =>
              update({
                resultMapping: [
                  ...mappings,
                  { resultId: `r_${mappings.length + 1}`, title: '新结果' },
                ],
              })
            }
            className="rounded-md bg-pink-500/20 px-2 py-1 text-xs text-pink-200 hover:bg-pink-500/30"
          >
            + 添加
          </button>
        </div>
        {mappings.map((m, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
            <div className="flex items-center gap-2">
              <TextField value={m.title} onChange={(title) => {
                const next = [...mappings];
                next[i] = { ...m, title };
                update({ resultMapping: next });
              }} />
              <button
                type="button"
                onClick={() => update({ resultMapping: mappings.filter((_, idx) => idx !== i) })}
                className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                删除
              </button>
            </div>
            <TextAreaField value={m.description ?? ''} onChange={(description) => {
              const next = [...mappings];
              next[i] = { ...m, description };
              update({ resultMapping: next });
            }} rows={2} placeholder="描述" />
          </div>
        ))}
      </div>
      {featureFlags.vector3d && (
        <div className="border-t border-slate-800 pt-3">
          <VectorSpaceSettings />
        </div>
      )}
    </div>
  );
}

/** Form for a video node. */
function VideoForm({ node, update }: { node: FlowNode; update: (data: Partial<VideoNodeData>) => void }) {
  const d = node.data as VideoNodeData;
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label="视频地址" hint="拖拽视频资源到此处。"><UrlField value={d.videoUrl ?? ''} onChange={(videoUrl) => update({ videoUrl })} /></Field>
      <SwitchField checked={d.autoPlay} onChange={(autoPlay) => update({ autoPlay })} label="自动播放" />
      <SwitchField checked={d.skipAllowed} onChange={(skipAllowed) => update({ skipAllowed })} label="允许跳过" />
    </div>
  );
}

/** Form for a link node. */
function LinkForm({ node, update }: { node: FlowNode; update: (data: Partial<LinkNodeData>) => void }) {
  const d = node.data as LinkNodeData;
  return (
    <div className="space-y-3">
      <Field label="标签"><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label="标题"><TextField value={d.title ?? ''} onChange={(title) => update({ title })} /></Field>
      <Field label="地址"><UrlField value={d.url ?? ''} onChange={(url) => update({ url })} /></Field>
      <Field label="描述"><TextAreaField value={d.description ?? ''} onChange={(description) => update({ description })} rows={2} /></Field>
    </div>
  );
}

function InspectorPanelImpl() {
  const node = useSelectedNode();
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const removeNode = useEditorStore((s) => s.removeNode);

  const update = useCallback(
    (data: Record<string, unknown>) => {
      if (node) updateNodeData(node.id, data);
    },
    [node, updateNodeData],
  );

  if (!node) {
    return (
      <aside className="flex h-full w-80 flex-col border-l border-slate-800/60 bg-slate-950/40 backdrop-blur-sm">
        <EmptyInspector />
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-80 flex-col border-l border-slate-800/60 bg-slate-950/40 backdrop-blur-sm">
      <InspectorHeader node={node} />
      <div className="flex-1 overflow-y-auto p-4">
        {node.type === 'start' && <StartForm node={node} update={update} />}
        {node.type === 'scene' && <SceneForm node={node} update={update} />}
        {node.type === 'logic' && <LogicForm node={node} update={update} />}
        {node.type === 'setter' && <SetterForm node={node} update={update} />}
        {node.type === 'calculator' && <CalculatorForm node={node} update={update} />}
        {node.type === 'settlement' && <SettlementForm node={node} update={update} />}
        {node.type === 'video' && <VideoForm node={node} update={update} />}
        {node.type === 'link' && <LinkForm node={node} update={update} />}
      </div>
      <div className="flex gap-2 border-t border-slate-800/60 p-3">
        <button
          type="button"
          onClick={() => duplicateNode(node.id)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          复制
        </button>
        <button
          type="button"
          onClick={() => removeNode(node.id)}
          className="flex-1 rounded-lg border border-rose-700/50 bg-rose-900/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-900/50"
        >
          删除
        </button>
      </div>
    </aside>
  );
}

export const InspectorPanel = memo(InspectorPanelImpl);
