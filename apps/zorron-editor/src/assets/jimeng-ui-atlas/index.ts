import emptyAssets from './empty-assets.png';
import emptyInspector from './empty-inspector.png';
import emptyProjects from './empty-projects.png';
import emptyCanvas from './empty-canvas.png';
import welcomeHero from './welcome-hero.png';

export const jimengAssets = {
  'empty-assets': emptyAssets,
  'empty-inspector': emptyInspector,
  'empty-projects': emptyProjects,
  'empty-canvas': emptyCanvas,
  'welcome-hero': welcomeHero,
} as const;

export type JimengAssetKey = keyof typeof jimengAssets;

export function getJimengAssetUrl(key: JimengAssetKey): string {
  return jimengAssets[key];
}
