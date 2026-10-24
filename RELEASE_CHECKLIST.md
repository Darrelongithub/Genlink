# Release checklist — Genlink + Adapt

Owner: release engineering. Date: 2026-10-24. Branch `arena/3315ff42-genlink`.
Read `RELEASE_READINESS.md` for the decisions and `SYSTEM_ARCHITECTURE.md` for the map.
**Never tick a box by assuming. Every tick needs a command and an artifact.**

## 0. One-command gate (no AI key)

```bash
cd /home/user/Genlink
python3 -m venv .venv
.venv/bin/python -m pip install -e "./Adapt-main/backend[dev]"
.venv/bin/python -m pip install pip-audit
(cd Adapt-main/frontend && npm ci --no-audit --no-fund && npm run lint \
  && npm run test:lib && npm run test:engine && npm run test:server && npm run test:env \
  && npm run test:dev && npm run build)
.venv/bin/python release/lint_changed.py --base origin/main
.venv/bin/python release/secret_scan.py
.venv/bin/python release/host_scan.py
.venv/bin/python release/check_second_layout.py --src adapt/backend/src
python3 -m unittest discover -s integration -p 'test_*.py'
(cd Adapt-main/backend && /home/user/Genlink/.venv/bin/python -m pytest -q)
.venv/bin/python release/stress_check.py --include-provider-outage
.venv/bin/python release/migration_smoke.py
.venv/bin/python release/e2e_smoke.py --web --demo-script
(cd Adapt-main/frontend && npm audit --json > ../../release-artifacts/npm-audit.json || true)
(npm audit --json --package-lock-only > release-artifacts/npm-audit-root.json || true)
.venv/bin/python -m pip_audit --format json --progress-spinner off > release-artifacts/pip-audit.json || true
.venv/bin/python release/audit_summary.py --npm release-artifacts/npm-audit.json \
  --npm-root release-artifacts/npm-audit-root.json --pip release-artifacts/pip-audit.json
bash release/browser_e2e.sh
```

CI equivalent: `.github/workflows/release-gate.yml` (jobs `static-contract`,
`backend-tests`, `release-smoke`). It caches pip/npm by lockfile, installs from the
lockfile, sets no AI credentials, reports audits without `--force`, and uploads
`release/evidence/*.json`.

Expected on this branch (after the third merge with `main` at `1b3add9`): backend
1645 passed / 2 skipped for `Adapt-main/backend` (one earlier pre-third-merge run had a flaky
async-job failure, isolated 5/5 and full rerun green — F-18); the mirrored `adapt/backend` pool
bound passes its isolated check; frontend lint + unit suites (`lib`/`engine`/`server`/`env`/
`dev`) + build pass; reference caller 17/17; stress 10 scenarios / 31 checks / 0 failures
(135.26 req/s loopback after production middleware); migration 4/4 with head `R10`; E2E 9/9
including the exhausted-credit 402 case; secret scan 1350 tracked files / 0 high; host scan
187 Adapt + 177 Genlink browser files / 0 loopback calls; diff-aware lint 23 changed files /
63 inherited findings / 0 on added lines; **Adapt-frontend npm audit 0, root Genlink npm 18
high + 9 moderate, pip 4 advisories**; browser E2E is `BLOCKED` for all four suites in the
sandbox.

## 1. Demo Ready — conditional YES

Scope: local/offline presentation, scratch learner data, no public tunnel, no billing claim.

- [x] Backend starts on a fresh DB and answers `/healthz`.
- [x] Frontend production build succeeds; `/engine` renders.
- [x] `scripts/demo.mjs` walks placement → practice → analysis → proposals over real HTTP.
- [x] Consent starts off and can be opted in; logout and deletion revoke the session.
- [x] Wrong answer is graded false and deterministic re-teach returns blocks.
- [x] Export and delete work; `/me` is 401 afterwards.
- [x] No model key is needed; the no-key answer is labelled local/simple.
- [x] Engine console numbers are visibly labelled sample/prototype.
- [x] README says Genlink is **not wired** and lists the missing docs honestly.
- [x] Secret scan prints no values; no private key or service-role key found.
- [ ] **Before the room:** rehearse on the actual laptop/network once; open the printed
      address on a phone and answer one question in portrait and landscape.
- [ ] **Do not** use `adapt host --tunnel`, a public URL or real learner data until F-02,
      F-03 and F-16 are resolved and the four browser suites pass. F-01's Adapt-frontend
      advisories are now patched on `main`, but the root Genlink lockfile is not.
- [ ] Say out loud: "the `/engine` credit numbers are presentation samples stored in this
      browser; Adapt now enforces institutional credits server-side, but this console is not
      connected to that ledger, and Genlink is not connected yet."
- [x] The real backend exhausted-credit case was measured: 402 `credits_exhausted` with
      `mode=standard`, unmetered reads still 200. Evidence: `release/evidence/e2e-smoke.json`.
- [ ] Use only scratch/guest learner ids; delete them afterwards.

Demo go/no-go: **GO** for the scope above. **NO-GO** for a public tunnel, real learner
data, or any claim that the console wallet/Genlink integration are live.

## 2. Pilot Ready — currently NO

A pilot means real learners. Do not start one until every box is ticked.

- [x] Close F-01: `main` PR #5 upgraded `next` to 15.5.28 with `postcss`/`undici` overrides;
      the Adapt-frontend `npm audit` on this branch reports **0 vulnerabilities**. Keep the
      audit JSON with the pilot evidence.
- [ ] Close F-02: ship the Genlink caller against `POST /api/v1/integration/adapt`, using
      `integration/reference_client.py` as the behaviour spec. Add its own tests; keep the
      loopback guard for deployed browser code.
- [ ] Close F-03: wire `/engine` to the real credit endpoints, or keep it explicitly labelled
      as a prototype and remove billing language from pilot material. Define who holds
      `ADAPT_OPERATOR_TOKEN`, how institutions/wallets are created, and what a learner sees
      when the wallet is empty (backend already returns 402 + standard mode).
- [ ] Close F-04: pinned, tested `setuptools` upgrade; re-run `pip-audit`.
- [ ] Close F-05: run all four browser suites (`test:e2e:banned`, `test:e2e:demo`,
      `test:e2e:engine`, `test:e2e:readiness`) in a browser-capable environment; replace
      `BLOCKED` with PASS artifacts.
- [x] Close F-06: the post-login 401 was reproduced 12/12 after the `main` merge, fixed by
      committing the session row in `issue_login`, and pinned by
      `Adapt-main/backend/tests/test_session_cookie_commit.py`. Final 12× immediate-use loop:
      0 failures. Still repeat under realistic network latency before pilot.
- [ ] Close F-07: document/enforce client-side request caps for integration callers.
- [ ] Close F-08: main deleted the Genlink archive; confirm no distributable ZIP re-adds a
      real `.env`, rotate the publishable key if the old archive circulated, and re-run the
      secret scan.
- [ ] Close F-16: triage the 18 high / 9 moderate vulnerabilities in the root Genlink
      `package-lock.json`; patch with reviewed, pinned upgrades only (never `--force`), then
      re-run `npm audit --package-lock-only` and record the JSON. This is now the main
      remaining npm risk, since F-01 is closed.
- [ ] Close F-17: decide whether the stateless integration route must be institution-scoped
      or debit the wallet. Today it ignores `institution_id`; the credit ledger applies to
      stateful Adapt generation only.
- [ ] Close F-18: watch the async lesson-upgrade job. If `state=fallback` recurs in a full
      suite run, capture server logs and add a regression test; do not disable the test.
- [x] Close F-19: the first post-merge CI backend failure was a missing
      `release-artifacts/` directory before the `tee`, not a test failure. Workflow now
      creates the directory; the rerun produced the log artifact.
- [x] Close F-20: a clean-venv run exposed a ~1/24-flaky two-learner shuffle assertion. It now
      samples 8 learners and asserts >1 distinct order; 5 isolated reruns pass.
- [x] Close F-21: CI forces ANSI colour into `adapt host --help`; the hosting tests now strip CSI
      sequences before asserting flags. 25/25 hosting tests pass with and without
      `FORCE_COLOR=1`. Confirm the final CI run is green before relying on CI evidence.
- [ ] Write the pilot protocol that `docs/PILOT.md` currently points to: who the learners
      are, consent text, what data leaves which system, retention/delete process, and the
      exact "pilot data" label used in the UI.
- [ ] Record a real pilot dataset and label it pilot data — never smoothed into live usage.
- [ ] Agree the cross-system consent: who may send `learner.id` + activity to Adapt, and
      how a learner withdraws.
- [ ] Verify a backup/restore of `ADAPT_DATA_DIR` and the keyfile on the pilot machine.
- [ ] Re-run the full gate on the pilot build and archive the evidence with a date.

Pilot go/no-go: **NO-GO** until all items above have dated evidence.

## 3. Production Ready — currently NO

All Pilot items, plus:

- [ ] Remediate or formally risk-accept every S0/S1 finding in `RELEASE_READINESS.md`.
- [ ] Load test on the production topology (worker count, reverse proxy, TLS, real DB
      encryption mode); the current 135.26 req/s is a single sandbox loopback number measured
      after the production middleware merge (down from 199.30 before it).
- [ ] Prove one institution cannot read another's wallet/ledger data, and decide whether the
      stateless integration route also needs scoping (it still ignores `institution_id`).
- [ ] Add monitoring, structured log alerts, backup verification and a written rollback
      (including Alembic downgrade behaviour on a copy of production data).
- [ ] Complete the missing documentation the README lists, or keep the status table and
      explicitly scope the release.
- [ ] Reduce or plan the inherited 5,108 Ruff / 217 mypy baseline; keep the diff-aware gate
      so new findings fail.
- [ ] Re-run the secret scan against the final deployable artifacts (not just source).
- [ ] Legal/privacy sign-off on learner data, model/provider use and cross-system transfer.
- [ ] Final gate green on the exact commit to be deployed; attach the commit hash.

Production go/no-go: **NO-GO**.

## 4. Failure drills (keep these in the gate)

| Drill | Command / scenario | What a good result looks like |
| --- | --- | --- |
| Adapt unavailable | reference caller against a closed port | 3 attempts max, `standard_content`, `adapted=false` |
| Model unavailable | 16 concurrent `/api/v1/explain`, no key | 200/429 only, `/healthz` 200 afterwards |
| Provider outage | `--include-provider-outage` diagnostic | measured statuses + health, no invented numbers |
| Duplicate submissions | 50 identical integration calls | one plan, no stored state |
| Interrupted connection | `integration/test_reference_client.py` | `IncompleteRead` caught, fallback returned |
| Restart during workflow | stress restart scenario | same learner after restart, stale session 401 |
| DB locked/busy | 2 s exclusive SQLite hold | stateless route unaffected, stateful write eventually 200 |
| Retry storm | 12 logical requests × 2 attempts | no request exceeds its attempt bound |
| Rate limit | multiplier 0.05, 40 requests | 429 with `retry-after`, no 5xx |
| Exhausted Adapt Credits | `release/e2e_smoke.py::run_exhausted_credits` | 402 `credits_exhausted`, `mode=standard`, unmetered reads 200, learner sees `exhausted=true` |
| Immediate post-login cookie use | 12× loop in the E2E harness | 0 failures; `issue_login` commits before returning the cookie |

## 5. Sign-off record

| Role | Name | Date | Decision | Evidence commit |
| --- | --- | --- | --- | --- |
| Release engineering | (this gate) | 2026-10-24 | Demo YES (conditional), Pilot NO, Production NO | `9aba09afe77714f7c7300f5a1c381325102265fb` + final docs commit in PR |
| Backend owner | ________ | ____ | ____ | ____ |
| Frontend owner | ________ | ____ | ____ | ____ |
| Product / privacy owner | ________ | ____ | ____ | ____ |

Do not replace an empty sign-off with "assumed". An unsigned pilot or production row is a
NO-GO.
