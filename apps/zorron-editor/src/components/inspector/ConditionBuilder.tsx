/**
 * ConditionBuilder (P2-4) - visual editor for boolean condition expressions.
 *
 * Renders an editable list of conditions (operand operator operand) joined by
 * AND/OR connectors with optional NOT negation. The list is serialized to a
 * string expression via `conditionsToExpr` and reported through `onChange`.
 * When an incoming `value` cannot be parsed back into the structured form, the
 * raw string is shown as a read-only preview until the user adds a new
 * condition (which overwrites it).
 */

import { memo, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useT } from '@/i18n/useT';

/** Props for the ConditionBuilder. */
export interface ConditionBuilderProps {
  /** Current condition expression string (e.g., "score >= 10"). */
  value: string;
  /** Called when the condition changes. */
  onChange: (value: string) => void;
  /** Available variable names from the project. */
  variables?: string[];
  /** Available fragment IDs from the project. */
  fragmentIds?: string[];
  /** Optional extra className for the root element. */
  className?: string;
}

/** The kind of value an operand refers to. */
type OperandType = 'var' | 'frag' | 'const';

/** A single operand of a comparison. */
interface Operand {
  type: OperandType;
  /** Variable name, fragment id, or constant value (as a string). */
  value: string;
}

/** Comparison operators supported by the builder. */
type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

/** A single structured condition row. */
interface ConditionItem {
  id: string;
  left: Operand;
  operator: ComparisonOperator;
  right: Operand;
  /** Logical connector joining this condition to the next one. */
  connector: 'AND' | 'OR';
  /** Whether this condition is negated with NOT. */
  negate: boolean;
}

/** Serialize an operand to its expression fragment. */
function operandToExpr(op: Operand): string {
  switch (op.type) {
    case 'var':
      return op.value;
    case 'frag':
      return `fragCount("${op.value}")`;
    case 'const':
      return op.value;
  }
}

/** Serialize a list of conditions into a single expression string. */
function conditionsToExpr(items: ConditionItem[]): string {
  if (items.length === 0) return '';
  const parts = items.map((item, i) => {
    const expr = `${operandToExpr(item.left)} ${item.operator} ${operandToExpr(item.right)}`;
    const negated = item.negate ? `NOT (${expr})` : `(${expr})`;
    if (i < items.length - 1) {
      return `${negated} ${item.connector}`;
    }
    return negated;
  });
  return parts.join(' ');
}

/** Parse a single operand token; returns null if it cannot be recognized. */
function parseOperand(s: string): Operand | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const fragMatch = trimmed.match(/^fragCount\("(.*)"\)$/);
  if (fragMatch) return { type: 'frag', value: fragMatch[1] };
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return { type: 'const', value: trimmed };
  return { type: 'var', value: trimmed };
}

/**
 * Best-effort parser that reverses `conditionsToExpr`.
 *
 * Returns an empty array when the expression cannot be recognized, which
 * triggers the read-only raw preview fallback in the UI.
 */
function parseConditions(expr: string): ConditionItem[] {
  const trimmed = expr.trim();
  if (!trimmed) return [];

  // Split on top-level " AND " / " OR " connectors between parenthesized groups.
  const parts = trimmed.split(/\s+(AND|OR)\s+/);
  if (parts.length % 2 === 0) return []; // malformed: expect group (conn group)*

  const items: ConditionItem[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const groupStr = parts[i];
    const connector = i + 1 < parts.length ? (parts[i + 1] as 'AND' | 'OR') : 'AND';

    const groupMatch = groupStr.match(/^(NOT\s+)?\((.+)\)$/);
    if (!groupMatch) return [];
    const negate = !!groupMatch[1];
    const inner = groupMatch[2];

    const innerMatch = inner.match(/^(.+?)\s+(==|!=|>=|<=|>|<)\s+(.+)$/);
    if (!innerMatch) return [];
    const left = parseOperand(innerMatch[1]);
    const right = parseOperand(innerMatch[3]);
    if (!left || !right) return [];

    items.push({
      id: nanoid(6),
      left,
      operator: innerMatch[2] as ComparisonOperator,
      right,
      connector,
      negate,
    });
  }
  return items;
}

/** Shared input/select class for compact inline controls. */
const CONTROL_CLASS =
  'rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-100 outline-none transition-colors focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30';

/** Operand type selector options. */
const OPERAND_TYPE_OPTIONS: ReadonlyArray<{ value: OperandType; key: 'cond.operand.var' | 'cond.operand.frag' | 'cond.operand.const' }> = [
  { value: 'var', key: 'cond.operand.var' },
  { value: 'frag', key: 'cond.operand.frag' },
  { value: 'const', key: 'cond.operand.const' },
];

/** Comparison operator selector options. */
const OPERATOR_OPTIONS: ReadonlyArray<{ value: ComparisonOperator; key: 'cond.operator.eq' | 'cond.operator.ne' | 'cond.operator.gt' | 'cond.operator.lt' | 'cond.operator.ge' | 'cond.operator.le' }> = [
  { value: '==', key: 'cond.operator.eq' },
  { value: '!=', key: 'cond.operator.ne' },
  { value: '>', key: 'cond.operator.gt' },
  { value: '<', key: 'cond.operator.lt' },
  { value: '>=', key: 'cond.operator.ge' },
  { value: '<=', key: 'cond.operator.le' },
];

/** Pick a sensible default value when an operand's type changes. */
function defaultOperandValue(type: OperandType, variables: string[], fragmentIds: string[]): string {
  switch (type) {
    case 'var':
      return variables[0] ?? '';
    case 'frag':
      return fragmentIds[0] ?? '';
    case 'const':
      return '0';
  }
}

/** Render the value input appropriate for an operand's type. */
function OperandValueInput({
  operand,
  variables,
  fragmentIds,
  onChange,
}: {
  operand: Operand;
  variables: string[];
  fragmentIds: string[];
  onChange: (value: string) => void;
}) {
  if (operand.type === 'var') {
    if (variables.length === 0) {
      return (
        <input
          type="text"
          value={operand.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="var"
          className={`${CONTROL_CLASS} w-24`}
        />
      );
    }
    return (
      <select
        value={operand.value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL_CLASS} w-24`}
      >
        {variables.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }
  if (operand.type === 'frag') {
    if (fragmentIds.length === 0) {
      return (
        <input
          type="text"
          value={operand.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="frag_id"
          className={`${CONTROL_CLASS} w-24`}
        />
      );
    }
    return (
      <select
        value={operand.value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL_CLASS} w-24`}
      >
        {fragmentIds.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="number"
      value={operand.value}
      onChange={(e) => onChange(e.target.value)}
      className={`${CONTROL_CLASS} w-20`}
    />
  );
}

/** A single condition row with operand/operator controls and connector. */
function ConditionRow({
  item,
  index,
  total,
  variables,
  fragmentIds,
  onUpdate,
  onRemove,
}: {
  item: ConditionItem;
  index: number;
  total: number;
  variables: string[];
  fragmentIds: string[];
  onUpdate: (patch: Partial<ConditionItem>) => void;
  onRemove: () => void;
}) {
  const { t } = useT();
  const isLast = index === total - 1;

  const updateOperand = (side: 'left' | 'right', patch: Partial<Operand>) => {
    onUpdate({ [side]: { ...item[side], ...patch } } as Partial<ConditionItem>);
  };

  const changeOperandType = (side: 'left' | 'right', type: OperandType) => {
    const value = defaultOperandValue(type, variables, fragmentIds);
    updateOperand(side, { type, value });
  };

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Left operand type */}
        <select
          value={item.left.type}
          onChange={(e) => changeOperandType('left', e.target.value as OperandType)}
          className={CONTROL_CLASS}
        >
          {OPERAND_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.key)}
            </option>
          ))}
        </select>
        {/* Left operand value */}
        <OperandValueInput
          operand={item.left}
          variables={variables}
          fragmentIds={fragmentIds}
          onChange={(value) => updateOperand('left', { value })}
        />
        {/* Operator */}
        <select
          value={item.operator}
          onChange={(e) => onUpdate({ operator: e.target.value as ComparisonOperator })}
          className={CONTROL_CLASS}
        >
          {OPERATOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.key)}
            </option>
          ))}
        </select>
        {/* Right operand type */}
        <select
          value={item.right.type}
          onChange={(e) => changeOperandType('right', e.target.value as OperandType)}
          className={CONTROL_CLASS}
        >
          {OPERAND_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.key)}
            </option>
          ))}
        </select>
        {/* Right operand value */}
        <OperandValueInput
          operand={item.right}
          variables={variables}
          fragmentIds={fragmentIds}
          onChange={(value) => updateOperand('right', { value })}
        />
      </div>
      <div className="flex items-center gap-2">
        {/* Connector to next condition (hidden for the last row) */}
        {!isLast && (
          <select
            value={item.connector}
            onChange={(e) => onUpdate({ connector: e.target.value as 'AND' | 'OR' })}
            className={CONTROL_CLASS}
          >
            <option value="AND">{t('cond.and')}</option>
            <option value="OR">{t('cond.or')}</option>
          </select>
        )}
        {/* NOT toggle */}
        <label className="flex items-center gap-1 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={item.negate}
            onChange={(e) => onUpdate({ negate: e.target.checked })}
            className="h-3 w-3 accent-cyan-500"
          />
          {t('cond.not')}
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded-md px-2 py-1 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/20"
        >
          {t('cond.del')}
        </button>
      </div>
    </div>
  );
}

function ConditionBuilderImpl({
  value,
  onChange,
  variables = [],
  fragmentIds = [],
  className,
}: ConditionBuilderProps) {
  const { t } = useT();
  const [items, setItems] = useState<ConditionItem[]>(() => parseConditions(value));
  /** Marks the next `value` effect as originating from our own emit (skip re-parse). */
  const internalChange = useRef(false);

  useEffect(() => {
    if (internalChange.current) {
      internalChange.current = false;
      return;
    }
    setItems(parseConditions(value));
  }, [value]);

  /** Update local state and propagate the serialized expression upward. */
  const emit = (next: ConditionItem[]) => {
    setItems(next);
    internalChange.current = true;
    onChange(conditionsToExpr(next));
  };

  const updateItem = (id: string, patch: Partial<ConditionItem>) => {
    emit(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    emit(items.filter((it) => it.id !== id));
  };

  const addItem = () => {
    const newItem: ConditionItem = {
      id: nanoid(6),
      left: { type: 'var', value: defaultOperandValue('var', variables, fragmentIds) },
      operator: '>=',
      right: { type: 'const', value: '0' },
      connector: 'AND',
      negate: false,
    };
    emit([...items, newItem]);
  };

  // When the incoming value is non-empty but unparseable, show it read-only.
  const isRaw = value.trim() !== '' && items.length === 0;
  const preview = items.length > 0 ? conditionsToExpr(items) : '';

  return (
    <div
      className={[
        'flex flex-col gap-2 rounded-xl border border-slate-700/50 bg-slate-900/40 p-3',
        className ?? '',
      ].join(' ')}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {t('cond.title')}
      </h3>

      {isRaw ? (
        <div className="space-y-2">
          <p className="rounded-lg border border-amber-700/40 bg-amber-900/20 p-2 text-[11px] text-amber-200">
            {value}
          </p>
          <p className="text-[10px] text-slate-500">
            {t('cond.empty')}
          </p>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
          {t('cond.empty')}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <ConditionRow
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              variables={variables}
              fragmentIds={fragmentIds}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addItem}
        className="rounded-md bg-cyan-500/20 px-2 py-1.5 text-xs text-cyan-200 transition-colors hover:bg-cyan-500/30"
      >
        {t('cond.add')}
      </button>

      <div className="border-t border-slate-800/60 pt-2">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {t('cond.preview')}
        </p>
        {preview ? (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-slate-950/60 p-2 font-mono text-[11px] text-emerald-300">
            {preview}
          </pre>
        ) : isRaw ? null : (
          <p className="text-[11px] text-slate-500">{t('cond.preview.empty')}</p>
        )}
      </div>
    </div>
  );
}

export const ConditionBuilder = memo(ConditionBuilderImpl);
