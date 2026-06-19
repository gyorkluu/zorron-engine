/**
 * Editor store (Zustand) - React Flow canvas state with undo/redo.
 *
 * Responsibilities:
 * - Hold nodes/edges/selectedNodeId/viewport.
 * - Apply React Flow change events (nodesChange, edgesChange, connect).
 * - Provide addNode/removeNode/updateNodeData for the palette and inspector.
 * - Maintain a bounded history stack for undo/redo (Ctrl+Z / Ctrl+Shift+Z).
 */

import { create } from 'zustand';
import {
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import { nanoid } from 'nanoid';
import {
  type NodeType,
  type FlowNode,
  type GameNodeData,
  NODE_TYPE_LABELS,
  createDefaultNodeData,
} from '@/types/flow';

/** Maximum history entries kept for undo/redo. */
const MAX_HISTORY = 50;

/** A snapshot of the canvas structure stored in history. */
interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
}

/** Editor store state shape. */
interface EditorState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewport: { x: number; y: number; zoom: number };

  // History
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];

  // React Flow event handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Mutations
  addNode: (type: NodeType, position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<GameNodeData>) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  loadFlow: (nodes: Node[], edges: Edge[]) => void;
  clear: () => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/** Push the current canvas onto the past stack and clear the future. */
function pushHistory(state: EditorState): Partial<EditorState> {
  const snapshot: CanvasSnapshot = {
    nodes: state.nodes,
    edges: state.edges,
  };
  const past = [...state.past, snapshot].slice(-MAX_HISTORY);
  return { past, future: [] };
}

/** Create a new node with default data for the given type. */
function buildNode(type: NodeType, position: { x: number; y: number }): FlowNode {
  const id = `${type}_${nanoid(6)}`;
  return {
    id,
    type,
    position,
    data: createDefaultNodeData(type),
    selected: false,
  } as FlowNode;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  past: [],
  future: [],

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => {
      // Selection changes should not pollute history; structural changes do.
      const structural = changes.some(
        (c) => c.type === 'remove' || c.type === 'add',
      );
      const next = applyNodeChanges(changes, state.nodes);
      if (structural) {
        return { ...pushHistory(state), nodes: next };
      }
      return { nodes: next };
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => {
      const structural = changes.some(
        (c) => c.type === 'remove' || c.type === 'add',
      );
      const next = applyEdgeChanges(changes, state.edges);
      if (structural) {
        return { ...pushHistory(state), edges: next };
      }
      return { edges: next };
    });
  },

  onConnect: (connection: Connection) => {
    set((state) => {
      // Prevent duplicate edges between the same source/target/handles.
      const exists = state.edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          (e.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
          (e.targetHandle ?? null) === (connection.targetHandle ?? null),
      );
      if (exists) return state;
      const next = addEdge(
        {
          ...connection,
          id: `edge_${nanoid(8)}`,
          type: 'zorron',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        },
        state.edges,
      );
      return { ...pushHistory(state), edges: next };
    });
  },

  addNode: (type, position) => {
    const node = buildNode(type, position);
    set((state) => ({
      ...pushHistory(state),
      nodes: [...state.nodes, node],
      selectedNodeId: node.id,
    }));
    return node.id;
  },

  removeNode: (id) => {
    set((state) => ({
      ...pushHistory(state),
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  duplicateNode: (id) => {
    const state = get();
    const source = state.nodes.find((n) => n.id === id);
    if (!source) return;
    const newId = `${source.type}_${nanoid(6)}`;
    const clone: FlowNode = {
      ...(source as FlowNode),
      id: newId,
      position: {
        x: (source.position?.x ?? 0) + 40,
        y: (source.position?.y ?? 0) + 40,
      },
      selected: false,
      data: { ...source.data } as GameNodeData,
    } as FlowNode;
    set((s) => ({
      ...pushHistory(s),
      nodes: [...s.nodes, clone],
      selectedNodeId: newId,
    }));
  },

  updateNodeData: (id, data) => {
    set((state) => {
      const nodes = state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      );
      return { nodes };
    });
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setViewport: (viewport) => set({ viewport }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  loadFlow: (nodes, edges) =>
    set({
      nodes,
      edges,
      selectedNodeId: null,
      selectedEdgeId: null,
      past: [],
      future: [],
    }),

  clear: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      past: [],
      future: [],
    }),

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const present: CanvasSnapshot = {
        nodes: state.nodes,
        edges: state.edges,
      };
      return {
        nodes: previous.nodes,
        edges: previous.edges,
        past: state.past.slice(0, -1),
        future: [present, ...state.future].slice(0, MAX_HISTORY),
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const present: CanvasSnapshot = {
        nodes: state.nodes,
        edges: state.edges,
      };
      return {
        nodes: next.nodes,
        edges: next.edges,
        past: [...state.past, present].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

/** Convenience selector for the currently selected node. */
export function useSelectedNode(): FlowNode | null {
  return useEditorStore((state) => {
    if (!state.selectedNodeId) return null;
    return (state.nodes.find((n) => n.id === state.selectedNodeId) as FlowNode) ?? null;
  });
}

/** Re-export node type labels for convenience. */
export { NODE_TYPE_LABELS };
