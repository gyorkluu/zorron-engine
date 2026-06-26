/**
 * Setter node - modifies narrative variables.
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { SetterNodeData } from '@/types/flow';

function SetterNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as SetterNodeData;
  const assignments = d.assignments ?? [];
  return (
    <NodeShell type="setter" label={d.label ?? t('nodeFallback.setter')} selected={selected} icon="=">
      <div className="space-y-1">
        {assignments.length === 0 ? (
          <p className="italic text-slate-500">{t('nodeFallback.noAssign')}</p>
        ) : (
          <ul className="space-y-0.5 font-mono text-[11px]">
            {assignments.slice(0, 3).map((a, i) => (
              <li key={i} className="text-emerald-200/90">
                {a.variable} {a.operator === 'set' ? '=' : a.operator === 'add' ? '+=' : '-='}{' '}
                {String(a.value)}
              </li>
            ))}
            {assignments.length > 3 && (
              <li className="text-[10px] text-slate-500">{t('nodeFallback.more', { n: assignments.length - 3 })}</li>
            )}
          </ul>
        )}
      </div>
    </NodeShell>
  );
}

export const SetterNode = memo(SetterNodeImpl);
