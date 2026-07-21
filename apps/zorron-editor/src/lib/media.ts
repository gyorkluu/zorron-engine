/**
 * Media URL resolution helpers.
 *
 * Ported from the legacy Vue Player.vue getCdnUrl helper.
 * Supports:
 * - Remote URLs (http/https or isRemote flag)
 * - CDN mapping fallback for legacy file names
 * - Local /workspace prefix for relative assets
 */

import cdnMapping from '@/assets/cdn-mapping.json';

/** CDN mapping from file name to public CDN URL. */
const cdnMap: Record<string, string> = cdnMapping;

/**
 * Cache-busting version for local static assets that change without
 * file-name changes (e.g. when we recolor SVG icons in place).
 * Bump this number whenever an in-place asset update must reach
 * already-loaded browsers without a hard refresh.
 */
const ASSET_VERSION = 2;

/**
 * Resolve a legacy or migrated media path to a playable URL.
 *
 * @param path - The raw media path from node data.
 * @param isRemote - Whether the path is a remote URL.
 * @returns A resolved URL, or undefined if no path is provided.
 */
export function resolveMediaUrl(
  path: string | undefined,
  isRemote?: boolean,
): string | undefined {
  if (!path) return undefined;

  if (isRemote || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path;
  }

  if (path.startsWith('/')) {
    // Append a cache-busting query for in-place-editable vector assets
    // (SVG) so browsers always fetch the latest version from dev server.
    if (path.endsWith('.svg') && !path.includes('?')) {
      return `${path}?v=${ASSET_VERSION}`;
    }
    return path;
  }

  // Legacy CDN mapping for known file names.
  const fileName = path.split('/').pop() || path;
  const mapped = cdnMap[fileName];
  if (mapped) return mapped;

  return `/workspace/${path}`;
}
