#!/usr/bin/env bun
/**
 * batch-generate-stage-bg.ts
 *
 * Reads prompts.json and invokes jimeng-ui-atlas's generate-atlas.ts
 * for each entry, writing 16:9 PNGs directly to public/stage-bg/.
 *
 * Run (Windows PowerShell):
 *   $env:NO_PROXY='*'; $env:HTTP_PROXY=''; $env:HTTPS_PROXY=''
 *   $env:http_proxy=''; $env:https_proxy=''
 *   bun run scripts/jimeng-stage-bg/batch-generate-stage-bg.ts
 *
 * Output:
 *   zorron-engine/apps/zorron-editor/public/stage-bg/<name>.png
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_ROOT = dirname(fileURLToPath(new URL(import.meta.url)));

interface PromptItem {
  name: string;
  prompt: string;
}

interface PromptsFile {
  common_style: string;
  items: PromptItem[];
}

// ── Config ──
const PROMPTS_PATH = join(SCRIPT_ROOT, "prompts.json");
const GENERATE_ATLAS = resolve("C:/Users/Administrator/.trae-cn/skills/jimeng-ui-atlas/scripts/generate-atlas.ts");
const OUTPUT_DIR = resolve("i:/workspace/Nodejs-workspace/bot/project/zorron-engine/apps/zorron-editor/public/stage-bg");
const API_BASE = "http://gyorkmini.beago-hake.ts.net:9900";
const RATIO = "16:9";
const RESOLUTION = "2k";
const MODE = "api"; // fastest; falls back to auto on signature errors

// ── Main ──
function main(): void {
  if (!existsSync(GENERATE_ATLAS)) {
    console.error(`[FATAL] generate-atlas.ts not found: ${GENERATE_ATLAS}`);
    process.exit(1);
  }
  if (!existsSync(PROMPTS_PATH)) {
    console.error(`[FATAL] prompts.json not found: ${PROMPTS_PATH}`);
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const data = JSON.parse(readFileSync(PROMPTS_PATH, "utf-8")) as PromptsFile;
  console.log(`[INFO] Loaded ${data.items.length} prompt items`);
  console.log(`[INFO] Output dir: ${OUTPUT_DIR}`);
  console.log(`[INFO] API base: ${API_BASE}`);
  console.log("");

  let success = 0;
  let failed = 0;
  const failedItems: string[] = [];

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const outputPath = join(OUTPUT_DIR, `${item.name}.png`);

    console.log("──────────────────────────────────────────────────────────");
    console.log(`[${i + 1}/${data.items.length}] ${item.name}`);
    console.log(`  prompt: ${item.prompt.slice(0, 100)}...`);
    console.log(`  output: ${outputPath}`);

    // Try mode=api first; on failure, retry with mode=auto
    const attempts = [
      { mode: MODE, label: "api" },
      { mode: "auto", label: "auto-fallback" },
    ];

    let ok = false;
    for (const attempt of attempts) {
      const result = spawnSync(
        process.execPath,
        [
          GENERATE_ATLAS,
          "--prompt", item.prompt,
          "--output", outputPath,
          "--model", "v5.0",
          "--ratio", RATIO,
          "--resolution", RESOLUTION,
          "--mode", attempt.mode,
          "--api-base", API_BASE,
        ],
        {
          stdio: "inherit",
          cwd: dirname(GENERATE_ATLAS),
          env: {
            ...process.env,
            NO_PROXY: "*",
            HTTP_PROXY: "",
            HTTPS_PROXY: "",
            http_proxy: "",
            https_proxy: "",
          },
        },
      );

      if (result.status === 0 && existsSync(outputPath)) {
        console.log(`  [OK] generated via mode=${attempt.label}`);
        ok = true;
        break;
      } else {
        console.warn(`  [WARN] mode=${attempt.label} failed (exit=${result.status}); trying next...`);
      }
    }

    if (ok) {
      success++;
    } else {
      failed++;
      failedItems.push(item.name);
      console.error(`  [FAIL] ${item.name} could not be generated`);
    }
  }

  console.log("");
  console.log("──────────────────────────────────────────────────────────");
  console.log(`[DONE] success=${success}, failed=${failed}`);
  if (failedItems.length > 0) {
    console.log(`[FAILED_ITEMS] ${failedItems.join(", ")}`);
    process.exit(1);
  }
}

main();
