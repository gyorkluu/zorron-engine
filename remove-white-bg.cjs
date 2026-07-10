const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = 'i:/workspace/Nodejs-workspace/bot/project/zorron-engine/apps/zorron-editor/src/assets/jimeng-ui-atlas';
const assets = [
  { name: 'empty-assets',    src: 'w-empty-assets.png' },
  { name: 'empty-inspector', src: 'w-empty-inspector.png' },
  { name: 'empty-projects',  src: 'w-empty-projects.png' },
  { name: 'empty-canvas',    src: 'w-empty-canvas.png' },
  { name: 'welcome-hero',    src: 'w-welcome-hero.png' },
];
const PADDING = 32;

async function removeWhiteBgAdvanced(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixels = new Uint8ClampedArray(data);
  const total = width * height;

  // --- Step 0: Estimate background color from corners ---
  let bgR = 0, bgG = 0, bgB = 0, cornerCount = 0;
  const cornerSize = 15;
  for (let y = 0; y < cornerSize; y++) {
    for (let x = 0; x < cornerSize; x++) {
      for (const [cx, cy] of [[x,y],[width-1-x,y],[x,height-1-y],[width-1-x,height-1-y]]) {
        const pi = (cy*width+cx)*channels;
        bgR += pixels[pi]; bgG += pixels[pi+1]; bgB += pixels[pi+2];
        cornerCount++;
      }
    }
  }
  bgR = Math.round(bgR/cornerCount);
  bgG = Math.round(bgG/cornerCount);
  bgB = Math.round(bgB/cornerCount);
  console.log(`  estimated bg: rgb(${bgR},${bgG},${bgB})`);

  // --- Step 1: Classify pixels using Manhattan distance from bg color ---
  const bgDist = new Uint16Array(total);
  const HARD_FG_THR = 85;     // Manhattan dist > this = definitely subject, blocks flood
  const SOFT_BG_THR = 45;     // Manhattan dist < this = bg candidate (flood fill can pass through)

  for (let i = 0; i < total; i++) {
    const pi = i * channels;
    const r = pixels[pi], g = pixels[pi+1], b = pixels[pi+2];
    bgDist[i] = Math.abs(r-bgR) + Math.abs(g-bgG) + Math.abs(b-bgB);
  }

  // --- Step 2: Multi-pass flood fill (geodesic dilation) ---
  // Start from border bg pixels, flood through bgCandidate pixels.
  // Then repeatedly dilate by 1px (BFS expansion) up to MAX_GAP pixels,
  // but STOP when hitting hardFg pixels. This bridges gaps in thin subject edges
  // to reach enclosed bg areas, but cannot cross thick subject elements.
  const MAX_GAP = 10; // bridge gaps up to 10px wide (enough for connection beam glow gaps)
  const isBg = new Uint8Array(total);
  const distFromInitialBg = new Uint16Array(total); // distance from original confirmed bg
  const queue = [];
  let qHead = 0;

  const dirs8 = [-1, 1, -width, width, -width-1, -width+1, width-1, width+1];

  // Seed: border pixels that are soft bg
  for (let x = 0; x < width; x++) {
    for (const y of [0, height-1]) {
      const i = y*width+x;
      if (bgDist[i] < SOFT_BG_THR) {
        isBg[i] = 1;
        distFromInitialBg[i] = 0;
        queue.push(i);
      }
    }
  }
  for (let y = 1; y < height-1; y++) {
    for (const x of [0, width-1]) {
      const i = y*width+x;
      if (bgDist[i] < SOFT_BG_THR) {
        isBg[i] = 1;
        distFromInitialBg[i] = 0;
        queue.push(i);
      }
    }
  }

  // BFS: expand bg through soft-bg pixels first (standard flood fill)
  while (qHead < queue.length) {
    const idx = queue[qHead++];
    const x = idx % width, y = Math.floor(idx / width);
    const curD = distFromInitialBg[idx];
    for (const d of dirs8) {
      const n = idx + d;
      if (n < 0 || n >= total) continue;
      const nx = n % width, ny = Math.floor(n / width);
      if (Math.abs(nx-x) > 1 || Math.abs(ny-y) > 1) continue;
      if (isBg[n]) continue;
      // Can expand into this pixel if:
      // 1. It's soft bg (bgDist < SOFT_BG_THR), OR
      // 2. It's not hard fg AND we haven't exceeded gap bridge distance
      const isSoftBg = bgDist[n] < SOFT_BG_THR;
      const canBridge = bgDist[n] < HARD_FG_THR && curD < MAX_GAP;
      if (isSoftBg || canBridge) {
        isBg[n] = 1;
        distFromInitialBg[n] = isSoftBg ? 0 : curD + 1;
        queue.push(n);
      }
    }
  }
  console.log('  after geodesic flood fill:', isBg.reduce((s,v)=>s+v,0), 'bg pixels');

  // --- Step 3: Remove isolated noise specks (small non-bg components not touching hardFg) ---
  const MIN_SPECK = 25;
  const visited = new Uint8Array(total);
  for (let sy = 0; sy < height; sy++) {
    for (let sx = 0; sx < width; sx++) {
      const si = sy*width+sx;
      if (isBg[si] || visited[si]) continue;
      const compQ = [si];
      visited[si] = 1;
      let cqH = 0;
      const comp = [];
      let hasHardFg = false;
      while (cqH < compQ.length) {
        const idx = compQ[cqH++];
        comp.push(idx);
        if (bgDist[idx] > HARD_FG_THR) hasHardFg = true;
        const x = idx%width, y = Math.floor(idx/width);
        for (const d of dirs8) {
          const n = idx+d;
          if (n<0||n>=total) continue;
          const nx=n%width, ny=Math.floor(n/width);
          if (Math.abs(nx-x)>1||Math.abs(ny-y)>1) continue;
          if (!isBg[n] && !visited[n]) { visited[n]=1; compQ.push(n); }
        }
      }
      if (!hasHardFg && comp.length < MIN_SPECK) {
        for (const idx of comp) isBg[idx] = 1;
      }
    }
  }
  console.log('  after speck cleanup:', isBg.reduce((s,v)=>s+v,0), 'bg pixels');

  // --- Step 4: Distance transform from bg (8-way Chebyshev) ---
  const FEATHER = 7;
  const distToBg = new Uint16Array(total);
  for (let i = 0; i < total; i++) distToBg[i] = isBg[i] ? 0 : 65535;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y*width+x;
      let d = distToBg[i];
      if (x>0) d=Math.min(d,distToBg[i-1]+1);
      if (y>0) d=Math.min(d,distToBg[i-width]+1);
      if (x>0&&y>0) d=Math.min(d,distToBg[i-width-1]+1);
      if (x<width-1&&y>0) d=Math.min(d,distToBg[i-width+1]+1);
      distToBg[i]=d;
    }
  }
  for (let y = height-1; y >= 0; y--) {
    for (let x = width-1; x >= 0; x--) {
      const i = y*width+x;
      let d = distToBg[i];
      if (x<width-1) d=Math.min(d,distToBg[i+1]+1);
      if (y<height-1) d=Math.min(d,distToBg[i+width]+1);
      if (x<width-1&&y<height-1) d=Math.min(d,distToBg[i+width+1]+1);
      if (x>0&&y<height-1) d=Math.min(d,distToBg[i+width-1]+1);
      distToBg[i]=d;
    }
  }

  // --- Step 5: Apply alpha with smart unmultiply ---
  const CHROMA_GLOW = 16;
  for (let i = 0; i < total; i++) {
    const pi = i * channels;
    const d = distToBg[i];
    let alpha;
    if (d === 0) {
      alpha = 0;
    } else if (d >= FEATHER) {
      alpha = 255;
    } else {
      const t = d / FEATHER;
      // Smoothstep for soft edge
      alpha = Math.round((t*t*(3-2*t)) * 255);

      const r = pixels[pi], g = pixels[pi+1], b = pixels[pi+2];
      const mn = Math.min(r, g, b);
      const mx = Math.max(r, g, b);
      const chroma = mx - mn;

      // Unmultiply-white for colored glow edges to remove white contamination
      if (chroma > CHROMA_GLOW) {
        const whiteAmt = mn / 255;
        if (whiteAmt < 0.97) {
          const colorA = 1 - whiteAmt;
          if (colorA > 0.03) {
            const cr = (r - mn) / colorA;
            const cg = (g - mn) / colorA;
            const cb = (b - mn) / colorA;
            const blend = Math.min(1, Math.max(0.35, (chroma - CHROMA_GLOW) / 35 + 0.35));
            pixels[pi]   = Math.round(Math.max(0, Math.min(255, cr*blend + r*(1-blend))));
            pixels[pi+1] = Math.round(Math.max(0, Math.min(255, cg*blend + g*(1-blend))));
            pixels[pi+2] = Math.round(Math.max(0, Math.min(255, cb*blend + b*(1-blend))));
          }
        }
      }
    }
    pixels[pi+3] = alpha;
  }

  await sharp(pixels, { raw: { width, height, channels } })
    .trim({ threshold: 10 })
    .extend({ top:PADDING, bottom:PADDING, left:PADDING, right:PADDING, background:{r:0,g:0,b:0,alpha:0} })
    .png({ quality:100, compressionLevel:5 })
    .toFile(outputPath);

  const meta = await sharp(outputPath).metadata();
  return { width: meta.width, height: meta.height };
}

async function main() {
  console.log('=== White bg removal v3 (geodesic flood fill) ===\n');
  const manifest = {};
  for (const a of assets) {
    const src = path.join(ASSETS_DIR, a.src);
    const out = path.join(ASSETS_DIR, a.name + '.png');
    console.log('Processing:', a.name);
    try {
      const d = await removeWhiteBgAdvanced(src, out);
      manifest[a.name] = { path:'./'+a.name+'.png', width:d.width, height:d.height };
      console.log('  ✅', a.name, d.width+'x'+d.height, '\n');
    } catch(e) { console.error('  ❌', a.name, e.message, e.stack); }
  }
  fs.writeFileSync(path.join(ASSETS_DIR,'assets-manifest.json'), JSON.stringify(manifest,null,2));
  console.log('=== Done ===');
}
main();
