# Refactor Opportunities Report

_Maintained by the repo-cleanup-autopilot skill. Runs directly on `main`._

## 1. Repository Overview

`g1m1-trainer` is a self-hosted practice tool for the Ontario G1 (car) and M1
(motorcycle) knowledge tests. It has two cooperating parts:

- **Data pipeline (root + `scripts/`, CommonJS, Playwright):** the two root
  scrapers (`scrape-g1-practice.js`, `scrape-m1-practice.js`) are thin config
  wrappers around the shared engine in `scripts/scrape.js`; they harvest
  questions from g1.ca into `data/`. `scripts/sync-data.js` then mirrors that
  into `web/public/data/` (stripping scraper-only fields), with an optional
  image-cache flow (`scripts/cache-images.js` + `scripts/image-cache.js`). The
  pure project/collect helpers live in `scripts/sync-helpers.js`.
- **Web app (`web/`, Next.js 16 App Router, React 19, TypeScript, Tailwind 4):**
  a client-side quiz UI that fetches the published JSON, shuffles questions,
  tracks score, and persists a "missed questions" bank in `localStorage`.

The codebase is small and notably well-factored: history shows a deliberate
refactoring streak (centralizing the data route, test-id classification,
extracting sync helpers and the test-results component, flattening practice-test
metadata) plus a recent test-coverage push. Pure logic lives in testable
modules; the data-pipeline scripts share `scripts/image-cache.js` and
`scripts/sync-helpers.js`.

## 2. Current Quality Summary

**Strengths**

- Strong test coverage (99 tests across 7 files): question parsing/validation,
  bank storage versioning + migration, test-id classification, image-URL
  mapping, the sync projection, and React component behavior (QuestionCard,
  BankCount, ProgressBar, TestResults).
- Clean separation of concerns: client logic (`lib/questions.ts`), server-only
  counting (`lib/questions.server.ts`), small focused components, and pure,
  filesystem-free script helpers that are unit-tested from the web project.
- Accurate, non-duplicative docs: a thorough root `README.md` and a `web/README.md`
  stub that points back to it; `web/AGENTS.md` guidance.
- Comprehensive `.gitignore` (root + `web/`); no tracked build artifacts
  (`.next`, `*.tsbuildinfo`, `next-env.d.ts`, cached images, screenshots are all
  ignored).
- CI runs test + build + lint on every push/PR.

**Baseline validation (all green before any changes this run):**

- `cd web && npm test` → 99 passed (7 files)
- `npm run sync` (root) → idempotent; no change to tracked `web/public/data/`

**Weaknesses / smells (small and cosmetic)**

- Import-specifier style is split in the data-pipeline scripts: `cache-images.js`
  and `image-cache.js` use the modern `node:` prefix (as does the web app's
  `lib/questions.server.ts`), while `scrape.js` and `sync-data.js` still use the
  bare `require("fs")` / `require("path")` form. See Opportunity D.
- A few intentional, low-value items remain (see §6) — none worth a change.

_Note: the create-next-app boilerplate (unused SVGs, default `web/README.md`)
and the stale root-README repo map flagged in earlier runs have already been
cleaned up (Opportunities A/B/C — see the execution log)._

## 3. Highest-Value Refactor Opportunities

### Opportunity D — Use the `node:` import prefix consistently in the data scripts

- **Location/files:** `scripts/scrape.js`, `scripts/sync-data.js`
- **Problem:** Both `require("fs")` and `require("path")` with bare specifiers,
  while the sibling scripts (`scripts/cache-images.js`, `scripts/image-cache.js`)
  and the web app (`web/lib/questions.server.ts`) all use the `node:` prefix.
- **Why it matters:** The `node:` prefix is the modern, unambiguous way to import
  Node built-ins (it can never be shadowed by a same-named npm package).
  Standardizing removes a small inconsistency and matches the direction the rest
  of the repo already took.
- **Suggested refactor:** Change `require("fs")` → `require("node:fs")` and
  `require("path")` → `require("node:path")` in the two files. No other changes.
- **Risk level:** Low. `fs`/`node:fs` and `path`/`node:path` resolve to the exact
  same built-in module; this is a no-op at runtime. Supported on all Node
  versions in use here (CI: Node 20; local: Node 24).
- **Expected benefit:** Uniform import style across the data pipeline.
- **Suggested validation:** `npm run sync` (exercises `sync-data.js` end-to-end
  and must leave `web/public/data/` unchanged); `node --check scripts/scrape.js`
  plus a side-effect-free `require()` load (the scraper needs a live browser, so
  it cannot be run in CI); `cd web && npm test`.
- **Dependency ordering:** Independent.
- **Autopilot status:** Implemented

## 4. Quick Wins

- **D** — normalize the `node:` import prefix in the two stragglers (mechanical,
  no-op at runtime).

## 5. Larger Refactors

None warranted. The codebase is already small and well-decomposed; there are no
oversized files, deep nesting, or tangled responsibilities that justify a large
restructuring.

## 6. Things Not Worth Refactoring Yet

- **Unify `data/` traversal between `scripts/sync-data.js` and
  `scripts/cache-images.js`.** Both walk `data/` (top-level JSON + each subdir's
  `questions.json`), but `sync-data.js` uses a hardcoded allow-list for the two
  combined files while `cache-images.js` discovers all top-level `*.json`.
  Unifying would (a) change `sync-data.js` behavior to mirror *any* top-level
  JSON, and (b) touch filesystem-walking code that has **no** unit coverage.
  Fails the "preserve behavior" + "sufficient validation" bars — **skip**.
- **`PUBLISHED_FIELDS` is exported but only used inside `scripts/sync-helpers.js`.**
  It is part of the module's documented contract (the published-question shape).
  Removing it from `module.exports` is a public-surface change for effectively no
  benefit — **skip**.
- **`next.config.ts` placeholder comment** (`/* config options here */`) —
  harmless boilerplate; not worth a commit.
- **Root `package.json` empty `description`/`author`/`keywords` and default
  `test` script** — these are the maintainer's to fill; changing the `test`
  script would be a behavior change (root has no test runner).
- **Tailwind class-string duplication** (the "All tests" link styling repeats in
  `TestResults.tsx` and `app/test/[testId]/page.tsx`) — extracting a shared
  component/constant for ~3 short call sites risks over-abstraction for little
  gain in an app this size.
- **Per-file `makeQuestion` / `validRaw` test fixtures.** Each test file defines
  its own factory with a different signature and intentionally different content;
  they are not true duplication and are clearer kept self-contained.
- **Duplicated `ROOT`/`SRC_DIR` path constants** across the two scripts —
  centralizing 2 lines into a new module adds indirection for 2 consumers.

## 7. Suggested Refactor Sequence

1. D — normalize the `node:` import prefix (only remaining safe cleanup).

## 8. Recommended First Refactor

Opportunity **D**: trivially verifiable, no-op at runtime, and it finishes the
`node:`-prefix standardization the repo already started.

## 9. Validation Commands Discovered

Run from `web/` (mirrors `.github/workflows/ci.yml`):

```bash
npm test        # vitest run
npm run lint    # eslint
npm run build   # next build (runs the prebuild sync first)
```

Root data-pipeline scripts (no dedicated test runner; their pure helpers are
covered by `web/lib/sync-helpers.test.ts` and `web/lib/image-cache.test.ts`):

```bash
npm run sync          # node scripts/sync-data.js
npm run cache-images  # node scripts/cache-images.js
```

## 10. Autopilot Execution Log

| # | Cleanup | Files changed | Validation | Commit | Push | Notes |
|---|---------|---------------|------------|--------|------|-------|
| 0 | Add refactor opportunities report (prior run) | `docs/refactor-opportunities.md` | n/a (docs) | `459eef1` | pushed | Initial plan |
| A | Remove unused boilerplate SVGs | deleted 5× `web/public/*.svg` | test/lint/build green | `61a4b39` | pushed | Static assets only; unreferenced |
| C | Fix root README repo-layout | `README.md` | paths verified | `f193846` | pushed | Added scrape.js/sync-helpers.js |
| B | Replace boilerplate web/README | `web/README.md` | docs only | (prior run) | pushed | Removed create-next-app boilerplate |
| — | Update report for this run | `docs/refactor-opportunities.md` | n/a (docs) | `3cd113c` | pushed | Re-baselined (99 tests/7 files); planned Opportunity D |
| D | Normalize `node:` import prefix | `scripts/scrape.js`, `scripts/sync-data.js` | `node --check` + load; `npm run sync` (no data diff); web tests 99/7 green | _this commit_ | pending | Runtime no-op; matches cache-images.js/image-cache.js/questions.server.ts |

_Opportunities A/B/C were completed in a prior run and are already on `main`.
The data/-traversal unification in §6 remains deliberately skipped as
behavior-changing and lacking test coverage._
