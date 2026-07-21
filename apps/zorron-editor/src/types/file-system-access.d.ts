/**
 * Type declarations for the File System Access API.
 *
 * The standard `lib.dom.d.ts` shipped with TypeScript includes
 * `FileSystemDirectoryHandle` / `FileSystemFileHandle` but does NOT include:
 *   - `window.showDirectoryPicker`
 *   - `FileSystemHandlePermissionDescriptor`
 *   - `FileSystemHandle.queryPermission` / `requestPermission`
 *   - `FileSystemDirectoryHandle.entries()` (async iterator)
 *
 * These are widely supported in Chromium-based browsers (Chrome, Edge, Brave)
 * and are the foundation of the local-workspace mode in this editor. This
 * declaration augments the global types so application code can use them
 * without unsafe `as any` casts. Runtime feature-detection (e.g.
 * `typeof window.showDirectoryPicker === 'function'`) is still required to
 * support browsers that lack the API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */

interface Window {
  /** Opens a native directory picker and returns a handle to the chosen directory. */
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite';
    id?: string;
  }): Promise<FileSystemDirectoryHandle>;
}

/** Permission descriptor for `FileSystemHandle.queryPermission` / `requestPermission`. */
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
  /** Query the current permission state for this handle. */
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
  /** Request elevated permission for this handle (prompts the user). */
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle {
  /**
   * Asynchronously iterate over the entries in this directory.
   * Yields `[name, handle]` tuples (like `Map.entries()`).
   */
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  /** Asynchronously iterate over the keys (entry names). */
  keys(): AsyncIterableIterator<string>;
  /** Asynchronously iterate over the values (entry handles). */
  values(): AsyncIterableIterator<FileSystemHandle>;
  /** Asynchronously iterate over the entries. */
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
}
