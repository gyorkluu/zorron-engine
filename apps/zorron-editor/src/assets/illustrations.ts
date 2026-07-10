import { jimengAssets, type JimengAssetKey } from './jimeng-ui-atlas';

const API_BASE = 'http://gyorkmini.beago-hake.ts.net:9900/api/ide/v1/text_to_image';

export interface IllustrationConfig {
  name: string;
  prompt: string;
  size: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
}

export const illustrations: Record<string, IllustrationConfig> = {
  'empty-canvas': {
    name: 'empty-canvas',
    prompt: 'modern flat design illustration, dark theme, isometric node graph with glowing hexagonal nodes connected by cyan and purple light beams on dark grid background',
    size: 'landscape_16_9',
  },
  'empty-assets': {
    name: 'empty-assets',
    prompt: 'modern flat design illustration, dark theme, glowing folder with media icons (image, video, audio) and sparkles, cyan-purple neon',
    size: 'square_hd',
  },
  'empty-inspector': {
    name: 'empty-inspector',
    prompt: 'modern flat design illustration, dark theme, glowing settings panel with sliders, toggles, and hand cursor, cyan-purple neon',
    size: 'square_hd',
  },
  'welcome-hero': {
    name: 'welcome-hero',
    prompt: 'modern flat design illustration, dark theme, AI robot building branching story flowchart with glowing nodes, storybook and video icons, isometric',
    size: 'landscape_16_9',
  },
  'empty-projects': {
    name: 'empty-projects',
    prompt: 'modern flat design illustration, dark theme, rocket ship taking off with new document plus sign, sparkles, cyan-purple neon',
    size: 'square_hd',
  },
};

const JIMENG_KEYS = new Set<JimengAssetKey>(Object.keys(jimengAssets) as JimengAssetKey[]);

export function getIllustrationUrl(key: string): string {
  if (JIMENG_KEYS.has(key as JimengAssetKey)) {
    return jimengAssets[key as JimengAssetKey];
  }
  const ill = illustrations[key];
  if (!ill) {
    console.warn(`Illustration "${key}" not found`);
    return '';
  }
  return `${API_BASE}?prompt=${encodeURIComponent(ill.prompt)}&image_size=${ill.size}`;
}

export const illustrationKeys = Object.keys(illustrations);
