/**
 * AssetLightbox - High-fidelity modal viewer for inspecting assets.
 */

import { memo, useEffect } from 'react';
import { X, Copy, ArrowRight, Download, Check } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useAIImageStore } from '@/stores/aiImageStore';
import { useState } from 'react';

export interface AssetLightboxProps {
  url: string | null;
  onClose: () => void;
}

function AssetLightboxImpl({ url, onClose }: AssetLightboxProps) {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const applyToActiveNode = useAIImageStore((s) => s.applyToActiveNode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!url) return null;

  const handleCopy = () => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    applyToActiveNode(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/85 p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] max-w-4xl flex-col items-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Top bar */}
        <div className="flex w-full items-center justify-between border-b border-slate-800 bg-slate-950/60 px-5 py-3">
          <span className="font-mono text-xs text-slate-400 truncate max-w-md">
            {url}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Image Display */}
        <div className="flex max-h-[70vh] w-full items-center justify-center overflow-auto p-4 bg-slate-950/40">
          <img
            src={url}
            alt="Asset preview"
            className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-white/10"
          />
        </div>

        {/* Action Toolbar */}
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? '已复制链接' : '复制图片链接'}</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
            >
              <Download size={13} />
              <span>在新标签页打开</span>
            </a>
          </div>

          {selectedNodeId && (
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-200 shadow-lg shadow-cyan-500/10 transition-all hover:bg-cyan-500/30 hover:text-white active:scale-95"
            >
              <ArrowRight size={13} />
              <span>设为当前选中场景背景</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const AssetLightbox = memo(AssetLightboxImpl);
