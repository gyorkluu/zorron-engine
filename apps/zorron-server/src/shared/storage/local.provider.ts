import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import type { StorageProvider } from './provider';
import { env } from '../../config/env';

/**
 * [Local Storage]: stores uploaded files on disk and serves them directly.
 *
 * Security: every write/delete is confined to the configured root directory
 * via `isPathWithinRoot`, which rejects path traversal attempts (`..` segments)
 * in user-supplied storage keys.
 */
export class LocalStorageProvider implements StorageProvider {
  private root: string;
  private baseUrl: string;

  constructor(root?: string, baseUrl?: string) {
    this.root = resolve(root ?? env.STORAGE_LOCAL_ROOT);
    this.baseUrl = baseUrl ?? env.STORAGE_BASE_URL;
  }

  /**
   * Returns true when `target` is the same as or a descendant of `this.root`.
   * Prevents path traversal escapes from the configured uploads directory.
   */
  private isPathWithinRoot(target: string): boolean {
    const rel = relative(this.root, target);
    return rel === '' || (!rel.startsWith('..') && !resolve(target).startsWith('..'));
  }

  async put(key: string, file: File): Promise<string> {
    const dest = join(this.root, key);
    if (!this.isPathWithinRoot(dest)) {
      throw new Error(`Refusing to write outside storage root: ${key}`);
    }
    const dir = dirname(dest);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, buffer);
    return `${this.baseUrl}/${key}`;
  }

  async getSignedUrl(
    key: string,
    _expiresSeconds?: number,
  ): Promise<{ url: string; expiresAt?: Date }> {
    return { url: `${this.baseUrl}/${key}` };
  }

  async delete(key: string): Promise<void> {
    const dest = join(this.root, key);
    if (!this.isPathWithinRoot(dest)) {
      throw new Error(`Refusing to delete outside storage root: ${key}`);
    }
    try {
      await unlink(dest);
    } catch {
      // silently ignore missing files
    }
  }
}
