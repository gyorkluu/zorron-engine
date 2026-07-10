/**
 * AssetUploader - file picker + drag-drop zone that uploads via assetStore.
 */

import { memo, useRef, useState, type DragEvent } from 'react';
import { Upload, Loader2, CloudUpload } from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';

export interface AssetUploaderProps {
  className?: string;
}

function AssetUploaderImpl({ className }: AssetUploaderProps) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useAssetStore((s) => s.uploadAssetWithFallback);
  const isUploading = useAssetStore((s) => s.isUploading);
  const error = useAssetStore((s) => s.error);
  const projectId = useProjectStore((s) => s.id);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await upload(file, projectId ?? undefined);
      } catch {
        // fallback handles backend failures
      }
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

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
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        className={cn(
          'group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-5 text-center transition-all duration-200',
          isDragOver
            ? 'border-cyan-400/60 bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 shadow-inner shadow-cyan-500/10'
            : 'border-slate-800/60 bg-slate-900/30 hover:border-cyan-500/30 hover:bg-slate-900/50',
          isUploading && 'pointer-events-none opacity-60',
        )}
      >
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          isDragOver
            ? 'bg-cyan-500/20 text-cyan-300'
            : 'bg-slate-800/60 text-slate-400 group-hover:text-cyan-400',
        )}>
          {isUploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isDragOver ? (
            <CloudUpload size={18} />
          ) : (
            <Upload size={18} />
          )}
        </div>
        <p className="text-xs font-semibold text-slate-300">
          {isUploading ? t('asset.uploading') : t('asset.upload')}
        </p>
        <p className="text-[10px] text-slate-500">{t('asset.uploadHint')}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-rose-400" role="alert">
          <Upload size={10} />
          {error}
        </p>
      )}
    </div>
  );
}

export const AssetUploader = memo(AssetUploaderImpl);
