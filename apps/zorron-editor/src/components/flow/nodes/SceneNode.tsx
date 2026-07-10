/**
 * Scene node - dialogue stage with choices.
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { SceneNodeData } from '@/types/flow';

function SceneNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as SceneNodeData;
  const choices = d.choices ?? [];
  return (
    <NodeShell type="scene" label={d.label ?? t('nodeFallback.scene')} selected={selected}>
      <div className="space-y-2">
        {d.dialogue ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-300">{d.dialogue}</p>
        ) : (
          <p className="italic text-[11px] text-slate-500">{t('nodeFallback.noDialogue')}</p>
        )}
        {choices.length > 0 && (
          <ul className="space-y-1">
            {choices.slice(0, 3).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/8 px-2 py-1 text-[11px] text-violet-200"
              >
                <span className="text-[9px] font-bold uppercase opacity-60">{c.interaction}</span>
                <span className="truncate">{c.text}</span>
              </li>
            ))}
            {choices.length > 3 && (
              <li className="text-[10px] text-slate-500">{t('nodeFallback.more', { n: choices.length - 3 })}</li>
            )}
          </ul>
        )}
      </div>
    </NodeShell>
  );
}

export const SceneNode = memo(SceneNodeImpl);
