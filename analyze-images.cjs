const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dirs = {
  'UI Atlas': './apps/zorron-editor/src/assets/jimeng-ui-atlas',
  'Sprites': './apps/zorron-editor/public/workspace/sprite',
  'Backgrounds': './apps/zorron-editor/public/workspace/bg'
};

async function analyzeImage(filePath) {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const { width, height, hasAlpha } = metadata;
    const totalPixels = width * height;

    if (!hasAlpha) {
      return {
        name: path.basename(filePath),
        width,
        height,
        hasAlpha: false,
        transRatio: 0,
        opaqueAverage: 'N/A'
      };
    }

    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    
    let transparentCount = 0;
    let rSum = 0, gSum = 0, bSum = 0, opaqueCount = 0;

    for (let i = 0; i < data.length; i += channels) {
      const a = channels === 4 ? data[i + 3] : 255;
      if (a < 255) {
        transparentCount++;
      } else {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        opaqueCount++;
      }
    }

    // Check corners
    const corners = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1]
    ];
    const cornerColors = corners.map(([cx, cy]) => {
      const idx = (cy * width + cx) * channels;
      return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: channels === 4 ? data[idx + 3] : 255
      };
    });

    return {
      name: path.basename(filePath),
      width,
      height,
      hasAlpha: true,
      transRatio: transparentCount / totalPixels,
      opaqueAverage: opaqueCount > 0 ? `rgb(${Math.round(rSum/opaqueCount)}, ${Math.round(gSum/opaqueCount)}, ${Math.round(bSum/opaqueCount)})` : 'N/A',
      corners: cornerColors.map(c => `rgba(${c.r},${c.g},${c.b},${c.a/255})`).join(' | ')
    };
  } catch (e) {
    return { name: path.basename(filePath), error: e.message };
  }
}

async function main() {
  console.log('=== Image Transparency Analysis ===\n');
  for (const [dirName, dirPath] of Object.entries(dirs)) {
    console.log(`--- Directory: ${dirName} (${dirPath}) ---`);
    if (!fs.existsSync(dirPath)) {
      console.log('  Directory does not exist.\n');
      continue;
    }
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    if (files.length === 0) {
      console.log('  No PNG/JPG files found.\n');
      continue;
    }
    for (const file of files) {
      const res = await analyzeImage(path.join(dirPath, file));
      if (res.error) {
        console.log(`  ❌ ${res.name}: Error - ${res.error}`);
      } else {
        console.log(`  ${res.hasAlpha ? '✅' : '⚪'} ${res.name} (${res.width}x${res.height})`);
        console.log(`     Has Alpha: ${res.hasAlpha}`);
        if (res.hasAlpha) {
          console.log(`     Transparency Ratio: ${(res.transRatio * 100).toFixed(1)}%`);
          console.log(`     Corners: ${res.corners}`);
        }
      }
    }
    console.log();
  }
}

main().catch(console.error);
