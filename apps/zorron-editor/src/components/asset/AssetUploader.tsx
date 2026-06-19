/**
 * AssetUploader - file picker + drag-drop zone that uploads via assetStore.
 *
 * Uses the store's `uploadAssetWithFallback` so uploads succeed even when the
 * backend is unreachable (assets are then persisted in IndexedDB).
 */

import { memo, useRef, useState, type DragEvent } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

/** Props for the AssetUploader. */
export interface AssetUploaderProps {
  /** Optional class name. */
  className?: string;
}

function AssetUploaderImpl({ className }: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useAssetStore((s) => s.uploadAssetWithFallback);
  const isUploading = useAssetStore((s) => s.isUploading);
  const error = useAssetStore((s) => s.error);
  const projectId = useProjectStore((s) => s.id);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Upload sequentially so progress is predictable; small batches expected.
    for (const file of Array.from(files)) {
      try {
        await upload(file, projectId ?? undefined);
      } catch {
        // The fallback already handles backend failures; only surface unexpected errors.
      }
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => setIsDragOver(false);

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/40 px-3 py-4 text-center transition-colors',
          isDragOver && 'border-cyan-500/60 bg-cyan-500/5',
          isUploading && 'pointer-events-none opacity-60',
        )}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-slate-400"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-xs font-medium text-slate-300">
          {isUploading ? '上传中...' : '上传或拖拽文件'}
        </p>
        <p className="text-[10px] text-slate-500">图片 / 音频 / 视频 / 字体</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          // Reset so selecting the same file again re-fires onChange.
          e.target.value = '';
        }}
      />
      {error && (
        <p className="mt-1 text-[10px] text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const AssetUploader = memo(AssetUploaderImpl);
