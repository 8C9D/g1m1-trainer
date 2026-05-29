# Security Sanity Check Report

_Generated: 2026-05-28. Re-verified: 2026-05-29 on `main` (no new issues; no new
changes applied). This is a practical security hygiene review, not a formal
penetration test or full audit._

## 1. Scope

Local inspection of the `g1m1-trainer` repository on branch `main`: tracked
files, `.gitignore` coverage, secret scanning, frontend XSS sinks, unsafe
operations, route input handling, the data pipeline scripts (including the
image-cache URL→path mapping), CI configuration, and a dependency audit of the
web app. The original pass ran on `chore/repo-cleanup-autopilot` (since merged);
the 2026-05-29 re-verification re-ran every check against `main` and confirmed
all findings below still hold.

## 2. Project Overview

- **What it is:** an Ontario G1/M1 licence practice-test trainer.
- **Two parts:**
  - Root data pipeline (CommonJS): Playwright scrapers (`scrape.js` and the two
    `scrape-*-practice.js` entry points) plus `sync-data.js` / `cache-images.js`
    that project scraped JSON into `web/public/data` and cache images.
  - `web/`: a Next.js 16 + React 19 app (client-rendered test runner) that reads
    static JSON question files and stores the user's "missed questions" bank in
    `localStorage`.
- **No backend server, no authentication, no authorization, no database, no
  payments, no user accounts, no server-side request handling of user input.**
- **No environment variables are read anywhere** (`process.env` appears in zero
  tracked source files).
- **Deployment:** static/SSG Next.js app; CI runs test + build + lint.

## 3. Executive Summary

**Overall risk: Low.**

This is a static, client-side practice-test app with no secrets, no auth, no
backend, and no server-side handling of untrusted input. No secrets were found in
tracked files or in the working tree. The only concrete hygiene gap — the root
`.gitignore` not protecting `.env` files — was fixed in the original pass and is
now part of `main` (re-verified present). One moderate transitive dependency
advisory exists (`postcss` via Next.js) but its only npm remediation is a
breaking Next.js downgrade, so it is left for manual handling; its practical
exploitability here is minimal.

The 2026-05-29 re-verification on `main` found **no new issues and applied no new
changes**: the secret scans (including the committed JSON data), XSS-sink and
dynamic-execution greps, route/`testId` and server file-read tracing, the
image-cache URL→path mapping, install-hook check, and `npm audit` all returned
the same results as the original pass.

## 4. Findings

### Finding 1 — Root `.gitignore` did not protect `.env` files
- **Severity:** Low
- **Location:** `.gitignore`
- **Evidence:** `git check-ignore .env` returned nothing (not ignored), while
  `web/.env.local` and `auth.json` were ignored. A root-level `.env` would have
  been committable.
- **Why it matters:** If a contributor later adds a root `.env` (e.g. for a
  scraper token), it could be committed by accident.
- **Recommended fix:** add `.env` / `.env.*` (with `!.env.example`) to the root
  `.gitignore`.
- **Auto-fix status:** Fixed in the original pass; the rule is present on `main`
  and was re-verified this run (`git check-ignore .env` → ignored). No change
  applied in the 2026-05-29 run.
- **Secret redacted:** No secret involved.
- **Confidence:** High.

### Finding 2 — Moderate transitive advisory: `postcss < 8.5.10` via Next.js
- **Severity:** Low (advisory is rated moderate; practical risk here is minimal)
- **Location:** `web/` dependency tree —
  `next > node_modules/next/node_modules/postcss` (per `npm audit`).
- **Evidence:** `npm audit --audit-level=moderate` reports GHSA-qx2v-qp2m-jg93
  ("PostCSS has XSS via Unescaped `</style>` in its CSS Stringify Output"),
  2 moderate vulnerabilities total. Suggested `npm audit fix --force` would
  install `next@9.3.3` — a breaking downgrade.
- **Why it matters:** PostCSS is used at **build time** on the project's own
  (first-party) CSS via the Tailwind/PostCSS pipeline. The advisory requires
  stringifying attacker-controlled CSS, which this project never does, so
  real-world exploitability is effectively nil.
- **Recommended fix:** do **not** run `npm audit fix --force`. Instead, upgrade to
  a Next.js patch release that bundles `postcss >= 8.5.10` once available, or pin
  `postcss` via an override after verifying `npm run build` still succeeds.
- **Auto-fix status:** Manual action required (a broad/breaking dependency change;
  outside safe auto-fix scope).
- **Secret redacted:** No.
- **Confidence:** High (finding); Medium (timing of upstream fix).

### Finding 3 — CI workflow hardening opportunities
- **Severity:** Info
- **Location:** `.github/workflows/ci.yml`
- **Evidence:** Actions are pinned to mutable major tags (`actions/checkout@v5`,
  `actions/setup-node@v6`) and the workflow declares no explicit `permissions:`
  block, so it inherits the repository default `GITHUB_TOKEN` scope.
- **Why it matters:** Mutable tags can be re-pointed (supply-chain risk); an
  over-broad default token is unnecessary for a read-only test/build/lint job.
- **Recommended fix (manual, optional):** add a top-level
  `permissions:\n  contents: read` block, and optionally pin actions to full
  commit SHAs. Both are safe for this read-only workflow but touch CI
  infrastructure, so they are left for human review.
- **Auto-fix status:** Manual action required (CI/infrastructure — excluded from
  auto-fix scope).
- **Secret redacted:** No.
- **Confidence:** High.

### Finding 4 — External image URLs rendered from committed data
- **Severity:** Info
- **Location:** `web/components/QuestionCard.tsx` (`next/image` with `unoptimized`),
  data in `web/public/data/**`.
- **Evidence:** `questionImageUrl` from the JSON data is rendered as an image
  `src`. The values are first-party content scraped from g1.ca and committed by
  the maintainer, not user-supplied.
- **Why it matters:** If the data pipeline ever ingested untrusted third-party
  data, an attacker-controlled `src` could load arbitrary external resources.
- **Recommended fix:** none required today; if data provenance ever broadens,
  constrain allowed image hosts.
- **Auto-fix status:** Skipped (no action needed).
- **Secret redacted:** No.
- **Confidence:** High.

## 5. Secrets and Sensitive Files Review

- `git grep` for `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN`, `PRIVATE_KEY`,
  `BEGIN RSA/OPENSSH/PRIVATE`, `DATABASE_URL`, `client_secret`, `aws_`, `bearer`,
  etc. across tracked source: **no matches.**
- No tracked `.env`, `*.pem`, `*.key`, `*.p12/.pfx`, `*.crt`, `*secret*`,
  `*credential*`, `*.sqlite`, `*.db`, or service-account files (`git ls-files`).
- No such files present in the working tree either (ignored or not).
- The scrapers use no credentials — they navigate public g1.ca practice-test
  pages and read no env vars.
- **No secrets were found; nothing required redaction.**

## 6. `.gitignore` and Publish Safety Review

- Root `.gitignore` already ignored `node_modules/`, `auth.json` (Playwright
  session state), scraped `screenshots/`, locally cached `question-images/`,
  `web/.next/`, `web/node_modules/`, `web/.env*.local`, and `.DS_Store`.
- `web/.gitignore` is comprehensive (`.env*`, `*.pem`, `/.next/`, `/out/`,
  `/build`, `node_modules`, `*.tsbuildinfo`, `.vercel`, debug logs).
- **Gap (now fixed):** the root `.gitignore` did not protect a repo-root `.env`
  (see Finding 1). Resolved by adding `.env` / `.env.*` with an `!.env.example`
  exception.
- No `.env.example` is provided, and none is needed: the project reads no
  environment variables.

## 7. Authentication and Authorization Review

Not applicable. The app has no authentication, authorization, sessions, cookies,
or server-side user input handling. The only persistent state is the user's own
"missed questions" bank in their browser's `localStorage` (read/written via
`getBankQuestions` / `updateBank`), which is per-user, client-side, and
non-sensitive.

## 8. Input Validation and Unsafe Operation Review

- **No XSS sinks:** `git grep` found zero `dangerouslySetInnerHTML`, `innerHTML`,
  or `outerHTML`. All question/answer/explanation text is rendered as React text
  (auto-escaped).
- **No dynamic code execution / shell:** zero matches for `eval(`, `new Function(`,
  `child_process`, `execSync`, `exec(`, `spawn(`.
- **Route param handling is safe:** `web/app/test/[testId]/page.tsx` passes the
  URL `testId` only to `classifyTestId` (a pure lookup over the hardcoded
  `LICENCE_CLASSES`) and to `getQuestionsForPracticeTest`, which fetches only a
  matched, hardcoded `dataFile` or returns `[]`. The param never reaches a file
  path or fetch URL directly — no path traversal or SSRF.
- **Server file reads use trusted paths:** `lib/questions.server.ts` reads only
  hardcoded `dataFile` values from config under `public/`, not user input.
- **Parsing is defensive:** `parseQuestion` / `parseQuestionsArray` validate types
  and throw on malformed data; `parseBankStorage` swallows invalid JSON and
  unknown storage versions, returning `[]`.
- **Image-cache writes can't traverse:** `scripts/image-cache.js`
  `urlToCacheFilename` reduces any image URL to `path.posix.basename(pathname)`
  and rejects empty / `/` / `.` / `..`, so `cache-images.js`'s
  `path.join(DEST_DIR, filename)` can only ever write inside
  `web/public/question-images/`. The downloader is an opt-in local CLI fetching
  first-party scraped URLs (not a server endpoint), so SSRF is not in scope.

## 9. Dependency and Tooling Review

- Root `package.json`: single runtime dependency `playwright`; scripts are
  `sync` / `sync:cached-images` / `cache-images` / `test`. **No `pre/postinstall`
  hooks.**
- `web/package.json`: `next`, `react`, `react-dom` runtime; dev deps are testing
  and tooling. No suspicious scripts.
- `npm audit --audit-level=moderate` (web): **2 moderate** — transitive `postcss`
  advisory via Next.js (Finding 2). No critical/high. The only offered fix is a
  breaking Next.js downgrade, so it is not auto-applied.

## 10. CI/CD and Deployment Review

- `.github/workflows/ci.yml` runs on push/PR to `main`: `npm ci`, `npm test`,
  `npm run build`, `npm run lint` in `web/`. No secrets are referenced, no
  `pull_request_target`, no deploy step, no untrusted code execution.
- Hardening opportunities (manual) noted in Finding 3: least-privilege
  `permissions:` and optional SHA-pinning of actions.

## 11. Auto-Fixes Applied

**2026-05-29 re-verification run: no new auto-fixes were applied.** Every safe
hygiene gap identified in the original pass is already resolved on `main`, and
the remaining findings (postcss advisory, CI hardening) are out of safe auto-fix
scope. The only change committed this run is this report update.

### Auto-fix 1 (original pass) — Harden root `.gitignore` against `.env` files
- **Files changed:** `.gitignore`
- **What changed:** added a "Local env / secrets" block ignoring `.env` and
  `.env.*` with an `!.env.example` exception.
- **Why it is safe:** purely additive ignore rules; no tracked files are affected
  (none match), and application/runtime behavior is unchanged.
- **Validation run:** `git check-ignore .env` (ignored), `git diff --check`,
  and `npm test` (web) as a sanity check.
- **Result:** `.env` is ignored; the rule is present on `main` and was
  re-confirmed in the 2026-05-29 run.
- **Status:** merged into `main` (historical; not re-applied this run).

## 12. Recommended Manual Fix Order

1. **Finding 2 (postcss):** track Next.js for a release bundling
   `postcss >= 8.5.10`; upgrade and re-run `npm run build`. Avoid
   `npm audit fix --force`. (Low urgency — build-time, first-party CSS only.)
2. **Finding 3 (CI):** add `permissions: { contents: read }` and consider
   SHA-pinning the GitHub Actions. (Hardening.)
3. **Finding 4 (images):** revisit only if data provenance broadens beyond
   first-party scraped content. (No action today.)

## 13. Commands Run

- `pwd`, `git status --short`, `git branch --show-current`, `git remote -v`, `ls`
- `git ls-files` (filtered), and globbed `git ls-files` for sensitive file types
- `git grep` for secret patterns (incl. high-signal token shapes across JSON
  data: `eyJ…`, `AKIA…`, `-----BEGIN`, `sk_live_`, `sk-…`, `ghp_…`, `xox…`);
  for `dangerouslySetInnerHTML`/`innerHTML`/`outerHTML`/`insertAdjacentHTML`;
  for `eval`/`new Function`/`child_process`/`exec`/`spawn`; for `process.env`;
  for `pre`/`postinstall`/`prepare` hooks
- `git grep` tracing `testId` → `classifyTestId`/`getPracticeTest` and
  `fetch(dataFile)` / `path.join(..., publicPath)` to confirm trusted-only inputs
- Read of `scripts/image-cache.js` + `scripts/cache-images.js` to confirm the
  URL→cache-path mapping cannot traverse outside `web/public/question-images/`
- `find` for stray sensitive files; `git check-ignore` for
  `.env` / `web/.env.local` / `auth.json` / `web/public/question-images/*`
- `npm audit --audit-level=moderate` (in `web/`)

## 14. Final Notes

No secrets were found anywhere. Production/runtime behavior is unchanged. As of
the 2026-05-29 re-verification on `main`, no new issues were found and no code or
config changes were applied — the prior `.gitignore` hardening is already merged,
and the only commit this run is this report update. The remaining items are a
low-practical-risk transitive advisory and optional CI hardening, both left for
human review per safe-auto-fix limits.
