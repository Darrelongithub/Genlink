# Adapt production hosting audit

**Audit date:** 2026-10-23  
**Remediated source/runbook commit:** `4452080c94366e50fd8207e97ca4f4089f7e0686`  
**Branch:** `arena/cff9ff26-genlink`  
**Scope:** deployment, hosting, configuration, operations, dependency/build assurance and relevant
regression tests/documentation. Learner UI and adaptive algorithms were not redesigned.

This report file is committed separately so it can name the exact remediation commit above. The
final report commit/hash is supplied with the delivery.

## Conclusion

**Adapt is hostable as a carefully operated, single-host, single-API-worker production pilot using
the supplied topology and runbook. It is not signed off as turnkey Internet production, highly
available, or horizontally scalable.**

The evidence supporting that conclusion is a clean locked install, a complete frontend production
build, packaged-wheel migration tests, strict SQLCipher startup, fresh/existing database checks,
an actual TLS → Node → FastAPI smoke with CORS/CSRF/host/failure behavior, session preservation
across restart, graceful lifecycle checks, backup/restore round trips and 181 focused passing
backend tests. No PostgreSQL, Kubernetes, container image or high-availability claim is made.

Public deployment still requires target-system Nginx/systemd/public-CA validation, capacity/load
validation, normal operational review, and resolution of the owner actions below. The legacy
Supabase credential is a repository-wide security sign-off issue; its presence is not evidence of
an Adapt service-role key or of an Adapt database breach.

## Findings and remediation

### Critical

| ID | Finding | Resolution and evidence |
|---|---|---|
| C-01 | Baseline npm audit reported critical Next.js advisories. A public frontend could not be approved on that dependency set. | Upgraded Next.js exactly to `15.5.28` after reviewing the dependency tree. Clean `npm ci`, all 22 pages built, contract/TypeScript/proxy tests passed, and final npm audit reports zero vulnerabilities. |

**No unresolved Critical defect was found in the audited Adapt hosting code.**

### High

| ID | Finding | Resolution and evidence |
|---|---|---|
| H-01 | A tracked legacy Genlink ZIP contained an unexpired Supabase `anon` JWT in `.env`. Deletion alone neither revokes it nor rewrites Git history. No service-role key was identified. | Removed `genink-school-of-the-elites-main (1).zip` from the worktree/release commit. No credential value was printed or committed. **Owner action remains:** rotate/revoke as appropriate, review Supabase RLS/access logs and assess historical exposure. |
| H-02 | A clean non-editable backend install could not run Alembic: the wheel omitted the migration directory and startup looked in the wrong parent path. | Moved the existing 19 migration/support files intact under `adapt/migrations`, made paths package-relative, included revisions/Mako/curriculum data in the wheel, and added an extracted-wheel migration regression. Clean install and fresh startup now pass. |
| H-03 | Forwarded client IP/HTTPS handling was not a complete trust boundary. Direct clients could attempt spoofing, and production inherited broad demo/tunnel behavior. | Added explicit IP/CIDR proxy trust (world networks rejected), rightmost trusted HTTPS handling, exact production origins/hosts, production demo/debug invariants, and no public tunnel host inheritance in production. Trusted/untrusted proxy and HTTPS tests pass. |
| H-04 | The custom Node proxy lacked complete body/upstream bounds and could pass unsafe target configuration. | Added declared/chunked body caps, upstream timeouts, sanitized 502/504 responses, origin-only `ADAPT_API` validation, credential-bearing-target refusal without log echo, and forwarding-header trust. Node regression tests pass. |
| H-05 | Upgraded WebSocket connections could keep the Node process alive past graceful shutdown. | Tracks ordinary/upgraded sockets and upstream requests, bounds the grace period, then destroys remaining sockets. The upgraded-socket SIGTERM regression passes; the test runner exits instead of hanging. |
| H-06 | Backend Host validation could not reject a bad public Host through Node because the proxy intentionally rewrites Host to its API target. | Added optional exact `ADAPT_ALLOWED_HOSTS` enforcement at the actual Node front door, including WebSocket upgrades, and enabled it in the production template. Unknown HTTP Host and upgrade Host tests pass. Local behavior is unchanged when unset. |
| H-07 | Baseline npm audit also reported a high PostCSS advisory. | Added a global PostCSS `8.5.29` override after a nested override proved incompatible. Both Next and Tailwind resolve to the patched version; clean install/build/audit pass. |

### Medium

| ID | Finding | Resolution and evidence |
|---|---|---|
| M-01 | Liveness/readiness were conflated, and a read-only SQLite file could still pass `SELECT 1` or `BEGIN IMMEDIATE`. | Added separate `/healthz` liveness and `/readyz` readiness. Readiness performs and rolls back a real write. An actual chmod-read-only SQLCipher/SQLite regression returns sanitized 503. Launchers/probes now wait for readiness. |
| M-02 | Database failures could expose driver text, schema or local paths, and looked like generic 500s. | Added sanitized retryable 503 handling for SQLAlchemy failures and generic health/readiness failures, retaining request IDs and only exception types in logs. Regression tests assert no path/driver details leak. |
| M-03 | Production configuration accepted ambiguous origins/hosts and incomplete TLS settings. | Added exact origin/host parsers, TLS certificate/key pairing, explicit production HTTPS requirements and tests for wildcards, credentials, paths, bad ports and world-wide proxy trust. |
| M-04 | There was no reproducible production Python dependency set or proof of a clean non-editable installation. | Added `backend/requirements.lock`, build-tool declarations and backend package documentation. Two clean installs succeeded; `pip check` found no broken requirements; `pip-audit` found no known vulnerabilities. |
| M-05 | No operational backup/restore path proved learner-history and migration preservation. | Added `adapt db backup` and explicit offline `adapt db restore`: non-overwrite, mode-0600 files, integrity/revision checks, atomic replacement, safety backup and stale-WAL prevention. Round trips pass in field-only and SQLCipher modes. |
| M-06 | Raw access logs and process tuning were not consistently controlled for hosting. | Disabled Uvicorn raw access logs in the supported launchers; added bounded keepalive/concurrency/graceful settings and structured request events without raw URL, query, IP, cookie or learner payload. |
| M-07 | Production runtime and deployment assets did not establish non-root/resource/TLS operations. | Added separate API/web environment templates, non-root systemd units with limits/hardening/stop budgets, an Nginx TLS/WebSocket example and `PRODUCTION_RUNBOOK.md`. Static asset tests and substituted-path `systemd-analyze verify` pass; target execution remains required. |
| M-08 | A new moderate advisory affected development-only `undici` through jsdom; the declared Node floor no longer matched jsdom. | Pinned the minimal patched `undici@8.12.2`, aligned Node engine declarations, reran clean install/build/tests/audit. It is not a production runtime dependency after `npm ci --omit=dev`. |

### Low

| ID | Finding | Resolution and evidence |
|---|---|---|
| L-01 | `/api` advertised `/api/openapi.json` even when production disabled that endpoint. | The index now reports the configured `app.openapi_url` (`null` in production), with a regression test. |
| L-02 | Package metadata lacked a backend README and the offline wheel regression lacked a declared build tool. | Added the package README and declared `wheel` for build/test environments; extracted-wheel tests pass without global build dependencies. |

## Validation evidence

All results below were observed in the supplied Linux environment on 2026-10-23. Python was
3.11.2 and Node was 22.22.3. No real provider credential was used.

### Clean production install and package checks

```bash
cd /home/user/Genlink/Adapt-main/backend
rm -rf /tmp/adapt-prod-venv
python3.11 -m venv /tmp/adapt-prod-venv
/tmp/adapt-prod-venv/bin/python -m pip install --no-deps -r requirements.lock
/tmp/adapt-prod-venv/bin/python -m pip install --no-deps .
/tmp/adapt-prod-venv/bin/python -m pip check
```

**Result:** success; wheel built/installed; `No broken requirements found.` The final production
smoke below used this clean environment, not the editable development installation.

```bash
/tmp/adapt-audit-venv/bin/pip-audit -r requirements.lock
```

**Result:** `No known vulnerabilities found.` This is an advisory-database result at the audit
time, not a permanent guarantee.

### Frontend clean install, dependency audit, build and tests

```bash
cd /home/user/Genlink/Adapt-main/frontend
npm ci
npm audit
npm ls next postcss undici --all
npm run build
npm run lint
npm run test:env
npm run test:server
npm run test:engine
npm run test:lib
npm run test:dev
```

**Results:**

- clean install succeeded; npm audit: **0 vulnerabilities**;
- resolved Next `15.5.28`, PostCSS `8.5.29`, undici `8.12.2`;
- optimized production build succeeded; **22/22 pages** generated;
- contract checked **146 backend routes against 138 frontend calls**, plus four scene kinds;
  TypeScript passed;
- environment tests **2/2**, proxy/server tests **4/4**, engine **15/15**, library **61/61**,
  development launcher **5/5** passed;
- upgraded-socket and ordinary proxy SIGTERM tests completed without a hung runner.

A separate minimal-runtime check used:

```bash
rm -rf node_modules
npm ci --omit=dev
npm audit --omit=dev
npm run test:env
```

**Result:** 29 production packages installed, zero vulnerabilities, environment tests 2/2. npm
listed two optional sharp/wasm packages as extraneous; this did not produce an audit error or affect
the smoke. It is noted rather than hidden.

### Focused hosting/security/migration/failure tests

```bash
cd /home/user/Genlink/Adapt-main/backend
/tmp/adapt-dev-venv/bin/python -m pytest -q \
  tests/test_production_hosting.py \
  tests/test_production_packaging.py \
  tests/test_production_backup.py \
  tests/test_production_assets.py \
  tests/test_trusted_proxy.py \
  tests/test_hosting.py \
  tests/test_migrations.py \
  tests/test_migration_encryption.py \
  tests/test_startup_schema.py \
  tests/test_config_secrecy.py \
  tests/test_realtime_guards.py \
  tests/test_failure_loop.py \
  tests/test_llm_consent.py
```

**Result:** `181 passed, 1 warning in 58.81s`. The warning is Starlette's TestClient/httpx
deprecation notice, not a hosting failure.

### Full backend suite

```bash
cd /home/user/Genlink/Adapt-main/backend
/tmp/adapt-dev-venv/bin/python -m pytest -q
```

**Result:** `1 failed, 1587 passed, 2 skipped, 1 warning in 266.91s`.

The sole failure is:

```text
tests/test_ai_efficiency.py::test_the_docs_carry_the_same_table_the_code_does
AssertionError: docs/EFFICIENCY.md does not exist
```

That pre-existing AI-efficiency documentation asset is outside this deployment-only scope. No
learning code was changed to hide it, and a fully green backend suite is **not** claimed.

### Actual production proxy/TLS/restart/lifecycle smoke

```bash
cd /home/user/Genlink/Adapt-main
/tmp/adapt-dev-venv/bin/python scripts/production_smoke.py \
  --python /tmp/adapt-prod-venv/bin/python
```

**Result:** passed against the final clean installed backend and production-only frontend:

| Check | Observed result |
|---|---|
| Local TLS forwarding | passed with a throwaway self-signed certificate |
| Liveness / readiness / frontend | 200 / 200 / 200 |
| Unknown Host | 400 |
| CORS exact allow / disallowed Origin | 200 / 400 |
| Mutation without CSRF / with CSRF | 403 / 200 |
| Existing-database API restart | status 200; authenticated session preserved |
| Whole-file encryption in smoke | `file_encrypted: true` using strict SQLCipher |
| No-provider safe learning fallback | 200; simple mode |
| First/restarted API SIGTERM | `-15` with required graceful shutdown markers |
| Web SIGTERM | exit 0 |
| Credential patterns in smoke logs | 0 |

Uvicorn 0.54 intentionally re-raises SIGTERM after cleanup; `-15` was accepted only with
`Application shutdown complete` / `Finished server process` log evidence. The test does not call a
raw signal status alone “graceful.”

This smoke validates the proxy forwarding contract. It is **not** an Nginx execution test, public
CA test, load test or live-AI-provider test.

### Backup, static checks and lint

```bash
/tmp/adapt-dev-venv/bin/python -m pytest -q tests/test_production_backup.py
/tmp/adapt-dev-venv/bin/python -m pytest -q tests/test_production_assets.py
/tmp/adapt-dev-venv/bin/ruff check --select I,F \
  src/adapt/api/app.py src/adapt/cli.py src/adapt/config.py \
  src/adapt/security/middleware.py tests/test_production_hosting.py \
  tests/test_production_backup.py tests/test_production_assets.py
```

**Results:** backup test passed (both storage modes inside the test); deployment asset tests
passed; selected import/unused-name lint passed. The project has pre-existing line-length/style
findings outside this work, so a repository-wide Ruff-clean claim is not made. `git diff --check`
passed.

The systemd unit text was checked with `systemd-analyze verify` after replacing only unavailable
`/opt/adapt` executable paths with the validated temporary paths. It produced no errors. This does
not assert that systemd ran the services.

### Secret and archive review

The redacted scan read tracked text files, the complete `.next` build and ZIP members in memory;
it did not print matched values. A final worktree/build/deliverable pass covered **997 files**.
High-confidence patterns included private-key headers, JWTs and several provider token formats.

- Current Adapt worktree and built assets: only two pattern matches, both explicitly named test
  fixtures in `test_resource_providers.py` and `test_round2_a_public_privacy_and_logs.py`.
- Complete `.next`: no high-confidence credential pattern. Broader keywords were code terms
  (`password`, `passphrase`, `authorization`), with no long quoted credential assignment found.
- `Adapt-main (3).zip`: same two test fixtures; archived `.env.example` values inspected were
  placeholders. This original source archive is not the release path; use the runbook's exact-
  commit `git archive` procedure.
- Legacy ZIP in prior Git history: one unexpired Supabase `anon` JWT in `.env`; removed from the
  remediation commit, but still subject to the owner actions in H-01.
- No tracked live `.env`, database, private key or generated build directory was staged.

This is a targeted pattern review, not a mathematical proof that no secret exists. No credential
was revealed in chat, test output, reports or new files.

## Remaining blockers and limits

1. **Owner credential action (H-01):** rotate/revoke the legacy Supabase anon credential as
   appropriate, review RLS/access and decide whether history scrubbing is required. The worktree
   deletion cannot do those things.
2. **Target proxy/service validation:** Nginx is not installed in the audit environment, and no
   public CA/DNS was available. Run `nginx -t`, start the actual units, test public HTTPS and
   WebSockets on the target before exposure. The supplied Nginx file is reviewed/tested statically,
   not executed here.
3. **Full-suite pre-existing failure:** restore or author the unrelated `docs/EFFICIENCY.md` in a
   separate documentation/AI-efficiency task if a completely green suite is required.
4. **No capacity certification:** no production load test, soak test, multi-worker test or HA
   failover was performed. Resource limits are conservative starting points. Keep one API worker;
   process-local rate limits and SQLite writer behavior require a redesign before horizontal scale.
5. **No live provider test:** external Gemini authentication/model behavior and provider quality
   were not exercised. Offline fallback and failure paths were tested. Do not claim live model
   availability from this audit.
6. **No container validation:** no Docker/Podman engine is installed. No container manifests were
   added, so no image-build or container-health claim is made.
7. **Encryption scope:** strict SQLCipher whole-file behavior was tested. `field-only` mode does
   not encrypt the whole file or every field; the runbook preserves that distinction. Backups must
   include the matching key through a separate secure process.

## Release artifacts

- `PRODUCTION_RUNBOOK.md` — installation, configuration, TLS, services, migrations, backup/restore,
  smoke and incident procedures.
- `deploy/` — separate API/web environments, non-root systemd units and Nginx TLS proxy example.
- `scripts/production_smoke.py` — no-credential fresh/existing-database TLS proxy smoke.
- `backend/requirements.lock` — exact production runtime versions for the measured Linux/CPython
  3.11 installation.
- Production hosting, packaging, backup and deployment-asset regressions under `backend/tests/`.
