# Adapt production runbook

This runbook covers the **single-host, single-API-worker** deployment that is implemented and
smoke-tested in this repository. It does not describe PostgreSQL, Kubernetes, high availability,
or a container image. SQLite has one writer and Adapt's abuse limiter is process-local; adding
workers or replicas is not a safe drop-in scaling step.

See `PRODUCTION_AUDIT.md` for findings, exact validation results and unresolved blockers.

## 1. Architecture and security boundary

```text
Internet
  | HTTPS only (Nginx terminates TLS; firewall exposes 80/443)
  v
Nginx :443
  | HTTP on loopback, original Host + sanitized forwarding chain
  v
Next custom Node server 127.0.0.1:3000
  | exact Host check, body/time limits, /api + /readyz + /healthz + /ws proxy
  v
FastAPI/Uvicorn 127.0.0.1:8000
  | trusted-proxy HTTPS check, CORS/CSRF, rate limits, sanitized errors/logs
  v
SQLite or SQLCipher + the existing Alembic chain under /var/lib/adapt
```

The browser never needs direct access to ports 3000 or 8000. Keep both on loopback. Node needs
the public Host allowlist because it intentionally rewrites `Host` when calling the API; an API-
only Host check cannot protect the proxy path. Nginx overwrites `X-Forwarded-Proto`, and only
configured loopback peers may supply forwarding headers to Node or FastAPI.

The supplied units run both services as the non-login `adapt` user. API and web environment files
are deliberately separate: **provider/database credentials must never enter the Node environment**.

## 2. Requirements and measured platform

- Linux with systemd and Nginx. The examples use Debian/Ubuntu paths.
- Python 3.11+ (the validation environment used 3.11.2).
- A Node version satisfying `frontend/package.json` (validation used 22.22.3), plus npm.
- OpenSSL for the optional local smoke certificate.
- Linux x86_64 or aarch64 for the locked `sqlcipher3-binary` wheel. On another architecture,
  provide a supported SQLCipher driver or consciously use `field-only`; the latter encrypts the
  documented protected columns, **not the whole database file or every database field**.
- Enough disk for the database, WAL, backups and one release. The core systemd memory limits are
  starting points, not load-test results. The optional local speech/model stack is not in the
  production lock and may require higher limits after measurement.

## 3. Install from a clean commit, not a developer directory

Run from the repository checkout at the commit being released. `git archive` prevents untracked
`.env`, `var/`, `node_modules/`, build caches and local keys from entering the release.

```bash
sudo install -d -o "$USER" -g "$USER" -m 0755 /opt/adapt
# From the Genlink repository root:
git archive --format=tar HEAD \
  Adapt-main/backend Adapt-main/frontend Adapt-main/scripts \
  Adapt-main/deploy Adapt-main/.env.example \
  | tar -x -C /opt/adapt --strip-components=1

cd /opt/adapt
python3.11 -m venv .venv
.venv/bin/python -m pip install --no-deps -r backend/requirements.lock
.venv/bin/python -m pip install --no-deps ./backend
.venv/bin/python -m pip check

cd /opt/adapt/frontend
npm ci
npm run build
npm ci --omit=dev
cd /opt/adapt
sudo chown -R root:root /opt/adapt
```

Do not run an editable backend install in production. The wheel contains all existing Alembic
revisions, curriculum JSON and the unpriced credit-plan example. Do not copy a developer `.next`
directory over a clean build.
Run the release build as an unprivileged release account where possible; only the installation
and ownership steps need elevation.

## 4. Users, persistence and configuration

```bash
sudo useradd --system --home /var/lib/adapt --shell /usr/sbin/nologin adapt
sudo install -d -o adapt -g adapt -m 0700 /var/lib/adapt
sudo install -d -o root -g adapt -m 0750 /etc/adapt
sudo install -o root -g adapt -m 0640 /opt/adapt/deploy/api.env.example /etc/adapt/api.env
sudo install -o root -g adapt -m 0640 /opt/adapt/deploy/web.env.example /etc/adapt/web.env
sudoedit /etc/adapt/api.env
sudoedit /etc/adapt/web.env
```

Replace `learn.example.com` in **both** files and in the Nginx configuration. Keep these paired:

| Setting | Required production value |
|---|---|
| `ADAPT_MODE` | `production` |
| `ADAPT_FRONTEND_ORIGIN` | exact public HTTPS origin; no path or wildcard |
| `ADAPT_ALLOWED_HOSTS` (web) | exact public DNS name(s), comma-separated |
| `ADAPT_EXTRA_ALLOWED_HOSTS` (API) | same DNS name(s); loopback remains valid for the internal API hop |
| `ADAPT_REQUIRE_HTTPS` | `true` |
| `ADAPT_TRUSTED_PROXIES` | only actual direct peers; `127.0.0.1,::1` for this topology |
| `ADAPT_DATA_DIR`, `ADAPT_DB_PATH`, `ADAPT_KEYFILE` | absolute persistent paths under `/var/lib/adapt` |
| `ADAPT_DB_ENCRYPTION` | `sqlcipher` to fail rather than fall back to a plaintext container |
| `ADAPT_DEBUG`, `ADAPT_DEMO_MODE` | `false` |

Production validation rejects public HTTP origins, HTTPS without the matching requirement,
world-wide trusted-proxy networks, wildcard/credential-bearing origins, missing TLS certificate
key pairs, demo mode, debug mode and `ADAPT_DB_ENCRYPTION=off`. Do not weaken those checks to
make a misconfigured service start.

The default first start creates an owner-only key at `ADAPT_KEYFILE`. Back it up with the
database. Losing or replacing it can make existing encrypted values unrecoverable. Never generate
a new key to “fix” a key mismatch.

### AI provider configuration

No provider key is required: the deterministic local tutor remains available and reports simple
mode. To enable Gemini, put the credential only in `/etc/adapt/api.env` using `sudoedit`, or use
Adapt's hidden console credential flow. Never put it on a command line, in `web.env`, in frontend
`.env*` files, or in a `NEXT_PUBLIC_*` variable. Restart `adapt-api` after changing it.

`ADAPT_GEMINI_DAILY_CALL_BUDGET`, `ADAPT_GEMINI_DAILY_TOKEN_BUDGET`, model pins and timeouts are
API-only settings. Rolling model aliases can change underneath a deployment; pin a model when a
result must be reproducible. Provider/network/quota failures use the tested local fallback rather
than disabling learning. `adapt config test` makes a real provider request; it is not part of the
offline validation performed for this release.

### Credit-plan configuration

Startup applies migration `R10` and seeds plan slugs once from the packaged example. That example
is illustrative and deliberately has no currency or list price; seeding does not process payments.
To set commercial terms, install a separate API-only configuration and edit it:

```bash
sudo install -o root -g adapt -m 0640 \
  /opt/adapt/backend/src/adapt/credits/data/credit_plans.example.json \
  /etc/adapt/credit_plans.json
sudoedit /etc/adapt/credit_plans.json
```

Set `ADAPT_CREDIT_PLANS_PATH=/etc/adapt/credit_plans.json` in `/etc/adapt/api.env`, never in
`web.env`, then restart only after the JSON validates and a database backup exists. Existing slugs
are not overwritten on restart. The credit plane is institution-scoped; the learning plane is not
an institution-wide multi-tenant reporting system. See `BACKEND_READINESS.md` before making a
multi-tenant or payment claim.

## 5. TLS and Nginx

Obtain a publicly trusted certificate for the real DNS name before inviting users. Install the
example as a site (its `map` must be included by Nginx's `http` context, as on the standard
Debian `sites-enabled` layout), replace every example domain and verify certificate paths:

```bash
sudo cp /opt/adapt/deploy/nginx-adapt.conf /etc/nginx/sites-available/adapt.conf
sudoedit /etc/nginx/sites-available/adapt.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/adapt.conf /etc/nginx/sites-enabled/adapt.conf
sudo nginx -t
sudo systemctl reload nginx
```

The example enables TLS 1.2/1.3, HSTS, fixed-host HTTP redirect, 8 MiB body limit, bounded API
timeouts and a longer WebSocket idle timeout. Ensure no other default virtual host answers unknown
names with this application. Do not expose Nginx status, API docs or metrics publicly.

## 6. Services, startup and health

```bash
sudo cp /opt/adapt/deploy/adapt-api.service /etc/systemd/system/
sudo cp /opt/adapt/deploy/adapt-web.service /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/adapt-api.service /etc/systemd/system/adapt-web.service
sudo systemctl daemon-reload
sudo systemctl enable --now adapt-api.service
# Internal readiness gate before starting the public web service:
curl --fail -H 'Host: learn.example.com' -H 'X-Forwarded-Proto: https' \
  http://127.0.0.1:8000/readyz
sudo systemctl enable --now adapt-web.service
sudo systemctl status adapt-api.service adapt-web.service
```

Use the public HTTPS URL for subsequent checks. The API unit validates its environment before launch; application
startup then migrates and verifies the database before accepting traffic. Startup can take time on
a large existing database; do not start a second migration process against it.

- `/healthz`: process liveness only. It deliberately does not prove database health.
- `/readyz`: performs a real write and rolls it back. A read-only SQLite file can answer `SELECT 1`
  and even begin a transaction, so a read-only check is not sufficient.
- `/api/v1/health`: application capability information with sanitized database failure text.

```bash
curl --fail https://learn.example.com/healthz
curl --fail https://learn.example.com/readyz
curl --fail https://learn.example.com/api/v1/health
journalctl -u adapt-api.service -u adapt-web.service --since '15 minutes ago'
```

Request logs omit raw URLs, query strings, IP addresses, cookies and learner payloads. Uvicorn's
raw access log is disabled. Keep it disabled; do not log environment files or request bodies.

The units set memory/task/file-descriptor limits and graceful stop budgets. Uvicorn 0.54 re-raises
SIGTERM **after** application cleanup, so an API stop can report signal 15/status 143 even with
`Application shutdown complete` and `Finished server process` in the log. The smoke test requires
those cleanup markers rather than treating signal status alone as success.

## 7. Migration and release procedure

The existing Alembic revision history is preserved under `adapt/migrations`; no replacement or
parallel migration chain was introduced. Fresh and existing databases use the same keyed engine,
including SQLCipher. Startup also adopts the supported older unversioned `create_all` layout
without deleting learner history.

For each release:

1. Read the release diff and backup first. Do not assume a downgrade is schema-compatible.
2. Stop `adapt-web` and `adapt-api`; create and verify a database backup and secure the matching key.
3. Install the exact new commit using the clean-install steps above.
4. Start only `adapt-api`. Its startup runs `adapt.db.schema.upgrade_schema`, checks required
   tables/columns and samples encrypted values before serving.
5. Wait for `/readyz`, then start `adapt-web` and run the smoke checks.
6. Keep the pre-release backup until the release has been accepted. Never delete a database or
   blindly run `alembic stamp` to bypass a startup error.

For an explicit offline migration/seed, use the `adaptctl` helper below and run
`adaptctl /opt/adapt/.venv/bin/adapt init` while both services are stopped. Do not run it
concurrently with the API.

## 8. Backup and restore

Define this operator helper to execute a command with the API environment without sourcing the
secret file into a shell:

```bash
adaptctl() {
  sudo systemd-run --wait --pipe --collect \
    -p User=adapt -p Group=adapt \
    -p EnvironmentFile=/etc/adapt/api.env \
    -p WorkingDirectory=/opt/adapt \
    "$@"
}
```

### Backup

```bash
sudo install -d -o adapt -g adapt -m 0700 /var/backups/adapt
adaptctl /opt/adapt/.venv/bin/adapt db backup \
  --out "/var/backups/adapt/adapt-$(date -u +%Y%m%dT%H%M%SZ).db"
adaptctl /opt/adapt/.venv/bin/adapt db verify-encryption
```

`adapt db backup` uses SQLite/SQLCipher `VACUUM INTO`, refuses to overwrite, creates mode-0600
files, preserves the source file-encryption mode, checks the Alembic marker and runs
`PRAGMA integrity_check` on the result. It can take a consistent online snapshot but may compete
with the single writer; schedule it accordingly. It does **not** include the encryption key.

Back up the exact key source separately into an access-controlled, encrypted secret/backup store.
A database and key stored together in the same unencrypted off-site archive provide little
protection. Never print the key in a terminal or ticket. Test recovery on a schedule; an
integrity-checked database backup without its key is not a usable encrypted recovery.

### Restore

Restore requires the matching configuration and key. Stop both services; never restore into a
running database:

```bash
sudo systemctl stop adapt-web.service adapt-api.service
# Restore/confirm the matching key in its normal secret location first.
adaptctl /opt/adapt/.venv/bin/adapt db restore \
  --from /var/backups/adapt/REPLACE_WITH_VERIFIED_BACKUP.db --confirm
sudo systemctl start adapt-api.service
curl --fail https://learn.example.com/readyz
sudo systemctl start adapt-web.service
```

Restore validates the source with the configured driver/key, writes a pre-restore safety backup if
live data exists, atomically installs a mode-0600 replacement, prevents stale WAL replay and checks
integrity afterward. It does not silently migrate or bypass a wrong-key error. Preserve the safety
backup until recovery is confirmed. Startup on the next API launch applies any newer compatible
migrations normally.

## 9. Production smoke and failure drills

The repository smoke uses a fresh temporary SQLCipher database and a throwaway local certificate;
it does not touch `/var/lib/adapt` or use provider credentials:

```bash
cd /opt/adapt
python3.11 scripts/production_smoke.py \
  --python /opt/adapt/.venv/bin/python \
  --frontend /opt/adapt/frontend
```

It checks TLS forwarding, liveness/readiness, frontend service, unknown-Host rejection, exact CORS,
secure cookies, missing/valid CSRF, local fallback without a provider, session persistence across
an existing-database API restart, and graceful SIGTERM. This validates the forwarding contract,
not the Nginx file itself or a public CA. Run `nginx -t` and public-URL checks separately.

Also drill these before accepting a release:

- Make a scratch database read-only and confirm readiness becomes sanitized 503, not a false 200.
- Revoke/remove provider access in a scratch run and confirm local lessons still work and are
  labelled simple mode; do not run this against live learner traffic.
- Send an untrusted Host, a disallowed Origin, a mutation without CSRF, spoofed forwarding headers,
  an oversized/chunked body and a slow upstream. Expect 400/403/413/429/504 as appropriate, with no
  internal URL, credential or learner payload in the response.
- Stop each service with SIGTERM and confirm children/sockets do not survive. Start it again with
  the same data and key and verify an existing learner session.

## 10. Operations and incident response

- **Disk full/read-only:** remove the service from traffic, preserve DB/WAL/key, free space on the
  persistent volume, then require `/readyz`. Do not delete WAL files while the API is running.
- **Wrong key/policy:** keep the service stopped. Restore the original key and the
  `ADAPT_DB_ENCRYPTION` policy that wrote the file. Never force a new cipher or reset learner data.
- **AI outage/quota:** check API journals without exposing the key. Local fallback should continue;
  do not respond by logging prompts, provider responses or credentials.
- **Abuse:** keep rate limits and body limits enabled. `ADAPT_RATE_LIMIT_MULTIPLIER=1` is the public
  default. Room-specific multipliers are for trusted demos, not an Internet deployment. Limits are
  per process, so this single-worker design is part of the security model.
- **Credential exposure:** revoke/rotate at the provider, review access and RLS, scrub logs and
  artifacts, then assess Git history. Deleting a file or ZIP now does not revoke a credential or
  remove it from previous commits.
- **Updates:** audit dependencies without blindly applying major upgrades. Re-run clean install,
  build, proxy/migration/security tests and smoke before rollout.

Firewall ports 3000 and 8000 from all non-loopback peers. Retain journals and backups according to
a written learner-data retention policy. This release supplies mechanisms, not an organizational
retention, disaster-recovery or high-availability guarantee.
