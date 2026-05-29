#!/usr/bin/env node
/**
 * Mirrors scraped JSON from `data/` into `web/public/data/` so the web app
 * has a single source of truth.
 *
 * Strips `chosenAnswer` (the option the scraper happened to click while
 * harvesting; not used by the app) from each question.
 *
 * Image-URL handling:
 *   - Default: question image URLs are passed through verbatim (external
 *     `g1.ca` URLs). This is the safe-to-commit output and what
 *     `predev` / `prebuild` use.
 *   - With `--rewrite-cached-images`: when a matching file exists under
 *     `web/public/question-images/` (see `scripts/cache-images.js`), the
 *     published `questionImageUrl` is rewritten to a local public path.
 *     This is a local-development convenience; the rewritten JSON is NOT
 *     safe to commit because the image cache directory is gitignored.
 *
 * Safe no-op if `data/` doesn't exist — useful when only `web/` is checked
 * out (e.g., a deploy that ships the pre-synced JSONs straight from git).
 */
const fs = require("node:fs");
const path = require("node:path");
const { PUBLIC_DIR_NAME } = require("./image-cache");
const { projectQuestion } = require("./sync-helpers");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "data");
const DEST_DIR = path.join(ROOT, "web", "public", "data");
const IMAGE_CACHE_DIR = path.join(ROOT, "web", "public", PUBLIC_DIR_NAME);

const rewriteCachedImages = process.argv.includes("--rewrite-cached-images");
const cacheExists = (filename) => fs.existsSync(path.join(IMAGE_CACHE_DIR, filename));

function syncFile(relPath) {
  const src = path.join(SRC_DIR, relPath);
  const dest = path.join(DEST_DIR, relPath);
  if (!fs.existsSync(src)) return;

  const raw = JSON.parse(fs.readFileSync(src, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error(`expected an array in ${src}`);
  }
  const projected = raw.map((q) =>
    projectQuestion(q, { rewriteCachedImages, cacheExists }),
  );

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(projected, null, 2), "utf8");
  console.log(`synced ${relPath} (${projected.length} questions)`);
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.warn(`sync-data: ${SRC_DIR} not found; skipping.`);
    return;
  }

  if (rewriteCachedImages) {
    console.warn(
      "sync-data: --rewrite-cached-images is ON. " +
        "web/public/data/*.json may now reference /question-images/... paths. " +
        "Do NOT commit those rewrites — web/public/question-images/ is gitignored.",
    );
  }

  syncFile("all-questions.json");
  syncFile("g1-all-questions.json");

  for (const entry of fs.readdirSync(SRC_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      syncFile(path.join(entry.name, "questions.json"));
    }
  }
}

main();
