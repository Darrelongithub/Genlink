"""Failure-behaviour tests for the test-only Genlink→Adapt reference caller.

Everything here runs against in-process fake HTTP servers on an ephemeral loopback port.
No real Adapt process, no browser, no AI key, no network egress. The loopback URL is
always passed with ``allow_loopback=True`` so the guard that stops a deployed caller
from accidentally targeting localhost stays testable.

Run from the repository root::

    python3 -m unittest discover -s integration -p 'test_*.py' -v
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import contextlib
import json
import socket
import sys
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE.parent) not in sys.path:
    sys.path.insert(0, str(HERE.parent))

from integration.reference_client import adapt, idempotency_key  # noqa: E402

FIXTURES = HERE / "contract" / "fixtures"
REQUEST = json.loads((FIXTURES / "valid_request.json").read_text(encoding="utf-8"))
CAPTURED = json.loads((FIXTURES / "captured_response.json").read_text(encoding="utf-8"))
STANDARD = json.loads((FIXTURES / "standard_content_fallback.json").read_text(encoding="utf-8"))


class _State:
    def __init__(self) -> None:
        self.requests: list[dict[str, Any]] = []
        self.lock = threading.Lock()

    def record(self, handler: BaseHTTPRequestHandler) -> None:
        length = int(handler.headers.get("content-length") or 0)
        raw = handler.rfile.read(length) if length else b""
        with self.lock:
            self.requests.append({
                "path": handler.path,
                "idempotency_key": handler.headers.get("Idempotency-Key"),
                "authorization": handler.headers.get("Authorization"),
                "body": json.loads(raw.decode("utf-8")) if raw else None,
            })


def _make_server(mode: str, state: _State, *, sleep_s: float = 0.0):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *_args):  # keep the test output readable
            pass

        def _send(self, code: int, payload: Any, *, retry_after: str | None = None) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            if retry_after is not None:
                self.send_header("Retry-After", retry_after)
            self.end_headers()
            # the timeout tests deliberately hang up on this server
            with contextlib.suppress(BrokenPipeError, ConnectionResetError):
                self.wfile.write(body)

        def do_POST(self):
            state.record(self)
            if self.path == "/api/v1/integration/adapt":
                if mode == "slow":
                    time.sleep(sleep_s)
                    self._send(200, CAPTURED)
                elif mode == "unavailable":
                    self._send(503, {"detail": {"error": "temporarily_unavailable"}}, retry_after="0")
                elif mode == "rate_limited":
                    self._send(429, {"detail": {"error": "rate_limited", "retry_after_s": 0}})
                elif mode == "unauthorized":
                    self._send(401, {"detail": {"error": "integration_unauthorized"}})
                elif mode == "malformed":
                    self._send(200, {"ok": True})
                elif mode == "not_json":
                    body = b"<html>not json</html>"
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                else:
                    self._send(200, CAPTURED)
                return
            # A separate model-backed route exists on the real app. Here it is down, so a
            # caller can prove the integration door does not depend on the model.
            if self.path in ("/api/v1/lesson/plan", "/api/v1/tutor/ask"):
                self._send(503, {"detail": {"error": "model_unavailable"}})
                return
            self._send(404, {"detail": "not found"})

        def do_GET(self):
            state.record(self)
            if self.path == "/api/v1/status":
                self._send(200, {"llm": {"configured": False}, "mode": "local"})
            else:
                self._send(404, {"detail": "not found"})

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    return server


class _ServerCase(unittest.TestCase):
    mode = "ok"

    def setUp(self) -> None:
        self.state = _State()
        self.server = _make_server(self.mode, self.state, sleep_s=0.25)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)

    def call(self, **kw):
        kw.setdefault("timeout_s", 0.4)
        kw.setdefault("backoff_s", 0.01)
        kw.setdefault("allow_loopback", True)
        kw.setdefault("standard_content", STANDARD)
        return adapt(self.base, REQUEST, **kw)


class HappyPathTests(_ServerCase):
    def test_valid_response_is_accepted_and_carries_the_contract_flags(self):
        result = self.call(token="release-contract-token")
        self.assertEqual(result.source, "adapt")
        self.assertTrue(result.adapted)
        self.assertEqual(result.attempts, 1)
        self.assertEqual(result.status, 200)
        self.assertTrue(result.payload["engine"]["local_only"])
        self.assertEqual(result.payload["learner_id"], "genlink-42")
        self.assertEqual(self.state.requests[0]["path"], "/api/v1/integration/adapt")
        self.assertEqual(
            self.state.requests[0]["authorization"], "Bearer release-contract-token"
        )

    def test_duplicate_submissions_are_byte_identical_and_share_one_key(self):
        first = self.call()
        second = self.call()
        self.assertEqual(first.payload["adapted_content"], second.payload["adapted_content"])
        self.assertEqual(first.idempotency_key, second.idempotency_key)
        self.assertEqual(
            len({r["idempotency_key"] for r in self.state.requests}), 1,
            "a retry of the same logical request must carry the same idempotency key",
        )
        self.assertEqual(idempotency_key(REQUEST), first.idempotency_key)

    def test_different_learners_get_different_idempotency_keys(self):
        other = dict(REQUEST)
        other["learner"] = {"id": "genlink-43"}
        self.assertNotEqual(idempotency_key(REQUEST), idempotency_key(other))

    def test_invalid_request_never_touches_the_network(self):
        result = self.call()
        self.assertTrue(result.adapted)
        bad = adapt(
            self.base, {"concept": "x", "activity": [{"correct": "perhaps"}]},
            standard_content=STANDARD, allow_loopback=True,
        )
        self.assertFalse(bad.adapted)
        self.assertEqual(bad.attempts, 0)
        self.assertIn("invalid_request", bad.error or "")
        self.assertEqual(len(self.state.requests), 1, "only the valid call was sent")
        self.assertEqual(result.attempts, 1)

    def test_loopback_is_refused_without_an_explicit_opt_in(self):
        with self.assertRaisesRegex(ValueError, "no localhost default"):
            adapt("", REQUEST, standard_content=STANDARD)
        with self.assertRaisesRegex(ValueError, "loopback"):
            adapt(self.base, REQUEST, standard_content=STANDARD)

    def test_model_unavailable_does_not_fail_the_integration_door(self):
        """Status says no key; the model-backed route is 503; the door is still 200."""
        import urllib.request

        with urllib.request.urlopen(self.base + "/api/v1/status", timeout=2) as response:
            status = json.loads(response.read())
        self.assertFalse(status["llm"]["configured"])
        model_request = urllib.request.Request(
            self.base + "/api/v1/lesson/plan", data=b"{}", method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(model_request, timeout=2)
        self.assertEqual(caught.exception.code, 503)
        result = self.call()
        self.assertEqual(result.status, 200)
        self.assertTrue(result.payload["engine"]["local_only"])


class TimeoutTests(_ServerCase):
    mode = "slow"

    def test_timeout_is_bounded_and_retries_reuse_the_key(self):
        result = self.call(timeout_s=0.05, max_attempts=3)
        self.assertEqual(result.source, "standard_content")
        self.assertEqual(result.attempts, 3)
        self.assertIn("adapt_unavailable", result.error or "")
        self.assertEqual(len(self.state.requests), 3)
        self.assertEqual(len({r["idempotency_key"] for r in self.state.requests}), 1)
        self.assertEqual(len(result.retry_after_s), 2)
        self.assertGreaterEqual(result.elapsed_ms, 100)  # three 50 ms timeouts

    def test_fallback_is_honestly_labelled_and_is_the_callers_own_content(self):
        result = self.call(timeout_s=0.05, max_attempts=1)
        self.assertFalse(result.payload["adapted"])
        self.assertEqual(result.payload["source"], "standard_content")
        self.assertIn("not an adapted lesson", result.payload["notice"])
        self.assertEqual(result.payload["learner_id"], "genlink-42")
        self.assertEqual(
            result.payload["blocks"], STANDARD["blocks"],
            "the fallback must be the caller's own material, not a fabricated Adapt lesson",
        )


class UnavailableTests(_ServerCase):
    mode = "unavailable"

    def test_503_is_retried_then_falls_back(self):
        result = self.call(max_attempts=3)
        self.assertFalse(result.adapted)
        self.assertEqual(result.attempts, 3)
        self.assertEqual(result.status, 503)
        self.assertEqual(len(self.state.requests), 3)

    def test_retry_storm_is_bounded(self):
        with ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(lambda _i: self.call(max_attempts=2), range(12)))
        self.assertTrue(all(not r.adapted for r in results))
        # The bounded-retry guarantee lives on each caller result. Counting only
        # requests that reached the fake handler is a lower bound: under a 12-way
        # burst the ThreadingHTTPServer can refuse a connection before do_POST runs,
        # which is still a transport attempt, not an extra retry. Asserting an exact
        # 24 handler hits made this test flaky without testing the real invariant.
        self.assertTrue(all(r.attempts == 2 for r in results),
                        "every logical request must stop after exactly 2 attempts")
        self.assertLessEqual(len(self.state.requests), 24,
                             "12 logical requests x 2 attempts is the hard ceiling")
        self.assertGreaterEqual(len(self.state.requests), 12,
                                "each logical request must have tried at least once")


class RateLimitedTests(_ServerCase):
    mode = "rate_limited"

    def test_429_is_retried_with_a_bounded_wait(self):
        result = self.call(max_attempts=2, backoff_s=0.01)
        self.assertFalse(result.adapted)
        self.assertEqual(result.attempts, 2)
        self.assertEqual(result.status, 429)
        self.assertTrue(all(w <= 0.08 for w in result.retry_after_s))


class UnauthorizedTests(_ServerCase):
    mode = "unauthorized"

    def test_401_is_not_retried(self):
        result = self.call(max_attempts=3)
        self.assertEqual(result.attempts, 1)
        self.assertEqual(result.status, 401)
        self.assertEqual(len(self.state.requests), 1)
        self.assertIn("http_401", result.error or "")


class MalformedResponseTests(_ServerCase):
    mode = "malformed"

    def test_a_200_that_violates_the_schema_is_never_trusted(self):
        result = self.call(max_attempts=2)
        self.assertFalse(result.adapted)
        self.assertIn("invalid_response", result.error or "")
        self.assertEqual(result.attempts, 1, "a broken 200 is not a reason to retry")
        self.assertEqual(len(self.state.requests), 1)


class NotJsonTests(_ServerCase):
    mode = "not_json"

    def test_html_instead_of_json_falls_back(self):
        result = self.call()
        self.assertFalse(result.adapted)
        self.assertIn("invalid_response", result.error or "")


class ConnectionFailureTests(unittest.TestCase):
    def test_connection_refused_falls_back(self):
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        sock.close()  # nothing is listening now
        result = adapt(
            f"http://127.0.0.1:{port}", REQUEST, standard_content=STANDARD,
            max_attempts=2, timeout_s=0.2, backoff_s=0.01, allow_loopback=True,
        )
        self.assertFalse(result.adapted)
        self.assertEqual(result.attempts, 2)
        self.assertIn("transport_", result.error or "")

    def test_connection_interrupted_mid_response_falls_back(self):
        """A server that accepts, sends headers, then closes: the caller must not crash."""
        listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind(("127.0.0.1", 0))
        listener.listen(8)
        port = listener.getsockname()[1]

        def break_connections() -> None:
            for _ in range(3):
                try:
                    conn, _ = listener.accept()
                    conn.recv(65536)
                    conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: 5000\r\n\r\n{")
                    conn.close()
                except OSError:
                    break

        thread = threading.Thread(target=break_connections, daemon=True)
        thread.start()
        try:
            result = adapt(
                f"http://127.0.0.1:{port}", REQUEST, standard_content=STANDARD,
                max_attempts=3, timeout_s=0.3, backoff_s=0.01, allow_loopback=True,
            )
            self.assertFalse(result.adapted)
            self.assertIn("adapt_unavailable", result.error or "")
            self.assertGreaterEqual(result.attempts, 1)
        finally:
            listener.close()
            thread.join(timeout=3)


class ConcurrentModelRequestTests(_ServerCase):
    mode = "ok"

    def test_concurrent_adapt_calls_are_all_answered(self):
        started = time.monotonic()
        with ThreadPoolExecutor(max_workers=16) as pool:
            results = list(pool.map(lambda _i: self.call(), range(64)))
        elapsed_ms = int((time.monotonic() - started) * 1000)
        self.assertTrue(all(r.adapted for r in results), "any failure must be reported")
        self.assertEqual(len(self.state.requests), 64)
        self.assertEqual(len({id(r.payload) for r in results}), 64)
        # Recorded, not asserted against a magic threshold: a slow machine is not a regression.
        print(f"\n[measured] 64 concurrent reference-caller adaptations in {elapsed_ms} ms")


if __name__ == "__main__":
    unittest.main(verbosity=2)
