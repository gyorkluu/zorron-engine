/**
 * workspace.service - local file system access for the local workspace mode.
 *
 * Wraps the File System Access API (`showDirectoryPicker`) to read/write
 * project JSON and asset blobs into a user-chosen directory. When the API
 * is unavailable (Firefox, Safari, private mode) it falls back to IndexedDB
 * via `workspaceDB` so local-only creators still have persistence.
 *
 * Directory layout (when File System Access API is available):
 *   <chosen-dir>/
 *     project.json
 *     assets/
 *       <asset-id>-<filename>
 *
 * Each project lives in its own subdirectory named after the project id so
 * multiple local projects can coexist in the same workspace directory.
 */

import type { ProjectDetail } from '@/types/project';
import type { Asset } from '@/types/asset';
import { cacheDirtyProject, getCachedProject } from '@/utils/workspaceDB';

/** Workspace mode: local files vs. cloud API. */
export type WorkspaceMode = 'local' | 'cloud';

/** A local workspace bound to a directory handle (File System Access API). */
export interface LocalWorkspace {
  mode: 'local';
  directoryHandle: FileSystemDirectoryHandle;
}

/** A cloud workspace bound to the backend API. */
export interface CloudWorkspace {
  mode: 'cloud';
  apiBase: string;
}

/** Union of workspace types. */
export type Workspace = LocalWorkspace | CloudWorkspace;

/** Filename for the project JSON inside a project subdirectory. */
export const PROJECT_FILENAME = 'project.json';
/** Subdirectory name for asset files. */
export const ASSETS_DIR = 'assets';

/**
 * Feature-detect the File System Access API. Returns true when
 * `showDirectoryPicker` is available on `window`.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/**
 * Open the native directory picker and return a handle to the chosen
 * directory. Throws if the user cancels or the API is unavailable.
 */
export async function pickLocalDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

/**
 * Verify (or request) permission for a previously-stored directory handle.
 * Required after a page reload since handles lose their permission state.
 *
 * @returns true if readwrite permission is granted.
 */
export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  write: boolean = true,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: write ? 'readwrite' : 'read' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

/**
 * Get (or create) a subdirectory inside a directory handle.
 */
async function getSubdirectory(
  root: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(name, { create: true });
}

/**
 * Get (or create) a file handle inside a directory.
 */
async function getFileHandle(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle> {
  return dir.getFileHandle(name, { create: true });
}

/**
 * Serialize a ProjectDetail to JSON and write it to `<root>/<projectId>/project.json`.
 *
 * @param root The workspace root directory handle.
 * @param project The project to persist.
 */
export async function writeProjectToDirectory(
  root: FileSystemDirectoryHandle,
  project: ProjectDetail,
): Promise<void> {
  const projectDir = await getSubdirectory(root, project.id);
  const fileHandle = await getFileHandle(projectDir, PROJECT_FILENAME);
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(JSON.stringify(project, null, 2));
  } finally {
    await writable.close();
  }
}

/**
 * Read a project JSON from `<root>/<projectId>/project.json`.
 *
 * @returns The parsed ProjectDetail, or null if the file does not exist.
 */
export async function readProjectFromDirectory(
  root: FileSystemDirectoryHandle,
  projectId: string,
): Promise<ProjectDetail | null> {
  try {
    const projectDir = await root.getDirectoryHandle(projectId);
    const fileHandle = await projectDir.getFileHandle(PROJECT_FILENAME);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as ProjectDetail;
  } catch (err) {
    // `NotFoundError` is thrown when the directory/file doesn't exist.
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return null;
    }
    throw err;
  }
}

/** Result of listing local projects. */
export interface LocalProjectEntry {
  /** Project id (the subdirectory name). */
  id: string;
  /** Project title (extracted from project.json, falls back to id). */
  title: string;
  /** ISO timestamp of the last modification of project.json. */
  updatedAt: string;
}

/**
 * List all local projects inside a workspace directory by iterating
 * subdirectories and reading their `project.json` metadata.
 */
export async function listProjectsInDirectory(
  root: FileSystemDirectoryHandle,
): Promise<LocalProjectEntry[]> {
  const entries: LocalProjectEntry[] = [];
  for await (const [name, handle] of root.entries()) {
    if (handle.kind !== 'directory') continue;
    try {
      const fileHandle = await handle.getFileHandle(PROJECT_FILENAME);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const detail = JSON.parse(text) as ProjectDetail;
      entries.push({
        id: name,
        title: detail.title ?? name,
        updatedAt: detail.updatedAt ?? file.lastModified.toString(),
      });
    } catch {
      // Skip directories without a valid project.json.
    }
  }
  return entries;
}

/**
 * Delete a project subdirectory (and its assets) from the workspace.
 * Note: the File System Access API does not support recursive directory
 * deletion, so we remove files one by one.
 */
export async function deleteProjectInDirectory(
  root: FileSystemDirectoryHandle,
  projectId: string,
): Promise<void> {
  const projectDir = await root.getDirectoryHandle(projectId);
  // Remove all files inside the project directory.
  for await (const [, handle] of projectDir.entries()) {
    if (handle.kind === 'file') {
      await projectDir.removeEntry(handle.name);
    } else {
      // Recurse into subdirectories (e.g. assets/).
      await removeDirectoryRecursively(projectDir, handle.name);
    }
  }
  await root.removeEntry(projectId);
}

/** Recursively remove a subdirectory and all its contents. */
async function removeDirectoryRecursively(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  const dir = await parent.getDirectoryHandle(name);
  for await (const [, handle] of dir.entries()) {
    if (handle.kind === 'file') {
      await dir.removeEntry(handle.name);
    } else {
      await removeDirectoryRecursively(dir, handle.name);
    }
  }
  await parent.removeEntry(name);
}

/**
 * Write an asset blob to `<root>/<projectId>/assets/<assetId>-<filename>`.
 *
 * @returns The relative path within the project directory.
 */
export async function writeAssetToDirectory(
  root: FileSystemDirectoryHandle,
  projectId: string,
  asset: Asset,
  blob: Blob,
): Promise<string> {
  const projectDir = await getSubdirectory(root, projectId);
  const assetsDir = await getSubdirectory(projectDir, ASSETS_DIR);
  const filename = `${asset.id}-${asset.name}`;
  const fileHandle = await getFileHandle(assetsDir, filename);
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
  return `${ASSETS_DIR}/${filename}`;
}

/**
 * Read an asset blob from `<root>/<projectId>/assets/<assetId>-<filename>`.
 *
 * @returns The Blob, or null if the file does not exist.
 */
export async function readAssetFromDirectory(
  root: FileSystemDirectoryHandle,
  projectId: string,
  asset: Asset,
): Promise<Blob | null> {
  try {
    const projectDir = await root.getDirectoryHandle(projectId);
    const assetsDir = await projectDir.getDirectoryHandle(ASSETS_DIR);
    const filename = `${asset.id}-${asset.name}`;
    const fileHandle = await assetsDir.getFileHandle(filename);
    return fileHandle.getFile();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// IndexedDB fallback (browsers without File System Access API)
// ---------------------------------------------------------------------------

/**
 * Save a project in local mode. Routes to the File System Access API when
 * a directory handle is available, otherwise falls back to IndexedDB.
 *
 * @param workspace The current workspace (must be local mode).
 * @param project The project to save.
 */
export async function saveLocalProject(
  workspace: LocalWorkspace,
  project: ProjectDetail,
): Promise<void> {
  if (isFileSystemAccessSupported()) {
    await writeProjectToDirectory(workspace.directoryHandle, project);
  }
  // Always mirror to IndexedDB for offline access + dirty tracking.
  await cacheDirtyProject(project);
}

/**
 * Load a project in local mode. Tries the File System Access API first,
 * then falls back to the IndexedDB cache.
 *
 * @param workspace The current workspace (must be local mode).
 * @param projectId The project id to load.
 * @returns The ProjectDetail, or null if not found.
 */
export async function loadLocalProject(
  workspace: LocalWorkspace,
  projectId: string,
): Promise<ProjectDetail | null> {
  if (isFileSystemAccessSupported()) {
    const fromDir = await readProjectFromDirectory(workspace.directoryHandle, projectId);
    if (fromDir) return fromDir;
  }
  const cached = await getCachedProject(projectId);
  return cached?.detail ?? null;
}

/**
 * List local projects. Uses the File System Access API when available,
 * otherwise returns projects from the IndexedDB cache.
 */
export async function listLocalProjects(
  workspace: LocalWorkspace,
): Promise<LocalProjectEntry[]> {
  if (isFileSystemAccessSupported()) {
    return listProjectsInDirectory(workspace.directoryHandle);
  }
  // Fallback: read from IndexedDB cache.
  const { getAllCachedProjects } = await import('@/utils/workspaceDB');
  const cached = await getAllCachedProjects();
  return cached.map((r) => ({
    id: r.id,
    title: r.detail.title,
    updatedAt: r.localUpdatedAt ?? r.cachedAt,
  }));
}
