# System architecture — Genlink ↔ Adapt (release gate, 2026-10-23)

This is a **factual map of what exists on this branch**, not a target architecture.
The single most important fact: **Genlink is not connected to Adapt.** The contract is
proven; the caller is a test-only reference implementation. Any diagram that shows a
live arrow between the two products is a proposal, not the current system.

**Layout note (merge with main, 2026-10-23):** while this gate was running, `main` advanced
from `d998955` to `aad6946`. It deleted both ZIP archives, extracted Genlink into the
repository root (`src/`, `supabase/`, `drizzle/`, `index.html`, `package.json`) and added a
refactored top-level `adapt/` tree, while leaving `Adapt-main/` **unchanged**. This branch
merged that main, resolved the `.gitignore` add/add conflict, applied the same measured pool
fix to `adapt/backend/src/adapt/db/engine.py`, fixed the same demo-script drift in
`adapt/scripts/demo.mjs`, and extended the host scan to the extracted trees. The HTTP/stress
evidence below was measured against `Adapt-main/backend` + `Adapt-main/frontend`, which main
did not modify; `release/check_second_layout.py` separately proves the second backend carries
the same pool bound.

## 1. Ownership and physical layout

| Area | Where it lives | Owner in this release | State |
| --- | --- | --- | --- |
| Adapt backend | `Adapt-main/backend/src/adapt/` (tested here) and top-level `adapt/backend/src/adapt/` (refactored copy added on main) | parallel backend agent | both carry the bounded SQLite pool fix |
| Adapt frontend | `Adapt-main/frontend/` (Next.js 15.5.27) | parallel frontend agent | checked out, builds to 22 static pages |
| Adapt scripts/docs | `Adapt-main/scripts/`, `Adapt-main/docs/` | parallel agents, release gate for verification | most README-linked docs are **not written**; see README → Documentation status |
| Genlink | root `src/`, `supabase/`, `drizzle/` (201 files under `src/`); originally `genink-school-of-the-elites-main (1).zip`, now deleted on main | product owner | extracted on main; archive inspected in memory before deletion, nothing printed |
| Cross-system contract | `integration/contract/`, `integration/reference_client.py`, `integration/test_reference_client.py` | release engineering | frozen schemas, fixtures, 17/17 caller tests |
| Release gate | `release/`, `.github/workflows/release-gate.yml`, root `*.md` | release engineering | measured evidence in `release/evidence/` |

`Adapt-main (3).zip` was compared against the checkout before main deleted it: all 484 file
entries already existed in `Adapt-main/`. It was **not** extracted. The Genlink archive was
read with `zipfile` in memory; its `.env` was audited by key name only, never by value.
After the merge both archives are gone from the working tree, so the secret scan now covers
1313 tracked source files and 0 archive members.

## 2. Runtime topology that actually runs

```
learner browser
   │  same-origin https://<preview-host>/
   ▼
Next.js front door (Adapt-main/frontend/server.mjs)
   │  proxies /api/*, /healthz, /ws/voice to ADAPT_API
   │  browser code uses relative URLs only
   ▼
FastAPI (Adapt-main/backend/src/adapt/api/app.py)
   ├── SQLite / SQLCipher file in ADAPT_DATA_DIR (field encryption at rest)
   ├── Alembic upgrade on startup (fresh AND migrated files verified)
   ├── optional Gemini model (NOT configured in the release gate)
   └── optional external resource providers (disabled in deterministic CI scenarios)

Genlink browser (archive only)
   └── Supabase Auth + Supabase tables/functions
        ❌ no HTTP client for Adapt; no shared auth, no shared database
```

`release/host_scan.py` now scans **183 Adapt browser files (both trees) and 177 Genlink
browser files (root `src/` + `index.html`)**: 0 network calls or base-URL assignments to `localhost`, `127.0.0.1`,
`0.0.0.0` or `::1`. Two informational loopback strings remain in Genlink's
`src/integrations/supabase/previewAuthStorage.ts` (lines 63 and 69): they are origin
allowlist regexes, not requests. `Adapt-main/scripts/check-contract.mjs` independently
checks 146 backend routes against 138 frontend calls and passes.

## 3. The one integration endpoint

`POST /api/v1/integration/adapt` — `backend/src/adapt/api/routes/integration.py`.

**Request** (`integration/contract/request.schema.json`; fixture
`integration/contract/fixtures/valid_request.json`):

| Field | Meaning | Constraint |
| --- | --- | --- |
| `learner.id` | opaque caller-side identifier | echoed back; never resolved against Adapt's `students` table |
| `activity[]` | caller-observed events | max 500; `id`, `kind`, `topic_id`, `correct`, `response_ms`, `hint_used`, `confidence`, `method`, `expected_success` |
| `content` | the caller's standard lesson material | required; defines the blocks Adapt may reorder/split |
| `concept`, `title`, `topic_id`, `constraints` | curriculum context | optional; unknown top-level fields are ignored, including any `institution_id` |

**Response** (`integration/contract/response.schema.json`; a real 200 is captured in
`fixtures/captured_response.json`, with only `request_id`/`elapsed_ms` normalised):
`ok`, `engine{name,version,mode,local_only}`, `learner_id`, `request_id`, `elapsed_ms`,
`derived_profile{events,attempts,correct,hints,accuracy,levers,flags,subject,notes}` and
`adapted_content{blocks,concept,content,fallbacks,ladder_rung,lead_format,limits,mode,
provenance,subject,title,topic_id,why_panel}`. Every block carries a `why`.

Properties proven by `backend/tests/test_integration_release_contract.py` and
`backend/tests/test_integration_endpoint.py`:

* **Stateless.** No DB read, no DB write, no cookie set, no session row, no model call,
  no network call. A restart, a stale session and a locked database do not change its 200.
* **Deterministic.** 50 identical submissions produced one identical plan; the 50 distinct
  `request_id` values only show that the id is per response, not per stored state.
* **Local-only.** `engine.mode=deterministic`, `engine.local_only=true`. Removing Gemini and
  YouTube keys changes nothing.
* **Isolation by construction.** Because it reads no stored learner rows, one learner's
  persisted marker cannot leak into another learner's response. It also means Adapt does
  **not** verify that the caller is allowed to send a given `learner.id`.
* **Auth is deployment policy.** If `ADAPT_INTEGRATION_TOKEN` is set, a bearer token or
  `X-Adapt-Integration-Token` is required; otherwise, if an active demo passphrase is set,
  `X-ADAPT-Demo-Passphrase` is required; otherwise the route is deliberately open. A wrong
  token is `401 integration_unauthorized`. A malformed body is `422`.
* **Size cap.** `ADAPT_MAX_BODY_BYTES` defaults to 8 MiB. A 115,323-byte valid request
  returned 200 with 414 blocks. An announced 8,388,609-byte body is refused with `413`
  when read over a raw socket; a client that sends the whole body first (urllib) sees a
  connection reset instead, because the server refuses before reading it. Both behaviours
  are recorded, and the server remains healthy afterwards.

**Failure contract** (`integration/reference_client.py`, test-only, standard library only):

* explicit base URL required; loopback refused unless `allow_loopback=True`;
* at most 3 attempts by default; retries only transport errors, timeouts and 429/502/503/504;
  a 401, 422 or schema-violating 200 is **not** retried;
* one SHA-256-derived 32-character `Idempotency-Key` per logical request across retries;
* `http.client.IncompleteRead`/`HTTPException` (server died mid-response) are caught —
  this was a real defect found by the gate's interrupted-connection test;
* on outage it returns the caller's own blocks labelled
  `source=standard_content`, `adapted=false`, **never** presented as an Adapt lesson.

## 4. Identity, session and institution assumptions

| System | Identity | Session | Tenant/institution |
| --- | --- | --- | --- |
| Genlink (archive) | Supabase Auth (`src/contexts/AuthContext.tsx`, `src/integrations/supabase/client.ts`) | Supabase session in the browser | course/pathway/ops roles in Drizzle migrations; no Adapt tenant concept |
| Adapt app | `students` row; username/email + Argon2id or guest | httpOnly `adapt_session` cookie + `adapt_csrf`, 12 h TTL, revoke on logout/delete | **none** in the integration route; any `institution_id` sent is ignored |
| Integration route | opaque `learner.id` string supplied by the caller | none | none |

There is **no identity federation**. A Supabase user id is not validated as an Adapt
student id. The endpoint is a pure function of the request body. If a real deployment needs
institution scoping, that is a new contract — not something the current UI implies.

## 5. Data exchanged and consent

Adapt receives only what the caller sends: the learner id, activity events and the caller's
own content. It stores none of it on this route. On the stateful Adapt app routes the learner
chooses `consent_analytics` (default **off** at sign-up in the smoke test) and
`consent_share_with_llm`; the integration caller is responsible for obtaining whatever
consent covers sending activity to Adapt, and for minimising the activity fields. Because
the reference caller is test-only and never shipped, **no learner data is currently
transferred between the two products**.

The privacy boundary (`backend/src/adapt/security/secrecy.py`) removes provider, model and
quota metadata from public payloads. That is why `GET /api/v1/status` for a signed-in
learner returns no `llm` key: the release gate verifies "no key configured" through the
published sentence `lessons.state = "simple mode"` instead.

## 6. Credits, billing and the engine console

**Credits are not enforced outside the UI.** `GET /api/openapi.json` on the running app
exposes 138 paths and **0** credit/balance/debit/ledger paths. The engine console
(`frontend/src/app/engine/page.tsx`) stores sample plans, prices, `18,420 credits
remaining`, `6,580 adapted actions`, `347 active learners` and an example ledger in
browser `localStorage`. It is a **presentation prototype**.

Release-gate corrections now on this branch:

* top bar: `Prototype · not wired to Genlink`;
* health rail: `Prototype console · values are samples`;
* flow label: `contract route exists · Genlink not wired`;
* a visible `SAMPLE FIGURES FOR PRESENTATION — not live usage, not pilot data, not
  learner data` line above the stats;
* `Sample credits remaining`, `Sample adapted actions`, `Sample active learners`;
* fallback rule pill changed from `ENABLED` to `PROPOSED ONLY`, with text saying the
  backend does not debit credits;
* `Export usage` is disabled and labelled `(prototype)`;
* footer: sample values stored in this browser only, no billing or credit enforcement
  backend.

`release/e2e_smoke.py --web` fetches the built `/engine` page and asserts the sample and
no-live-connection labels are present. An "exhausted Adapt Credits" case is therefore
**not testable**: there is no ledger to exhaust. It remains a product blocker, not a
simulated test.

## 7. Failure and recovery behaviour measured

| Failure | Behaviour | Evidence |
| --- | --- | --- |
| Concurrent learners | 20 learners × 5 = 100 stateless requests, all 200, 191.04 req/s, p50 99.42 ms, p95 116.31 ms | `release/evidence/stress-2026-10-23.json` |
| Duplicate submissions | 50 identical → one plan, 50 distinct response ids | same |
| Interrupted connection mid-response | caller catches `IncompleteRead`, serves labelled standard content | `integration/test_reference_client.py` |
| Adapt unavailable / model unavailable / retry storm | 3 bounded attempts, stable idempotency key, labelled fallback | same + stress scenario |
| Server restart / stale session | stateful `/me` 401 when forced stale; stateless integration still 200 | stress scenario |
| DB locked/busy | stateless integration 200 in 7.83 ms during a 2 s exclusive lock; stateful write waits 1.68 s then succeeds | stress scenario |
| Rate limit | multiplier clamps at 0.05; 40 requests → 11×200, 29×429 with `retry-after: 10` | stress scenario |
| Concurrent AI-capable route, no key | 16 calls → 12×200, 4×429 in 226.62 ms; `/healthz` still 200 | stress scenario |
| Provider outage diagnostic | 16 calls with providers enabled → 12×200, 4×429 in 228.99 ms; API stayed responsive | opt-in stress diagnostic (FINDING, not a pass) |

### The concurrency deadlock that was fixed

Before this branch, 12 simultaneous `POST /api/v1/explain` calls answered in 206 ms but
**15** simultaneous calls all hung past a 6 s client timeout and `GET /healthz` then timed
out too: the single-worker API was wedged. Cause: file SQLite used SQLAlchemy's default
`QueuePool` (5 connections + 10 overflow); request ~16 blocked on a pool checkout while
the event loop was waiting on those same requests. Minimal fix in
`backend/src/adapt/db/engine.py`: an explicit bounded pool
(`pool_size=20, max_overflow=20, pool_timeout=5, pool_pre_ping=True`) for **file**
databases, guarded so in-memory databases keep `SingletonThreadPool`. After the fix the
same probe served 16/24/32 concurrent calls in 269/393/543 ms with `/healthz` 200.
Pinned by `backend/tests/test_release_concurrency_pool.py` and the live stress scenario.
Full before/after numbers: `release/evidence/concurrency-deadlock-before-fix.json`.

## 8. What is explicitly not claimed

* No live Genlink→Adapt traffic. No shipped caller.
* No real AI model key was used, and no live model quality claim is made.
* No browser E2E run in this sandbox: Chromium download from `cdn.playwright.dev` is
  blocked. CI attempts it and records `BLOCKED`, never a fake pass.
* No pilot or production learner data. All learner ids in evidence are scratch guests.
* No credit enforcement, no institution dashboard, no password reset, no teacher
  dashboard, no spaced-review notification.
* Loopback measurements on one sandbox machine are **not** capacity guarantees.
