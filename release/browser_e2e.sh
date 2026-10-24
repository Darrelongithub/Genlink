#!/usr/bin/env bash
# Selected browser smoke tests. Chromium is the one dependency the sandbox cannot
# download, so "cannot install a browser" is recorded as BLOCKED, not as a pass and
# not as a fake failure. When the browser IS available, a real test failure fails
# this script. Evidence is always written to release/evidence/browser-e2e.json.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT="release/evidence/browser-e2e.json"
mkdir -p "$(dirname "$OUT")"

blocked() {
  local reason="$1"
  printf '{\n  "outcome": "BLOCKED",\n  "reason": "%s",\n  "policy": "browser download is environmental noise; this is NOT a passing browser gate",\n  "tests": []\n}\n' "$reason" > "$OUT"
  echo "BLOCKED: $reason"
  exit 0
}

if ! npx --yes playwright@1.64.0 install --with-deps chromium > /tmp/adapt-playwright-install.log 2>&1; then
  tail -5 /tmp/adapt-playwright-install.log
  blocked "Chromium could not be installed in this environment (playwright install failed)"
fi

API_PORT="${API_PORT:-8051}"
WEB_PORT="${WEB_PORT:-3051}"
DATA="$(mktemp -d /tmp/adapt-browser-e2e-XXXXXX)"
export ADAPT_DATA_DIR="$DATA"
export ADAPT_KEYFILE="$DATA/master.key"
export ADAPT_DB_ENCRYPTION=field-only
export ADAPT_MODE=local
export PYTHONPATH="$ROOT/Adapt-main/backend/src"
export ADAPT_LOG_LEVEL=WARNING
export ADAPT_RATE_LIMIT_MULTIPLIER=20
export ADAPT_OPENALEX_ENABLED=false
export ADAPT_ARXIV_ENABLED=false
export ADAPT_OPENLIBRARY_ENABLED=false
export ADAPT_YOUTUBE_ENABLED=false
unset ADAPT_GEMINI_API_KEY ADAPT_YOUTUBE_API_KEY || true

"${ADAPT_PYTHON:-$ROOT/.venv/bin/python}" -m uvicorn adapt.api.app:app \
  --host 127.0.0.1 --port "$API_PORT" --log-level warning \
  > /tmp/adapt-browser-api.log 2>&1 &
API_PID=$!
WEB_PID=0
WEB_WRAPPER_PID=0
cleanup() {
  kill "$WEB_PID" 2>/dev/null || true
  kill "$API_PID" 2>/dev/null || true
  rm -rf "$DATA"
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$API_PORT/healthz" > /dev/null; then break; fi
  sleep 0.25
done
curl -sf "http://127.0.0.1:$API_PORT/healthz" > /dev/null || blocked "the API did not start for the browser suite"

(
  cd "$ROOT/Adapt-main/frontend"
  ADAPT_API="http://127.0.0.1:$API_PORT" HOST=127.0.0.1 PORT="$WEB_PORT" \
    NODE_ENV=production node server.mjs > /tmp/adapt-browser-web.log 2>&1 &
  echo $! > /tmp/adapt-browser-web.pid
  wait
) &
WEB_WRAPPER_PID=$!
for _ in $(seq 1 20); do
  if [ -s /tmp/adapt-browser-web.pid ]; then break; fi
  sleep 0.1
done
WEB_PID="$(cat /tmp/adapt-browser-web.pid 2>/dev/null || echo 0)"
for _ in $(seq 1 80); do
  if curl -sf "http://127.0.0.1:$WEB_PORT/" > /dev/null; then break; fi
  sleep 0.25
done
if ! curl -sf "http://127.0.0.1:$WEB_PORT/" > /dev/null; then
  tail -10 /tmp/adapt-browser-web.log
  wait "$WEB_WRAPPER_PID" 2>/dev/null || true
  blocked "the built frontend did not start for the browser suite"
fi

cd "$ROOT/Adapt-main/frontend"
export ADAPT_BASE_URL="http://127.0.0.1:$WEB_PORT"
TESTS="[]"
FAILED=0
run_test() {
  local label="$1"; shift
  local log="/tmp/adapt-browser-${label}.log"
  if "$@" > "$log" 2>&1; then
    echo "  ok   $label"
    TESTS="$(python3 -c 'import json,sys; a=json.loads(sys.argv[1]); a.append({"name":sys.argv[2],"outcome":"PASS"}); print(json.dumps(a))' "$TESTS" "$label")"
  else
    echo "  FAIL $label"
    tail -8 "$log"
    TESTS="$(python3 -c 'import json,sys; a=json.loads(sys.argv[1]); a.append({"name":sys.argv[2],"outcome":"FAIL"}); print(json.dumps(a))' "$TESTS" "$label")"
    FAILED=1
  fi
}
run_test banned-phrases npm run test:e2e:banned
run_test demo-flow npm run test:e2e:demo

kill "$WEB_PID" 2>/dev/null || true
wait "$WEB_WRAPPER_PID" 2>/dev/null || true
cd "$ROOT"
python3 - "$OUT" "$TESTS" "$FAILED" <<'PY'
import json,sys
out,tests,failed=sys.argv[1],sys.argv[2],int(sys.argv[3])
report={
 "outcome":"FAIL" if failed else "PASS",
 "tests":json.loads(tests),
 "policy":"real browser failures fail the job; an unavailable Chromium binary is BLOCKED",
}
open(out,"w").write(json.dumps(report,indent=2)+"\n")
PY
echo "browser e2e: $([ "$FAILED" -eq 0 ] && echo PASS || echo FAIL)"
exit "$FAILED"
