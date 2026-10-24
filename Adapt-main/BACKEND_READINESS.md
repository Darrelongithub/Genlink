# Backend readiness: what is implemented, what is presentation, what blocks production

This note answers one question for one audience: **if an institution bought this
tomorrow, what would actually happen?** It is written from the code and the test run, not
from the pitch. Where something is not built, it says so and names the migration that
would build it.

Scope of the audit: `backend/` (FastAPI application, SQLAlchemy models, Alembic
migrations, the adaptive-learning services, model routing, the integration door) and the
backend-facing API contracts. The Next.js frontend was read for what it *claims* and not
redesigned.

---

## 1. Architecture as it is

```
                     ┌──────────────────────────── browser ─────────────────────────────┐
                     │  Next.js app  ── /api, /ws proxied ──┐                           │
                     └─────────────────────────────────────┼───────────────────────────┘
                                                           ▼
  FastAPI (api/app.py)
    SecurityHeadersMiddleware → ConfigurationSecrecyMiddleware (redacts provider/secret
                                 keys and learner text from every response and log line)
    TrustedHostMiddleware → LimitsMiddleware (body cap, per-IP bucket, in-flight guard)
    routers: auth, learning, lessons, lesson, content, content/prepare, credits/admin,
             adaptations, journey, lesson_plan, subjects, check_in, curriculum, tests,
             study, tutor, baseline, evidence, integration, system, /ws/voice
                                                           │
        ┌──────────────────────────────────────────────────┼─────────────────────────┐
        ▼                          ▼                       ▼                         ▼
  Session auth              AI 1 (Learning            AI 2 (Educational        Learner State Store
  (opaque token,             Intelligence):           Intelligence):           (state_evidence →
   SHA-256 stored,           BKT, evidence,            tutor, hints, items,     immutable model_versions
   Argon2id passwords,       hypotheses, proposals     lessons, scenes,         → plans → deliveries)
   CSRF, rate limits)                                  resources, voice
        │                          │                       │                         │
        └──────────────────────────┴───────────┬───────────┴─────────────────────────┘
                                               ▼
                       SQLite (SQLCipher or field-level AES-256-GCM)
                       single writer, WAL, foreign_keys=ON, busy_timeout=5s
                                               │
                       ┌───────────────────────┴──────────────────────┐
                       ▼                                              ▼
             model provider (optional)                      Adapt Credits (new)
             gemini via httpx, routed by tier               institutions → plans →
             consent-gated, redacted, budgeted              wallets + append-only ledger
```

Two AI roles share a database and **no channel**. Persistent changes to how a learner is
taught require a recorded learner decision (`approved_adaptations`), enforced in
`services/adaptations.py`.

Everything external is optional: with no model key the tutor, the analysis and the scene
author fall back to deterministic local implementations and the app keeps teaching.

---

## 2. Tenancy: the honest position

**Before this change, institutions did not exist in the data model at all.** There was no
`institutions` table, no tenant column on any learner table, and no query filtered by
tenant — because there was nothing to filter by. The engine console presented plan names,
pool sizes and per-learner allowances as if they were configured; the backend had no
concept of a plan, a pool or an allowance. That is now partly untrue, and the part that is
still true is stated below rather than implied.

### What exists now (revision `R10`)

| Table | What it is |
|---|---|
| `institutions` | id, name, unique slug, status (`active`/`suspended`/`closed`), operator reference |
| `institution_memberships` | learner ↔ institution, role, status, optional per-learner cap. **Partial unique index: at most one *active* membership per learner**; revoked rows are kept as history |
| `credit_plans` | Configurable terms: included credits, period, action→credit map, per-learner cap, `allow_negative`, optional currency + integer minor-unit price |
| `credit_wallets` | One per institution. `balance` is an integer and is a denormalised sum of the ledger |
| `credit_ledger` | Append-only. Signed integer `delta`, `balance_after`, unique `(institution_id, idempotency_key)`, at most one refund per debit |

### What is isolated, and what is not

**Isolated by institution today** — the credit and administration plane:

* every wallet, ledger row, usage report and membership is scoped by `institution_id`,
  and the institution is resolved from the authenticated learner's membership, never from
  the request body;
* a learner's `/api/v1/credits/me` filters the ledger by **both** institution and their own
  `student_id`, so one learner cannot see a colleague's consumption even inside the same
  institution (`test_a_learner_sees_their_own_institution_and_no_other`);
* every admin route requires operator authority and an institution id; usage/ledger for
  institution B never contains institution A's rows
  (`test_usage_reports_are_scoped_to_one_institution`);
* a learner already in one institution cannot be silently moved into another
  (`test_a_second_membership_is_refused_rather_than_silently_moved`).

**Not isolated by institution** — the learning data plane. No learner-owned table
(`attempts`, `learning_sessions`, `learner_events`, `state_evidence`, `model_versions`,
`chat_messages`, `study_items`, `lesson_runs`, `baseline_runs`, `lesson_plans`,
`deliveries`, `session_states`, `evidence`, `hypotheses`, `adaptation_proposals`, …) has an
`institution_id`. Every one of them is scoped by the authenticated `student_id` only.

The consequence, stated plainly: **there is no cross-institution leak through the learning
plane, because the tenant axis does not exist there — and equally, an institution
administrator cannot report on their own learners' progress at all.** The credit plane is
multi-tenant; the learning plane is single-tenant with per-learner ownership. Do not
describe the product as multi-tenant without the migration in §6.

### Every query that could cross an institution boundary

Audited by reading every route and service that takes an id from the request. The
inventory, including the ones that are currently fine:

1. **Learner-owned reads/writes** — all resolve the student from the session cookie or
   bearer token and compare `row.student_id != student.id` before returning
   (`learning.py` sessions/events/attempts, `lessons.py` runs, `baseline.py` runs,
   `study.py` items, `curriculum.py`/`subjects.py` learner subjects, `evidence.py` loops,
   `services/attempts.py`, `services/telemetry.py`). Failures answer **404**, not 403, so
   the existence of another learner's row is not disclosed.
2. **`GET /api/v1/content/prepare/{job_id}`** — a job row is cache-addressed, not
   learner-owned, so any signed-in learner can read another's job *status* (`state`,
   `pack_source`). No topic text, no learner text, no answers. **Low**; fixing it needs an
   owner column on `content_prepare_jobs` (not done, deliberately: a column with no
   backfill would be a false boundary).
3. **`GET /api/v1/items/{item_id}/reveal`** — reveals the answer key of any item before an
   attempt. Documented in the route as a deliberate self-service read. It is not a
   cross-learner leak (items are curriculum), but it is an assessment-integrity hole.
   **Medium, accepted for the demo, listed in §6.**
4. **Global curriculum and caches** — `courses`, `topics`, `items`,
   `learning_materials`, `content_packs`, `narration_cache`, `scan_cache`, `http_cache`,
   `bkt_params`, built-in `lesson_scenes`. Shared by design; they carry no learner data
   except `content_packs.payload`, which can be generated *for* a learner. That is a
   **tenant-isolation gap to close in the migration** (a generated explanation derived from
   one learner's evidence should not be served to another).
5. **Operator views** — `services.quotas()` and `/api/v1/admin/.../usage` aggregate across
   the deployment. Both are behind operator authority; provider token totals are
   deployment-wide and labelled as such.

---

## 3. Adapt Credit semantics (what the numbers mean)

### Two separate meters

| | Adapt Credits | Upstream tokens |
|---|---|---|
| Unit | integer credits, priced by a plan | provider prompt/candidate tokens |
| Stored in | `credit_ledger` | `llm_calls` |
| Audience | what the institution bought | the operator's cost diagnostic |
| Conversion | **none** | **none** |

No code converts one into the other. `institution_usage` reports them in separate objects
(`credits`, `upstream_metering`). `estimate_tokens` is used to *reserve* budget against
the provider's daily ceiling, never to price a learner action.

### Rules

* **A charge is a reservation, then a settlement.** `credits.charge(action=…)` debits
  before the provider call and refunds if the block raises, or if the caller says the
  action was not billable. A local (deterministic) answer is **not billable** — the learner
  is not charged for their own material — which is why `/explain`, `/practice` and
  `/lessons/author` each set `not_billable(...)` when the provider did not produce the
  answer. Tested: `test_a_reservation_is_refunded_when_the_provider_never_answered`.
* **Atomic debit.** One conditional statement:
  `UPDATE credit_wallets SET balance = balance - :units WHERE id = :id AND balance >= :units`.
  The loser of a race updates zero rows and is refused. Tested with two threads:
  `test_two_simultaneous_charges_cannot_overspend` (balance 10, two charges of 8, exactly
  one succeeds, final balance 2, one ledger row).
* **No negative balance** unless `credit_plans.allow_negative` is true (copied to the
  wallet when the plan is assigned, so a later plan edit cannot flip it). Tested both ways:
  `test_a_negative_balance_is_only_possible_when_the_plan_allows_it`.
* **Idempotency.** `(institution_id, idempotency_key)` is unique. Nodes: debits derive a
  key from the client `Idempotency-Key` header when sent; operator grants **require** the
  header. A replay returns the original row; a lost race is caught and re-read. Tested:
  `test_one_idempotency_key_is_one_charge`, `test_granting_credits_requires_an_idempotency_key_and_is_idempotent`.
* **Refunds are entries.** A refund is a new row with `reverses_entry_id` pointing at the
  debit, and the partial unique index allows **one refund per debit**, so compensation
  cannot double-apply. Tested: `test_a_refund_is_written_once_even_when_asked_for_twice`.
* **Append-only ledger.** SQLAlchemy `before_update`/`before_delete` listeners raise;
  corrections are new rows. Tested: `test_the_ledger_is_append_only`.
* **Per-learner limits** are checked *after* the wallet write lock is taken, inside the
  same transaction, so two concurrent charges for one learner cannot both see the last
  slot. Tested: `test_a_learner_limit_is_enforced_under_the_same_lock`.
* **Exhaustion is a mode, not an error page.** `402` with
  `mode: "standard"` and `fallback.available` naming the reads that stay open. Tested by
  exercising them: `test_an_empty_wallet_stops_generation_and_says_what_still_works`
  (lessons list, study notes and `/credits/me` all still answer).
* **Balance = ledger.** `usage().reconciled` compares the wallet to the sum of the ledger;
  the test suite asserts equality after a mixed debit/refund/grant run.
* **Integers only.** Plan parsing rejects floats and booleans; the debit rejects a
  non-integer; the column type is asserted in SQLite (`typeof` = `integer`).

### What is deliberately absent

**No payment processing.** There is no card, invoice, bank, tax or refund-to-customer
path. Credits enter a wallet only when an operator calls the admin grant endpoint (or a
plan's included credits are granted on assignment). Where the money came from is outside
this system, and the ledger will still be right when a payments system is added in front
of it.

### Pricing configuration

Plan terms live in `backend/config/credit_plans.example.json` and are seeded **once**
(a slug that already exists is never overwritten, so an operator's edited terms survive a
restart). The shipped file has **no currency and no price** — the columns are nullable and
the example leaves them empty, because typing someone's commercial terms for them is how a
codebase starts asserting a price it cannot back up. KSh amounts exist nowhere in
`adapt/credits/`, and nowhere in the adaptive-learning code.

---

## 4. Findings by severity

### Fixed in this change

| # | Severity | Finding | Fix | Regression test |
|---|---|---|---|---|
| 1 | **High** | The product presented institution plans, pools and per-learner allowances; the backend had no institution, plan, wallet or ledger at all. Any claim of billing or metering was unbacked. | `credits/` package + revision `R10` + admin plane + enforcement around three AI routes | `tests/test_credits_and_tenancy.py` (33 tests) |
| 2 | **High** | `POST /api/v1/integration/adapt` was **open** when `ADAPT_INTEGRATION_TOKEN` was unset and the demo passphrase was unset — including on a public tunnel, where it is a free compute oracle. | A world-reachable door now fails closed; LAN behaviour unchanged | `test_the_integration_door_is_closed_on_a_public_tunnel_without_a_token` |
| 3 | **Medium** | The CSRF token was accepted from `?csrf=` on **every** mutating route, so it could reach access logs and `Referer` headers. | Query token accepted only on the telemetry append route (`sendBeacon` cannot set a header); header required everywhere else | `test_csrf_in_the_query_string_is_only_accepted_on_the_telemetry_beacon` |
| 4 | **Medium** | `students.role` was written by the CLI and **read by nobody**: any signed-in learner reached shared-state mutations in `mode=local`. | `require_operator` (operator token *or* role), applied to the whole admin plane; CSRF still required when the credential is a cookie | `test_a_learner_cannot_reach_the_institution_admin_plane`, `test_an_operator_role_is_enough_and_cookie_auth_still_needs_csrf` |
| 5 | **Medium** | Login leaked account existence by timing: an unknown username returned before any Argon2 work. | `auth.dummy_password_verify` pays the same cost | `test_an_unknown_username_costs_the_same_work_as_a_wrong_password` |
| 6 | **Medium** | `POST /api/v1/voice/speak` accepted `dict[str, Any]` — any JSON object of any shape, truncated only after parsing. | Typed `SpeakBody` (`text` ≤ 2000 chars, `gender` bounded) | `test_the_speech_route_has_a_bounded_body` |
| 7 | **Low** | `docs/EFFICIENCY.md` did not exist, so the suite's own "the docs carry the code's table" test failed. | Generated from `static_context`/`routing` tables | `tests/test_ai_efficiency.py::test_the_docs_carry_the_same_table_the_code_does` |
| 8 | **Medium** | `[tool.setuptools.packages.find]` collects only directories that have an `__init__.py`, so a built wheel silently omitted `adapt.ai`, `adapt.assessment`, `adapt.resources`, `adapt.voice` and `adapt.credits`. An editable install (what the tests run on) hides this: the first `install` from a wheel would fail at import, and it would fail on the AI layer that the whole product depends on. | Added the missing `__init__.py` files (no behaviour change) | `test_every_backend_package_lands_in_a_built_wheel` |
| 9 | **High** | The browser routes that create a session (`/login`, `/students`, `/demo/session`) did not check `Origin`. `SameSite=Lax` does not protect a route that *mints* a cookie: a cross-site form could sign a victim into an attacker-controlled account, making the victim's later records readable to the attacker (login CSRF/session confusion). The existing `origin_ok` helper was wired to no route. | Added a same-origin dependency to all three session-minting routes and origin defence in depth beside CSRF on every authenticated mutation; CLI/native callers without `Origin` remain supported | `test_a_cross_site_login_does_not_get_a_session_cookie`, `test_the_apps_own_origin_is_still_accepted`, `test_a_missing_origin_is_not_treated_as_a_browser`, `test_a_learner_cannot_be_tricked_into_a_state_change_from_another_site` |

### Found and accepted (documented, not fixed)

| # | Severity | Finding | Why it is not fixed here |
|---|---|---|---|
| 10 | **Medium** | `GET /items/{id}/reveal` returns an answer key before an attempt | Deliberate self-service read, documented in the route; closing it changes learner-facing behaviour and needs a product decision (partial reveal, teacher approval) |
| 11 | **Low** | Any signed-in learner can read another's content-prepare *job status* (`state`, `pack_source`; no learner or topic text) | Needs an owner column with a real backfill; a nullable column with no semantics would be a false boundary |
| 12 | **Low** | Shared-state mutations (`POST /learning/train`, `POST /numbas/import`) are gated on tunnel + passphrase, not on `role` | `mode=local` is defined as "the operator is at the terminal"; changing it alters the documented local workflow. The new admin plane does use `role`/token. |
| 13 | **Low** | Session rows are never garbage-collected automatically (`auth.purge_expired` exists, is called by the CLI) | Bounded by TTL and low volume; a scheduled job belongs to the deployment, not the app |
| 14 | **Low** | Rate limiting and the model daily budget are **per process**. N workers ⇒ N× the configured budget | A shared store (Redis) is a deployment decision; documented here so nobody assumes a global ceiling |

### Verified sound (no change needed)

* **Object-level authorization** — every learner-scoped route resolves the student from the
  credential, compares owner ids and answers 404 on mismatch (sessions, events, attempts,
  lesson runs, baseline runs, study items, subject rounds, evidence loops, learner subjects,
  curriculum guidelines, websocket sessions).
* **Session creation/revocation** — opaque 32-byte tokens stored only as SHA-256; Argon2id
  passwords above the OWASP floor; `Secure` when TLS, `HttpOnly`, `SameSite=Lax`; expiry
  enforced on read and revoked immediately on logout (`revoke` commits before the response);
  logout also revokes the row, not just the cookie.
* **Brute force** — per-account *and* per-IP failure buckets; a successful sign-in spends
  nothing; while a bucket is empty the password is not read.
* **Guest behaviour** — guests are real learner rows with no identifier; a passphrase is
  required to mint one on a tunnel; creation is rate-limited per connection.
* **Duplicate billing in the model client** — the budget guard reserves once per call and
  settles once (provider 429 settles to zero; 5xx retries reuse the reservation; a fallback
  model releases before re-reserving). Tokens come from `usageMetadata` when present.
* **Consent** — every learner-bound model call checks `consent_share_with_llm` immediately
  before the prompt is prepared, and fails closed when no checker is wired.
* **Redaction** — prompts, history and cache prefixes pass `security/redact`; `llm_calls`
  records counts, tier, latency and token totals, **never prompt or answer text**.
* **Malformed provider responses** — non-JSON bodies, blocked/empty candidates and
  non-conforming structured output are typed failures (`empty`, `blocked`, `parse_error`)
  that fall back locally rather than teaching nothing.
* **Encryption at rest** — SQLCipher when available, field-level AES-256-GCM otherwise;
  startup refuses to serve a database whose key cannot open sampled values.
* **Deletion/export** — export walks the ORM and strips credentials and lookup digests;
  soft delete immediately removes the learner from every read path and deactivates
  adaptations, with a CLI hard purge available.

---

## 5. API contract changes introduced here

New:

```
GET    /api/v1/credits/me                              learner's own usage, pool, prices
GET    /api/v1/credits/actions                          action catalogue (no prices)
GET    /api/v1/admin/plans                              operator
POST   /api/v1/admin/plans                              operator; strict integer validation
POST   /api/v1/admin/institutions                       operator
POST   /api/v1/admin/institutions/{id}/plan              operator
POST   /api/v1/admin/institutions/{id}/credits           operator; Idempotency-Key required
POST   /api/v1/admin/institutions/{id}/members           operator
DELETE /api/v1/admin/institutions/{id}/members/{sid}     operator
GET    /api/v1/admin/institutions/{id}/usage             operator
GET    /api/v1/admin/institutions/{id}/ledger            operator
```

Changed:

* `/api/v1/explain`, `/api/v1/practice`, `/api/v1/lessons/author` — responses gain
  `credits: {metered, action, credits, charged, refunded, balance_after, note}` and honour
  an optional `Idempotency-Key` request header. Existing fields are unchanged.
* `/api/v1/voice/speak` — typed body; a non-string `text` is now a 422 rather than being
  coerced.
* Credit refusals have **one** shape (`{error, message, …}` at the top level) with
  `402 / 429 / 409 / 422` used by meaning, and the 402 payload names the standard-mode
  routes.

---

## 6. Unresolved production blockers

Ordered by what would have to happen first.

1. **Full tenant isolation of the learning plane.** This is the one that stops a real
   institution deployment. It is not a one-liner, and pretending otherwise with a nullable
   column would be worse than the current state.
   * Add `institution_id` (nullable) to every learner-owned table, backfill from
     `institution_memberships`, then make it `NOT NULL` in a second revision once verified.
   * Route every read through a resolver (`tenant_of(request)`) and add composite indexes
     `(institution_id, student_id, …)`; add a test per route proving a learner in A cannot
     read a row in B *even if they know the id*.
   * Decide the fate of shared generated content (`content_packs`, `narration_cache`): key
     them by institution or prove they carry no learner-derived text.
   * Revisit export/delete: "this learner's data" must not cross an institution boundary.
   * Rough size: ~30 tables, ~20 route modules, one backfill migration, one enforcement
     layer. Do it with a copy of production data, not on a guess.
2. **Payments.** No provider integration, no invoices, no reconciliation. Credits are
   granted by hand today. When billing is added it must write *ledger grants* from a
   verified provider event (idempotency key = provider event id), never mutate a balance.
3. **Shared budgets across workers.** The rate limiter and the model daily budget are
   in-process. Any multi-worker or multi-host deployment multiplies them. Needs a shared
   counter store before scaling past one process.
4. **Operator identity.** `ADAPT_OPERATOR_TOKEN` is a single shared secret with no
   per-operator identity, rotation or expiry; audit rows record `operator:token` for
   token-authenticated calls. Per-operator credentials are required before more than one
   person can grant credits.
5. **Background work.** `content_prepare` runs on a thread pool inside the API process; a
   crash loses jobs (they are marked stale on read). A durable queue is required for
   unattended use.
6. **Database scale.** SQLite with a single writer is appropriate for a class or a small
   school. A district needs Postgres; the debit statement and the unique indexes are
   already portable (the only SQLite-specific parts of this change are partial indexes,
   which Postgres also supports).
7. **Assessment integrity.** `GET /items/{id}/reveal` before an attempt (finding 10). Also
   no proctoring or duplicate-timer detection: the app measures what a browser reports.
8. **Password lifecycle.** No self-service reset, no email verification, no 2FA; a lost
   password is reset by the operator. Acceptable for a pilot, not for a school roll-out.
9. **Adversarial model testing.** Prompt-injection defences are structural (redaction,
   fixed static heads, deterministic validators) and unit-tested; there is no fuzzed or
   red-team suite against a live provider.

---

## 7. What is implemented vs presentation-only

### Fully implemented (verified by the test suite)

* session auth, CSRF, rate limits, guest/credential flows, operator authority;
* per-learner ownership of every learner record, object-level authorization, 404 on
  mismatch;
* the adaptive loop (attempts → BKT → evidence → hypotheses → proposals → learner
  approval → delivery), with the Learner State Store's immutable model versions;
* institutions, plans, wallets, the append-only ledger, atomic debits, idempotent grants,
  refunds, per-learner caps, usage reporting, admin audit;
* exhaustion → standard mode, with the standard reads exercised in a test;
* model routing by tier, static-prefix caching, consent gating, redaction, fallbacks,
  token reconciliation, provider-outage behaviour;
* Alembic migrations on a fresh database **and** on an existing one, with learner data
  preserved (`R10` is additive only);
* export/delete, encryption at rest, key-check-at-startup.

### Presentation-only (do not sell as backend behaviour)

* `frontend/src/app/engine/page.tsx` — the engine console's plans, prices
  (`100_000`, `300_000`, `500_000`), pool sizes, per-learner allowance, credit rules and
  the "recent activity" table are **local component state**. They are examples that an
  operator can edit in the browser; nothing is persisted and nothing is enforced. The
  numbers do not match any database row and are not meant to. Real metering is the
  `/api/v1/credits/*` and `/api/v1/admin/*` surface described above.
* The console's "Credits remaining: 18,420" and "73.7% of Core allocation" are literals.
* Any statement that the product processes payments, issues invoices or refunds money.

### Partially implemented — say it this way

* "Institution-scoped credit metering and usage reporting" — true.
* "Multi-tenant learning data" — **false**; per-learner ownership only.
* "Institution administrator dashboard" — the usage/ledger endpoints exist; there is no
  roster-progress reporting, because the learning plane has no tenant axis.
* "Billable AI usage" — true for the three metered routes when the provider answers; a
  local answer is free by design.

---

## 8. Validation: exact commands and results

Environment: Python 3.11.2, `pip install -e ".[dev]"` into a clean venv,
`ADAPT_DB_ENCRYPTION=field-only`, `ADAPT_MODE=local` (set by `tests/conftest.py`).

```
$ cd backend && python -m pytest tests -q
1593 passed, 2 skipped in 232.83s          # before this change: 1559 passed, 1 failed, 2 skipped
```

(The single failure at baseline was `test_the_docs_carry_the_same_table_the_code_does`,
because `docs/EFFICIENCY.md` did not exist. It is finding 7 above; the file is now
generated from the code's own tables and the test passes.)

```
$ python -m pytest tests/test_credits_and_tenancy.py -q
33 passed

$ python -m pytest tests/test_migrations.py -q
10 passed          # fresh upgrade, alembic check, stamp+replay paths

$ python -m pytest tests/test_ai_efficiency.py -q
27 passed
```

Fresh database, empty directory:

```
$ ADAPT_DATA_DIR=/tmp/mig-fresh ADAPT_DB_ENCRYPTION=auto alembic -c alembic.ini upgrade head
INFO  [alembic.runtime.migration] Running upgrade R9 -> R10, Institutions, plans, wallets and the Adapt Credit ledger.
$ alembic -c alembic.ini current
R10 (head)
$ alembic -c alembic.ini check
No new upgrade operations detected.
```

Upgrade from an existing installation **with learner data**, at `R9`:

```
$ alembic -c alembic.ini upgrade R9
$ python -c "…insert a students row…"            # one learner row present before R10
$ alembic -c alembic.ini upgrade head
INFO  [alembic.runtime.migration] Running upgrade R9 -> R10, …
learners kept: 1
credit tables: ['credit_ledger', 'credit_plans', 'credit_wallets',
                'institution_memberships', 'institutions']
version: R10
```

Static analysis (scoped to the new modules; the repository as a whole has ~5,100
pre-existing `ruff` findings, mostly long lines, and is not lint-clean at baseline):

```
$ ruff check src/adapt/credits src/adapt/api/routes/credits.py \
              tests/test_credits_and_tenancy.py migrations/versions/R10_*.py
All checks passed!
$ mypy src/adapt/credits src/adapt/api/routes/credits.py --ignore-missing-imports
Success: no issues found in 4 source files
```

`mypy` over the *pre-existing* modules this change touches (`security/auth.py`,
`services/sessions.py`) still reports four findings, all on lines this change does not
modify (`compare_digest` argument type, two `Row`/`tuple` set memberships, a `Mapping`
passed where `dict` is expected). They are listed here rather than silenced. This
repository was not type-clean at baseline for those files and cleaning them up is not
part of a security fix.

---

## 9. Migration: rollback and recovery

* **`R10` is additive.** It creates five tables and touches nothing that existed. A failed
  upgrade rolls back with the revision marker (startup runs migrations inside
  `BEGIN IMMEDIATE`, so DDL and the marker move together).
* **Downgrade** (`alembic downgrade R9`) drops the five tables — which *is* the loss of the
  ledger. Before downgrading in any environment that has granted credits, stop the app and
  copy the database file (`ADAPT_DATA_DIR/adapt.db`) **and** its key file. A downgraded
  database has no credit history; re-upgrading gives you an empty wallet, not the old one.
* **Backup/restore** must move the SQLCipher file and the keyfile together. A field-only
  deployment (`ADAPT_DB_ENCRYPTION=field-only`) encrypts columns but not the file; the key
  file is still required to read them. Startup refuses to serve a database whose key cannot
  open sampled values, which is the intended failure mode for a mismatched restore.
* **Recovery from an unversioned database** (built by an old `create_all`): the documented
  path is unchanged — `alembic stamp 0002` then `upgrade head`, which replays every
  revision existentially. `R10` follows that rule like `0003`–`R9`.
* **Rolling back a credit mistake** is *not* a downgrade: write an `adjustment` grant (or a
  refund, via the service) and leave the history intact.

---

## 10. Where to look

| Concern | File |
|---|---|
| Institutions, plans, wallets, ledger models | `src/adapt/credits/models.py` |
| Atomic debit, refunds, grants, usage | `src/adapt/credits/service.py` |
| Plan configuration and its strict integer rules | `src/adapt/credits/plans.py`, `config/credit_plans.example.json` |
| Learner and admin HTTP surface | `src/adapt/api/routes/credits.py` |
| Operator authority, CSRF, idempotency keys | `src/adapt/api/deps.py` |
| Migration | `migrations/versions/R10_institutions_and_credits.py` |
| Tests for all of the above | `tests/test_credits_and_tenancy.py` |
