/**
 * extract-zodiac-svg.ts
 *
 * Extracts the 12 zodiac Mono SVG icons from titimap.html (saved alongside
 * this script) and writes them as individual .svg files under
 * apps/zorron-editor/public/zodiac-icons/<chinese>.svg.
 *
 * Run: bun run scripts/extract-zodiac-svg.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HTML_PATH = resolve(__dirname, '../titimap.html');
const OUT_DIR = resolve(__dirname, '../apps/zorron-editor/public/zodiac-icons');

// Chinese zodiac name (as used in seed-jx3-social-card.ts ZODIACS) →
// mono SVG group id suffix used by titimap.com.
const ZODIAC_MAP: Array<{ cn: string; monoId: string }> = [
  { cn: '白羊', monoId: 'Aries_Mono' },
  { cn: '金牛', monoId: 'Taurus_Mono' },
  { cn: '双子', monoId: 'Gemini_Mono' },
  { cn: '巨蟹', monoId: 'Cancer_Mono' },
  { cn: '狮子', monoId: 'Leo_Mono' },
  { cn: '处女', monoId: 'Virgo_Mono' },
  { cn: '天秤', monoId: 'Libra_Mono' },
  { cn: '天蝎', monoId: 'Scorpio_Mono' },
  { cn: '射手', monoId: 'Sag_Mono' },
  { cn: '摩羯', monoId: 'Capricorn_Mono' },
  { cn: '水瓶', monoId: 'Aquarius_Mono' },
  { cn: '双鱼', monoId: 'Pisces_Mono' },
];

function extractSvg(html: string, monoId: string): string | null {
  // Find the <svg> that contains the given monoId (supporting both
  // id="Xxx_Mono" and id='Xxx_Mono' quote styles), then capture until
  // the matching </svg>.
  const dqIdx = html.indexOf(`id="${monoId}"`);
  const sqIdx = html.indexOf(`id='${monoId}'`);
  const start = dqIdx !== -1 ? dqIdx : sqIdx;
  if (start === -1) return null;
  // Walk backwards to find the opening <svg ...> tag.
  const svgOpen = html.lastIndexOf('<svg', start);
  if (svgOpen === -1) return null;
  const svgClose = html.indexOf('</svg>', start);
  if (svgClose === -1) return null;
  // Reconstruct a clean SVG: keep <svg ...> tag but replace viewBox if missing,
  // drop data-v-* attrs and cls-* class refs (paths are filled black).
  const raw = html.slice(svgOpen, svgClose + 6);
  const cleaned = raw
    .replace(/\s+data-v-[a-z0-9]+=""/g, '')
    .replace(/\s+data-v-[a-z0-9]+=''/g, '')
    .replace(/\s+class="cls-1"/g, '')
    .replace(/\s+class='cls-1'/g, '')
    .replace(/\s+fill="currentColor"/g, '')
    // Apply a warm cream/gold fill so the line-art zodiac icons stay visible
    // against the dark stage background (img-loaded SVGs cannot inherit CSS
    // currentColor, so we bake a fixed color into the file).
    .replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
      const hasFill = /fill=/.test(attrs);
      const newAttrs = hasFill ? attrs : `${attrs} fill="#e8d9b5"`;
      return `<svg${newAttrs} role="img" aria-hidden="true">`;
    });
  return cleaned;
}

function main(): void {
  if (!existsSync(HTML_PATH)) {
    console.error(`[extract] HTML file not found: ${HTML_PATH}`);
    process.exit(1);
  }
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
  const html = readFileSync(HTML_PATH, 'utf-8');
  let ok = 0;
  let fail = 0;
  for (const z of ZODIAC_MAP) {
    const svg = extractSvg(html, z.monoId);
    if (!svg) {
      console.error(`[extract] FAIL ${z.cn} (${z.monoId})`);
      fail += 1;
      continue;
    }
    const outPath = resolve(OUT_DIR, `${z.cn}.svg`);
    writeFileSync(outPath, svg, 'utf-8');
    console.log(`[extract] OK   ${z.cn} → ${outPath} (${svg.length} bytes)`);
    ok += 1;
  }
  console.log(`[extract] Done: ${ok} ok, ${fail} fail`);
}

main();
