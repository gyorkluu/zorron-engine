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

  const onNodeClick = useCallback((_event: MouseEvent | React.MouseEvent, node: Node) => { selectNode(node.id); }, [selectNode]);
  const onPaneClick = useCallback(() => { selectNode(null); }, [selectNode]);
  const onNodeContextMenu = useCallback((event: MouseEvent | React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: null });
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
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        isValidConnection={isValidConnection}
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
                从左侧面板拖拽节点到画布上，或点击节点快速创建
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
                <span>拖拽创建</span>
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
