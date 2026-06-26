/**
 * Settlement node - final result and archetype matching.
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { SettlementNodeData } from '@/types/flow';

function SettlementNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as SettlementNodeData;
  const mappings = d.resultMapping ?? [];
  return (
    <NodeShell
      type="settlement"
      label={d.label ?? t('nodeFallback.settlement')}
      selected={selected}
      showSource={false}
      icon="★"
    >
      <div className="space-y-1">
        {mappings.length === 0 ? (
          <p className="italic text-slate-500">{t('nodeFallback.noResults')}</p>
        ) : (
          <ul className="space-y-0.5">
            {mappings.slice(0, 3).map((m) => (
              <li key={m.resultId} className="truncate text-pink-200/90">
                {m.title}
              </li>
            ))}
            {mappings.length > 3 && (
              <li className="text-[10px] text-slate-500">{t('nodeFallback.more', { n: mappings.length - 3 })}</li>
            )}
          </ul>
        )}
      </div>
    </NodeShell>
  );
}

export const SettlementNode = memo(SettlementNodeImpl);
