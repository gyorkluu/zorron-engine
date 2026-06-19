/**
 * Custom edge component with a gradient stroke and animated flow dot.
 */

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

function ZorronEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Color the edge by the source handle (true/false for logic nodes).
  const color =
    sourceHandleId === 'true'
      ? '#34d399'
      : sourceHandleId === 'false'
        ? '#fb7185'
        : '#64748b';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.7,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {selected && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
              style={{ background: `${color}33`, color }}
            >
              {sourceHandleId ?? '流转'}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ZorronEdge = memo(ZorronEdgeImpl);
