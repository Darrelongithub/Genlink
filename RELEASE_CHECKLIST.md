# Release checklist — Genlink + Adapt

Owner: release engineering. Date: 2026-10-23. Branch `arena/3315ff42-genlink`.
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
  && npm run build)
.venv/bin/python release/lint_changed.py --working-tree
.venv/bin/python release/secret_scan.py
.venv/bin/python release/host_scan.py
python3 -m unittest discover -s integration -p 'test_*.py'
(cd Adapt-main/backend && /home/user/Genlink/.venv/bin/python -m pytest -q)
.venv/bin/python release/stress_check.py --include-provider-outage
.venv/bin/python release/migration_smoke.py
.venv/bin/python release/e2e_smoke.py --web --demo-script
(cd Adapt-main/frontend && npm audit --json > ../../release-artifacts/npm-audit.json || true)
.venv/bin/python -m pip_audit --format json --progress-spinner off > release-artifacts/pip-audit.json || true
.venv/bin/python release/audit_summary.py --npm release-artifacts/npm-audit.json --pip release-artifacts/pip-audit.json
bash release/browser_e2e.sh
```

CI equivalent: `.github/workflows/release-gate.yml` (jobs `static-contract`,
`backend-tests`, `release-smoke`). It caches pip/npm by lockfile, installs from the
lockfile, sets no AI credentials, reports audits without `--force`, and uploads
`release/evidence/*.json`.

Expected on this branch: backend 1583 passed / 2 skipped; frontend lint + 80 unit tests +
build pass; reference caller 17/17; stress 10 scenarios / 31 checks / 0 failures;
migration 4/4; E2E 8/8; secret and host scans pass; **dependency audit reports findings**;
browser E2E is `BLOCKED` in the sandbox.

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
- [ ] **Do not** use `adapt host --tunnel` or any public URL until F-01 is patched.
- [ ] Say out loud: "the credit numbers are presentation samples; the backend does not
      debit credits, and Genlink is not connected yet."
- [ ] Use only scratch/guest learner ids; delete them afterwards.

Demo go/no-go: **GO** for the scope above. **NO-GO** for a public tunnel, real learner
data, or any claim that credits/Genlink integration are live.

## 2. Pilot Ready — currently NO

A pilot means real learners. Do not start one until every box is ticked.

- [ ] Close F-01: patch the critical/high npm advisories; re-run `npm audit`, build and
      the gate. Record the new JSON.
- [ ] Close F-02: ship the Genlink caller against `POST /api/v1/integration/adapt`, using
      `integration/reference_client.py` as the behaviour spec. Add its own tests; keep the
      loopback guard for deployed browser code.
- [ ] Close F-03: decide credits. Either implement a server-side ledger + debit +
      institution limits + exhausted-credit test, or remove billing language from pilot
      material and keep `/engine` as a labelled prototype.
- [ ] Close F-04: pinned, tested `setuptools` upgrade; re-run `pip-audit`.
- [ ] Close F-05: run `npm run test:e2e:banned` and `npm run test:e2e:demo` in a browser-
      capable environment; replace `BLOCKED` with a PASS artifact.
- [ ] Close F-06: repeat the 12× immediate post-login check under realistic latency; if a
      401 reappears, capture server logs and fix the auth/session path with a regression test.
- [ ] Close F-07: document/enforce client-side request caps for integration callers.
- [ ] Close F-08: remove `.env` from the Genlink archive; rotate the publishable key if it
      has circulated; re-run the secret scan.
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
      encryption mode); the current 191 req/s is a single sandbox loopback number.
- [ ] Add institution/tenant scoping and prove one institution cannot read another's data
      (the integration route currently ignores `institution_id`).
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

## 5. Sign-off record

| Role | Name | Date | Decision | Evidence commit |
| --- | --- | --- | --- | --- |
| Release engineering | (this gate) | 2026-10-23 | Demo YES (conditional), Pilot NO, Production NO | see final commit hash in the task report |
| Backend owner | ________ | ____ | ____ | ____ |
| Frontend owner | ________ | ____ | ____ | ____ |
| Product / privacy owner | ________ | ____ | ____ | ____ |

Do not replace an empty sign-off with "assumed". An unsigned pilot or production row is a
NO-GO.
