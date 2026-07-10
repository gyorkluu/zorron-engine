import { memo } from 'react';
import {
  Play,
  MessageSquare,
  GitBranch,
  Settings2,
  Calculator,
  Trophy,
  Video,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import type { NodeType } from '@/types/flow';

const NODE_ICONS: Record<NodeType, LucideIcon> = {
  start: Play,
  scene: MessageSquare,
  logic: GitBranch,
  setter: Settings2,
  calculator: Calculator,
  settlement: Trophy,
  video: Video,
  link: ExternalLink,
};

export interface NodeIconProps {
  type: NodeType;
  size?: number;
  className?: string;
}

function NodeIconImpl({ type, size = 14, className = '' }: NodeIconProps) {
  const Icon = NODE_ICONS[type];
  return <Icon size={size} className={className} strokeWidth={2.25} />;
}

export const NodeIcon = memo(NodeIconImpl);

export { NODE_ICONS };
