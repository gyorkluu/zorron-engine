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
} from '@/types/flow';
import { createDefaultNodeData } from '@/engine/nodeRegistry';
import {
  autoLayout,
  alignNodes,
  distributeNodes,
  type AlignMode,
} from '@/lib/layoutTools';

/** Maximum history entries kept for undo/redo. */
const MAX_HISTORY = 50;

/** A snapshot of the canvas structure stored in history. */
interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
}

/** Clipboard payload for copy/paste operations. */
export interface ClipboardPayload {
  nodes: FlowNode[];
  edges: Edge[];
}

/** Editor store state shape. */
interface EditorState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewport: { x: number; y: number; zoom: number };

  // Clipboard (P1-3)
  clipboard: ClipboardPayload | null;

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

  // Clipboard operations (P1-3)
  /** Copy selected node (and its connected edges) to clipboard. */
  copyNode: (id: string) => void;
  /** Paste clipboard content at a given position. */
  pasteNode: (position: { x: number; y: number }) => void;
  /** Focus/select a node and center viewport on it. */
  focusNode: (id: string) => void;
  /** Create an empty collapsible group container. Returns the new node id. */
  createGroup: (label?: string) => string;
  /** Collapse or expand a group, hiding or revealing its children. */
  toggleGroupCollapse: (groupId: string) => void;
  /** Re-flow the whole graph into layered columns. */
  autoLayoutAll: () => void;
  /** Align the selected nodes against their shared bounding box. No-op under 2. */
  alignSelected: (mode: AlignMode) => void;
  /** Evenly space the selected nodes. No-op under 3. */
  distributeSelected: (axis: 'horizontal' | 'vertical') => void;

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

/** Footprint of a newly created group. */
const GROUP_DEFAULT_WIDTH = 420;
const GROUP_DEFAULT_HEIGHT = 280;
/** Footprint of a collapsed group — just enough for the header chip. */
const GROUP_COLLAPSED_WIDTH = 180;
const GROUP_COLLAPSED_HEIGHT = 38;

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  clipboard: null,
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

  copyNode: (id) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === id) as FlowNode | undefined;
    if (!node) return;
    // Capture the node and its connected edges; edges are rebuilt on paste
    // because source/target ids will change.
    const connectedEdges = state.edges.filter(
      (e) => e.source === id || e.target === id,
    );
    set({
      clipboard: {
        nodes: [{ ...(node as FlowNode), data: { ...node.data } as GameNodeData }],
        edges: connectedEdges.map((e) => ({ ...e })),
      },
    });
  },

  pasteNode: (position) => {
    const state = get();
    if (!state.clipboard || state.clipboard.nodes.length === 0) return;
    const source = state.clipboard.nodes[0] as FlowNode;
    const newId = `${source.type}_${nanoid(6)}`;
    const clone: FlowNode = {
      ...(source as FlowNode),
      id: newId,
      position,
      selected: false,
      data: { ...source.data } as GameNodeData,
    } as FlowNode;
    set((s) => ({
      ...pushHistory(s),
      nodes: [...s.nodes, clone],
      selectedNodeId: newId,
    }));
  },

  focusNode: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  createGroup: (label) => {
    const id = `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const groupNode = {
      id,
      type: 'group',
      position: { x: 120, y: 120 },
      data: {
        label: label ?? '\u65b0\u5206\u7ec4',
        color: '#38bdf8',
        collapsed: false,
        width: GROUP_DEFAULT_WIDTH,
        height: GROUP_DEFAULT_HEIGHT,
      },
      style: { width: GROUP_DEFAULT_WIDTH, height: GROUP_DEFAULT_HEIGHT },
      // Groups render behind whatever they contain.
      zIndex: 0,
      selectable: true,
      draggable: true,
    };
    set((s) => ({
      ...pushHistory(s),
      nodes: [...s.nodes, groupNode],
      selectedNodeId: id,
    }));
    return id;
  },

  toggleGroupCollapse: (groupId) => {
    set((state) => {
      const group = state.nodes.find((n) => n.id === groupId);
      if (!group) return state;

      const data = group.data as { collapsed?: boolean; width?: number; height?: number };
      const collapsed = !data.collapsed;
      const expandedWidth = (group.style?.width as number) || GROUP_DEFAULT_WIDTH;
      const expandedHeight = (group.style?.height as number) || GROUP_DEFAULT_HEIGHT;

      const nodes = state.nodes.map((n) => {
        if (n.id === groupId) {
          return {
            ...n,
            data: {
              ...n.data,
              collapsed,
              // Cache the expanded footprint so expanding restores it.
              width: collapsed ? expandedWidth : (data.width ?? expandedWidth),
              height: collapsed ? expandedHeight : (data.height ?? expandedHeight),
            },
            style: collapsed
              ? { ...n.style, width: GROUP_COLLAPSED_WIDTH, height: GROUP_COLLAPSED_HEIGHT }
              : {
                  ...n.style,
                  width: data.width ?? GROUP_DEFAULT_WIDTH,
                  height: data.height ?? GROUP_DEFAULT_HEIGHT,
                },
          };
        }
        // Children follow the group's collapsed state.
        if (n.parentId === groupId) {
          return { ...n, hidden: collapsed };
        }
        return n;
      });

      return { nodes };
    });
  },

  autoLayoutAll: () => {
    set((s) => ({
      ...pushHistory(s),
      nodes: autoLayout(s.nodes, s.edges),
    }));
  },

  alignSelected: (mode) => {
    set((s) => {
      const selected = s.nodes.filter((n) => n.selected);
      if (selected.length < 2) return s;
      const moved = new Map(alignNodes(selected, mode).map((n) => [n.id, n]));
      return {
        ...pushHistory(s),
        nodes: s.nodes.map((n) => moved.get(n.id) ?? n),
      };
    });
  },

  distributeSelected: (axis) => {
    set((s) => {
      const selected = s.nodes.filter((n) => n.selected);
      if (selected.length < 3) return s;
      const moved = new Map(distributeNodes(selected, axis).map((n) => [n.id, n]));
      return {
        ...pushHistory(s),
        nodes: s.nodes.map((n) => moved.get(n.id) ?? n),
      };
    });
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
      clipboard: null,
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
