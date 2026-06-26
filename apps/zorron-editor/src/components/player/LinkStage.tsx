/**
 * LinkStage - shows an external link with an open button.
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import type { GameState } from '@/engine/GameEngine';

/** Props for LinkStage. */
export interface LinkStageProps {
  state: GameState;
}

function LinkStageImpl({ state }: LinkStageProps) {
  const { t } = useT();
  const link = state.link;
  if (!link) return null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
      <div className="space-y-2">
        {link.title && <h2 className="text-2xl font-bold text-slate-100">{link.title}</h2>}
        {link.description && <p className="max-w-md text-slate-400">{link.description}</p>}
        <p className="text-sm text-slate-500">{link.url}</p>
      </div>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-cyan-500/20 px-6 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30"
      >
        {t('player.openLink')}
      </a>
    </div>
  );
}

export const LinkStage = memo(LinkStageImpl);
