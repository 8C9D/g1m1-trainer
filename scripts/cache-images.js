#!/usr/bin/env node
/**
 * Opt-in image cache for question images.
 *
 * Walks `data/**\/questions.json`, collects every `questionImageUrl`, and
 * downloads any not-yet-cached image into `web/public/question-images/`.
 *
 * Designed to be safe to skip: the web app falls back to the original
 * external URLs whenever a cached file is absent, so this is never required
 * for `npm run dev` or `npm run build` to work.
 *
 * Usage:
 *   node scripts/cache-images.js              # download missing images
 *   node scripts/cache-images.js --dry-run    # list what would be downloaded
 *   node scripts/cache-images.js --force      # re-download even if cached
 */
const fs = require("node:fs");
const path = require("node:path");
const { urlToCacheFilename, PUBLIC_DIR_NAME } = require("./image-cache");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "data");
const DEST_DIR = path.join(ROOT, "web", "public", PUBLIC_DIR_NAME);
const REQUEST_TIMEOUT_MS = 15000;

function collectImageUrls() {
  const urls = new Set();
  if (!fs.existsSync(SRC_DIR)) return urls;

  for (const entry of fs.readdirSync(SRC_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      addFromFile(path.join(SRC_DIR, entry.name), urls);
    } else if (entry.isDirectory()) {
      const f = path.join(SRC_DIR, entry.name, "questions.json");
      if (fs.existsSync(f)) addFromFile(f, urls);
    }
  }
  return urls;
}

function addFromFile(filepath, urls) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch (e) {
    console.warn(`skip ${filepath}: ${e.message}`);
    return;
  }
  if (!Array.isArray(data)) return;
  for (const q of data) {
    if (q && typeof q.questionImageUrl === "string" && q.questionImageUrl) {
      urls.add(q.questionImageUrl);
    }
  }
}

async function downloadOne(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buf);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  const urls = collectImageUrls();
  if (urls.size === 0) {
    console.log("No image URLs found under data/.");
    return;
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let invalid = 0;

  for (const url of urls) {
    const filename = urlToCacheFilename(url);
    if (!filename) {
      console.warn(`invalid URL: ${url}`);
      invalid++;
      continue;
    }
    const dest = path.join(DEST_DIR, filename);
    if (fs.existsSync(dest) && !force) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`would download: ${url} -> ${path.relative(ROOT, dest)}`);
      continue;
    }
    try {
      await downloadOne(url, dest);
      downloaded++;
      console.log(`downloaded: ${filename}`);
    } catch (e) {
      failed++;
      console.warn(`failed: ${url} (${e.message})`);
    }
  }

  console.log(
    `\nTotal: ${urls.size}, downloaded: ${downloaded}, skipped: ${skipped}, failed: ${failed}, invalid: ${invalid}`,
  );
  if (dryRun) console.log("(dry run — no files were written)");
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
