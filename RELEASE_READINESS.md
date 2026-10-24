# Release readiness — 2026-10-24

Branch `arena/3315ff42-genlink`, originally based on `d998955e883934bffe606f4cbb2a4c9b63d68a27`,
then merged with `main` at `aad6946b2198e4a08ce84f84777cd412ef5a9263`, again at
`8851869` (PR #4: backend institution credits, operator authority and cross-site session
protection), a third time at `1b3add9` (PRs #5/#6: production hosting, WCAG 2.2 AA
frontend, four browser suites, dependency patches and a rebuilt `/engine` console), and a
fourth time at `bca7d15` (PR #7: room joining, page-switch/overload collapse and root Genlink
+ top-level `adapt/` hardening). See the Layout note in `SYSTEM_ARCHITECTURE.md`. Everything
below was re-executed on this branch after the fourth merge. No AI credential was configured
or used. All load numbers are **single-machine loopback measurements**, not capacity
guarantees. Raw evidence: `release/evidence/*.json`; full logs: `release-artifacts/`
(ignored by Git). Evidence commit: `c63d101...` (fourth merge of `origin/main` at `bca7d15`
into the release branch, including the refreshed post-merge evidence). Final documentation
commit: `f42f1a7...`; final merge commit is reported in the task/PR.

## Decisions

| Target | Decision | Scope / condition |
| --- | --- | --- |
| **Demo Ready** | **YES — conditional** | A **local/offline, clearly labelled prototype demo** with scratch learner data only. The 3-minute HTTP demo walker, the rebuilt `/engine` prototype (now carrying its own strong "example / not live billing" labels), the real backend exhausted-credit case and a clean Adapt-frontend dependency audit all pass. Do **not** use real learner data or claim live integration: Genlink is still not wired (F-02), the console is not connected to the backend ledger (F-03), and the root Genlink lockfile still has 18 high / 9 moderate advisories (F-16). |
| **Pilot Ready** | **NO** | Requires the shipped Genlink caller, a real consent/data-sharing agreement, a written pilot protocol and dataset, a verified browser E2E run (4 suites attempted, all currently BLOCKED), wiring or explicitly scoping the engine console against the real credit ledger, an operator/institution onboarding process, and remediation of the root Genlink lockfile (F-16) plus setuptools (F-04). |
| **Production Ready** | **NO** | All pilot blockers plus F-04/F-16 dependency remediation, load testing beyond one machine (the latest post-merge loopback number was 97.57 req/s on this busy sandbox), institution/tenant scoping for the integration route, monitoring/rollback, secret-handling cleanup and reduction of the inherited lint/type debt. |

The three decisions are separate on purpose: a demo that is honest about being a
prototype is shippable today; a pilot that touches real learners is not.

## Severity-ranked findings

| ID | Sev | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| F-01 | S0 | Earlier `npm audit` (Adapt frontend) had **1 critical** Next.js advisory plus **2 high** (postcss, undici). | `release/evidence/dependency-audit.json` | **FIXED by `main` PR #5.** `next` 15.5.28 with `postcss 8.5.29` / `undici 8.12.2` overrides; re-audit on this branch reports **0 vulnerabilities**. No force-upgrade was done by this branch. |
| F-02 | S0 | **Genlink does not call Adapt.** The extracted Genlink source has no `integration/adapt`, `ADAPT_API` or Adapt route reference. Only a test-only reference caller exists. | `integration/`, host scan in `SYSTEM_ARCHITECTURE.md` | **OPEN — blocks pilot/production.** Contract is proven; connection is a product task. |
| F-03 | S1 | **Backend credit enforcement now exists; the rebuilt console is still not wired to it.** `main` added R10 institutions/wallets/ledger and an operator plane. An empty wallet returns 402 `credits_exhausted` with `mode=standard` while unmetered reads stay 200. The third `main` merge rebuilt `/engine` with explicit "No live institution or billing connected", "Example figures · not live telemetry" and "Sample rows · not real students" labels, but the numbers remain `localStorage` examples. | `release/evidence/e2e-smoke.json::exhausted_credits`, `SYSTEM_ARCHITECTURE.md` §6 | **Mitigated for demo** by the measured 402 case and the console's own labels. **OPEN for pilot/production:** wire the console to the real ledger (or keep it explicitly scoped) and define operator/institution onboarding. |
| F-04 | S1 | `pip-audit`: 4 unique advisories in `setuptools 66.1.1` (fix versions 70/78/83/84.1.0 reported). 76 packages scanned, 1 affected. | `release/evidence/dependency-audit.json` | **OPEN — report only.** No unpinned upgrade was applied. |
| F-05 | S1 | Browser E2E could not run in this sandbox: `npx playwright install --with-deps chromium` failed on unresolvable apt font packages (`fonts-wqy-zenhei`, `fonts-tlwg-loma-otf`, `fonts-freefont-ttf`). The gate now attempts **four** suites: `banned-phrases`, `demo-flow`, `engine-console`, `readiness-matrix`. | `release/browser_e2e.sh`, `release/evidence/browser-e2e.json`, CI job step | **BLOCKED, not passed.** CI records `BLOCKED`; a real browser failure still fails the script. |
| F-06 | S1 | After merging `main`'s security work, the post-login flake became deterministic: 12/12 immediate requests returned 401 after a 200 login. Cause: `db_session` commits after the endpoint returns, but `issue_login` sends the cookie in that response. | `release/e2e_smoke.py::run_login_cookie_immediate_use`, `Adapt-main/backend/tests/test_session_cookie_commit.py` | **FIXED.** `issue_login` now commits the session row before returning, in both backend layouts. Final 12/12 loop: 0 failures. |
| F-07 | S1 | An 8,388,609-byte body is refused by the server, but a client that sends the whole body before reading the response (urllib) sees a connection reset (transport status 0), not the 413. A raw socket that announces the size and sends 1 KB reads `HTTP/1.1 413`. Server stays healthy. | stress scenario `large_but_valid_payloads` | **OPEN — caller guidance.** Callers should cap bodies client-side / use `Expect: 100-continue`; the guard itself works. |
| F-08 | S1 | The Genlink archive **did** ship a `.env` with `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` (browser-public by design; no service-role/private key found). Main has since **deleted that archive** and extracted the source; the tracked `.env.example` now contains only a placeholder. | `release/evidence/secret-scan.json` (key names + fingerprints only, **no values**) | **MITIGATED by the merge.** Still verify that no future distributable ZIP re-adds a real `.env`, and rotate the publishable key if the old archive already circulated. |
| F-09 | S2 | 9 README-linked documents under `Adapt-main/docs/` do not exist (`DEMO`, `PILOT`, `AUDIT`, `UNVERIFIED`, `BUGS`, `ENGINE`, `INTEGRATION`, `EVIDENCE`, `VOICE`, `ACCESSIBILITY`). | README → Documentation status | **Mitigated.** README now carries an explicit status table instead of implying the docs exist. `EFFICIENCY.md` is generated from code so its test passes. |
| F-10 | S2 | `scripts/demo.mjs` crashed at the end of an otherwise successful run reading `methods.labels.unit`; `/api/v1/methods/report` no longer returns a `labels` object. | e2e `--demo-script` check | **FIXED.** Optional-chained fallback to the report's own `note`; walker exits 0. |
| F-11 | S2 | Reference-caller retry-storm test asserted an exact count of handler hits (24). Under a 12-thread burst the fake `ThreadingHTTPServer` can refuse a connection before `do_POST`, making the exact count flaky. | `integration/test_reference_client.py` | **FIXED.** Now asserts the real invariant: every result used exactly 2 attempts, handler hits ≤ 24 and ≥ 12. 5 consecutive reruns passed. |
| F-12 | S2 | `ADAPT_RATE_LIMIT_MULTIPLIER` below 0.05 is silently clamped; the first stress run expected 0.01 to produce ~10 429s and saw 1. `Retry-After` is sent lowercase, so a case-exact header check missed it. | stress scenario `rate_limit_responses` | **FIXED in harness.** Uses 0.05 and case-insensitive header lookup; 40 requests → 11×200, 29×429, `retry-after: 10`. |
| F-13 | S3 | Inherited code-quality debt: **5,108** Ruff findings and **217** mypy errors in the backend baseline. | `release/lint_changed.py`, CI baseline step | **OPEN — reported, not hidden.** CI fails only for findings on lines this branch adds: after the fourth merge, 24 changed Python files, 79 inherited findings in those files, **0 on added lines**. |
| F-14 | S3 | `/api/v1/status` is a signed-in route and its `llm` key is removed by the privacy boundary; the first stress run wrongly treated that as "no key evidence". | stress scenario `backend_startup_and_no_ai_credential` | **FIXED in harness.** Authenticates, then checks redaction + published `lessons.state = simple mode`. |
| F-15 | S3 | No live model, voice audio, real phone, real tunnel or Numbas-live verification was possible/attempted here. | `RELEASE_CHECKLIST.md` | **OPEN — explicitly unverified**, not simulated as live usage. |
| F-16 | S1 | Root Genlink `package-lock.json` audit reports **27 vulnerabilities**: 18 high, 9 moderate, 0 critical (transitive `react-router`, `postcss`, `rollup`, `js-yaml`, `lodash`, `minimatch`, etc.). This lockfile was only added on `main` and was not covered by the earlier single-frontend audit. | `release/evidence/dependency-audit.json::npm_genlink_root` | **OPEN — report only.** No `--force`/unpinned upgrade was applied. Must be triaged before distributing the extracted Genlink app. |
| F-17 | S2 | Integration route still ignores `institution_id` and does not debit the new wallets; credit enforcement applies to stateful Adapt generation, not to the stateless Genlink contract. | `SYSTEM_ARCHITECTURE.md` §3–4, backend contract tests | **OPEN — new contract needed** if institution-scoped integration traffic is a pilot requirement. |
| F-18 | S2 | One full-suite run failed `test_typed_topic_flows_from_prepare_through_all_three_lesson_moments`: an async lesson-upgrade job reported `state=fallback` instead of `ready`. The same test passed 5/5 in isolation and the next full-suite rerun passed 1617/1617. Cause not proven; credit enforcement and the new session commit both touch the shared test services. | `release-artifacts/backend-pytest-final.log` vs `backend-pytest-final-rerun.log` | **FLAKY — observed once, not hidden.** Full gate rerun is green; keep the test and watch for recurrence under load. |
| F-19 | S2 | First CI run after the third merge failed the `Backend pytest` job with exit 1, but the log upload reported `No files were found with the provided path: release-artifacts/backend-pytest.log`. Cause: the backend job piped pytest through `tee` into a directory it had not created, so `set -o pipefail` turned the missing parent directory into a job failure — **not a backend test failure**. | GH Actions run `40060477554`, job `120772677039` annotations | **FIXED in workflow.** `mkdir -p ../../release-artifacts` added before the suite; the rerun produced the log artifact. |
| F-20 | S2 | A clean-venv CI-like run exposed a genuinely flaky assertion in `tests/test_content_engine.py::TestContentRoute::test_two_learners_do_not_share_an_answer_key_by_position`: it demanded two independent 4-option shuffles differ, which fails ~1/24 of the time. This is why the second CI backend job still failed after F-19 was fixed. | `/tmp/ci-clean-pytest.log` (clean venv, 1 failed / 1644 passed); 5 isolated reruns after fix green | **FIXED in test.** Sample 8 learners and assert >1 distinct order (collision probability (1/24)^7) while the option set stays identical. |
| F-21 | S2 | GitHub Actions forces ANSI colour on Rich/Typer help even when stdout is a pipe, so `test_hosting.py` assertions on `--port` / `--tunnel` inside `adapt host --help` failed in CI while passing locally. The command output was correct; the substring search was not colour-safe. | GH Actions run `40063307920` annotations | **FIXED in test.** Strip CSI sequences before asserting; 25/25 hosting tests pass with and without `FORCE_COLOR=1`. |

### Fixed during this gate (with regression tests)

| Fix | Minimal change | Regression test |
| --- | --- | --- |
| SQLite pool deadlock wedged the whole API at ~15 concurrent requests | `backend/src/adapt/db/engine.py`: explicit bounded pool for file DBs, `is_file` guard for memory DBs; SQLCipher branch included | `backend/tests/test_release_concurrency_pool.py` + live 16-way stress scenario; before/after in `release/evidence/concurrency-deadlock-before-fix.json` |
| Post-login 401 on an immediately following request (F-06) | `issue_login` commits the `auth_sessions` row before returning the `Set-Cookie`, in both `Adapt-main/backend` and `adapt/backend` | `backend/tests/test_session_cookie_commit.py` reads the row from a separate connection; live 12× immediate-use loop reports 0 failures |
| Exhausted-credit case was untestable | Harness now creates priced actions, plan, institution, wallet and membership with an operator token, then asserts 402 + standard fallback | `release/e2e_smoke.py::run_exhausted_credits`; backend `test_credits_and_tenancy.py::test_an_empty_wallet_stops_generation_and_says_what_still_works` |
| Interrupted response crashed the reference caller with `IncompleteRead` | `integration/reference_client.py`: catch `http.client.IncompleteRead`/`HTTPException` | `integration/test_reference_client.py::test_connection_interrupted_mid_response_falls_back` |
| Missing `docs/EFFICIENCY.md` failed the full backend suite | `Adapt-main/scripts/write_efficiency_doc.py` regenerates the doc from routing/rate-limit tables; no AI key | `backend/tests/test_ai_efficiency.py` (full suite green) |
| Demo walker contract drift (F-10) | `scripts/demo.mjs` fallback | `release/e2e_smoke.py --demo-script` |
| Engine console implied live billing/metering | earlier branch copy/labels were superseded by `main` PR #5's rebuilt console, which ships its own "example / not live billing / no live institution connected" labels; this branch took main's version on merge | `release/e2e_smoke.py --web` asserts sample + no-live-connection labels; new `npm run test:e2e:engine` exists but is BLOCKED until Chromium is available |
| Critical/high Adapt-frontend npm advisories (F-01) | `main` PR #5 upgraded `next` to 15.5.28 and pinned `postcss`/`undici` overrides; this branch re-audited after merging | `release/evidence/dependency-audit.json` now reports 0 Adapt-frontend vulnerabilities |
| CI backend job failed on a missing log directory (F-19) | `.github/workflows/release-gate.yml`: `mkdir -p ../../release-artifacts` before `pytest \| tee` | fresh CI run after the fix; the suite itself already passes 1645/2 locally |
| Flaky two-learner shuffle assertion (F-20) | `tests/test_content_engine.py`: sample 8 learners, assert >1 distinct permutation instead of requiring 2 to differ | 5 isolated reruns green; clean-venv full-suite rerun recorded below |
| Colour-sensitive CLI help assertions (F-21) | `tests/test_hosting.py`: `_plain()` strips ANSI CSI codes before checking `--port` / `--tunnel` / `already in use` | 25/25 hosting tests pass with `FORCE_COLOR=1` and without |

## Test matrix — exact commands and outcomes

All commands run from `/home/user/Genlink` unless stated. Python is the repository
`.venv` (Python 3.11.2); Node v22.22.3, npm 10.9.8.

| Gate | Command | Outcome |
| --- | --- | --- |
| Reproducible install | `python3 -m venv .venv && .venv/bin/python -m pip install -e "./Adapt-main/backend[dev]"`; `cd Adapt-main/frontend && npm ci --no-audit --no-fund` | exit 0; FastAPI 0.162.0, pytest 9.1.1, SQLAlchemy 2.1.6; 92 npm packages on the post-fourth-merge reinstall |
| Frontend lint/type/route contract | `cd Adapt-main/frontend && npm run lint` | exit 0; 146 backend routes vs 138 frontend calls, tsc clean |
| Frontend unit tests | `npm run test:lib && npm run test:engine && npm run test:server && npm run test:env && npm run test:dev` | 61/15/2/2 + dev suite pass, exit 0 |
| Frontend production build | `npm run build` | exit 0; 22 static pages generated, `.next/BUILD_ID` present |
| Full backend suite | `cd Adapt-main/backend && /home/user/Genlink/.venv/bin/python -m pytest -q` | **1645 passed, 2 skipped** in 388.38 s, exit 0 on the post-fourth-merge tree. Earlier: 1645/2 in 401.72 s after the ANSI fix; 1645/2 in 238.78 s after the third merge; clean-venv CI-like run exposed F-20 (1 failed / 1644 passed), fixed; fresh clone + venv run 1645/2 in 236.11 s; CI exposed F-21 (ANSI-coloured help), fixed. One pre-third-merge run had 1 flaky async-job failure (F-18); isolated 5/5 and reruns green. |
| Credit + contract + concurrency targeted | `pytest -q tests/test_session_cookie_commit.py tests/test_credits_and_tenancy.py tests/test_integration_release_contract.py` | 55 passed in 3.86 s |
| Reference caller | `python3 -m unittest discover -s integration -p 'test_*.py'` | **17/17**; measured 64 concurrent caller adaptations in 455 ms (fake server, in-process) on the post-fourth-merge rerun |
| Diff-aware lint | `.venv/bin/python release/lint_changed.py --base origin/main --out release/evidence/lint-changed.json` | PASS; 24 changed Python files, 79 inherited Ruff findings in those files, 0 on added lines |
| Second backend layout | `.venv/bin/python release/check_second_layout.py --src adapt/backend/src` | PASS; `QueuePool(size=12, max_overflow=24, timeout=30, pre_ping=False)`, total capacity 36, in an isolated process (main PR #7's values) |
| Secret scan | `.venv/bin/python release/secret_scan.py --out release/evidence/secret-scan.json` | PASS; 1352 tracked files + 0 archive members; 0 high; 5 informational |
| Browser host scan | `.venv/bin/python release/host_scan.py --out release/evidence/host-scan.json` | PASS; 187 Adapt + 179 Genlink browser files, 0 loopback calls, 2 informational allowlist regexes |
| Stress/failure harness | `.venv/bin/python release/stress_check.py --include-provider-outage --out release/evidence/stress-2026-10-23.json` | **PASS**; 10 scenarios, 31 checks, 0 failures, 1 diagnostic FINDING |
| Migration smoke | `.venv/bin/python release/migration_smoke.py --out release/evidence/migration-smoke.json` | PASS 4/4; legacy Alembic `0002 → R10 (head R10)`; fresh and migrated DBs both boot and accept a learner |
| E2E smoke + demo + web + credits | `.venv/bin/python release/e2e_smoke.py --web --demo-script --out release/evidence/e2e-smoke.json` | **PASS**; 9 checks, 0 failed; 25 HTTP steps; `scripts/demo.mjs` exit 0; `/engine` 200 with honesty labels |
| Dependency audit | `npm audit --json` (Adapt frontend); `npm audit --json --package-lock-only` (root); `pip-audit --format json`; `.venv/bin/python release/audit_summary.py --npm ... --npm-root ... --pip ...` | report only; **Adapt npm 0 vulnerabilities** (F-01 fixed on main), root Genlink npm 18 high/9 moderate (F-16), pip 4 unique advisories (F-04); **no dependency was changed by this branch** |
| Browser E2E | `bash release/browser_e2e.sh` | **BLOCKED** in this sandbox (Chromium apt font packages unresolvable). Four suites are attempted; CI records `BLOCKED`; a real test failure still fails. |
| CI workflow | `.github/workflows/release-gate.yml` | YAML parsed; 3 jobs (`static-contract`, `backend-tests`, `release-smoke`); audits both lockfiles; browser wrapper runs 4 suites when Chromium is available |

### Stress numbers (real uvicorn on loopback, no AI key)

| Scenario | Measured result | Gate |
| --- | --- | --- |
| 20 learners × 5 requests | 100×200, wall 1,024.92 ms, **97.57 req/s**, p50 181.13 ms, p95 248.74 ms, max 272.03 ms, 0 schema failures. Lower again than the previous 135.26 req/s on this busy sandbox; recorded, not capacity-adjusted | PASS |
| 50 duplicate submissions | wall 389.02 ms, p50 106.06 ms, one distinct plan, 50 distinct request ids | PASS |
| Large valid / oversize | 115,323 B → 200 in 317.59 ms, 414 blocks, schema true; 8,388,609 B → raw-socket 413, urllib transport 0; health 200 after | PASS (F-07 recorded) |
| 16 concurrent `/api/v1/explain`, no key | wall 485.37 ms, 12×200 + 4×429, p50 387.02 ms, health 200 after | PASS |
| Retry storm + credit capability | 3 attempts, `standard_content`, `adapted=false`; OpenAPI 200 with **147 paths** and credit paths `/api/v1/credits/me`, `/api/v1/credits/actions`, `/api/v1/admin/institutions/{institution_id}/credits` | PASS |
| Restart + stale session | `/me` 200 after restart, forced stale `/me` 401, stateless integration 200 before/after/stale | PASS |
| DB locked/busy | 2 s exclusive hold; stateless 200 in 7.32 ms; stateful write 200 in 1,671.18 ms; after release 200 in 19.75 ms | PASS |
| Rate limit | multiplier 0.05, 40 requests → 11×200 + 29×429, `retry-after: 10` observed 5× | PASS |
| Provider-outage diagnostic | 16 calls, providers enabled → 12×200 + 4×429 in 289.42 ms, health 200 | FINDING (report-only) |

### E2E journey details (fresh DB, scratch learner)

Sign-up with analytics consent **off** → logout → `GET /me` 401 → login → `GET /me` 200 →
consent opt-in read back as **true** → baseline start + snapshot 200 → lesson plan 200 with
4 blocks → practice session/items 200 → wrong answer graded `correct=false` 200 → lesson
concepts 200 → re-teach 200 with 3 blocks → no-key teaching answer 200 → proposal gate 200
(0 proposals; the gate was not faked) → method report + journey 200 → export 200 → delete
200 → `GET /me` 401 → Genlink integration request 200 validated against the frozen schema →
provider outage reported (401 after deletion) → rebuilt engine console 200 with its own
"Example figures · not live telemetry", "No live institution or billing connected" and
"Sample rows · not real students" labels.
Separate exhausted-credit run: 4 priced actions, plan/institution/wallet/membership created,
generation **402 `credits_exhausted`** with `mode=standard`, 5 unmetered fallback routes still
200, learner sees `exhausted=true`. 12 immediate post-login cookie-use checks: 0 failures.

## Presentation / reality gaps corrected

* `/engine` numbers, plans, prices, ledger and "credits remaining" are visibly labelled
  **sample / example / not live telemetry** by `main`'s rebuilt console; it states
  **No live institution or billing connected** and labels the CSV export as a sample. The
  release gate's real HTTP fetch of the built page asserts those labels. The console is still
  **not connected to the backend credit ledger**.
* README now states Genlink is **not wired** in its integration section and carries a
  Documentation status table for the 9+ missing docs instead of dead-link claims.
* The demo walker no longer crashes on a drifted report shape; its output is real HTTP,
  not a simulated success.
* The exhausted-credit case is now a **measured backend 402**, not a simulated UI state.
* Scratch learner ids in all evidence are guests created for the test. **No simulated usage
  is labelled live usage.**

## Unresolved blockers / not verified

1. F-01 is **closed** on this branch by `main` PR #5 (`next` 15.5.28 + overrides, audit 0).
   Still triage F-16, the 18 high / 9 moderate advisories in the **root Genlink**
   `package-lock.json`, before distributing the extracted app.
2. F-02 ship a real Genlink caller (or explicitly scope the release to Adapt-only).
3. F-03 wire the rebuilt engine console to the backend credit ledger or keep it explicitly
   scoped as a presentation prototype; define operator token handling, institution onboarding
   and what a learner sees when a wallet is empty.
4. F-04 review `setuptools` advisories with a pinned, tested upgrade.
5. F-05 run all four browser suites (`test:e2e:banned`, `test:e2e:demo`,
   `test:e2e:engine`, `test:e2e:readiness`) in an environment that can install Chromium;
   treat `BLOCKED` as unverified, not passing.
6. F-07 document client-side body caps for integration callers.
7. F-08 the archive was removed on main; verify no future distributable ZIP re-adds a real
   `.env`, and rotate the publishable key if the old archive already circulated.
8. F-15 live model quality, voice audio, real-phone/landscape layout, real tunnel, Numbas
   live server remain unverified. `scripts/live_model_check.py` deliberately needs a key and
   is **not** a CI step.
9. F-16 triage the 27 root Genlink npm vulnerabilities before distributing the extracted app;
   do not use `npm audit fix --force`.
10. F-17 decide whether the stateless integration route needs institution scoping / wallet
    debiting; today it ignores `institution_id`.
11. F-18 watch the async lesson-upgrade job: one full-suite run returned `fallback` instead
    of `ready`; 5 isolated reruns and the next full-suite rerun passed. Capture logs on any
    recurrence before pilot.
12. Real migrated production data, multi-worker deployment, monitoring, backup/restore and
    rollback were not exercised; only a synthetic `0002 → R10` migration was proven. `main`
    PR #6 added runbooks/systemd/nginx assets and backend packaging tests, but those tests
    prove files/builds, not a live deployment.
13. Loopback throughput on this shared sandbox has moved with load: 199.30 → 135.26 →
    **97.57 req/s** (p50 96 → 134 → 181 ms) across the post-merge reruns. These are three
    single-run measurements, not capacity guarantees; size the pilot/production topology from
    its own controlled load test.
14. F-19 was a CI harness defect (missing `release-artifacts` directory), not a backend
    regression. Fixed and covered by a green CI run.
15. F-20 was a flaky test, not a product regression. Fixed and covered by a green CI run.
16. F-21 was a colour-formatting assumption in CI-only help text. Fixed; CI run
    `40067319614` at `8a021ab` was fully green (all three jobs), and the post-fourth-merge
    CI run `40068913606` at `f42f1a7` is also fully green: static-contract, backend pytest and
    release-smoke all pass. The gate is verified for this branch.

## Conflict report for the four `main` merges

| Merge | Conflict | Resolution | Verification |
| --- | --- | --- | --- |
| `aad6946` (Genlink extracted, top-level `adapt/` added) | `.gitignore` add/add | Combined main's Node/Genlink ignores with the release gate's `.venv/`, cache, `release-artifacts/`, `*.key` and `.env.local` ignores. | `git diff --check` clean; secret scan then covered the extracted trees. |
| `8851869` (backend credits/operator/security, PR #4) | `Adapt-main/docs/EFFICIENCY.md` add/add | Regenerated from `Adapt-main/scripts/write_efficiency_doc.py` (93 lines, 0 conflict markers), keeping the branch's generator as the source of truth. All other main changes — R10 migration, credit service/routes, operator boundary, cross-site guard — were accepted as staged. | `pytest -q tests/test_ai_efficiency.py` 27/27; full suite 1617 passed / 2 skipped; merge commit `d812f79`. |
| `1b3add9` (production hosting, WCAG frontend, dependency patches, PRs #5/#6) | `Adapt-main/frontend/src/app/engine/page.tsx` content conflict | Took **main's rebuilt console** (`git checkout --theirs`): it already carries the sample/non-live labels the release gate requires, plus a full operator presentation layer. All other production/packaging/hosting files auto-merged; the `issue_login` `s.commit()` survived the auto-merge of `deps.py`. | frontend lint + 6 unit scripts + build exit 0; `release/e2e_smoke.py --web` engine-label check PASS; full suite 1645 passed / 2 skipped; Adapt npm audit 0 vulnerabilities; merge commit `9aba09a`. |
| `bca7d15` (PR #7 room joining, page-switch/overload collapse, root Genlink + top-level `adapt/` hardening) | `adapt/backend/src/adapt/db/engine.py` content conflict: release branch had `pool_size=20, max_overflow=20, pool_timeout=5, pre_ping=True`; main chose `_POOL_KWARGS = {12, 24, 30}` | Took **main's version** and relaxed `release/check_second_layout.py` to assert the invariant (QueuePool, total capacity ≥ 20, finite timeout) instead of our exact numbers. Main's `adapt/backend` hosting + realtime tests pass 44/44. | `release/check_second_layout.py` PASS (`size=12, max_overflow=24, timeout=30, total_capacity=36`); secret/host/lint scans re-run PASS; root Genlink browser files now 179; merge commit `c63d101`. |

No other file conflicted in the fourth merge. The deliberate release-owned edits that remain on
top of all four merges are the `s.commit()` in `issue_login` (both layouts), the new session
regression test, the credit E2E/stress harness, the two-lockfile audit, the four-suite browser
wrapper, the property-based second-layout pool check and the refreshed docs/evidence.

## Likely conflicts with the other three parallel branches

These are the files this branch touched that the other agents most likely also own. Keep
the changes minimal and re-run the gate after merging:

| File | Why it may conflict | What this branch did |
| --- | --- | --- |
| `Adapt-main/backend/src/adapt/db/engine.py` **and `adapt/backend/src/adapt/db/engine.py`** | backend/infrastructure agent owns DB setup | identical additive pool configuration + comment in both `create_db_engine` copies; no API change |
| `Adapt-main/backend/src/adapt/api/deps.py` **and `adapt/backend/src/adapt/api/deps.py`** | backend agent owns auth/session | one `s.commit()` inside `issue_login` before the cookie is returned; regression test added |
| `Adapt-main/frontend/src/app/engine/page.tsx` | frontend agent owns the console UI | earlier copy/labels were superseded; took main's rebuilt console on the third merge, which already carries the honesty labels |
| `Adapt-main/scripts/demo.mjs` **and `adapt/scripts/demo.mjs`** | demo/release script may be edited by backend or demo owner | identical optional-chaining fallback for the absent `labels` object |
| `Adapt-main/README.md` | documentation owner | engine-console honesty paragraph, Documentation status table, integration "not wired" note |
| `Adapt-main/backend/pyproject.toml` / frontend `package.json` / root `package-lock.json` | dependency owners | **not changed by this branch**; main upgraded `next`/overrides, closing F-01; root Genlink advisories still reported, not force-upgraded |
| `Adapt-main/deploy/`, `PRODUCTION_AUDIT.md`, `PRODUCTION_RUNBOOK.md`, `backend/requirements.lock`, `src/adapt/migrations/` | added/moved by main PRs #5/#6 | accepted as merged; release gate re-ran migration smoke (now resolves revisions from the packaged `src/adapt/migrations` path) and packaging tests |
| `Adapt-main/backend/src/adapt/api/routes/integration.py` | backend contract owner | **not changed**; contract is proven by tests around it |
| `.gitignore` | **actual add/add conflict resolved in the first merge commit** | combined main's Node/Genlink ignores with the release gate's `.venv/`, cache and artifact ignores |
| `Adapt-main/docs/EFFICIENCY.md` | **actual add/add conflict resolved in the second merge** | regenerated from `scripts/write_efficiency_doc.py`; 0 conflict markers; its 27 tests pass |
| `.github/workflows/release-gate.yml`, `release/`, `integration/`, root `*.md` | new release-owned files | workflow references the agents' build/test commands, audits both lockfiles and attempts four browser suites |
| `src/`, `supabase/`, `drizzle/`, `adapt/` | added on main by the other agents while this gate ran | not modified except the two mirrored fixes above; scans now cover them |

If the pool or session-commit fixes are replaced by different implementations from the backend
agent, keep `backend/tests/test_release_concurrency_pool.py`,
`backend/tests/test_session_cookie_commit.py` and the live stress/E2E scenarios — they are
the regression proof, not the implementation.
