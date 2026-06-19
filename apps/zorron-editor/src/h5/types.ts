/**
 * Embed SDK configuration types.
 *
 * These types describe the options that can be passed to
 * `ZorronPlayer.mount()` or read from `data-*` attributes on the embed
 * container element.
 */

import type { FlowData } from '@/types/flow';

/** Feature toggles for the embed player. */
export interface EmbedFeatures {
  /** Whether to enable the 3D vector space visualization. */
  vector3d?: boolean;
}

/** Theme for the embed player. */
export type EmbedTheme = 'dark' | 'light';

/** Configuration for mounting an embed player. */
export interface EmbedConfig {
  /** Cloud project id to load (fetches from the API). */
  projectId?: string;
  /** Inline project JSON to play (bypasses the API). */
  projectJson?: FlowData;
  /** API base URL (defaults to VITE_API_BASE_URL). */
  apiBase?: string;
  /** Visual theme. Defaults to 'dark'. */
  theme?: EmbedTheme;
  /** Feature toggles. */
  features?: EmbedFeatures;
}

/** Options for the `mount` function (container can be a selector or element). */
export interface MountOptions extends EmbedConfig {
  /** CSS selector or HTMLElement to mount into. */
  container: string | HTMLElement;
}

/** Message shape for postMessage communication with the embed. */
export type EmbedMessage =
  | { type: 'load'; projectId?: string; projectJson?: FlowData }
  | { type: 'restart' }
  | { type: 'exit' };

/** Parse data-* attributes from an element into an EmbedConfig. */
export function parseEmbedConfig(element: HTMLElement): EmbedConfig {
  const config: EmbedConfig = {};
  const projectId = element.getAttribute('data-project-id');
  if (projectId) config.projectId = projectId;
  const apiBase = element.getAttribute('data-api-base');
  if (apiBase) config.apiBase = apiBase;
  const theme = element.getAttribute('data-theme');
  if (theme === 'light' || theme === 'dark') config.theme = theme;
  const vector3d = element.getAttribute('data-features-vector3d');
  if (vector3d === 'on' || vector3d === 'true') {
    config.features = { vector3d: true };
  }
  return config;
}
