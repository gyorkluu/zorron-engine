/**
 * Unit tests for useAutoSave and the fileIO helpers.
 *
 * The auto-save hook is tested by driving fake timers and observing the
 * project store's save() call. fileIO round-trip is tested via JSON
 * serialization (the DOM download is not exercised).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoSave, buildCurrentFlowData } from './useAutoSave';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { downloadJson } from '@/utils/fileIO';
import type { FlowData } from '@/types/flow';

// Mock the project service so save/load don't hit the network.
vi.mock('@/services/project.service', () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  exportProject: vi.fn(),
  importProject: vi.fn(),
}));

// Mock DOM download so we can assert the payload.
vi.mock('@/utils/fileIO', async () => {
  const actual = await vi.importActual<typeof import('@/utils/fileIO')>('@/utils/fileIO');
  return {
    ...actual,
    downloadJson: vi.fn(),
  };
});

const sampleFlow: FlowData = {
  nodes: [
    {
      id: 'n1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start', title: 'T', intro: '' },
    },
  ],
  edges: [],
  variables: {},
  settings: {
    vectorSpace: { enabled: false, dimensions: { x: '处世', y: '立场', z: '性情' } },
  },
  version: '1.0.0',
};

describe('buildCurrentFlowData', () => {
  beforeEach(() => {
    useEditorStore.getState().clear();
    useProjectStore.getState().reset();
  });

  it('combines editor nodes/edges with project metadata', () => {
    useEditorStore.getState().addNode('start', { x: 0, y: 0 });
    const flow = buildCurrentFlowData();
    expect(flow.nodes).toHaveLength(1);
    expect(flow.edges).toHaveLength(0);
    expect(flow.version).toBe(useProjectStore.getState().version);
  });
});

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().clear();
    useProjectStore.getState().reset();
    // Seed a saved snapshot so isDirty starts false.
    useProjectStore.getState().setSavedSnapshot(sampleFlow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not save when the flow matches the snapshot', () => {
    const saveSpy = vi.spyOn(useProjectStore.getState(), 'save');
    // Hydrate the editor with the same flow so isDirty is false.
    useEditorStore.getState().loadFlow(sampleFlow.nodes, sampleFlow.edges);
    renderHook(() => useAutoSave({ delay: 1000 }));
    vi.advanceTimersByTime(2000);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('saves after the debounce when the flow becomes dirty', () => {
    const saveSpy = vi.spyOn(useProjectStore.getState(), 'save');
    renderHook(() => useAutoSave({ delay: 1000 }));
    // Mutate the canvas -> dirty.
    useEditorStore.getState().addNode('scene', { x: 10, y: 10 });
    vi.advanceTimersByTime(500);
    expect(saveSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('does not save when disabled', () => {
    const saveSpy = vi.spyOn(useProjectStore.getState(), 'save');
    renderHook(() => useAutoSave({ delay: 1000, enabled: false }));
    useEditorStore.getState().addNode('scene', { x: 10, y: 10 });
    vi.advanceTimersByTime(2000);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

describe('fileIO export round-trip', () => {
  it('downloadJson is called with a serializable payload', () => {
    const payload = { hello: 'world', n: 42 };
    downloadJson('test', payload);
    expect(downloadJson).toHaveBeenCalledWith('test', payload);
  });

  it('FlowData survives JSON round-trip', () => {
    const json = JSON.stringify(sampleFlow);
    const parsed = JSON.parse(json) as FlowData;
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0].id).toBe('n1');
    expect(parsed.version).toBe('1.0.0');
  });
});
