/**
 * EmbedPlayer - standalone player component for H5 embedding.
 *
 * A self-contained wrapper around the PlayerShell that loads a project from
 * a URL or postMessage and renders it without the editor chrome. Designed to
 * be bundled into the embed.js SDK via Vite library mode.
 */

import { memo, useEffect, useState } from 'react';
import { PlayerShell } from '@/components/player/PlayerShell';
import { API_BASE_URL, http } from '@/services/api';
import { createEmptyFlowData } from '@/types/flow';
import type { FlowData } from '@/types/flow';
import type { ProjectDetail } from '@/types/project';
import type { EmbedConfig } from './types';

/** Props for the EmbedPlayer. */
export interface EmbedPlayerProps extends EmbedConfig {
  /** Optional class name. */
  className?: string;
}

/** Loading state. */
type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; flowData: FlowData }
  | { status: 'error'; message: string };

function EmbedPlayerImpl({
  projectId,
  projectJson,
  apiBase,
  theme = 'dark',
  features,
  className,
}: EmbedPlayerProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  /** Override the API base URL if provided. */
  useEffect(() => {
    if (apiBase) {
      // Note: we can't reconfigure the axios instance's baseURL at runtime
      // without a setter, so we use a direct fetch when apiBase is provided.
    }
  }, [apiBase]);

  /** Load the project from the provided source. */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (projectJson) {
          // Use the inline project JSON.
          if (!cancelled) {
            setState({ status: 'ready', flowData: projectJson });
          }
          return;
        }
        if (projectId) {
          // Fetch the project from the API.
          const base = apiBase ?? API_BASE_URL;
          const res = await fetch(`${base}/api/projects/${projectId}/export`);
          if (!res.ok) {
            throw new Error(`Failed to load project: ${res.status}`);
          }
          const detail = (await res.json()) as ProjectDetail;
          if (!cancelled) {
            setState({
              status: 'ready',
              flowData: detail.data ?? createEmptyFlowData(),
            });
          }
          return;
        }
        throw new Error('No projectId or projectJson provided');
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load';
          setState({ status: 'error', message });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, projectJson, apiBase]);

  // Apply the theme class to the container.
  const themeClass = theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100';

  if (state.status === 'loading') {
    return (
      <div
        className={`flex h-full w-full items-center justify-center ${themeClass} ${className ?? ''}`}
        data-testid="embed-player-loading"
      >
        <div className="text-sm opacity-70">Loading...</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center ${themeClass} ${className ?? ''}`}
        data-testid="embed-player-error"
      >
        <div className="text-sm font-medium text-rose-400">Failed to load</div>
        <div className="text-xs opacity-70">{state.message}</div>
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full ${themeClass} ${className ?? ''}`}
      data-testid="embed-player-ready"
      data-theme={theme}
      data-features-vector3d={features?.vector3d ? 'on' : 'off'}
    >
      <PlayerShell flowData={state.flowData} />
    </div>
  );
}

export const EmbedPlayer = memo(EmbedPlayerImpl);

// Re-export the http client for SDK consumers that want to prefetch.
export { http };
