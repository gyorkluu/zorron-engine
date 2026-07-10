import { memo } from 'react';
import type { NodeType } from '@/types/flow';
import { getNodeIcon } from '@/engine/nodeRegistry';

export interface NodeIconProps {
  type: NodeType;
  size?: number;
  className?: string;
}

function NodeIconImpl({ type, size = 14, className = '' }: NodeIconProps) {
  const Icon = getNodeIcon(type);
  if (!Icon) return null;
  return <Icon size={size} className={className} strokeWidth={2.25} />;
}

export const NodeIcon = memo(NodeIconImpl);
