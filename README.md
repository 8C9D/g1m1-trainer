# g1m1-trainer

A self-hosted practice tool for the Ontario **G1** (car) and **M1** (motorcycle) knowledge tests.

Questions, answer options, and explanations are scraped from <https://www.g1.ca/> with Playwright, then served by a small Next.js web app that quizzes you one question at a time with shuffling, keyboard shortcuts, score reporting, and a "missed questions" review bank persisted in browser `localStorage`.

## Repo layout

```
g1m1-trainer/
├── scrape-g1-practice.js       Playwright scraper for G1 (car) practice tests
├── scrape-m1-practice.js       Playwright scraper for M1 (motorcycle) practice tests
├── data/                       scraped source data (source of truth)
│   ├── all-questions.json        all M1 questions, flat
│   ├── g1-all-questions.json     all G1 questions, flat
│   └── <test-id>/
│       ├── questions.json        per-test questions
│       └── screenshots/          before/after screenshots (gitignored)
├── scripts/
│   ├── sync-data.js            mirrors data/ → web/public/data/, strips scraper-only fields
│   ├── cache-images.js         opt-in downloader for question images
│   └── image-cache.js          URL ↔ local-path helpers shared by the two above
└── web/                        Next.js 16 (App Router) practice-test trainer
    ├── app/                      routes (home + /test/[testId])
    ├── components/               QuestionCard, ProgressBar
    ├── lib/questions.ts          data loading, shuffle, missed-bank
    ├── public/data/              published mirror of scraped data (served by Next)
    └── public/question-images/   locally cached question images (gitignored, generated)
```

## Data flow

```
g1.ca  →  Playwright scraper  →  data/*.json  →  scripts/sync-data.js  →  web/public/data/*.json  →  fetched by browser  →  React UI
```

The web app only reads from `web/public/data/`. The sync step strips `chosenAnswer` (an internal scraper field) and otherwise mirrors `data/` verbatim. `predev` and `prebuild` hooks in `web/package.json` invoke the sync automatically, so day-to-day web development does not require a manual sync.

## Setup

```bash
# Install scraper deps (root).
npm install

# Install web-app deps.
npm install --prefix web
```

The scraper uses Playwright. The first time you intend to run it, also install the Chromium browser binary:

```bash
npx playwright install chromium
```

## Running the scraper

> The scrapers fetch live data from `g1.ca` and open a **visible** browser window (`headless: false`, `slowMo: 75`). Each one takes a few minutes and needs an active internet connection.

```bash
node scrape-g1-practice.js   # writes data/g1-practice-test-{1..3}/ and data/g1-all-questions.json
node scrape-m1-practice.js   # writes data/m1-practice-test-{1..5}/ and data/all-questions.json
```

## Syncing scraped data into the web app

```bash
npm run sync
```

This is also invoked automatically by the `predev` and `prebuild` hooks in `web/package.json`, so it usually runs on its own.

`web/public/data/` is a generated mirror — don't edit those files by hand; the next sync will overwrite them.

## Caching question images locally (optional)

By default, question images are loaded straight from `g1.ca`. To remove that
runtime dependency for **local development**, you can download them once
into a local cache:

```bash
npm run cache-images               # download missing images
npm run cache-images -- --dry-run  # preview what would be downloaded
npm run cache-images -- --force    # re-download even if already cached
```

Images are written to `web/public/question-images/`, which is **gitignored**
(treated as a generated asset, the same way `data/*/screenshots/` is).

### Two sync modes

The web app only sees image URLs through `web/public/data/**/*.json`. `sync`
has two modes that control what gets written there:

| Command                       | `questionImageUrl` written         | Safe to commit?         | When to use                                                  |
|-------------------------------|------------------------------------|-------------------------|--------------------------------------------------------------|
| `npm run sync` *(default)*    | external `g1.ca` URLs              | yes — this is the norm  | normal dev/build; also invoked by `predev` and `prebuild`    |
| `npm run sync:cached-images`  | `/question-images/...` when cached | **no** — local only     | when you want the locally running app to read cached images  |

The `sync:cached-images` flow only rewrites a URL when the matching file
exists in the cache; URLs without a cached file are left external, so the
app keeps working as a fallback.

> ⚠ `web/public/question-images/` is gitignored. Do **not** commit
> `web/public/data/*.json` changes produced by `sync:cached-images` — a
> fresh clone or deploy would not have the cached files, and the rewritten
> `/question-images/...` paths would 404. `predev` / `prebuild` always run
> the default `sync`, so the tracked JSON stays canonical (external URLs)
> across normal dev/build cycles.

Caching is never required for `npm run dev` or `npm run build` to succeed.

## Running the web app locally

```bash
cd web
npm run dev
```

Then open <http://localhost:3000>. The home page lists the M1 and G1 practice tests, a **Marathon** mode that combines all tests of a class, and a **Missed Questions** bank that surfaces questions you've answered incorrectly (persisted per class in `localStorage`).

## Building the web app

```bash
cd web
npm run build
npm run start   # serve the production build on http://localhost:3000
```

## Known issues

- **`web/public/data/` is tracked in git.** It is a generated mirror of `data/`, but we intentionally keep it tracked so a deploy of just `web/` works without first running the sync. The cost is two synchronized copies in version control; the `predev`/`prebuild` hooks keep them aligned.
- **Moderate `postcss` advisory in the dependency audit.** `npm audit` (in `web/`) flags [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) inside the copy of `postcss` bundled by Next 16. The advisory describes a stringify-time XSS that requires attacker-supplied CSS; this project's build only processes our own CSS (Tailwind + `app/globals.css`), so exploitability here is very low. The auto-fix is a major Next.js downgrade and is **not** safe to apply. Re-audit after upgrading to a Next.js release that bundles a newer `postcss`.
- **Multiple-lockfiles warning during `next build`.** Next emits a workspace-root inference warning because both `package-lock.json` (root, for the scraper) and `web/package-lock.json` exist. It is harmless; resolving it would require either npm workspaces or a `turbopack.root` setting and is deferred.
