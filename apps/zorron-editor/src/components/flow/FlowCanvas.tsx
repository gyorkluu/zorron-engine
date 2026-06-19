/**
 * FlowCanvas - the central React Flow canvas.
 *
 * Wires the editor store to React Flow, handles drag-to-create from the
 * palette, enforces connection rules (isValidConnection), and binds
 * undo/redo/delete keyboard shortcuts.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type IsValidConnection,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorStore } from '@/stores/editorStore';
import { nodeTypes } from './nodes';
import { ZorronEdge } from './edges/ZorronEdge';
import type { NodeType } from '@/types/flow';

/** Terminal node types that cannot have outgoing edges. */
const TERMINAL_TYPES: ReadonlySet<NodeType> = new Set([
  'settlement',
  'link',
]);

/** Edge types registry. */
const edgeTypes = { zorron: ZorronEdge };

/** Props for the FlowCanvas. */
export interface FlowCanvasProps {
  /** Optional class name for the wrapper. */
  className?: string;
}

export function FlowCanvas({ className }: FlowCanvasProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const addNode = useEditorStore((s) => s.addNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const selectNode = useEditorStore((s) => s.selectNode);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /** Connection validation: terminal nodes can't be sources; no duplicates. */
  const isValidConnection: IsValidConnection<Connection & { source: string; target: string }> =
    useCallback(
      (connection) => {
        const sourceNode = nodes.find((n) => n.id === connection.source) as
          | Node
          | undefined;
        if (sourceNode && TERMINAL_TYPES.has(sourceNode.type as NodeType)) {
          return false;
        }
        // Prevent duplicate edges between the same source/target/handles.
        const exists = edges.some(
          (e) =>
            e.source === connection.source &&
            e.target === connection.target &&
            (e.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
            (e.targetHandle ?? null) === (connection.targetHandle ?? null),
        );
        return !exists;
      },
      [nodes, edges],
    );

  /** Handle drop from the NodePalette. */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/zorron-node-type') as NodeType;
      if (!type) return;
      const bounds = wrapperRef.current?.getBoundingClientRect();
      const position = bounds
        ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
        : { x: 0, y: 0 };
      addNode(type, position);
    },
    [addNode],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /** Keyboard shortcuts: undo/redo/delete. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ignore when typing in inputs/textareas.
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = useEditorStore.getState().selectedNodeId;
        if (selectedId) {
          e.preventDefault();
          removeNode(selectedId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, removeNode]);

  /** Click on a node selects it. */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  /** Click on the pane background clears selection. */
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const minimapNodeColor = useCallback((n: Node) => {
    const accents: Record<string, string> = {
      start: '#22d3ee',
      scene: '#a78bfa',
      logic: '#f59e0b',
      setter: '#34d399',
      calculator: '#60a5fa',
      settlement: '#f472b6',
      video: '#fb7185',
      link: '#94a3b8',
    };
    return accents[n.type ?? ''] ?? '#64748b';
  }, []);

  const flowNodes = useMemo(() => nodes, [nodes]);
  const flowEdges = useMemo(() => edges, [edges]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-[hsl(20,14%,4%)]"
      >
        <Background gap={20} size={1} color="hsl(28,14%,12%)" />
        <Controls />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(20,14,4,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
