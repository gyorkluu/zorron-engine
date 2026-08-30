/**
 * AI Image Generation Store (Zustand).
 *
 * Manages prompts, style presets, aspect ratios, generation jobs,
 * and one-click integration into the project's asset library / canvas nodes.
 */

import { create } from 'zustand';
import {
  generateJimengImage,
  type JimengGenerateResult,
  STYLE_PRESETS,
} from '@/services/jimeng.service';
import { useAssetStore } from './assetStore';
import { useEditorStore } from './editorStore';
import { useProjectStore } from './projectStore';
import type { Asset } from '@/types/asset';

interface AIImageState {
  prompt: string;
  stylePreset: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  resolution: '2k' | '4k';
  removeBg: boolean;
  isGenerating: boolean;
  error: string | null;
  recentGenerations: JimengGenerateResult[];
  activeGeneration: JimengGenerateResult | null;
  selectedPreviewUrl: string | null;

  setPrompt: (prompt: string) => void;
  setStylePreset: (style: string) => void;
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4') => void;
  setRemoveBg: (removeBg: boolean) => void;
  setSelectedPreviewUrl: (url: string | null) => void;

  generate: () => Promise<JimengGenerateResult | null>;
  saveToAssetLibrary: (item: JimengGenerateResult, customName?: string) => Promise<Asset>;
  applyToActiveNode: (imageUrl: string) => void;
}

export const useAIImageStore = create<AIImageState>((set, get) => ({
  prompt: '',
  stylePreset: STYLE_PRESETS[0].id,
  aspectRatio: '16:9',
  resolution: '2k',
  removeBg: false,
  isGenerating: false,
  error: null,
  recentGenerations: [],
  activeGeneration: null,
  selectedPreviewUrl: null,

  setPrompt: (prompt) => set({ prompt }),
  setStylePreset: (stylePreset) => set({ stylePreset }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setRemoveBg: (removeBg) => set({ removeBg }),
  setSelectedPreviewUrl: (selectedPreviewUrl) => set({ selectedPreviewUrl }),

  generate: async () => {
    const { prompt, stylePreset, aspectRatio, resolution, removeBg } = get();
    if (!prompt.trim()) return null;

    set({ isGenerating: true, error: null });
    try {
      const result = await generateJimengImage({
        prompt,
        stylePreset,
        ratio: aspectRatio,
        resolution,
        removeBg,
      });

      set((s) => ({
        isGenerating: false,
        activeGeneration: result,
        recentGenerations: [result, ...s.recentGenerations.slice(0, 19)],
      }));
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败，请重试';
      set({ isGenerating: false, error: msg });
      return null;
    }
  },

  saveToAssetLibrary: async (item, customName) => {
    const name = customName || `AI素材_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    const projectId = useProjectStore.getState().id;

    // Create asset object and persist into asset store
    const newAsset: Asset = {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: projectId ?? null,
      name,
      type: 'image',
      mimeType: 'image/png',
      size: 1024 * 512, // approx 512KB
      url: item.imageUrl,
      createdAt: new Date().toISOString(),
      source: 'remote',
    };

    useAssetStore.setState((s) => ({
      assets: [newAsset, ...s.assets],
      total: s.total + 1,
    }));

    return newAsset;
  },

  applyToActiveNode: (imageUrl) => {
    const selectedNodeId = useEditorStore.getState().selectedNodeId;
    if (!selectedNodeId) return;

    const nodes = useEditorStore.getState().nodes;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;

    // Apply background or cover depending on node type
    useEditorStore.getState().updateNodeData(selectedNodeId, {
      backgroundUrl: imageUrl,
      ...(node.type === 'start' ? { coverUrl: imageUrl } : {}),
      ...(node.type === 'media' ? { url: imageUrl } : {}),
    });
  },
}));
