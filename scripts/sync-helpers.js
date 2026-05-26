/**
 * Pure helpers for the data-pipeline scripts.
 *
 * Kept separate from `scripts/image-cache.js` (which handles URL ↔ local-path
 * mapping) so the project/collect logic can be unit-tested without touching
 * the filesystem.
 *
 * Used by:
 *   - `scripts/sync-data.js`     (projectQuestion)
 *   - `scripts/cache-images.js`  (collectImageUrlsFromQuestions)
 */
const { maybeRewriteImageUrl } = require("./image-cache");

const PUBLISHED_FIELDS = [
  "testName",
  "questionNumber",
  "question",
  "questionImageUrl",
  "answerOptions",
  "correctAnswer",
  "explanation",
];

/**
 * Project a scraped question into the safe-to-publish shape.
 *
 * Keeps only `PUBLISHED_FIELDS`. Anything else on the input — notably the
 * scraper-only `chosenAnswer` — is dropped so it never reaches `web/public/data`.
 * When `rewriteCachedImages` is set and the cache predicate reports a hit,
 * `questionImageUrl` is rewritten to a local public path; otherwise it passes
 * through verbatim.
 */
function projectQuestion(question, opts = {}) {
  const { rewriteCachedImages = false, cacheExists = () => false } = opts;
  const out = {};
  for (const k of PUBLISHED_FIELDS) {
    if (k in question) out[k] = question[k];
  }
  if (out.questionImageUrl) {
    out.questionImageUrl = maybeRewriteImageUrl(out.questionImageUrl, {
      rewriteCachedImages,
      cacheExists,
    });
  }
  return out;
}

/**
 * Accumulate non-empty external image URLs from a parsed questions array into
 * a Set. Skips non-array input, non-object entries, and entries whose
 * `questionImageUrl` is missing, non-string, or empty.
 */
function collectImageUrlsFromQuestions(data, urls = new Set()) {
  if (!Array.isArray(data)) return urls;
  for (const q of data) {
    if (q && typeof q.questionImageUrl === "string" && q.questionImageUrl) {
      urls.add(q.questionImageUrl);
    }
  }
  return urls;
}

module.exports = {
  PUBLISHED_FIELDS,
  projectQuestion,
  collectImageUrlsFromQuestions,
};
