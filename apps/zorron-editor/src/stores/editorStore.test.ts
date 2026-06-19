/**
 * Unit tests for the editor store (nodes/edges/undo/redo).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import type { FlowNode } from '@/types/flow';

function makeNode(id: string, type: FlowNode['type'] = 'scene'): FlowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, dialogue: '', choices: [] } as FlowNode['data'],
  } as FlowNode;
}

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().clear();
  });

  it('starts with empty nodes and edges', () => {
    const state = useEditorStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
  });

  it('addNode creates a node with default data and selects it', () => {
    const id = useEditorStore.getState().addNode('scene', { x: 10, y: 20 });
    const state = useEditorStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].id).toBe(id);
    expect(state.nodes[0].type).toBe('scene');
    expect(state.nodes[0].position).toEqual({ x: 10, y: 20 });
    expect(state.selectedNodeId).toBe(id);
  });

  it('removeNode deletes the node and its edges', () => {
    const store = useEditorStore.getState();
    const id1 = store.addNode('start', { x: 0, y: 0 });
    const id2 = store.addNode('scene', { x: 100, y: 0 });
    // Manually connect them.
    useEditorStore.setState((s) => ({
      edges: [
        ...s.edges,
        { id: 'e1', source: id1, target: id2, sourceHandle: null, targetHandle: null },
      ],
    }));
    useEditorStore.getState().removeNode(id2);
    const state = useEditorStore.getState();
    expect(state.nodes.find((n) => n.id === id2)).toBeUndefined();
    expect(state.edges.filter((e) => e.target === id2)).toHaveLength(0);
  });

  it('updateNodeData merges partial data into the node', () => {
    const id = useEditorStore.getState().addNode('scene', { x: 0, y: 0 });
    useEditorStore.getState().updateNodeData(id, { dialogue: 'Updated' });
    const node = useEditorStore.getState().nodes.find((n) => n.id === id);
    expect(node?.data).toMatchObject({ label: 'Scene', dialogue: 'Updated' });
  });

  it('undo reverses the last structural change', () => {
    const store = useEditorStore.getState();
    store.addNode('start', { x: 0, y: 0 });
    expect(useEditorStore.getState().nodes).toHaveLength(1);
    store.addNode('scene', { x: 100, y: 0 });
    expect(useEditorStore.getState().nodes).toHaveLength(2);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nodes).toHaveLength(1);
  });

  it('redo re-applies an undone change', () => {
    const store = useEditorStore.getState();
    store.addNode('start', { x: 0, y: 0 });
    store.addNode('scene', { x: 100, y: 0 });
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nodes).toHaveLength(1);
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().nodes).toHaveLength(2);
  });

  it('canUndo/canRedo reflect history state', () => {
    const store = useEditorStore.getState();
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
    store.addNode('start', { x: 0, y: 0 });
    expect(useEditorStore.getState().canUndo()).toBe(true);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().canRedo()).toBe(true);
  });

  it('onConnect prevents duplicate edges', () => {
    const store = useEditorStore.getState();
    const id1 = store.addNode('start', { x: 0, y: 0 });
    const id2 = store.addNode('scene', { x: 100, y: 0 });
    const connection = {
      source: id1,
      target: id2,
      sourceHandle: null,
      targetHandle: null,
    };
    useEditorStore.getState().onConnect(connection);
    useEditorStore.getState().onConnect(connection);
    expect(useEditorStore.getState().edges).toHaveLength(1);
  });

  it('loadFlow replaces nodes/edges and resets history', () => {
    const store = useEditorStore.getState();
    store.addNode('start', { x: 0, y: 0 });
    const nodes = [makeNode('n1'), makeNode('n2')];
    useEditorStore.getState().loadFlow(nodes, []);
    const state = useEditorStore.getState();
    expect(state.nodes).toHaveLength(2);
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
  });
});
