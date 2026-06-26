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

  if (path.startsWith('/')) return path;

  // Legacy CDN mapping for known file names.
  const fileName = path.split('/').pop() || path;
  const mapped = cdnMap[fileName];
  if (mapped) return mapped;

  return `/workspace/${path}`;
}
