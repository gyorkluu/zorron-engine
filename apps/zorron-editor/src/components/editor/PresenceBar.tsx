/**
 * PresenceBar — who else is editing this project right now.
 *
 * Renders nothing while disconnected, so single-player sessions see no extra
 * chrome.
 */

import { memo } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useT } from '@/i18n/useT';

export interface PresenceBarProps {
  projectId: string | null;
}

function PresenceBarImpl({ projectId }: PresenceBarProps) {
  const { t } = useT();
  const { collaborators, connected } = useCollaboration(projectId);

  if (!connected || collaborators.length === 0) return null;

  const shown = collaborators.slice(0, 4);
  const overflow = collaborators.length - shown.length;

  return (
    <div
      className="flex items-center -space-x-1.5"
      data-testid="presence-bar"
      title={`${collaborators.length} ${t('collab.editing')}`}
    >
      {shown.map((collaborator) => (
        <span
          key={collaborator.id}
          title={collaborator.name}
          style={{ background: collaborator.color }}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 text-[10px] font-bold text-slate-900"
        >
          {collaborator.name.slice(-1)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-[10px] font-semibold text-slate-200">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

export const PresenceBar = memo(PresenceBarImpl);
