#!/usr/bin/env python3
"""Single-host production smoke through TLS -> Node -> FastAPI.

No provider credential or real certificate is used. The temporary TLS terminator
models the forwarding contract of deploy/nginx-adapt.conf; it does not validate
that Nginx configuration itself. Requires openssl, Node and a built frontend.
"""

from __future__ import annotations

import argparse
import http.client
import json
import os
import signal
import ssl
import subprocess
import sys
import tempfile
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "learn.example.test"
ORIGIN = f"https://{HOST}"


def free_port() -> int:
    import socket

    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def request(port: int, method: str, path: str, *, body=None, headers=None, tls=True):
    payload = None if body is None else json.dumps(body).encode()
    sent = {"Host": HOST, **(headers or {})}
    if payload is not None:
        sent["Content-Type"] = "application/json"
        sent["Content-Length"] = str(len(payload))
    if tls:
        context = ssl._create_unverified_context()  # throwaway local certificate only
        connection = http.client.HTTPSConnection("127.0.0.1", port, timeout=15, context=context)
    else:
        connection = http.client.HTTPConnection("127.0.0.1", port, timeout=15)
    try:
        connection.request(method, path, body=payload, headers=sent)
        response = connection.getresponse()
        raw = response.read()
        return response.status, response.headers, raw
    finally:
        connection.close()


def json_body(raw: bytes):
    return json.loads(raw.decode())


def stop_process(process: subprocess.Popen, timeout=35) -> tuple[int, float]:
    if process.poll() is None:
        started = time.monotonic()
        process.send_signal(signal.SIGTERM)
        try:
            process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
            raise RuntimeError(f"process {process.pid} did not stop after SIGTERM")
        return int(process.returncode), time.monotonic() - started
    return int(process.returncode), 0.0


class Forwarder(BaseHTTPRequestHandler):
    web_port = 0
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):
        return

    def _forward(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else None
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"connection", "keep-alive", "transfer-encoding"}
        }
        headers["X-Forwarded-Proto"] = "https"
        headers["X-Forwarded-For"] = "192.0.2.123"
        upstream = http.client.HTTPConnection("127.0.0.1", self.web_port, timeout=20)
        try:
            upstream.request(self.command, self.path, body=body, headers=headers)
            response = upstream.getresponse()
            payload = response.read()
        except OSError:
            payload = b'{"error":"frontend_starting"}'
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            upstream.close()
            return
        try:
            self.send_response(response.status)
            for key, value in response.getheaders():
                if key.lower() not in {
                    "connection",
                    "keep-alive",
                    "transfer-encoding",
                    "content-length",
                }:
                    self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)
        finally:
            upstream.close()

    do_GET = _forward
    do_POST = _forward
    do_OPTIONS = _forward
    do_PATCH = _forward
    do_DELETE = _forward


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--python", required=True, type=Path, help="installed production venv Python")
    parser.add_argument("--frontend", type=Path, default=Path(__file__).resolve().parents[1] / "frontend")
    args = parser.parse_args()
    # Path.resolve() follows the venv Python symlink to /usr/bin and would then
    # look for the adapt entry point beside the system interpreter.
    python = args.python.expanduser().absolute()
    adapt = python.with_name("adapt")
    frontend = args.frontend.resolve()
    if not adapt.is_file():
        parser.error(f"adapt entry point not found beside {python}")
    if not (frontend / ".next" / "BUILD_ID").is_file():
        parser.error("frontend/.next/BUILD_ID is missing; run npm run build first")

    results = {"tls": "local self-signed test certificate", "checks": {}}
    with tempfile.TemporaryDirectory(prefix="adapt-production-smoke-") as temporary:
        root = Path(temporary)
        data = root / "data"
        logs = root / "logs"
        logs.mkdir()
        cert = root / "cert.pem"
        key = root / "key.pem"
        subprocess.run(
            [
                "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                "-days", "1", "-subj", f"/CN={HOST}", "-keyout", str(key), "-out", str(cert),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=30,
        )
        api_port, web_port, tls_port = free_port(), free_port(), free_port()
        base_env = {
            key: value
            for key, value in os.environ.items()
            if not key.startswith("ADAPT_") and key not in {"NODE_ENV", "HOST", "PORT"}
        }
        api_env = {
            **base_env,
            "ADAPT_MODE": "production",
            "ADAPT_DEBUG": "false",
            "ADAPT_DEMO_MODE": "false",
            "ADAPT_FRONTEND_ORIGIN": ORIGIN,
            "ADAPT_EXTRA_ALLOWED_HOSTS": HOST,
            "ADAPT_REQUIRE_HTTPS": "true",
            "ADAPT_TRUSTED_PROXIES": "127.0.0.1",
            "ADAPT_DATA_DIR": str(data),
            "ADAPT_DB_ENCRYPTION": "sqlcipher",
            "ADAPT_LOG_LEVEL": "INFO",
            "ADAPT_REQUEST_LOG_ENABLED": "true",
            "ADAPT_GRACEFUL_SHUTDOWN_TIMEOUT_S": "10",
        }
        web_env = {
            **base_env,
            "NODE_ENV": "production",
            "HOST": "127.0.0.1",
            "PORT": str(web_port),
            "ADAPT_API": f"http://127.0.0.1:{api_port}",
            "ADAPT_ALLOWED_HOSTS": HOST,
            "ADAPT_TRUSTED_PROXIES": "127.0.0.1",
            "ADAPT_PROXY_TIMEOUT_MS": "15000",
            "ADAPT_SHUTDOWN_TIMEOUT_MS": "5000",
            "NEXT_TELEMETRY_DISABLED": "1",
        }

        api_log_path = logs / "api.log"
        web_log_path = logs / "web.log"
        api_log = api_log_path.open("w", encoding="utf-8")
        web_log = web_log_path.open("w", encoding="utf-8")
        api = None
        web = None
        tls_server = None
        tls_thread = None
        try:
            def start_api():
                return subprocess.Popen(
                    [str(adapt), "serve", "--host", "127.0.0.1", "--port", str(api_port)],
                    cwd=root,
                    env=api_env,
                    stdout=api_log,
                    stderr=subprocess.STDOUT,
                )

            api = start_api()
            web = subprocess.Popen(
                ["node", "server.mjs"],
                cwd=frontend,
                env=web_env,
                stdout=web_log,
                stderr=subprocess.STDOUT,
            )
            Forwarder.web_port = web_port
            tls_server = ThreadingHTTPServer(("127.0.0.1", tls_port), Forwarder)
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(cert, key)
            tls_server.socket = context.wrap_socket(tls_server.socket, server_side=True)
            tls_thread = threading.Thread(target=tls_server.serve_forever, daemon=True)
            tls_thread.start()

            deadline = time.monotonic() + 120
            while True:
                if api.poll() is not None or web.poll() is not None:
                    raise RuntimeError("a service exited before becoming ready")
                try:
                    live = request(tls_port, "GET", "/healthz")
                    ready = request(tls_port, "GET", "/readyz")
                    if live[0] == ready[0] == 200:
                        break
                except OSError:
                    pass
                if time.monotonic() >= deadline:
                    raise RuntimeError("services did not become ready within 120 seconds")
                time.sleep(0.25)
            results["checks"]["liveness"] = live[0]
            results["checks"]["readiness"] = ready[0]

            page = request(tls_port, "GET", "/")
            assert page[0] == 200 and b"ADAPT" in page[2]
            results["checks"]["frontend"] = page[0]
            bad_host = request(tls_port, "GET", "/healthz", headers={"Host": "bad.example.test"})
            assert bad_host[0] == 400
            results["checks"]["untrusted_host"] = bad_host[0]

            preflight = request(
                tls_port,
                "OPTIONS",
                "/api/v1/students",
                headers={
                    "Origin": ORIGIN,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type,x-csrf-token",
                },
            )
            assert preflight[0] == 200 and preflight[1].get("access-control-allow-origin") == ORIGIN
            bad_cors = request(
                tls_port,
                "OPTIONS",
                "/api/v1/students",
                headers={"Origin": "https://bad.example.test", "Access-Control-Request-Method": "POST"},
            )
            assert bad_cors[0] == 400 and not bad_cors[1].get("access-control-allow-origin")
            results["checks"]["cors"] = {"allowed": preflight[0], "rejected": bad_cors[0]}

            created = request(
                tls_port,
                "POST",
                "/api/v1/students",
                body={"display_name": "Production Smoke", "as_guest": True, "consent_analytics": True},
                headers={"Origin": ORIGIN},
            )
            assert created[0] == 200, created[2]
            learner = json_body(created[2])
            csrf = learner["csrf_token"]
            cookies = SimpleCookie()
            for value in created[1].get_all("set-cookie") or []:
                cookies.load(value)
            assert all(cookie["secure"] for cookie in cookies.values())
            cookie_header = "; ".join(f"{key}={cookie.value}" for key, cookie in cookies.items())
            session_path = "/api/v1/sessions"
            common = {"Origin": ORIGIN, "Cookie": cookie_header}
            refused = request(tls_port, "POST", session_path, body={"mode": "practice"}, headers=common)
            assert refused[0] == 403, refused[2]
            session = request(
                tls_port,
                "POST",
                session_path,
                body={"mode": "practice"},
                headers={**common, "x-csrf-token": csrf},
            )
            assert session[0] == 200, session[2]
            results["checks"]["csrf"] = {"missing": refused[0], "valid": session[0]}

            api_code, api_seconds = stop_process(api)
            assert api_code in (0, -signal.SIGTERM), api_code
            assert "Application shutdown complete" in api_log_path.read_text(encoding="utf-8")
            results["checks"]["first_api_sigterm"] = {"exit": api_code, "seconds": round(api_seconds, 2)}
            api = start_api()
            deadline = time.monotonic() + 90
            while True:
                try:
                    restarted = request(tls_port, "GET", "/readyz")
                    if restarted[0] == 200:
                        break
                except OSError:
                    pass
                if api.poll() is not None or time.monotonic() >= deadline:
                    raise RuntimeError("API did not restart with the existing database")
                time.sleep(0.25)
            status = request(tls_port, "GET", "/api/v1/status", headers=common)
            assert status[0] == 200, status[2]
            protection = json_body(status[2])["data_protection"]
            assert protection["file_encrypted"] is True
            results["checks"]["existing_database_restart"] = {
                "status": status[0],
                "session_preserved": True,
                "file_encrypted": protection["file_encrypted"],
            }
            health = request(tls_port, "GET", "/api/v1/health")
            assert health[0] == 200 and json_body(health[2])["lessons"]["state"] == "simple mode"
            results["checks"]["no_provider_safe_fallback"] = health[0]

            web_code, web_seconds = stop_process(web, timeout=20)
            assert web_code == 0, web_code
            results["checks"]["web_sigterm"] = {"exit": web_code, "seconds": round(web_seconds, 2)}
            api_code, api_seconds = stop_process(api)
            assert api_code in (0, -signal.SIGTERM), api_code
            assert "Finished server process" in api_log_path.read_text(encoding="utf-8")
            results["checks"]["restarted_api_sigterm"] = {"exit": api_code, "seconds": round(api_seconds, 2)}

            # The smoke uses no credentials; these broad patterns catch accidental
            # future additions without printing any matched value.
            combined = api_log_path.read_text(encoding="utf-8") + web_log_path.read_text(encoding="utf-8")
            forbidden = ("BEGIN PRIVATE KEY", "ADAPT_GEMINI_API_KEY=", "ADAPT_DB_PASSPHRASE=")
            assert not any(marker in combined for marker in forbidden)
            results["checks"]["log_credential_patterns"] = 0
        except Exception:
            for path in (api_log_path, web_log_path):
                if path.exists():
                    # Operator diagnostics only; the application has its own redaction boundary.
                    print(f"--- {path.name} tail ---", file=sys.stderr)
                    print("\n".join(path.read_text(encoding="utf-8").splitlines()[-20:]), file=sys.stderr)
            raise
        finally:
            for process in (web, api):
                if process is not None and process.poll() is None:
                    process.kill()
                    process.wait(timeout=5)
            if tls_server is not None:
                tls_server.shutdown()
                tls_server.server_close()
            if tls_thread is not None:
                tls_thread.join(timeout=5)
            api_log.close()
            web_log.close()
    print(json.dumps(results, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
