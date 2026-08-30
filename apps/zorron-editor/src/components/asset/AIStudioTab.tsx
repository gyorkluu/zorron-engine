/**
 * AIStudioTab - In-Editor AI Asset Creation Workshop.
 *
 * Provides prompt engineering with style presets, aspect ratio controls,
 * background removal toggle, and one-click integration with the canvas and
 * asset store.
 */

import { useState, memo } from 'react';
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Check,
  Copy,
  Plus,
  Loader2,
  ArrowRight,
  Maximize2,
  SlidersHorizontal,
  History,
} from 'lucide-react';
import { useAIImageStore } from '@/stores/aiImageStore';
import { useEditorStore } from '@/stores/editorStore';
import { STYLE_PRESETS } from '@/services/jimeng.service';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';

export interface AIStudioTabProps {
  onPreviewImage?: (url: string) => void;
}

const RATIO_OPTIONS = [
  { id: '16:9', label: '16:9', desc: '横版场景', aspect: 'aspect-video' },
  { id: '9:16', label: '9:16', desc: '竖屏H5', aspect: 'aspect-[9/16]' },
  { id: '1:1', label: '1:1', desc: '头像/图标', aspect: 'aspect-square' },
  { id: '4:3', label: '4:3', desc: '标准画幅', aspect: 'aspect-[4/3]' },
] as const;

function AIStudioTabImpl({ onPreviewImage }: AIStudioTabProps) {
  const { t } = useT();
  const prompt = useAIImageStore((s) => s.prompt);
  const stylePreset = useAIImageStore((s) => s.stylePreset);
  const aspectRatio = useAIImageStore((s) => s.aspectRatio);
  const removeBg = useAIImageStore((s) => s.removeBg);
  const isGenerating = useAIImageStore((s) => s.isGenerating);
  const error = useAIImageStore((s) => s.error);
  const activeGeneration = useAIImageStore((s) => s.activeGeneration);
  const recentGenerations = useAIImageStore((s) => s.recentGenerations);

  const setPrompt = useAIImageStore((s) => s.setPrompt);
  const setStylePreset = useAIImageStore((s) => s.setStylePreset);
  const setAspectRatio = useAIImageStore((s) => s.setAspectRatio);
  const setRemoveBg = useAIImageStore((s) => s.setRemoveBg);
  const generate = useAIImageStore((s) => s.generate);
  const saveToAssetLibrary = useAIImageStore((s) => s.saveToAssetLibrary);
  const applyToActiveNode = useAIImageStore((s) => s.applyToActiveNode);

  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);

  const [savedUrls, setSavedUrls] = useState<Record<string, boolean>>({});
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleSave = async (item: any) => {
    await saveToAssetLibrary(item);
    setSavedUrls((prev) => ({ ...prev, [item.imageUrl]: true }));
    setTimeout(() => {
      setSavedUrls((prev) => ({ ...prev, [item.imageUrl]: false }));
    }, 2500);
  };

  const handleCopy = (url: string) => {
    void navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleQuickPrompt = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 space-y-4 scrollbar-thin select-none">
      {/* Title & Banner */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-indigo-500/5 to-purple-500/10 p-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-100">{t('ai.studio.title')}</h3>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          {t('ai.studio.desc')}
        </p>
      </div>

      {/* Prompt Editor */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {t('ai.studio.prompt')}
          </label>
          <button
            type="button"
            onClick={() => {
              const currentStyle = STYLE_PRESETS.find((p) => p.id === stylePreset);
              if (currentStyle) handleQuickPrompt(currentStyle.examplePrompt);
            }}
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Wand2 size={10} />
            <span>填入灵感样例</span>
          </button>
        </div>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('ai.studio.promptPh')}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/20"
        />
      </div>

      {/* Style Presets */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
          {t('ai.studio.style')}
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {STYLE_PRESETS.map((preset) => {
            const isSelected = stylePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setStylePreset(preset.id)}
                className={cn(
                  'flex items-start gap-2.5 rounded-xl border p-2 text-left transition-all',
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-sm shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                    : 'border-slate-800/60 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40',
                )}
              >
                <div
                  className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: preset.color, boxShadow: `0 0 6px ${preset.color}80` }}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-xs font-semibold', isSelected ? 'text-cyan-200' : 'text-slate-200')}>
                    {preset.name}
                  </p>
                  <p className="line-clamp-1 text-[10px] text-slate-400 mt-0.5">{preset.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
          {t('ai.studio.ratio')}
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {RATIO_OPTIONS.map((opt) => {
            const isSelected = aspectRatio === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAspectRatio(opt.id as any)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all',
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-200 shadow-sm'
                    : 'border-slate-800/60 bg-slate-900/40 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200',
                )}
              >
                <span className="font-mono text-xs font-bold">{opt.label}</span>
                <span className="text-[9px] text-slate-500 mt-0.5">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Background Removal Option */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 px-3 py-2.5">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-200">{t('ai.studio.removeBg')}</p>
          <p className="text-[10px] text-slate-500">基于 rembg AI 模型提取纯透明素材</p>
        </div>
        <input
          type="checkbox"
          checked={removeBg}
          onChange={(e) => setRemoveBg(e.target.checked)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
        />
      </div>

      {/* Generate Button */}
      <button
        type="button"
        disabled={isGenerating || !prompt.trim()}
        onClick={() => void generate()}
        className={cn(
          'group relative flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-500/25 via-indigo-500/25 to-purple-500/25 py-2.5 text-xs font-bold text-cyan-100 shadow-lg shadow-cyan-500/10 backdrop-blur-md transition-all hover:border-cyan-400 hover:from-cyan-500/35 hover:to-purple-500/35 hover:shadow-cyan-500/20 active:scale-[0.98]',
          (isGenerating || !prompt.trim()) && 'cursor-not-allowed opacity-50',
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 size={14} className="animate-spin text-cyan-300" />
            <span>{t('ai.studio.generating')}</span>
          </>
        ) : (
          <>
            <Sparkles size={14} className="text-cyan-300 transition-transform group-hover:scale-110" />
            <span>{t('ai.studio.generate')}</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
          {error}
        </p>
      )}

      {/* Generation Feed & Results */}
      <div className="space-y-2 border-t border-slate-800/60 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History size={12} className="text-slate-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {t('ai.studio.recent')}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            {recentGenerations.length} 项
          </span>
        </div>

        {recentGenerations.length === 0 ? (
          <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 p-5 text-center">
            <ImageIcon size={22} className="mx-auto text-slate-600 mb-1.5" />
            <p className="text-xs text-slate-400">{t('ai.studio.emptyRecent')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentGenerations.map((item, idx) => {
              const isSaved = savedUrls[item.imageUrl];
              const isCopied = copiedUrl === item.imageUrl;

              return (
                <div
                  key={item.timestamp + idx}
                  className="group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/50 shadow-md transition-all hover:border-slate-700"
                >
                  {/* Image Preview with glow */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                    {/* Quick Lightbox Trigger */}
                    <button
                      type="button"
                      onClick={() => onPreviewImage?.(item.imageUrl)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/80 text-slate-300 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 hover:text-white"
                      title={t('asset.preview')}
                    >
                      <Maximize2 size={12} />
                    </button>

                    <span className="absolute bottom-2 left-2 font-mono text-[9px] text-slate-400 bg-slate-900/80 rounded px-1.5 py-0.5 border border-slate-800">
                      {item.ratio} · {item.model}
                    </span>
                  </div>

                  {/* Info & Prompt */}
                  <div className="p-2.5 space-y-2">
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-300 font-medium">
                      {item.prompt}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/50">
                      <button
                        type="button"
                        onClick={() => void handleSave(item)}
                        className={cn(
                          'flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all',
                          isSaved
                            ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                            : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25',
                        )}
                      >
                        {isSaved ? <Check size={11} /> : <Plus size={11} />}
                        <span>{isSaved ? t('ai.studio.saved') : t('ai.studio.saveToLib')}</span>
                      </button>

                      {selectedNodeId && (
                        <button
                          type="button"
                          onClick={() => applyToActiveNode(item.imageUrl)}
                          className="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold text-indigo-200 hover:bg-indigo-500/25 transition-all"
                          title="将此图片设为当前选中的场景节点背景"
                        >
                          <ArrowRight size={11} />
                          <span>{t('asset.applyActive')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopy(item.imageUrl)}
                        className="ml-auto flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        title={t('asset.copyUrl')}
                      >
                        {isCopied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{isCopied ? t('asset.copied') : t('asset.copyUrl')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const AIStudioTab = memo(AIStudioTabImpl);
