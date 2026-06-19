import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageProvider } from './local.provider';

/**
 * Security tests for the LocalStorageProvider path-traversal guard.
 *
 * Verifies that user-supplied storage keys containing `..` segments or
 * absolute paths cannot escape the configured root directory.
 */
describe('LocalStorageProvider path traversal guard', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'zorron-storage-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes a file with a normal key inside the root', async () => {
    const provider = new LocalStorageProvider(root, 'http://localhost/uploads');
    const file = new File(['hello'], 'test.png', { type: 'image/png' });
    const url = await provider.put('assets/user-1/abc-test.png', file);
    expect(url).toBe('http://localhost/uploads/assets/user-1/abc-test.png');
    const content = await readFile(join(root, 'assets', 'user-1', 'abc-test.png'), 'utf8');
    expect(content).toBe('hello');
  });

  it('rejects a key with `..` that would escape the root', async () => {
    const provider = new LocalStorageProvider(root, 'http://localhost/uploads');
    const file = new File(['evil'], 'evil.png', { type: 'image/png' });
    await expect(
      provider.put('assets/../../etc/evil', file),
    ).rejects.toThrow(/outside storage root/);
    // Confirm the file was NOT written outside the root.
    await expect(access(join(root, '..', '..', 'etc', 'evil'))).rejects.toThrow();
  });

  it('rejects a delete with `..` that would escape the root', async () => {
    const provider = new LocalStorageProvider(root, 'http://localhost/uploads');
    await expect(provider.delete('../../etc/passwd')).rejects.toThrow(/outside storage root/);
  });

  it('returns a direct URL from getSignedUrl for local storage', async () => {
    const provider = new LocalStorageProvider(root, 'http://localhost/uploads');
    const result = await provider.getSignedUrl('assets/user-1/abc.png');
    expect(result.url).toBe('http://localhost/uploads/assets/user-1/abc.png');
    expect(result.expiresAt).toBeUndefined();
  });
});
