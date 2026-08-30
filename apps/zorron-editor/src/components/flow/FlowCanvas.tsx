/**
 * FlowCanvas - the central React Flow canvas.
 *
 * Wires the editor store to React Flow, handles drag-to-create from the
 * palette, enforces connection rules (isValidConnection), and binds
 * undo/redo/delete keyboard shortcuts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type IsValidConnection,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MousePointer2, Sparkles } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { nodeTypes } from './nodes';
import { ZorronEdge } from './edges/ZorronEdge';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import { NodeSearch } from './NodeSearch';
import { EmptyStateIllustration } from '@/components/brand/EmptyStateIllustration';
import { type NodeType } from '@/types/flow';
import { getTerminalTypes, getNodeAccent } from '@/engine/nodeRegistry';
import { cn } from '@/lib/utils';

const TERMINAL_TYPES = getTerminalTypes();
const edgeTypes = { zorron: ZorronEdge };

export interface FlowCanvasProps {
  className?: string;
}

function CustomControls() {
  return (
    <div className="!bottom-4 !left-4 flex flex-col gap-1 rounded-xl border border-slate-800/50 bg-slate-900/80 p-1.5 shadow-xl backdrop-blur-xl">
      <Controls
        className="!static !m-0 !flex !flex-col !gap-1 !border-0 !bg-transparent !p-0 !shadow-none"
        position="bottom-left"
        showInteractive={false}
      />
    </div>
  );
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
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const isValidConnection: IsValidConnection<Edge> =
    useCallback(
      (connection) => {
        const sourceNode = nodes.find((n) => n.id === connection.source) as Node | undefined;
        if (sourceNode && TERMINAL_TYPES.has(sourceNode.type as NodeType)) return false;
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

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/zorron-node-type') as NodeType;
      if (!type) return;
      const position = rfInstance?.screenToFlowPosition
        ? rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        : { x: event.clientX - (wrapperRef.current?.getBoundingClientRect().left ?? 0), y: event.clientY - (wrapperRef.current?.getBoundingClientRect().top ?? 0) };
      addNode(type, position);
    },
    [addNode, rfInstance],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (isMod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setShowSearch(true);
      } else if (isMod && e.key.toLowerCase() === 'c') {
        const selectedId = useEditorStore.getState().selectedNodeId;
        if (selectedId) {
          e.preventDefault();
          useEditorStore.getState().copyNode(selectedId);
        }
      } else if (isMod && e.key.toLowerCase() === 'v') {
        const selectedId = useEditorStore.getState().selectedNodeId;
        if (selectedId) {
          const node = useEditorStore.getState().nodes.find((n) => n.id === selectedId);
          if (node) {
            e.preventDefault();
            useEditorStore.getState().pasteNode({ x: (node.position?.x ?? 0) + 40, y: (node.position?.y ?? 0) + 40 });
          }
        }
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

  const onNodeClick = useCallback((_event: MouseEvent | React.MouseEvent, node: Node) => {
    selectNode(node.id);
    setContextMenu(null);
  }, [selectNode]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setContextMenu(null);
  }, [selectNode]);

  const onNodeContextMenu = useCallback((event: MouseEvent | React.MouseEvent, node: Node) => {
    event.preventDefault();
    const flowPosition = rfInstance?.screenToFlowPosition
      ? rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: event.clientX, y: event.clientY };
    setContextMenu({ x: event.clientX, y: event.clientY, flowPosition, nodeId: node.id });
  }, [rfInstance]);

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    const flowPosition = rfInstance?.screenToFlowPosition
      ? rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: event.clientX, y: event.clientY };
    setContextMenu({ x: event.clientX, y: event.clientY, flowPosition, nodeId: null });
  }, [rfInstance]);

  // GroupNode signals collapse through a DOM event so the node component stays
  // independent of the editor store.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string }>).detail;
      if (detail?.nodeId) {
        useEditorStore.getState().toggleGroupCollapse(detail.nodeId);
      }
    };
    window.addEventListener('zorron:toggle-group', handler);
    return () => window.removeEventListener('zorron:toggle-group', handler);
  }, []);

  /**
   * Adopt a dragged node into whichever group it was dropped on, converting
   * between absolute and parent-relative coordinates as React Flow expects.
   */
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const { nodes, setNodes } = useEditorStore.getState();

    const target = nodes.find((n) => {
      if (n.type !== 'group' || n.id === node.id) return false;
      const w = (n.style?.width as number) ?? 0;
      const h = (n.style?.height as number) ?? 0;
      return (
        node.position.x >= n.position.x &&
        node.position.x <= n.position.x + w &&
        node.position.y >= n.position.y &&
        node.position.y <= n.position.y + h
      );
    });

    const previousParent = node.parentId ?? null;
    const nextParent = target?.id ?? null;
    if (previousParent === nextParent) return;

    const anchorId = nextParent ?? previousParent;
    const anchor = anchorId ? nodes.find((g) => g.id === anchorId) : undefined;

    setNodes(
      nodes.map((n) => {
        if (n.id !== node.id) return n;
        if (nextParent && anchor) {
          // Entering a group: store coordinates relative to the group.
          return {
            ...n,
            parentId: nextParent,
            extent: 'parent' as const,
            position: {
              x: node.position.x - anchor.position.x,
              y: node.position.y - anchor.position.y,
            },
          };
        }
        if (!nextParent && anchor) {
          // Leaving a group: convert back to absolute coordinates.
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
            position: {
              x: node.position.x + anchor.position.x,
              y: node.position.y + anchor.position.y,
            },
          };
        }
        return n;
      }),
    );
  }, []);

  const minimapNodeColor = useCallback((n: Node) => getNodeAccent(n.type as NodeType), []);
  const flowNodes = useMemo(() => nodes, [nodes]);
  const flowEdges = useMemo(() => edges, [edges]);

  const hasNodes = nodes.length > 0;

  return (
    <div
      ref={wrapperRef}
      className={cn('relative overflow-hidden', className)}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div className="pointer-events-none absolute inset-0 z-0" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(34,211,238,0.03), transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(167,139,250,0.02), transparent 70%)',
      }} />

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        isValidConnection={isValidConnection}
        onInit={setRfInstance}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'zorron',
          animated: true,
          style: { strokeWidth: 2 },
        }}
        className="!bg-slate-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#1e293b"
          style={{ opacity: 0.6 }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={120}
          size={2}
          color="#334155"
          style={{ opacity: 0.3 }}
        />
        <CustomControls />
        <MiniMap
          nodeColor={minimapNodeColor}
          className="!bottom-4 !right-4 !overflow-hidden !rounded-xl !border !border-slate-800/50 !bg-slate-900/80 !p-0 shadow-xl backdrop-blur-xl"
          maskColor="rgba(2,6,23,0.75)"
          nodeStrokeWidth={3}
          pannable
          zoomable
        />
      </ReactFlow>

      {!hasNodes && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <EmptyStateIllustration
              illustration="empty-canvas"
              alt="Empty canvas"
              className="max-w-md opacity-80"
              aspectRatio="video"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                  开始构建你的叙事
                </h3>
                <Sparkles size={16} className="text-purple-400" />
              </div>
              <p className="text-sm text-slate-400">
                右键画布任意位置快速添加节点，或按 Ctrl+P 搜索创建
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="rounded border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 font-mono">P</kbd>
                <span>搜索节点</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="flex items-center gap-1">
                <MousePointer2 size={12} />
                <span>右键画布添加</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {contextMenu ? <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} /> : null}
      {showSearch ? <NodeSearch onClose={() => setShowSearch(false)} /> : null}
    </div>
  );
}
