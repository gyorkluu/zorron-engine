/**
 * EditorShell - the main three-panel editor layout.
 *
 * Left: AssetPanel (resource management + drag source).
 * Center: FlowCanvas (React Flow node graph) with a floating NodePalette.
 * Right: InspectorPanel (selected node editor).
 * Top: EditorToolbar (title, save status, import/export/save).
 *
 * Wires auto-save and project sync. The NodePalette floats over the canvas
 * top-left so the asset panel can own the left rail. When the 3D vector
 * feature flag is on, a VectorSpacePanel floats over the canvas bottom-right.
 */

import { memo, useCallback } from 'react';
import { AssetPanel } from '@/components/asset/AssetPanel';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { NodePalette } from '@/components/flow/NodePalette';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { EditorToolbar } from './EditorToolbar';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useProjectSync } from '@/hooks/useProjectSync';
import { SimulationTrigger } from '@/components/simulation/SimulationTrigger';
import { VectorSpacePanel } from '@/components/vector3d/VectorSpacePanel';
import { ConflictDialog } from '@/components/workspace/ConflictDialog';
import { featureFlags } from '@/lib/featureFlags';
import { useEditorStore } from '@/stores/editorStore';
import type { NodeType } from '@/types/flow';

/** Props for the EditorShell. */
export interface EditorShellProps {
  /** Optional project id to load (cloud mode). Null = local mode. */
  projectId?: string | null;
}

function EditorShellImpl({ projectId = null }: EditorShellProps) {
  // Hydrate the editor from the backend (or reset for local mode).
  useProjectSync({ projectId });
  // Debounced auto-save whenever the canvas / metadata changes.
  useAutoSave({ delay: 3000, enabled: true });

  const addNode = useEditorStore((s) => s.addNode);

  /** Click-to-create from the palette: add at a reasonable center offset. */
  const handleCreateNode = useCallback(
    (type: NodeType) => {
      // Place near the canvas center with a small cascade so successive
      // clicks don't stack on top of each other.
      const count = useEditorStore.getState().nodes.length;
      addNode(type, { x: 250 + count * 40, y: 200 + count * 40 });
    },
    [addNode],
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[hsl(20,14%,4%)] text-[hsl(40,30%,92%)]">
      <EditorToolbar />
      <div className="flex min-h-0 flex-1">
        <AssetPanel />
        <main className="relative min-w-0 flex-1">
          <FlowCanvas className="h-full w-full" />
          {/* 浮动节点面板 — 画布左上角 */}
          <div className="absolute left-3 top-3 z-10 max-h-[70vh] w-56 overflow-hidden rounded-2xl border border-[hsl(28,14%,18%)] bg-[hsl(22,16%,7%,0.85)] shadow-2xl backdrop-blur-xl animate-fade-in">
            <NodePalette onCreateNode={handleCreateNode} />
          </div>
          {/* 浮动模拟触发器 — 画布右上角 */}
          <div className="absolute right-3 top-3 z-10">
            <SimulationTrigger />
          </div>
          {/* 浮动 3D 向量空间面板（Feature Flag 控制） */}
          {featureFlags.vector3d && (
            <div className="absolute bottom-3 right-3 z-10 w-80">
              <VectorSpacePanel compact />
            </div>
          )}
        </main>
        <InspectorPanel />
      </div>
      {/* 冲突解决对话框（Feature Flag 控制） */}
      {featureFlags.cloudSync && <ConflictDialog />}
    </div>
  );
}

export const EditorShell = memo(EditorShellImpl);
