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
      icon="↗"
    >
      <div className="space-y-1">
        {d.title && <p className="font-medium text-slate-200">{d.title}</p>}
        {d.url ? (
          <p className="truncate text-slate-400">{d.url}</p>
        ) : (
          <p className="italic text-slate-500">{t('nodeFallback.noUrl')}</p>
        )}
      </div>
    </NodeShell>
  );
}

export const LinkNode = memo(LinkNodeImpl);
