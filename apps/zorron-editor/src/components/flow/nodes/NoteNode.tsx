/**
 * NoteNode — a free-floating sticky note for annotating the canvas.
 *
 * Purely editorial: it carries no handles, so it can never be wired into the
 * flow. Double-click to edit in place.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { StickyNote } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

export interface NoteNodeProps extends NodeProps {
  data: {
    text?: string;
    /** Accent colour (hex) for the note paper. */
    color?: string;
  };
}

export function NoteNode({ id, data, selected }: NoteNodeProps) {
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text ?? '');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(data.text ?? '');
  }, [data.text, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== (data.text ?? '')) {
      updateNodeData(id, { text: draft } as never);
    }
  }, [draft, data.text, id, updateNodeData]);

  const color = data.color ?? '#eab308';

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      className="nodrag nopan w-48 cursor-text rounded-md p-2.5 shadow-lg transition-shadow"
      style={{
        background: `${color}26`,
        border: `1px solid ${selected ? color : `${color}59`}`,
        boxShadow: selected ? `0 0 0 1px ${color}` : undefined,
      }}
    >
      <div
        className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color }}
      >
        <StickyNote size={10} />
        便签
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft(data.text ?? '');
              setEditing(false);
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
          }}
          rows={3}
          className="w-full resize-none rounded bg-slate-950/60 p-1.5 text-xs leading-relaxed text-slate-100 focus:outline-none"
          style={{ border: `1px solid ${color}80` }}
        />
      ) : (
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">
          {data.text || (
            <span className="italic text-slate-500">双击编辑备注…</span>
          )}
        </p>
      )}
    </div>
  );
}

export const NoteNodeComponent = memo(NoteNode);
