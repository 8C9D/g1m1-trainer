/**
 * Shared helpers for mapping external question-image URLs to local cache paths.
 *
 * Source JSON keeps the original external URL (typically on g1.ca). Two
 * pieces of plumbing use these helpers:
 *   - `scripts/cache-images.js` downloads each URL into
 *     `web/public/question-images/<basename>`.
 *   - `scripts/sync-data.js` rewrites the published `questionImageUrl` to the
 *     local public path *only when* the corresponding cached file exists,
 *     so the app keeps working with the external URL as a fallback.
 */
const path = require("node:path");

const PUBLIC_DIR_NAME = "question-images";

function urlToCacheFilename(url) {
  if (typeof url !== "string" || !url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const base = path.posix.basename(parsed.pathname);
  if (!base || base === "/" || base === "." || base === "..") return null;
  return base;
}

function urlToPublicPath(url) {
  const filename = urlToCacheFilename(url);
  return filename ? `/${PUBLIC_DIR_NAME}/${filename}` : null;
}

/**
 * Decide whether `url` should be rewritten to a local cached path.
 *
 * Pure: the caller injects the `cacheExists(filename)` predicate so this
 * function can be unit-tested without touching the filesystem.
 *
 * Falsy `rewriteCachedImages` always returns `url` unchanged — that is the
 * default `sync-data.js` behavior, which keeps tracked `web/public/data/`
 * JSON safe to commit even when cached images happen to be present locally.
 */
function maybeRewriteImageUrl(url, { rewriteCachedImages, cacheExists }) {
  if (!url || !rewriteCachedImages) return url;
  const filename = urlToCacheFilename(url);
  if (!filename || !cacheExists(filename)) return url;
  return urlToPublicPath(url);
}

module.exports = {
  urlToCacheFilename,
  urlToPublicPath,
  maybeRewriteImageUrl,
  PUBLIC_DIR_NAME,
};
