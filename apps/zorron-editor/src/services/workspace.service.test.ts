/**
 * Unit tests for workspace.service.ts.
 *
 * The File System Access API is not available in jsdom, so we mock the
 * directory/file handles with in-memory stubs that implement the same
 * interface. The IndexedDB fallback functions are tested by mocking
 * `@/utils/workspaceDB`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isFileSystemAccessSupported,
  writeProjectToDirectory,
  readProjectFromDirectory,
  listProjectsInDirectory,
  deleteProjectInDirectory,
  writeAssetToDirectory,
  readAssetFromDirectory,
  saveLocalProject,
  loadLocalProject,
  listLocalProjects,
  PROJECT_FILENAME,
  ASSETS_DIR,
  type LocalWorkspace,
} from './workspace.service';
import type { ProjectDetail } from '@/types/project';
import type { Asset } from '@/types/asset';

// Mock the workspaceDB module so we don't touch real IndexedDB.
vi.mock('@/utils/workspaceDB', () => ({
  cacheDirtyProject: vi.fn().mockResolvedValue(undefined),
  getCachedProject: vi.fn().mockResolvedValue(null),
  getAllCachedProjects: vi.fn().mockResolvedValue([]),
  cacheProject: vi.fn().mockResolvedValue(undefined),
  markProjectClean: vi.fn().mockResolvedValue(undefined),
  deleteCachedProject: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// In-memory mock FileSystemDirectoryHandle / FileSystemFileHandle
// ---------------------------------------------------------------------------

/** Mock writable stream that captures written content. */
class MockWritable {
  private chunks: Uint8Array[] = [];
  async write(data: string | Blob | BufferSource): Promise<void> {
    if (typeof data === 'string') {
      this.chunks.push(new TextEncoder().encode(data));
    } else if (data instanceof Blob) {
      const buf = new Uint8Array(await data.arrayBuffer());
      this.chunks.push(buf);
    } else {
      // BufferSource
      this.chunks.push(new Uint8Array(data as ArrayBuffer));
    }
  }
  async close(): Promise<void> {
    /* no-op */
  }
  getContent(): string {
    const merged = this.chunks.reduce((acc, c) => {
      const next = new Uint8Array(acc.length + c.length);
      next.set(acc);
      next.set(c, acc.length);
      return next;
    }, new Uint8Array());
    return new TextDecoder().decode(merged);
  }
  getBlob(): Blob {
    const merged = this.chunks.reduce((acc, c) => {
      const next = new Uint8Array(acc.length + c.length);
      next.set(acc);
      next.set(c, acc.length);
      return next;
    }, new Uint8Array());
    return new Blob([merged]);
  }
}

/** Mock file handle backed by a content store (string or Blob). */
class MockFileHandle {
  kind = 'file' as const;
  name: string;
  private content: string | Blob;
  private lastModified: number;

  constructor(name: string, content: string | Blob = '') {
    this.name = name;
    this.content = content;
    this.lastModified = Date.now();
  }

  async getFile(): Promise<File> {
    // Create a File from the stored content so text()/arrayBuffer() work.
    if (typeof this.content === 'string') {
      return new File([this.content], this.name, {
        lastModified: this.lastModified,
      });
    }
    // Blob content (for binary assets).
    return new File([this.content], this.name, {
      lastModified: this.lastModified,
      type: this.content.type,
    });
  }

  async createWritable(): Promise<MockWritable> {
    const writable = new MockWritable();
    const originalClose = writable.close.bind(writable);
    // Arrow function captures `this` lexically from the method scope, so we
    // can reference the MockFileHandle instance directly without aliasing.
    writable.close = async () => {
      // Store as string if the content looks like text, otherwise as Blob.
      const content = writable.getContent();
      this.setContent(content);
      this.lastModified = Date.now();
      await originalClose();
    };
    return writable;
  }

  /** Set the file content (string). */
  setContent(content: string): void {
    this.content = content;
  }

  /** Set the file content (Blob, for binary assets). */
  setBlobContent(blob: Blob): void {
    this.content = blob;
  }

  getContent(): string {
    return typeof this.content === 'string' ? this.content : '';
  }
}

/** Mock directory handle backed by an in-memory map. */
class MockDirHandle {
  kind = 'directory' as const;
  name: string;
  private children = new Map<string, MockDirHandle | MockFileHandle>();

  constructor(name: string) {
    this.name = name;
  }

  async getDirectoryHandle(
    name: string,
    opts?: { create?: boolean },
  ): Promise<MockDirHandle> {
    const existing = this.children.get(name);
    if (existing instanceof MockDirHandle) return existing;
    if (existing instanceof MockFileHandle) {
      throw new DOMException('Not a directory', 'TypeMismatchError');
    }
    if (opts?.create) {
      const dir = new MockDirHandle(name);
      this.children.set(name, dir);
      return dir;
    }
    throw new DOMException('Not found', 'NotFoundError');
  }

  async getFileHandle(
    name: string,
    opts?: { create?: boolean },
  ): Promise<MockFileHandle> {
    const existing = this.children.get(name);
    if (existing instanceof MockFileHandle) return existing;
    if (existing instanceof MockDirHandle) {
      throw new DOMException('Not a file', 'TypeMismatchError');
    }
    if (opts?.create) {
      const file = new MockFileHandle(name);
      this.children.set(name, file);
      return file;
    }
    throw new DOMException('Not found', 'NotFoundError');
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.children.has(name)) {
      throw new DOMException('Not found', 'NotFoundError');
    }
    this.children.delete(name);
  }

  /** Returns an async iterator over the directory entries (mimics FSA API). */
  entries(): AsyncIterableIterator<[string, MockDirHandle | MockFileHandle]> {
    const items = Array.from(this.children.entries());
    let index = 0;
    const iterator: AsyncIterableIterator<[string, MockDirHandle | MockFileHandle]> = {
      next: async (): Promise<IteratorResult<[string, MockDirHandle | MockFileHandle]>> => {
        if (index < items.length) {
          return { value: items[index++], done: false };
        }
        return { value: undefined as never, done: true };
      },
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };
    return iterator;
  }

  /** Helper: directly set a file's content (for test setup). */
  setFile(name: string, content: string): MockFileHandle {
    const file = new MockFileHandle(name, content);
    this.children.set(name, file);
    return file;
  }

  /** Helper: check if a child exists. */
  has(name: string): boolean {
    return this.children.has(name);
  }

  /** Helper: get a child. */
  get(name: string): MockDirHandle | MockFileHandle | undefined {
    return this.children.get(name);
  }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: 'p1',
    title: 'Test Project',
    description: 'A test',
    coverUrl: null,
    isPublished: false,
    data: {
      nodes: [],
      edges: [],
      variables: {},
      settings: {
        vectorSpace: { enabled: false, dimensions: { x: 'x', y: 'y', z: 'z' } },
      },
      version: '1.0.0',
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'a1',
    name: 'image.png',
    type: 'image',
    mimeType: 'image/png',
    size: 1024,
    url: 'blob:test',
    projectId: 'p1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isFileSystemAccessSupported', () => {
  it('returns false in jsdom (no showDirectoryPicker)', () => {
    expect(isFileSystemAccessSupported()).toBe(false);
  });
});

describe('writeProjectToDirectory / readProjectFromDirectory', () => {
  let root: MockDirHandle;

  beforeEach(() => {
    root = new MockDirHandle('workspace');
  });

  it('writes project.json into a project subdirectory', async () => {
    const project = makeProject();
    // Cast the mock to the real type since the shapes are compatible.
    await writeProjectToDirectory(root as unknown as FileSystemDirectoryHandle, project);

    const projectDir = root.get(project.id) as MockDirHandle | undefined;
    expect(projectDir).toBeInstanceOf(MockDirHandle);
    const file = projectDir?.get(PROJECT_FILENAME) as MockFileHandle | undefined;
    expect(file).toBeInstanceOf(MockFileHandle);
    const content = file?.getContent();
    expect(content).toBeDefined();
    const parsed = JSON.parse(content!) as ProjectDetail;
    expect(parsed.id).toBe('p1');
    expect(parsed.title).toBe('Test Project');
  });

  it('reads back the project that was written', async () => {
    const project = makeProject({ title: 'Round Trip' });
    await writeProjectToDirectory(root as unknown as FileSystemDirectoryHandle, project);
    const read = await readProjectFromDirectory(
      root as unknown as FileSystemDirectoryHandle,
      project.id,
    );
    expect(read).not.toBeNull();
    expect(read?.title).toBe('Round Trip');
  });

  it('returns null when the project does not exist', async () => {
    const read = await readProjectFromDirectory(
      root as unknown as FileSystemDirectoryHandle,
      'nonexistent',
    );
    expect(read).toBeNull();
  });

  it('survives a JSON round-trip with nodes and edges', async () => {
    const project = makeProject({
      data: {
        nodes: [
          {
            id: 'n1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { label: 'Start', title: 'T', intro: '' },
          },
        ],
        edges: [],
        variables: { score: 0 },
        settings: {
          vectorSpace: { enabled: true, dimensions: { x: 'X', y: 'Y', z: 'Z' } },
        },
        version: '2.0.0',
      },
    });
    await writeProjectToDirectory(root as unknown as FileSystemDirectoryHandle, project);
    const read = await readProjectFromDirectory(
      root as unknown as FileSystemDirectoryHandle,
      project.id,
    );
    expect(read?.data.nodes).toHaveLength(1);
    expect(read?.data.nodes[0].id).toBe('n1');
    expect(read?.data.variables.score).toBe(0);
    expect(read?.data.version).toBe('2.0.0');
  });
});

describe('listProjectsInDirectory', () => {
  let root: MockDirHandle;

  beforeEach(() => {
    root = new MockDirHandle('workspace');
  });

  it('lists project subdirectories with their titles', async () => {
    const p1 = makeProject({ id: 'p1', title: 'Alpha' });
    const p2 = makeProject({ id: 'p2', title: 'Beta' });
    await writeProjectToDirectory(root as unknown as FileSystemDirectoryHandle, p1);
    await writeProjectToDirectory(root as unknown as FileSystemDirectoryHandle, p2);

    const entries = await listProjectsInDirectory(
      root as unknown as FileSystemDirectoryHandle,
    );
    expect(entries).toHaveLength(2);
    const titles = entries.map((e) => e.title).sort();
    expect(titles).toEqual(['Alpha', 'Beta']);
  });

  it('skips directories without a valid project.json', async () => {
    // Create a valid project.
    await writeProjectToDirectory(
      root as unknown as FileSystemDirectoryHandle,
      makeProject({ id: 'p1', title: 'Alpha' }),
    );
    // Create a directory without project.json.
    await root.getDirectoryHandle('empty-dir', { create: true });

    const entries = await listProjectsInDirectory(
      root as unknown as FileSystemDirectoryHandle,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('p1');
  });
});

describe('deleteProjectInDirectory', () => {
  let root: MockDirHandle;

  beforeEach(() => {
    root = new MockDirHandle('workspace');
  });

  it('removes the project subdirectory and its contents', async () => {
    const project = makeProject({ id: 'p1' });
    await writeProjectToDirectory(root as unknown as FileSystemDirectoryHandle, project);
    // Also add an asset file.
    const projectDir = root.get('p1') as MockDirHandle;
    await projectDir.getDirectoryHandle(ASSETS_DIR, { create: true });
    await (projectDir.get(ASSETS_DIR) as MockDirHandle).getFileHandle('asset.png', {
      create: true,
    });

    await deleteProjectInDirectory(root as unknown as FileSystemDirectoryHandle, 'p1');
    expect(root.has('p1')).toBe(false);
  });
});

describe('writeAssetToDirectory / readAssetFromDirectory', () => {
  let root: MockDirHandle;

  beforeEach(() => {
    root = new MockDirHandle('workspace');
  });

  it('writes and reads an asset blob', async () => {
    const project = makeProject({ id: 'p1' });
    const asset = makeAsset();
    const blob = new Blob(['fake-image-data'], { type: 'image/png' });

    const path = await writeAssetToDirectory(
      root as unknown as FileSystemDirectoryHandle,
      project.id,
      asset,
      blob,
    );
    expect(path).toBe(`${ASSETS_DIR}/${asset.id}-${asset.name}`);

    const readBlob = await readAssetFromDirectory(
      root as unknown as FileSystemDirectoryHandle,
      project.id,
      asset,
    );
    expect(readBlob).not.toBeNull();
    const text = await readBlob!.text();
    expect(text).toBe('fake-image-data');
  });

  it('returns null when the asset file does not exist', async () => {
    const project = makeProject({ id: 'p1' });
    const asset = makeAsset();
    const readBlob = await readAssetFromDirectory(
      root as unknown as FileSystemDirectoryHandle,
      project.id,
      asset,
    );
    expect(readBlob).toBeNull();
  });
});

describe('IndexedDB fallback (saveLocalProject / loadLocalProject / listLocalProjects)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveLocalProject caches the project as dirty', async () => {
    const { cacheDirtyProject } = await import('@/utils/workspaceDB');
    const workspace: LocalWorkspace = {
      mode: 'local',
      // jsdom doesn't support FSA, so this handle won't be used.
      directoryHandle: {} as FileSystemDirectoryHandle,
    };
    const project = makeProject();
    await saveLocalProject(workspace, project);
    expect(cacheDirtyProject).toHaveBeenCalledWith(project);
  });

  it('loadLocalProject falls back to the IndexedDB cache', async () => {
    const { getCachedProject } = await import('@/utils/workspaceDB');
    const cached = makeProject({ id: 'cached-1', title: 'Cached' });
    vi.mocked(getCachedProject).mockResolvedValueOnce({
      id: 'cached-1',
      detail: cached,
      cachedAt: '2025-01-01T00:00:00.000Z',
      dirty: false,
      localUpdatedAt: null,
    });
    const workspace: LocalWorkspace = {
      mode: 'local',
      directoryHandle: {} as FileSystemDirectoryHandle,
    };
    const result = await loadLocalProject(workspace, 'cached-1');
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Cached');
  });

  it('loadLocalProject returns null when nothing is cached', async () => {
    const workspace: LocalWorkspace = {
      mode: 'local',
      directoryHandle: {} as FileSystemDirectoryHandle,
    };
    const result = await loadLocalProject(workspace, 'nonexistent');
    expect(result).toBeNull();
  });

  it('listLocalProjects reads from the IndexedDB cache in jsdom', async () => {
    const { getAllCachedProjects } = await import('@/utils/workspaceDB');
    vi.mocked(getAllCachedProjects).mockResolvedValueOnce([
      {
        id: 'p1',
        detail: makeProject({ id: 'p1', title: 'Alpha' }),
        cachedAt: '2025-01-01T00:00:00.000Z',
        dirty: false,
        localUpdatedAt: null,
      },
    ]);
    const workspace: LocalWorkspace = {
      mode: 'local',
      directoryHandle: {} as FileSystemDirectoryHandle,
    };
    const entries = await listLocalProjects(workspace);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Alpha');
  });
});
