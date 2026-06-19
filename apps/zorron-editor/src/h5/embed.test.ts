/**
 * Unit tests for the H5 Embed SDK.
 *
 * Tests the `parseEmbedConfig` helper and the `mount`/`unmount` lifecycle
 * using a mocked React root. The actual rendering is exercised in component
 * tests; here we focus on the SDK's DOM resolution and handle management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseEmbedConfig } from './types';

describe('parseEmbedConfig', () => {
  it('parses data-project-id', () => {
    const el = document.createElement('div');
    el.setAttribute('data-project-id', 'abc-123');
    const config = parseEmbedConfig(el);
    expect(config.projectId).toBe('abc-123');
  });

  it('parses data-api-base', () => {
    const el = document.createElement('div');
    el.setAttribute('data-api-base', 'https://api.example.com');
    const config = parseEmbedConfig(el);
    expect(config.apiBase).toBe('https://api.example.com');
  });

  it('parses data-theme', () => {
    const el = document.createElement('div');
    el.setAttribute('data-theme', 'light');
    const config = parseEmbedConfig(el);
    expect(config.theme).toBe('light');
  });

  it('ignores invalid theme values', () => {
    const el = document.createElement('div');
    el.setAttribute('data-theme', 'purple');
    const config = parseEmbedConfig(el);
    expect(config.theme).toBeUndefined();
  });

  it('parses data-features-vector3d', () => {
    const el = document.createElement('div');
    el.setAttribute('data-features-vector3d', 'on');
    const config = parseEmbedConfig(el);
    expect(config.features?.vector3d).toBe(true);
  });

  it('returns an empty config when no attributes are set', () => {
    const el = document.createElement('div');
    const config = parseEmbedConfig(el);
    expect(config).toEqual({});
  });
});

describe('ZorronPlayer SDK mount/unmount', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear the DOM between tests.
    document.body.innerHTML = '';
  });

  it('mounts a player into a container element', async () => {
    // Mock react-dom/client to avoid actual rendering.
    const mockRender = vi.fn();
    const mockUnmount = vi.fn();
    vi.doMock('react-dom/client', () => ({
      createRoot: vi.fn(() => ({
        render: mockRender,
        unmount: mockUnmount,
      })),
    }));
    // Mock the EmbedPlayer to avoid loading the full player tree.
    vi.doMock('./EmbedPlayer', () => ({
      EmbedPlayer: () => null,
    }));

    const { ZorronPlayer } = await import('./embed');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = ZorronPlayer.mount({
      container,
      projectId: 'test-id',
      theme: 'dark',
    });
    expect(handle.container).toBe(container);
    expect(mockRender).toHaveBeenCalled();
    handle.unmount();
    expect(mockUnmount).toHaveBeenCalled();
  });

  it('mounts a player using a CSS selector', async () => {
    const mockRender = vi.fn();
    vi.doMock('react-dom/client', () => ({
      createRoot: vi.fn(() => ({
        render: mockRender,
        unmount: vi.fn(),
      })),
    }));
    vi.doMock('./EmbedPlayer', () => ({
      EmbedPlayer: () => null,
    }));

    const { ZorronPlayer } = await import('./embed');
    const container = document.createElement('div');
    container.id = 'player-target';
    document.body.appendChild(container);

    const handle = ZorronPlayer.mount({
      container: '#player-target',
      projectId: 'test-id',
    });
    expect(handle.container).toBe(container);
    expect(mockRender).toHaveBeenCalled();
  });

  it('throws when the container selector does not match', async () => {
    vi.doMock('react-dom/client', () => ({
      createRoot: vi.fn(() => ({ render: vi.fn(), unmount: vi.fn() })),
    }));
    vi.doMock('./EmbedPlayer', () => ({
      EmbedPlayer: () => null,
    }));

    const { ZorronPlayer } = await import('./embed');
    expect(() =>
      ZorronPlayer.mount({ container: '#nonexistent', projectId: 'x' }),
    ).toThrow('container "#nonexistent" not found');
  });

  it('unmounts a player via the SDK function', async () => {
    const mockUnmount = vi.fn();
    vi.doMock('react-dom/client', () => ({
      createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: mockUnmount,
      })),
    }));
    vi.doMock('./EmbedPlayer', () => ({
      EmbedPlayer: () => null,
    }));

    const { ZorronPlayer } = await import('./embed');
    const container = document.createElement('div');
    document.body.appendChild(container);

    ZorronPlayer.mount({ container, projectId: 'x' });
    ZorronPlayer.unmount(container);
    expect(mockUnmount).toHaveBeenCalled();
  });
});
