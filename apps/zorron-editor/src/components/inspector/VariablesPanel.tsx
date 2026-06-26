/**
 * VariablesPanel - P2-1 project variables management panel.
 *
 * Lists all project variables with inline name/type/value editing and a live
 * reference count derived from the editor's nodes (setter assignments, logic
 * varName, calculator targetVariable). Deletions of referenced variables
 * require confirmation.
 */

import { memo, useCallback, useMemo } from 'react';
import { useT } from '@/i18n/useT';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import type { FlowNode, VariableValue, Variables } from '@/types/flow';
import { cn } from '@/lib/utils';

/** Props for the VariablesPanel. */
export interface VariablesPanelProps {
  /** Optional class name. */
  className?: string;
}

/** Variable type discriminator used by the type selector. */
type VarType = 'string' | 'number' | 'boolean';

/**
 * Infer the runtime type of a variable value.
 *
 * @param value - The variable value to inspect.
 * @returns The matching VarType (defaults to 'string').
 */
function inferType(value: VariableValue): VarType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Count how many nodes reference a variable by name.
 *
 * Checks setter assignments (`variable`), logic nodes (`varName`) and
 * calculator nodes (`targetVariable`).
 *
 * @param varName - The variable name to search for.
 * @param nodes  - The current canvas nodes.
 * @returns The total reference count across all nodes.
 */
function countVariableReferences(varName: string, nodes: FlowNode[]): number {
  let count = 0;
  for (const node of nodes) {
    const data = node.data as Record<string, unknown>;
    // Setter assignments
    if ('assignments' in data && Array.isArray(data.assignments)) {
      count += data.assignments.filter(
        (a) =>
          typeof a === 'object' &&
          a !== null &&
          'variable' in a &&
          (a as { variable: unknown }).variable === varName,
      ).length;
    }
    // Logic varName
    if ('varName' in data && data.varName === varName) {
      count += 1;
    }
    // Calculator targetVariable
    if ('targetVariable' in data && data.targetVariable === varName) {
      count += 1;
    }
  }
  return count;
}

/**
 * Coerce a value to the target type. Booleans default to `true`, numbers to
 * `0` (when not parseable), strings use `String()`.
 *
 * @param value - The current value.
 * @param type  - The target type.
 * @returns The coerced value.
 */
function coerceType(value: VariableValue, type: VarType): VariableValue {
  switch (type) {
    case 'string':
      return String(value);
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    case 'boolean':
      return true;
  }
}

function VariablesPanelImpl({ className }: VariablesPanelProps) {
  const { t } = useT();
  const variables = useProjectStore((s) => s.variables);
  const setVariables = useProjectStore((s) => s.setVariables);
  const nodes = useEditorStore((s) => s.nodes);

  /** Build the next variables object immutably and persist it. */
  const commit = useCallback(
    (next: Variables) => {
      setVariables(next);
    },
    [setVariables],
  );

  /** Add a new variable with an auto-incremented default name. */
  const handleAdd = useCallback(() => {
    let i = 1;
    while (`var_new_${i}` in variables) i += 1;
    commit({ ...variables, [`var_new_${i}`]: '' });
  }, [variables, commit]);

  /** Rename a variable (preserving order). */
  const handleRename = useCallback(
    (oldName: string, newName: string) => {
      if (!newName || newName === oldName) return;
      // Avoid clobbering an existing variable.
      if (newName in variables) return;
      const next: Variables = {};
      for (const [k, v] of Object.entries(variables)) {
        next[k === oldName ? newName : k] = v;
      }
      commit(next);
    },
    [variables, commit],
  );

  /** Change a variable's type, coercing the stored value. */
  const handleTypeChange = useCallback(
    (name: string, type: VarType) => {
      const next = { ...variables };
      next[name] = coerceType(variables[name], type);
      commit(next);
    },
    [variables, commit],
  );

  /** Update a variable's value (type-coerced to match the current type). */
  const handleValueChange = useCallback(
    (name: string, value: VariableValue) => {
      commit({ ...variables, [name]: value });
    },
    [variables, commit],
  );

  /** Delete a variable, prompting if it is referenced. */
  const handleDelete = useCallback(
    (name: string) => {
      const refs = countVariableReferences(name, nodes);
      if (refs > 0) {
        if (!window.confirm(t('vars.confirmDel'))) return;
      }
      const next = { ...variables };
      delete next[name];
      commit(next);
    },
    [variables, nodes, commit, t],
  );

  const entries = useMemo(() => Object.entries(variables), [variables]);

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm',
        className,
      )}
      data-testid="variables-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t('vars.title')}
          </h3>
          <span className="text-[10px] text-slate-500">{t('vars.tip')}</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/30"
        >
          {t('vars.add')}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
            {t('vars.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map(([name, value]) => {
              const type = inferType(value);
              const refs = countVariableReferences(name, nodes);
              return (
                <div
                  key={name}
                  className="space-y-1.5 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      placeholder={t('vars.namePh')}
                      onChange={(e) => handleRename(name, e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 font-mono text-xs text-slate-100 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                    />
                    <select
                      value={type}
                      onChange={(e) => handleTypeChange(name, e.target.value as VarType)}
                      className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500/60"
                    >
                      <option value="string">{t('vars.type.string')}</option>
                      <option value="number">{t('vars.type.number')}</option>
                      <option value="boolean">{t('vars.type.boolean')}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(name)}
                      className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                      title={t('vars.del')}
                    >
                      {t('vars.del')}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {t('vars.value')}
                    </span>
                    {type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => handleValueChange(name, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-cyan-500"
                      />
                    ) : type === 'number' ? (
                      <input
                        type="number"
                        value={Number(value)}
                        onChange={(e) => handleValueChange(name, Number(e.target.value))}
                        className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500/60"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => handleValueChange(name, e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500/60"
                      />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {refs > 0 ? t('vars.used', { n: refs }) : t('vars.unused')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const VariablesPanel = memo(VariablesPanelImpl);
