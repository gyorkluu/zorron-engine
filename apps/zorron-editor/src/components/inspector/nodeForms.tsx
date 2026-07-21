/**
 * Per-node-type inspector forms.
 *
 * Extracted from InspectorPanel.tsx so each form can be registered against
 * its node type via the NodeDefinition registry (`definitions.ts`) instead of
 * being dispatched by an `if (node.type === '...')` chain. Form props preserve
 * the original `{ node, update }` contract.
 */

import { useT } from '@/i18n/useT';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { featureFlags } from '@/lib/featureFlags';
import { settlementStrategyRegistry, STRATEGY_IDS } from '@/engine/settlementStrategies';
import {
  Field,
  TextField,
  TextAreaField,
  UrlField,
  SwitchField,
  SelectField,
  NumberField,
} from './fields/Field';
import { ChoicesEditor } from './fields/ChoicesEditor';
import { AssignmentsEditor } from './fields/AssignmentsEditor';
import { VectorEditor } from './fields/VectorEditor';
import { ConditionBuilder } from './ConditionBuilder';
import { VectorSpaceSettings } from '@/components/vector3d/VectorSpaceSettings';
import type {
  FlowNode,
  StartNodeData,
  SceneNodeData,
  LogicNodeData,
  SetterNodeData,
  CalculatorNodeData,
  SettlementNodeData,
  VideoNodeData,
  LinkNodeData,
  MinigameNodeData,
  RatingNodeData,
  MultiSelectNodeData,
  MediaNodeData,
} from '@/types/flow';

/** Form for a start node. */
export function StartForm({ node, update }: { node: FlowNode; update: (data: Partial<StartNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as StartNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.title')}><TextField value={d.title ?? ''} onChange={(title) => update({ title })} /></Field>
      <Field label={t('field.intro')}><TextAreaField value={d.intro ?? ''} onChange={(intro) => update({ intro })} /></Field>
      <Field label={t('field.coverUrl')} hint={t('field.dragImage')}><UrlField value={d.coverUrl ?? ''} onChange={(coverUrl) => update({ coverUrl })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
    </div>
  );
}

/** Form for a scene node. */
export function SceneForm({ node, update }: { node: FlowNode; update: (data: Partial<SceneNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as SceneNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.speaker')}><TextField value={d.speaker ?? ''} onChange={(speaker) => update({ speaker })} /></Field>
      <Field label={t('field.dialogue')}><TextAreaField value={d.dialogue ?? ''} onChange={(dialogue) => update({ dialogue })} rows={4} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.charUrl')} hint={t('field.dragImage')}><UrlField value={d.characterUrl ?? ''} onChange={(characterUrl) => update({ characterUrl })} /></Field>
      <Field label={t('field.bgmUrl')}><UrlField value={d.bgm ?? ''} onChange={(bgm) => update({ bgm })} /></Field>
      <ChoicesEditor choices={d.choices ?? []} onChange={(choices) => update({ choices })} />
    </div>
  );
}

/** Form for a logic node. */
export function LogicForm({ node, update }: { node: FlowNode; update: (data: Partial<LogicNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as LogicNodeData;
  const variables = useProjectStore((s) => Object.keys(s.variables));
  const nodes = useEditorStore((s) => s.nodes);
  // Collect fragment IDs from scene choices for the condition builder.
  const fragmentIds = nodes
    .filter((n) => n.type === 'scene')
    .flatMap((n) => {
      const data = n.data as { choices?: Array<{ dropFragmentId?: string }> };
      return (data.choices ?? []).map((c) => c.dropFragmentId).filter((id): id is string => Boolean(id));
    });
  const operators: ReadonlyArray<{ value: NonNullable<LogicNodeData['operator']>; label: string }> = [
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: '==', label: '==' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
  ];
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.checkType')}>
        <SelectField
          value={d.checkType ?? 'variable'}
          onChange={(checkType) => update({ checkType })}
          options={[
            { value: 'variable', label: t('checkType.variable') },
            { value: 'count', label: t('checkType.count') },
            { value: 'has-specific', label: t('checkType.has') },
          ]}
        />
      </Field>
      {d.checkType === 'variable' && (
        <div className="grid grid-cols-3 gap-2">
          <Field label={t('field.variable')}><TextField value={d.varName ?? ''} onChange={(varName) => update({ varName })} /></Field>
          <Field label={t('field.operator')}>
            <SelectField value={d.operator ?? '>='} onChange={(operator) => update({ operator })} options={operators} />
          </Field>
          <Field label={t('field.value')}><NumberField value={d.value ?? 0} onChange={(value) => update({ value })} /></Field>
        </div>
      )}
      {d.checkType === 'count' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('field.operator')}>
            <SelectField value={d.operator ?? '>='} onChange={(operator) => update({ operator })} options={operators} />
          </Field>
          <Field label={t('field.threshold')}><NumberField value={d.countThreshold ?? 0} onChange={(countThreshold) => update({ countThreshold })} /></Field>
        </div>
      )}
      {d.checkType === 'has-specific' && (
        <Field label={t('field.fragmentId')}><TextField value={d.targetFragmentId ?? ''} onChange={(targetFragmentId) => update({ targetFragmentId })} /></Field>
      )}
      {/* P2-4: Advanced condition builder for complex multi-clause expressions. */}
      <div className="border-t border-slate-800 pt-3">
        <ConditionBuilder
          value={d.condition ?? ''}
          onChange={(condition) => update({ condition })}
          variables={variables}
          fragmentIds={fragmentIds}
        />
      </div>
    </div>
  );
}

/** Form for a setter node. */
export function SetterForm({ node, update }: { node: FlowNode; update: (data: Partial<SetterNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as SetterNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <AssignmentsEditor assignments={d.assignments ?? []} onChange={(assignments) => update({ assignments })} />
    </div>
  );
}

/** Form for a calculator node. */
export function CalculatorForm({ node, update }: { node: FlowNode; update: (data: Partial<CalculatorNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as CalculatorNodeData;
  const dimensions = useProjectStore((s) => s.settings.vectorSpace?.dimensions ?? {});
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.description')}><TextAreaField value={d.description ?? ''} onChange={(description) => update({ description })} rows={2} /></Field>
      <Field label={t('field.vectorDelta')} hint={t('field.vectorDelta.hint')}>
        <VectorEditor value={d.vector ?? {}} onChange={(vector) => update({ vector })} labels={dimensions} />
      </Field>
      <Field label={t('field.targetVar')} hint={t('field.targetVar.hint')}>
        <TextField value={d.targetVariable ?? ''} onChange={(targetVariable) => update({ targetVariable })} placeholder={t('field.targetVar.ph')} />
      </Field>
    </div>
  );
}

/** Form for a settlement node. */
export function SettlementForm({ node, update }: { node: FlowNode; update: (data: Partial<SettlementNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as SettlementNodeData;
  const mappings = d.resultMapping ?? [];
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.strategy') ?? 'Strategy'}>
        <SelectField
          value={d.strategy ?? STRATEGY_IDS.VECTOR_NEAREST}
          onChange={(strategy) => update({ strategy })}
          options={settlementStrategyRegistry.list().map((s) => ({
            value: s.id,
            label: s.name,
          }))}
        />
      </Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {t('results.title', { n: mappings.length })}
          </span>
          <button
            type="button"
            onClick={() =>
              update({
                resultMapping: [
                  ...mappings,
                  { resultId: `r_${mappings.length + 1}`, title: t('results.newDefault') },
                ],
              })
            }
            className="rounded-md bg-pink-500/20 px-2 py-1 text-xs text-pink-200 hover:bg-pink-500/30"
          >
            {t('results.add')}
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
                {t('results.del')}
              </button>
            </div>
            <TextAreaField value={m.description ?? ''} onChange={(description) => {
              const next = [...mappings];
              next[i] = { ...m, description };
              update({ resultMapping: next });
            }} rows={2} placeholder={t('results.descPh')} />
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
export function VideoForm({ node, update }: { node: FlowNode; update: (data: Partial<VideoNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as VideoNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.videoUrl')} hint={t('field.dragVideo')}><UrlField value={d.videoUrl ?? ''} onChange={(videoUrl) => update({ videoUrl })} /></Field>
      <SwitchField checked={d.autoPlay} onChange={(autoPlay) => update({ autoPlay })} label={t('field.autoPlay')} />
      <SwitchField checked={d.skipAllowed} onChange={(skipAllowed) => update({ skipAllowed })} label={t('field.allowSkip')} />
    </div>
  );
}

/** Form for a link node. */
export function LinkForm({ node, update }: { node: FlowNode; update: (data: Partial<LinkNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as LinkNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.title')}><TextField value={d.title ?? ''} onChange={(title) => update({ title })} /></Field>
      <Field label={t('field.url')}><UrlField value={d.url ?? ''} onChange={(url) => update({ url })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.description')}><TextAreaField value={d.description ?? ''} onChange={(description) => update({ description })} rows={2} /></Field>
    </div>
  );
}

/** Form for a minigame node. */
export function MinigameForm({ node, update }: { node: FlowNode; update: (data: Partial<MinigameNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as MinigameNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.gameUrl')}><UrlField value={d.gameUrl ?? ''} onChange={(gameUrl) => update({ gameUrl })} /></Field>
      <Field label={t('field.scoreVariable')}><TextField value={d.scoreVariable ?? ''} onChange={(scoreVariable) => update({ scoreVariable })} /></Field>
      <Field label={t('field.passingScore')}><NumberField value={d.passingScore ?? 0} onChange={(passingScore) => update({ passingScore })} /></Field>
    </div>
  );
}

/** Form for a rating node. */
export function RatingForm({ node, update }: { node: FlowNode; update: (data: Partial<RatingNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as RatingNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.prompt')}><TextField value={d.prompt ?? ''} onChange={(prompt) => update({ prompt })} /></Field>
      <Field label={t('field.variable')}><TextField value={d.variable ?? ''} onChange={(variable) => update({ variable })} /></Field>
      <Field label={t('field.min')}><NumberField value={d.min} onChange={(min) => update({ min })} /></Field>
      <Field label={t('field.max')}><NumberField value={d.max} onChange={(max) => update({ max })} /></Field>
      <Field label={t('field.step')}><NumberField value={d.step ?? 1} onChange={(step) => update({ step })} /></Field>
    </div>
  );
}

/** Form for a multi-select node. */
export function MultiSelectForm({ node, update }: { node: FlowNode; update: (data: Partial<MultiSelectNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as MultiSelectNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.variable')}><TextField value={d.variable ?? ''} onChange={(variable) => update({ variable })} /></Field>
      <Field label={t('field.minSelect')}><NumberField value={d.minSelect ?? 0} onChange={(minSelect) => update({ minSelect })} /></Field>
      <Field label={t('field.maxSelect')}><NumberField value={d.maxSelect ?? 0} onChange={(maxSelect) => update({ maxSelect })} /></Field>
      <Field label={t('field.options')}>
        <div className="space-y-2">
          {(d.options ?? []).map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input
                type="text"
                value={opt.label}
                onChange={(e) => {
                  const options = [...(d.options ?? [])];
                  options[i] = { ...opt, label: e.target.value };
                  update({ options });
                }}
                className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              />
              <button
                type="button"
                onClick={() => {
                  const options = (d.options ?? []).filter((_, idx) => idx !== i);
                  update({ options });
                }}
                className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const options = [...(d.options ?? []), { id: `opt_${Date.now()}`, label: '' }];
              update({ options });
            }}
            className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
          >
            {t('field.addOption')}
          </button>
        </div>
      </Field>
    </div>
  );
}

/** Form for a media node. */
export function MediaForm({ node, update }: { node: FlowNode; update: (data: Partial<MediaNodeData>) => void }) {
  const { t } = useT();
  const d = node.data as MediaNodeData;
  return (
    <div className="space-y-3">
      <Field label={t('field.label')}><TextField value={d.label ?? ''} onChange={(label) => update({ label })} /></Field>
      <Field label={t('field.bgUrl')} hint={t('field.dragImage')}><UrlField value={d.backgroundUrl ?? ''} onChange={(backgroundUrl) => update({ backgroundUrl })} /></Field>
      <Field label={t('field.mediaType')}>
        <SelectField
          value={d.mediaType}
          onChange={(mediaType) => update({ mediaType: mediaType as MediaNodeData['mediaType'] })}
          options={[
            { value: 'image', label: t('field.image') },
            { value: 'audio', label: t('field.audio') },
            { value: 'video', label: t('field.video') },
          ]}
        />
      </Field>
      <Field label={t('field.url')}><UrlField value={d.url ?? ''} onChange={(url) => update({ url })} /></Field>
      <SwitchField checked={d.autoAdvance ?? false} onChange={(autoAdvance) => update({ autoAdvance })} label={t('field.autoAdvance')} />
      <Field label={t('field.durationMs')}><NumberField value={d.durationMs ?? 0} onChange={(durationMs) => update({ durationMs })} /></Field>
    </div>
  );
}
