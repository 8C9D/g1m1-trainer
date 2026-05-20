import { describe, it, expect, vi } from "vitest";
// CommonJS helper shared with `scripts/sync-data.js` and `scripts/cache-images.js`.
import {
  urlToCacheFilename,
  urlToPublicPath,
  maybeRewriteImageUrl,
} from "../../scripts/image-cache.js";

describe("urlToCacheFilename", () => {
  it("returns the basename for a typical g1.ca image URL", () => {
    expect(
      urlToCacheFilename(
        "https://www.g1.ca/wp-content/uploads/autotest/202009250521014592.jpg",
      ),
    ).toBe("202009250521014592.jpg");
  });

  it("strips any query string", () => {
    expect(
      urlToCacheFilename(
        "https://www.g1.ca/wp-content/uploads/autotest/abc.jpg?v=2",
      ),
    ).toBe("abc.jpg");
  });

  it("returns null for non-string input", () => {
    expect(urlToCacheFilename(null as unknown as string)).toBeNull();
    expect(urlToCacheFilename(undefined as unknown as string)).toBeNull();
    expect(urlToCacheFilename("")).toBeNull();
  });

  it("returns null for an unparseable URL", () => {
    expect(urlToCacheFilename("not a url")).toBeNull();
  });

  it("returns null when the URL has no usable basename", () => {
    expect(urlToCacheFilename("https://example.com/")).toBeNull();
  });
});

describe("urlToPublicPath", () => {
  it("maps a valid URL into the /question-images/ public path", () => {
    expect(
      urlToPublicPath(
        "https://www.g1.ca/wp-content/uploads/autotest/202009250521014592.jpg",
      ),
    ).toBe("/question-images/202009250521014592.jpg");
  });

  it("returns null for input that cannot be mapped", () => {
    expect(urlToPublicPath("https://example.com/")).toBeNull();
    expect(urlToPublicPath("")).toBeNull();
  });
});

describe("maybeRewriteImageUrl", () => {
  const url = "https://www.g1.ca/wp-content/uploads/autotest/abc.jpg";
  const local = "/question-images/abc.jpg";

  it("returns the original URL when rewriteCachedImages is false, even if cache claims a hit", () => {
    expect(
      maybeRewriteImageUrl(url, {
        rewriteCachedImages: false,
        cacheExists: () => true,
      }),
    ).toBe(url);
  });

  it("returns the original URL when the cache predicate says the file is absent", () => {
    expect(
      maybeRewriteImageUrl(url, {
        rewriteCachedImages: true,
        cacheExists: () => false,
      }),
    ).toBe(url);
  });

  it("returns the local public path when opted in and the cache predicate says the file exists", () => {
    expect(
      maybeRewriteImageUrl(url, {
        rewriteCachedImages: true,
        cacheExists: () => true,
      }),
    ).toBe(local);
  });

  it("queries the cache predicate with the exact basename", () => {
    const seen: string[] = [];
    maybeRewriteImageUrl(url, {
      rewriteCachedImages: true,
      cacheExists: (filename) => {
        seen.push(filename);
        return true;
      },
    });
    expect(seen).toEqual(["abc.jpg"]);
  });

  it("never consults the cache when the URL is null or empty", () => {
    const cacheExists = vi.fn(() => true);
    expect(
      maybeRewriteImageUrl(null as unknown as string, {
        rewriteCachedImages: true,
        cacheExists,
      }),
    ).toBeNull();
    expect(
      maybeRewriteImageUrl("", { rewriteCachedImages: true, cacheExists }),
    ).toBe("");
    expect(cacheExists).not.toHaveBeenCalled();
  });

  it("returns the input unchanged for an unparseable URL even when opted in", () => {
    const cacheExists = vi.fn(() => true);
    expect(
      maybeRewriteImageUrl("not a url", {
        rewriteCachedImages: true,
        cacheExists,
      }),
    ).toBe("not a url");
    expect(cacheExists).not.toHaveBeenCalled();
  });
});
