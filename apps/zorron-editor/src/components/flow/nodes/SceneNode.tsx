/**
 * Scene node - dialogue stage with choices.
 */

import { memo } from 'react';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { SceneNodeData } from '@/types/flow';

function SceneNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as SceneNodeData;
  const choices = d.choices ?? [];
  return (
    <NodeShell type="scene" label={d.label ?? 'Scene'} selected={selected} icon="D">
      <div className="space-y-1.5">
        {d.dialogue ? (
          <p className="line-clamp-2 text-slate-300">{d.dialogue}</p>
        ) : (
          <p className="italic text-slate-500">No dialogue yet</p>
        )}
        {choices.length > 0 && (
          <ul className="space-y-1">
            {choices.slice(0, 3).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 rounded bg-violet-500/10 px-2 py-1 text-violet-200"
              >
                <span className="text-[10px] uppercase opacity-70">{c.interaction}</span>
                <span className="truncate">{c.text}</span>
              </li>
            ))}
            {choices.length > 3 && (
              <li className="text-[10px] text-slate-500">+{choices.length - 3} more</li>
            )}
          </ul>
        )}
      </div>
    </NodeShell>
  );
}

export const SceneNode = memo(SceneNodeImpl);
