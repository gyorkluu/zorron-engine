/**
 * Link node - opens an external URL. Terminal node (no output handle).
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { LinkNodeData } from '@/types/flow';

function LinkNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as LinkNodeData;
  return (
    <NodeShell
      type="link"
      label={d.label ?? t('nodeFallback.link')}
      selected={selected}
      showSource={false}
    >
      <div className="space-y-1.5">
        {d.title && <p className="text-[11px] font-semibold text-slate-200">{d.title}</p>}
        {d.url ? (
          <p className="truncate rounded bg-slate-700/20 px-2 py-1 font-mono text-[10px] text-slate-400">{d.url}</p>
        ) : (
          <p className="italic text-[11px] text-slate-500">{t('nodeFallback.noUrl')}</p>
        )}
      </div>
    </NodeShell>
  );
}

export const LinkNode = memo(LinkNodeImpl);
