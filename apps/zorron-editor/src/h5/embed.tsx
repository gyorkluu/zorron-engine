/**
 * ZorronPlayer Embed SDK entry point.
 *
 * This module is the entry for the Vite library build that produces
 * `embed.js` (UMD + ESM). It exposes a global `ZorronPlayer` object with:
 *
 * - `mount(options)`: programmatically mount a player into a container.
 * - `unmount(container)`: remove a mounted player.
 * - `autoMount()`: scan the DOM for `[data-zorron-player]` elements and mount.
 *
 * The SDK is framework-agnostic at the surface: it accepts a CSS selector or
 * an HTMLElement and handles the React rendering internally.
 */

import { createRoot, type Root } from 'react-dom/client';
import { EmbedPlayer } from './EmbedPlayer';
import {
  type MountOptions,
  type EmbedConfig,
  type EmbedMessage,
  parseEmbedConfig,
} from './types';

/** Global SDK object exposed as `window.ZorronPlayer`. */
export interface ZorronPlayerSDK {
  /** Mount a player into a container. Returns a handle for unmounting. */
  mount: (options: MountOptions) => PlayerHandle;
  /** Unmount a player from a container. */
  unmount: (container: string | HTMLElement) => void;
  /** Scan the DOM and auto-mount players for `[data-zorron-player]` elements. */
  autoMount: () => PlayerHandle[];
  /** Send a message to a mounted player (e.g. restart, load a new project). */
  postMessage: (handle: PlayerHandle, message: EmbedMessage) => void;
}

/** Handle returned by `mount()` for managing a mounted player. */
export interface PlayerHandle {
  /** The container element the player is mounted into. */
  container: HTMLElement;
  /** The React root managing the player. */
  root: Root;
  /** Update the player's configuration. */
  update: (config: EmbedConfig) => void;
  /** Unmount the player and clean up. */
  unmount: () => void;
}

/** Resolve a container selector or element into an HTMLElement. */
function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof container === 'string') {
    const el = document.querySelector<HTMLElement>(container);
    if (!el) {
      throw new Error(`ZorronPlayer: container "${container}" not found`);
    }
    return el;
  }
  return container;
}

/** Mount a player into a container. */
function mount(options: MountOptions): PlayerHandle {
  const container = resolveContainer(options.container);
  // Ensure the container has relative positioning for the player overlay.
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  const root = createRoot(container);
  const { container: _c, ...config } = options;
  void _c;
  root.render(<EmbedPlayer {...config} />);

  const handle: PlayerHandle = {
    container,
    root,
    update: (nextConfig: EmbedConfig) => {
      root.render(<EmbedPlayer {...nextConfig} />);
    },
    unmount: () => {
      root.unmount();
    },
  };
  // Track the handle on the element for later unmount lookups.
  (container as HTMLElement & { __zorronHandle?: PlayerHandle }).__zorronHandle = handle;
  return handle;
}

/** Unmount a player from a container. */
function unmount(container: string | HTMLElement): void {
  const el = resolveContainer(container);
  const handle = (el as HTMLElement & { __zorronHandle?: PlayerHandle }).__zorronHandle;
  if (handle) {
    handle.unmount();
    delete (el as HTMLElement & { __zorronHandle?: PlayerHandle }).__zorronHandle;
  }
}

/** Auto-mount players for all `[data-zorron-player]` elements. */
function autoMount(): PlayerHandle[] {
  const elements = document.querySelectorAll<HTMLElement>('[data-zorron-player]');
  const handles: PlayerHandle[] = [];
  elements.forEach((el) => {
    const config = parseEmbedConfig(el);
    const handle = mount({ container: el, ...config });
    handles.push(handle);
  });
  return handles;
}

/** Send a message to a mounted player (placeholder for future postMessage API). */
function postMessage(handle: PlayerHandle, message: EmbedMessage): void {
  // For now, we support 'restart' and 'load' by re-rendering.
  if (message.type === 'load') {
    handle.update({
      projectId: message.projectId,
      projectJson: message.projectJson,
    });
  }
  // 'restart' and 'exit' would be handled by the player store; left as a stub.
  void message;
}

/** The global SDK object. */
export const ZorronPlayer: ZorronPlayerSDK = {
  mount,
  unmount,
  autoMount,
  postMessage,
};

/** Auto-mount on DOMContentLoaded when running as a UMD script. */
if (typeof window !== 'undefined') {
  // Expose the SDK globally.
  (window as unknown as { ZorronPlayer: ZorronPlayerSDK }).ZorronPlayer = ZorronPlayer;
  // Auto-mount when the DOM is ready (only if there are embed containers).
  const autoStart = () => {
    if (document.querySelector('[data-zorron-player]')) {
      autoMount();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoStart);
  } else {
    autoStart();
  }
}

export default ZorronPlayer;
