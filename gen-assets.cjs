const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://gyorkmini.beago-hake.ts.net:9900/api/jimeng/generate';
const OUT_DIR = 'i:/workspace/Nodejs-workspace/bot/project/zorron-engine/apps/zorron-editor/src/assets/jimeng-ui-atlas';

const PROMPT_BASE = [
  'solid pure chroma key green background color #00FF00, flat uniform green screen, absolutely no gradients no shadows no textures on background',
  'NO glow NO neon NO bloom NO light effects NO lens flare NO outer glow NO inner glow NO aura NO illumination NO shine',
  'clean 2D vector illustration style, flat design, solid color fills, crisp sharp edges, clear outlines, isometric view',
  'subject colors must NOT contain any green, no green in the character or object',
  'centered composition, subject placed in center with generous green border around it, no cropping',
  'high contrast between subject and green background, subject edges sharp and clean, no soft edges no blur no anti-alias halos',
].join(', ');

const ASSETS = [
  {
    name: 'g-empty-canvas',
    concept: 'a network of interconnected cubic nodes floating in space connected by thin lines, representing a node graph editor or flow chart, the nodes are 3D isometric cubes colored in dark blue and purple tones with subtle light gray accents, geometric and technical looking',
    outName: 'g-empty-canvas.png',
  },
  {
    name: 'g-empty-assets',
    concept: 'a single isometric media library panel or dashboard card with four small square icons arranged in a 2x2 grid inside it: a photo icon, a music note icon, a play button video icon, and a font letter A icon, the panel is dark slate blue and purple colored, clean UI element illustration',
    outName: 'g-empty-assets.png',
  },
  {
    name: 'g-empty-inspector',
    concept: 'an isometric properties panel or inspector window with a large magnifying glass icon at the top, below it are several horizontal sliders and toggle switches with small circular knobs, the panel is dark slate color with cyan and purple accent details, clean UI controls illustration',
    outName: 'g-empty-inspector.png',
  },
  {
    name: 'g-empty-projects',
    concept: 'an isometric cloud folder icon, a large rounded cloud-shaped folder in soft blue-purple gradient colors, small floating document cards and tiny folder icons scattered around it, some with screen displays on them, representing cloud storage and project files',
    outName: 'g-empty-projects.png',
  },
  {
    name: 'g-welcome-hero',
    concept: 'a cute friendly small robot mascot character standing on the right side, the robot is rounded chibi style with a screen face showing two dot eyes and a small smile, colored in dark charcoal with cyan and purple accent details, on the left side a small flow chart diagram with connected rectangular nodes, both robot and diagram are clean solid color illustrations',
    outName: 'g-welcome-hero.png',
  },
];

async function generateImage(prompt, ratio = '1:1') {
  console.log('  Generating with prompt length:', prompt.length);
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode: 'auto', model: 'v5.0', ratio, resolution: '2k' }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API error ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  if (!data.success || !data.images || data.images.length === 0) {
    throw new Error(`API returned no images: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.images[0];
}

async function downloadImage(url, destPath) {
  console.log('  Downloading:', url.slice(0, 80) + '...');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf;
}

function chromaKeyRemoveGreen(inputBuf, outputPath) {
  return new Promise((resolve, reject) => {
    sharp(inputBuf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        const { width, height, channels } = info;
        const pixels = new Uint8ClampedArray(data);
        const total = width * height;

        // Chroma key: pure green (#00FF00) background removal
        // Strategy:
        // 1. For each pixel, determine if it's "green background" by checking:
        //    - G channel is dominant (G > R and G > B)
        //    - Green value is high enough
        //    - Not near-white/gray (which would be anti-aliased white text)
        // 2. Edge pixels (semi-green): feather alpha based on green dominance
        // 3. Protect white/near-white pixels (potential text/highlights)

        const GREEN_THR = 180;     // minimum G to be considered background
        const GREEN_DOM = 40;      // G must exceed max(R,B) by this much
        const FEATHER_RANGE = 50;  // how wide the soft edge is
        const WHITE_PROTECT = 200; // if min(R,G,B) > this, treat as white/foreground

        // Two-pass approach for clean edges:
        // Pass 1: Create binary bg/fg mask using flood fill from corners
        // Pass 2: Apply soft edge feathering

        // Simple approach: direct color distance from pure green, with white protection
        for (let i = 0; i < total; i++) {
          const pi = i * channels;
          const r = pixels[pi], g = pixels[pi+1], b = pixels[pi+2];

          // White protection: high values in all channels = white/light gray foreground
          const minCh = Math.min(r, g, b);
          if (minCh > WHITE_PROTECT) {
            pixels[pi+3] = 255;
            // Despill: remove green cast from white pixels
            if (g > r + 10 || g > b + 10) {
              pixels[pi+1] = Math.max(r, b);
            }
            continue;
          }

          const maxRB = Math.max(r, b);
          const greenExcess = g - maxRB;

          // Classify pixel
          if (g >= GREEN_THR && greenExcess >= GREEN_DOM) {
            // Clearly green background - fully transparent
            pixels[pi+3] = 0;
          } else if (g >= GREEN_THR - FEATHER_RANGE && greenExcess >= GREEN_DOM - FEATHER_RANGE/2) {
            // Edge zone - compute alpha based on how "green" it is
            const gDist = Math.min(
              (g - (GREEN_THR - FEATHER_RANGE)) / FEATHER_RANGE,
              (greenExcess - (GREEN_DOM - FEATHER_RANGE/2)) / (FEATHER_RANGE/2)
            );
            // gDist: 0 = fully foreground edge, 1 = fully background
            const clamped = Math.max(0, Math.min(1, gDist));
            // Smoothstep for natural feather
            const t = clamped * clamped * (3 - 2 * clamped);
            pixels[pi+3] = Math.round((1 - t) * 255);

            // Despill: reduce green channel for semi-transparent edge pixels
            if (pixels[pi+3] > 0 && pixels[pi+3] < 255) {
              const targetG = Math.max(r, b);
              pixels[pi+1] = Math.round(g + (targetG - g) * t);
            }
          } else {
            // Foreground pixel - opaque
            pixels[pi+3] = 255;
            // Despill for foreground: if green is significantly higher than both R and B,
            // reduce green spill
            if (g > r + 30 && g > b + 30) {
              pixels[pi+1] = Math.max(r, b) + Math.round((g - Math.max(r,b)) * 0.3);
            }
          }
        }

        // Trim transparent borders and add padding
        sharp(pixels, { raw: { width, height, channels } })
          .trim({ threshold: 10 })
          .extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r:0, g:0, b:0, alpha:0 } })
          .png({ quality: 100, compressionLevel: 5 })
          .toFile(outputPath, (err, info) => {
            if (err) reject(err);
            else resolve(info);
          });
      })
      .catch(reject);
  });
}

async function main() {
  console.log('=== Step 1: Generate illustrations via Jimeng API ===\n');
  const results = [];

  for (const asset of ASSETS) {
    const fullPrompt = `${asset.concept}, ${PROMPT_BASE}`;
    console.log(`[${asset.name}]`);
    try {
      // Save prompt for reference
      fs.writeFileSync(path.join(OUT_DIR, `prompt-g-${asset.name.replace('g-','')}.txt`), fullPrompt);

      const imgUrl = await generateImage(fullPrompt);
      const rawPath = path.join(OUT_DIR, asset.outName.replace('.png', '-raw.png'));
      await downloadImage(imgUrl, rawPath);

      const meta = await sharp(rawPath).metadata();
      console.log(`  Raw: ${meta.width}x${meta.height}`);
      results.push({ ...asset, rawPath, ok: true });
    } catch (e) {
      console.error(`  FAILED:`, e.message);
      results.push({ ...asset, ok: false, error: e.message });
    }
    // Small delay between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n=== Step 2: Chroma key (green screen) removal ===\n');
  for (const r of results) {
    if (!r.ok) continue;
    const finalName = r.outName.replace('g-', '');
    const finalOutPath = path.join(OUT_DIR, finalName);
    console.log(`[${r.name}] -> ${finalName}`);
    try {
      const rawBuf = fs.readFileSync(r.rawPath);
      await chromaKeyRemoveGreen(rawBuf, finalOutPath);
      const meta = await sharp(finalOutPath).metadata();
      console.log(`  Output: ${meta.width}x${meta.height}`);
    } catch (e) {
      console.error(`  FAILED:`, e.message);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
