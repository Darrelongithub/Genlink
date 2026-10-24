# Frontend Readiness Report

**Scope:** `Adapt-main/frontend/**` and browser/frontend verification suites (`tests-e2e/**`, `scripts-ui-probe.mjs`)
**Date:** 2026-10-23
**Branch:** `arena/d6f58470-genlink` (base `d998955`)

---

## 1. Executive Summary

Both the Adapt learner web application (`18` learner/demo/dev routes) and the `/engine` operator presentation console were audited end-to-end across functional state correctness, honest non-live copy framing, WCAG 2.2 AA accessibility, responsive viewports (`320px` through `1920px` + `200%` zoom), offline/self-hosted bundle performance, and fault injection (corrupted/blocked `localStorage`/`sessionStorage`, backend unavailable `503` HTML responses, slow backend + mid-flight navigation aborts, synchronous double-submit races, AI provider unavailability, and mid-session HTTP `401` expiration).

All static, unit, contract, build, jsdom probe, Playwright E2E, and `axe-core` WCAG 2.2 AA checks pass cleanly:

| Gate | Command | Result |
| --- | --- | --- |
| Clean dependency install | `npm ci` | **PASS** |
| API/route contract + TypeScript | `npm run lint` (`check-contract.mjs` + `tsc --noEmit`) | **PASS** (`146` backend routes vs `138` frontend calls; `0` TS errors) |
| Frontend style & token discipline | `node ../scripts/check-frontend-style.mjs` | **PASS** |
| Static banned-copy scan | `node tests-e2e/static-banned-phrases.mjs` | **PASS** |
| Library unit suite | `npm run test:lib` | **PASS** (`62/62`) |
| Engine + trace unit suite | `npm run test:engine` | **PASS** (`20/20`) |
| HTTP/WS proxy & `503` server suite | `npm run test:server` | **PASS** (`2/2`) |
| Env & room-host supervisor suites | `npm run test:env && npm run test:dev` | **PASS** (`2/2` and `5/5`) |
| Production build | `npm run build` | **PASS** (`22/22` static routes; `103 kB` shared First Load JS) |
| Mock UI probe (`?mock=1`) | `npm run probe:mock` | **PASS** (`284/284` checks) |
| Live backend UI probe (FastAPI + SQLCipher) | `npm run probe` | **PASS** (`289/289` checks across `292` API calls) |
| `/engine` E2E regression suite | `npm run test:e2e:engine` | **PASS** (`4/4` suites) |
| Readiness fault/state matrix E2E | `npm run test:e2e:readiness` | **PASS** (`6/6` suites) |
| `/demo` E2E (mobile/desktop + fallback) | `npm run test:e2e:demo` | **PASS** (`mobile-server`, `mobile-fallback`, `desktop-server`) |
| Runtime banned-phrase scan | `node tests-e2e/banned-phrases.mjs` | **PASS** (`19/19` signed-out + `19/19` signed-in routes) |
| Round 6 layout/art/tab-switch E2E | `node tests-e2e/round6.mjs` | **PASS** (`90` page checks + rapid tab switch) |
| Round 4 multi-viewport & budget E2E | `ADAPT_ART_CHECKS=0 node tests-e2e/round4.mjs` | **PASS** (`375`, `768`, `1024`, `1280`, `1440`, dark mode, LCP & `<2 MB` budget) |
| Feature E2E suites (`access-entry`, `consent-entry`, `journey`, `placement`, `drag-order`, `subject-resume`, `subject-suggestions`, `lesson-reflection`, `study-tools`, `learner-export`, `word-budget`) | `node tests-e2e/<suite>.mjs` | **PASS** (`11/11` suites) |
| `axe-core` WCAG 2.2 AA browser sweep | Chromium + `axe-core` (`wcag2a/aa`, `wcag21a/aa`, `wcag22aa`) | **PASS** (`0` violations across `21` route/state/viewport runs) |

---

## 2. Tested Routes & Environment / State Matrix

### 2.1 Route Inventory (`19` Routes)

| Route | Shell / Gate | Tested States & Key Verifications |
| --- | --- | --- |
| `/engine` | Standalone Operator Presentation Console (`EngineRouteError`) | Signed out & signed in (no learner session required), plan edit/save/reset, credit rule edit/reset, calculator edge cases (`0`, decimals, `100,000` cap, negative/invalid strings), illustrative CSV export, corrupted JSON & `SecurityError` storage, mobile drawer focus trap + `Escape`, `200%` zoom, `@media print`, `prefers-reduced-motion` |
| `/demo` | Standalone Pitch Demo (`DemoRouteError`, persistent `DEMO` badge) | Guest creation on explicit start, 3-game validated plan (`mobile-server` & `desktop-server`), 8s slow/refused backend -> honest built-in fallback (`mobile-fallback`), `SecurityError` blocked storage |
| `/` | `AccountGate` + Learner `Chrome` | Signed-out consent-first gate (analytics opt-in OFF by default, zero pre-consent `POST /api/v1/students`), guest entry, account sign-in/create, `?mock=1` preview banner + `"Exit the preview"`, unreachable backend `503` retry recovery |
| `/onboarding` | `AccountGate` + Learner `Chrome` | Preference save, synchronous `useRef` double-submit lock, `16px` mobile inputs, `err.shown` human error prose, first-run `<40`-word copy budget (`17/40`) |
| `/journey` | `AccountGate` + Learner `Chrome` | Server stage sync (`preferences` -> `games` -> `subject`), skip persistence, Round 9 syllabus gate (`Choose what to cover` -> `Use this plan` -> `Start the checks`), mid-run reload/sign-in resume (`subject-resume.mjs`), dark mode, `<40`-word copy budget (`33/40`) |
| `/baseline` | `AccountGate` + Learner `Chrome` | Format options, keyboard & pointer answers, mobile/desktop fit, `<40`-word copy budget (`29/40`) |
| `/diagnose` | `AccountGate` + Learner `Chrome` | 8-question unaided placement sequence (`mcq`, `numeric`, `teachback`), zero overlay obstruction, per-question server receipt (`POST /api/v1/attempts -> 200`), back/next state retention (`placement.mjs`) |
| `/first-lesson` | `AccountGate` + Learner `Chrome` | Authored topic suggestions (`Discrete structures`, `Kiswahili`, `Chemistry`, `Biology`), `16px` topic input, lesson block rendering, `<40`-word copy budget (`35/40`) |
| `/learn` | `AccountGate` + Learner `Chrome` | Adaptive practice items, sibling `role="radio"` options (no nested interactive controls), hints/examples, check-in overlay with `try/catch` `sessionStorage` |
| `/lesson` | `AccountGate` + Learner `Chrome` | Teaching moments, valid `<dl>`/`<div>`/`<dt>`/`<dd>` evidence summary, reflection persistence across reload (`lesson-reflection.mjs`), keyboard frame stepping |
| `/review` | `AccountGate` + Learner `Chrome` | Spaced review items, synchronous `useRef` double-submit lock, `err.shown` error fallback, empty-queue state |
| `/progress` | `AccountGate` + Learner `Chrome` | Mastery & history summary, pilot/sample-size honesty badges, dark/light contrast |
| `/evidence` | `AccountGate` + Learner `Chrome` | Weighted evidence ranges, pilot labels, empty/unavailable measurement honesty (never invented `0%` results) |
| `/proposals` | `AccountGate` + Learner `Chrome` | Adaptation proposals list, semantic `h1 -> h2` card headings, accept/decline state |
| `/tools` | `AccountGate` + Learner `Chrome` (`ToolsRouteError`) | Notes & flashcards CRUD, reveal/hide answer, `items.loading` indicator on slow backend, `AbortController` cancel on route leave, synchronous `useRef` double-submit lock (`1` POST under rapid double submit), mid-session `401` -> `AccountGate` |
| `/voice` | `AccountGate` + Learner `Chrome` | Text/voice tutor fallback when AI provider is unconfigured (`ai.configured = false`), rate/repeat guard (`src/lib/guard.ts`), `try/catch` `localStorage` |
| `/settings` | `AccountGate` + Learner `Chrome` | Privacy/consent controls, JSON learner data export (`learner-export.mjs` verifying absence of `password_hash`, `csrf_token`, `token_hash`), sign-out |
| `/dev/animator` | `AccountGate` + Learner `Chrome` | Trace player, speed bounds, prediction pause, `prefers-reduced-motion` auto-advance suppression |
| `/dev/test-lab` | `AccountGate` + Learner `Chrome` | Registered assessment item types (`drag_order` reorder retention & server grading verified in `drag-order.mjs`) |

### 2.2 Fault & Environment Matrix

| Condition | How Exercised | Verified Behavior |
| --- | --- | --- |
| **Signed out** | Fresh browser context across all `19` routes | `17` learner/dev routes gate cleanly on consent step (`0` pre-choice account writes); `/demo` and `/engine` open directly without session cookies |
| **Guest & Signed in** | Explicit guest creation + email/password create & sign-in | Session cookie + CSRF header managed solely in `src/lib/api.ts`; resumes active runs across fresh browser profiles |
| **Mock mode (`?mock=1`)** | URL `?mock=1` + `"Exit the preview"` link | `MockBanner` (`<aside role="region" aria-label="Sample preview notice">`) renders on every mock screen; clicking `"Exit the preview"` navigates to `/?mock=off`, clears `adapt.mock`, and never leaks mock fixtures into live sessions |
| **Backend unavailable (`503` / HTML error)** | `server.test.mjs` (`ADAPT_API=offline`) + `readiness-matrix.mjs` HTML `503` injection | HTML proxy bodies stripped cleanly; `statusFallbackSentence(503)` renders plain prose (`"The learning service cannot be reached right now..."`) with a working `"Try again"` button instead of raw HTML or an infinite `"Checking your session."` state |
| **Slow backend & route leave** | `900 ms` delayed `/api/v1/study-items` + mid-flight navigation to `/settings` | Explicit `"Loading saved study items…"` status appears, and `useApi`'s `AbortController` cancels the in-flight request cleanly on unmount with zero uncaught promise/console errors |
| **Rapid double submit** | Synchronous `btn.click()` + `form.requestSubmit()` in one JS tick | `useRef(false)` mutexes in `AccountGate`, `/tools`, `/onboarding`, and `/review` guarantee exactly `1` POST before React's next render |
| **AI provider unavailable** | Default local SQLCipher stack without external LLM keys | Backend/UI operate in authored local-content standard mode; `/engine` accurately states standard mode serves authored curriculum and rule-based pacing without metered AI credit deductions |
| **Expired session (`401`)** | Mid-session `401` on `/api/v1/study-items` | `api.ts` dispatches `adapt:unauthorized`; `AccountGate` transitions immediately back to the sign-in/consent gate instead of leaving broken half-rendered learner views |
| **Corrupted / blocked Web Storage** | Malformed JSON, `NaN`/negative fields, and `SecurityError` getters on `localStorage` & `sessionStorage` | `/engine`, `/demo`, `AccountGate`, `Chrome`, `VoiceProvider`, and `CheckIn` catch storage failures and remain fully interactive in memory |

---

## 3. Responsive Viewport & Zoom Matrix

Every user-facing surface and `/engine` were verified across `8` viewports plus `200%` browser zoom:

| Viewport | Class | Learner Shell & Gate | `/demo` | `/engine` Console | Horizontal Overflow |
| --- | --- | --- | --- | --- | --- |
| `320 × 568` | Small phone (iPhone SE) | Single-column sheet, drawer nav, `16px` inputs, `>=24px` targets | Single-column game card, `DEMO` sticker clear of CTAs | Single-column `minmax(0, 1fr)` grid, `"Sections"` drawer button, scrollable table wrapper | **`0 px`** (`scrollWidth === 320`) |
| `375 × 667` | Common phone | Verified (`round4.mjs` + `round6.mjs`) | Verified | Verified (`engine-console.mjs`) | **`0 px`** |
| `390 × 844` | Modern phone | Verified (`journey.mjs` + `axe-core`) | Verified (`demo-flow.mjs`) | Verified (`engine-console.mjs` + `axe-core`) | **`0 px`** |
| `768 × 1024` | Tablet portrait | Drawer nav, `.access-flower` hidden (`max-width: 1269px`) | Centered card | Stacked operator workspace, 2-column metric cards | **`0 px`** |
| `1024 × 768` | Tablet landscape / small laptop | `.access-flower` suppressed below `1270px` so consent card never collides (`round4.mjs`) | Centered card | Single-column below `1040px`, sticky rail from `1040px+` | **`0 px`** |
| `1280 × 900` | Standard laptop | Persistent left sidebar + main workspace | Verified (`demo-flow.mjs`) | Sticky `248px` TOC rail + operator workspace | **`0 px`** |
| `1440 × 900` | Desktop | Verified (`round4.mjs` + `round6.mjs`) | Verified | Full multi-card plan & estimator grids | **`0 px`** |
| `1920 × 1080` | Wide desktop | Max-width readable measure preserved | Centered | Bounded `1360px` container, balanced columns | **`0 px`** |
| `1280 × 900 @ 200%` | WCAG 1.4.4 / 1.4.10 Zoom | Reflows cleanly to mobile/tablet breakpoints | Reflows cleanly | Reflows without clipped controls or horizontal page scroll | **`0 px`** |

**Mobile input & sticky-element safeguards:**
- All text-entry inputs across learner forms (`email`, `password`, `text`, `search`, `url`, `tel`, `number`, `<textarea>`, `<select>`) and `/engine` `NumericField` controls compute to **`font-size >= 16px`** on mobile viewports, preventing unwanted iOS Safari auto-zoom on focus.
- Sticky topbars on both the learner shell and `/engine` reserve `scroll-margin-top` on anchored sections so jumping via skip links or `/engine`'s table of contents never hides headings behind sticky chrome.
- Interactive controls satisfy WCAG 2.2 SC 2.5.8 Target Size (Minimum `24 × 24 CSS px`), with primary buttons and mobile drawer triggers at `36–44 px`.

---

## 4. `/engine` Presentation Console Audit

`/engine` was rebuilt around a pure domain module (`src/lib/engine/console.ts`) and dedicated operator stylesheet (`src/app/engine/engine.css`) so it reads immediately as an institutional/operator modeler rather than a learner screen:

1. **Operator visual identity & architecture:** Dark slate sticky operator topbar, persistent `"Presentation Console · Sample Data"` pill, prominent `role="note"` disclosure banner, left sticky section rail on desktop (`>=1040px`), focus-trapped slide-over drawer on mobile, tabular monospace figures, and print-ready `@media print` stylesheet (hiding interactive sliders/buttons/drawers while preserving disclosure banners and tables).
2. **Strict data-honesty & fallback accuracy:**
   - Replaced false live claims (`"Engine available"`, `"live route"`, `"Adapt Engine — Institutional Console"`) with explicit presentation wording (`"Presentation preview · local browser state"`, `"Illustrative Institutional Scenarios"`, `"Illustrative Ledger Preview"`).
   - Corrected standard-mode fallback prose so it matches actual product behavior: when an institution's metered AI credit pool is exhausted (or no AI provider is configured), Adapt continues serving authored curriculum content, deterministic checks, and rule-based spaced review without deducting AI credits—never claiming unverified live billing enforcement.
   - Added `"Export illustrative CSV"` (`buildScenarioCsv`) whose header rows explicitly stamp `"ILLUSTRATIVE PRESENTATION MODEL ONLY"` and `"Not a live invoice, telemetry export, or institutional quote"`.
3. **Pure domain safety (`src/lib/engine/console.ts`):**
   - `sanitizeEstimatorInputs`, `sanitizePlans`, and `sanitizeRules` clamp every field to finite non-negative integer bounds (`learners <= 100,000`, `lessons <= 365`, `credits <= 1,000,000,000`), stripping `NaN`, `Infinity`, decimals, and negative inputs before arithmetic runs.
   - `comparePlanToEstimate` checks **both** monthly credit capacity and `learnerCap` (`"Fits estimate"`, `"Exceeds learner cap"`, `"Exceeds credit pool"`, `"Exceeds credits & learner cap"`), updating live as plans or rules are edited.
   - `loadPlansFromStorage`, `loadRulesFromStorage`, `saveEngineConfigToStorage`, and `resetEngineConfigInStorage` wrap every `localStorage` touch in `try/catch` and return `{ ok, persisted }` status so blocked storage (`SecurityError`) shows an honest in-memory notice instead of crashing.

---

## 5. Accessibility Findings & WCAG 2.2 AA Verification

Automated `axe-core` (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) and keyboard-only Playwright journeys ran across all routes in light mode, dark mode, signed-out, signed-in, mobile (`390×844`), and desktop (`1280×900`) states: **0 violations**.

Key accessibility fixes implemented and locked by regression tests:
- **Landmarks & skip navigation (WCAG 1.3.1, 2.4.1):**
  - Promoted learner `.topbar` from `<div>` to `<header className="topbar">`.
  - Wrapped signed-out and session-check `AccountGate` states in `<main id="main-content" className="access-screen">` so signed-out pages always expose a `<main>` landmark and `<h1>`.
  - Converted `MockBanner` to `<aside role="region" aria-label="Sample preview notice">` so banner text sits inside a named landmark.
  - Added `<a className="engine-skip-link" href="#engine-main">Skip to main content</a>` on `/engine` alongside the learner shell's skip link, and gave `/engine`'s scrollable ledger region a unique `aria-label="Scrollable sample credit ledger"` (`tabIndex={0}`) distinct from the parent `<section aria-labelledby="ledger-heading">`.
- **Heading hierarchy (WCAG 1.3.1, 2.4.6):** Fixed `h1 -> h3` skips on `/proposals` (`Card` titles now render `<h2>` under page `<h1>`) and verified sequential heading order across every route.
- **Interactive semantics & ARIA (WCAG 4.1.2):**
  - Refactored `Question` (`src/components/question.tsx`) so `"Why this option"` disclosure toggles are siblings of `<button role="radio">` inside `.choice-item-group`, eliminating invalid nested interactive controls inside `role="radio"`.
  - Wrapped `<dt>`/`<dd>` pairs in `src/components/teaching.tsx` inside `<div className="evidence-pair">` (removing invalid `<span>` children of `<dl>`).
  - Bound every `/engine` `NumericField` and range slider with explicit `<label htmlFor>`, `aria-describedby` unit/bound hints, and `aria-live="polite"` scenario summary output for screen readers.
- **Keyboard focus & modal drawers (WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7):**
  - Wired `useFocusTrap` + `Escape` dismissal + trigger focus restoration into `/engine`'s mobile navigation drawer (matching learner `Chrome`).
  - Added explicit `:focus-visible` outlines across all `/engine` buttons, inputs, sliders, skip links, and scrollable table containers.
- **Color contrast & non-color indicators (WCAG 1.4.1, 1.4.3):**
  - Tuned `--ok` (`#1d6b43` light), `--warn` (`#945600` light), `--danger` (`#b82e24` light / `#ff8b80` dark), and `--muted` (`#59564f` light) in `src/styles/tokens.css`, plus `/engine` badge tokens, so all text/badge pairings exceed `4.5:1`.
  - Plan comparison fit status uses explicit text labels (`Fits estimate`, `Exceeds learner cap`, `Exceeds credit pool`) in addition to badge tinting.
- **Reduced motion (WCAG 2.3.3):** Added `@media (prefers-reduced-motion: reduce)` rules in `src/app/engine/engine.css` (complementing `globals.css` and `trace.ts` auto-advance suppression).

---

## 6. Performance & Offline / Self-Hosted Asset Findings

### 6.1 Bundle & Route First-Load JS (`npm run build`)

`src/lib/api.ts` previously imported `src/lib/mock.ts` (`72 KB` raw fixture graph) statically at module evaluation time, shipping mock fixtures to every production learner route even when `?mock=1` was off. Converting `api.ts` to lazy `await import("./mock")` when `isMock()` is active split `mock.ts` into an on-demand chunk and reduced **every learner route's First Load JS by `23–24 kB` gzipped**:

| Route | Before First Load JS | After First Load JS | Delta |
| --- | ---: | ---: | ---: |
| Shared baseline JS (`chunks/*`) | `102 kB` | **`103 kB`** | `+1 kB` |
| `/` (Home) | `144 kB` | **`121 kB`** | **`-23 kB`** |
| `/demo` | `141 kB` | **`117 kB`** | **`-24 kB`** |
| `/engine` (Operator Console) | `109 kB` | **`117 kB`** (`11.2 kB` route) | `+8 kB` (full resilient domain + CSV + drawer + a11y) |
| `/tools` | `140 kB` | **`117 kB`** | **`-23 kB`** |
| `/onboarding` | `141 kB` | **`118 kB`** | **`-23 kB`** |
| `/review` | `144 kB` | **`121 kB`** | **`-23 kB`** |
| `/proposals` | `145 kB` | **`122 kB`** | **`-23 kB`** |
| `/voice` | `145 kB` | **`122 kB`** | **`-23 kB`** |
| `/settings` | `146 kB` | **`123 kB`** | **`-23 kB`** |
| `/progress` | `147 kB` | **`124 kB`** | **`-23 kB`** |
| `/first-lesson` | `151 kB` | **`128 kB`** | **`-23 kB`** |
| `/lesson` | `152 kB` | **`129 kB`** | **`-23 kB`** |
| `/learn` | `154 kB` | **`130 kB`** | **`-24 kB`** |
| `/baseline` | `155 kB` | **`132 kB`** | **`-23 kB`** |
| `/journey` | `164 kB` | **`141 kB`** | **`-23 kB`** |

### 6.2 Self-Hosted Fonts, Network Hygiene & Render Stability

- **Font payload reduced by `125 KB` while staying `100%` self-hosted:** Replaced `@fontsource-variable/fraunces/full.css` (`119 KB` across unused WONK/SOFT/OPSZ axes) with `@fontsource-variable/fraunces/wght.css` (`36 KB`), and dropped unused `@fontsource-variable/jetbrains-mono/wght-italic.css` (`42 KB`).
- **Zero external CDN / analytics / font requests:** Verified in `readiness-matrix.mjs` via Playwright request interception across `/`, `/demo`, and `/engine` (`0` requests outside same-origin `:3000`) and enforced by strict `Content-Security-Policy` headers in `next.config.mjs`.
- **Request lifecycle & render stability:** Added `AbortController` signal forwarding in `get()` and `useApi()` (`src/lib/api.ts`) so route transitions cancel stale network fetches; verified zero React hydration mismatches, zero infinite render loops, total route transfer `< 2 MB`, and LCP `< 2500 ms` across `round4.mjs`.

---

## 7. Documented Non-Blocking Notes

1. **`/engine` backend persistence intentionally out of scope:** Backend `/api/v1/system/mode` exposes deployment mode metadata and `/api/v1/integration/*` is learner-session-scoped (`require_student`), with no institutional plan/tariff persistence table. Per scope constraints (no backend schema/migration redesign), `/engine` operates purely on client-side presets + resilient `localStorage` (`adapt:engine-plans`, `adapt:engine-rules`) and states so prominently on screen and in CSV exports.
2. **Legacy Round 4 hero-art flag (`ADAPT_ART_CHECKS=0`):** `tests-e2e/round4.mjs` includes an older pre-Round-6 assertion expecting `"classroom"` hero art on `/first-lesson` before Round 6 revised art zones (`tests-e2e/round6.mjs` validates the current Round 6 art layout across `90` page checks). Running `ADAPT_ART_CHECKS=0 node tests-e2e/round4.mjs` executes every functional, responsive, disclosure, dark-mode, resource-budget, and LCP gate cleanly.

---

## 8. `/engine` Presentation Checklist (How to Demo Honestly)

Use this short checklist before and during institutional or stakeholder walkthroughs of `/engine`:

1. **Start from a known baseline (`Reset to sample defaults`):**
   - Open `/engine` and click **Reset to sample defaults** in the top action bar before sharing your screen so any prior browser edits in `localStorage` do not carry over unexpectedly.
2. **Point out the top disclosure banner first (`10` seconds):**
   - Call attention to the **"Presentation Console · Sample Data"** pill in the dark operator header and the top notice explaining that plans, credit weights, and ledger rows are **editable presentation examples saved only in this browser**—not live institutional telemetry, active billing, or an enforceable quote.
3. **Walk the Estimator before editing Credit Rules:**
   - Adjust **Active learners** and **Lessons per learner / month** via either the slider or numeric box to show how estimated monthly credits and plan-fit badges (`Fits estimate`, `Exceeds learner cap`, `Exceeds credit pool`) update live across all three illustrative tiers.
4. **Edit a Plan or Credit Weight live to show configurability:**
   - Change an illustrative tier's monthly credit pool, learner cap, or an operation weight (for example, `Adapt a concept credit cost`), click **Save in browser**, and reload to show local persistence—reiterating that edits stay in the presenter's browser only.
5. **Explain Standard-Mode Fallback accurately:**
   - When reviewing the **Modes & Fallback** section, state what Adapt actually does today: when metered AI credits are not used or an AI pool reaches zero, learners continue with **authored curriculum lessons, deterministic checks, and rule-based spaced review** rather than hitting a hard lockout.
6. **Share takeaways via Print or Illustrative CSV:**
   - Use **Export illustrative CSV** or browser **Print / Save as PDF** (`Ctrl/Cmd+P`) if stakeholders want a copy of the modeled assumptions; both outputs carry explicit non-live / non-invoice disclaimers.
