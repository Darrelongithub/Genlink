#!/usr/bin/env python3
"""Release secret scan: tracked files AND the two committed ZIP archives.

Design rules:

* Never print a secret. Every finding reports a path, a line/member, a kind, a
  length and a truncated SHA-256 fingerprint only.
* Only high-confidence private-credential patterns FAIL the gate. A Supabase
  *publishable/anon* key in a browser bundle is public by design and is reported
  as INFORMATIONAL; a service-role key or a private key is not.
* Placeholders in .env.example, docs and tests are allowlisted by value shape.
* ZIP members are read in memory. Nothing is extracted into the working tree.

Run::

    .venv/bin/python release/secret_scan.py --out release/evidence/secret-scan.json
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import zipfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]

HIGH = [
    ("private_key_block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----")),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b")),
    ("openai_key", re.compile(r"\bsk-[A-Za-z0-9]{24,}\b")),
    ("slack_token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("google_api_key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("supabase_service_role", re.compile(r"(?i)\b(?:supabase[_-]?)?service[_-]?role[_-]?key\b\s*[:=]\s*[\"']?([A-Za-z0-9_\-\.]{20,})")),
]

GENERIC = re.compile(
    r"(?i)\b(api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token|private[_-]?key)"
    r"\s*[:=]\s*[\"']?([A-Za-z0-9_\-\/+=]{24,})[\"']?"
)
PUBLIC_BROWSER_KEY = re.compile(
    r"(?i)\b(VITE_[A-Z0-9_]*(?:PUBLISHABLE|ANON)[A-Z0-9_]*|NEXT_PUBLIC_[A-Z0-9_]*(?:ANON|PUBLISHABLE)[A-Z0-9_]*)\s*=\s*([\"']?)([A-Za-z0-9_\-\.]{20,})\2"
)
PLACEHOLDER = re.compile(
    r"(?i)(your|example|placeholder|paste|changeme|dummy|sample|redacted|not[_-]?a[_-]?real|fake|demo|xxx|todo|localhost|<|\$\{|process\.env|os\.environ|base64|absolute|path/to|correct horse|a long demo|test[_-]?token|not[_-]?the[_-]?token|release-contract-token|genlink-demo-token)"
)
TEXT_SUFFIXES = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md",
    ".txt", ".yml", ".yaml", ".toml", ".ini", ".env", ".sh", ".sql", ".html",
    ".css", ".cfg", ".conf", ".example", ".lock",
}
SKIP_PARTS = {"node_modules", ".next", "dist", "build", ".venv", "__pycache__", "test-results"}
# Redaction canaries deliberately contain credential-shaped strings. A generic
# assignment inside a test file is INFORMATIONAL; the high-confidence patterns
# above (AKIA, gh*, sk-, private key blocks, service-role keys) still fail there.
TEST_PATH = re.compile(r"(?i)(^|/)(tests?|__tests__)/|test_[^/]*\.py$|\.spec\.[jt]sx?$|\.test\.[jt]sx?$")


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", "replace")).hexdigest()[:10]


def _finding(path: str, line: int | None, kind: str, value: str, severity: str, note: str = "") -> dict[str, Any]:
    return {
        "path": path, "line": line, "kind": kind, "severity": severity,
        "value_length": len(value), "sha256_prefix": _fingerprint(value),
        "note": note,
    }


def _scan_text(path: str, text: str, where: str, findings: list[dict[str, Any]]) -> None:
    lines = text.splitlines()
    for number, line in enumerate(lines, 1):
        stripped = line.strip()
        for kind, pattern in HIGH:
            match = pattern.search(line)
            if match:
                value = match.group(1) if match.lastindex else match.group(0)
                findings.append(_finding(f"{where}:{path}", number, kind, value, "HIGH"))
        public = PUBLIC_BROWSER_KEY.search(line)
        if public:
            findings.append(_finding(
                f"{where}:{path}", number, "browser_public_key", public.group(3), "INFO",
                note=f"{public.group(1)} is a browser-public Supabase publishable/anon key; "
                     "it is not a service credential, but shipping any environment file in an "
                     "archive is still a release finding.",
            ))
            continue
        if stripped.startswith(("#", "//", "*", "<!--")):
            continue  # commented examples, not configured credentials
        generic = GENERIC.search(line)
        if generic:
            value = generic.group(2)
            if not PLACEHOLDER.search(value) and not PLACEHOLDER.search(line[:generic.start()]):
                in_test = bool(TEST_PATH.search(path))
                findings.append(_finding(
                    f"{where}:{path}", number, f"generic_{generic.group(1).lower()}",
                    value, "INFO" if in_test else "HIGH",
                    note="credential-shaped test fixture; verify it is synthetic"
                    if in_test else "high-entropy-looking assignment; verify and rotate if real",
                ))


def _tracked_files() -> list[pathlib.Path]:
    out = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True)
    paths = []
    for raw in out.stdout.split(b"\0"):
        if not raw:
            continue
        path = ROOT / raw.decode("utf-8", "replace")
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        if (path.suffix.lower() in TEXT_SUFFIXES or path.name in (".env", ".env.example")) \
                and path.is_file() and path.stat().st_size < 3_000_000:
            paths.append(path)
    return paths


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="release/evidence/secret-scan.json")
    args = parser.parse_args()

    findings: list[dict[str, Any]] = []
    scanned_files = 0
    scanned_members = 0
    for path in _tracked_files():
        try:
            _scan_text(str(path.relative_to(ROOT)), path.read_text(encoding="utf-8", errors="replace"), "tracked", findings)
            scanned_files += 1
        except OSError:
            continue

    for archive in sorted(ROOT.glob("*.zip")):
        with zipfile.ZipFile(archive) as zf:
            for name in zf.namelist():
                if name.endswith("/"):
                    continue
                suffix = pathlib.PurePosixPath(name).suffix.lower()
                if suffix not in TEXT_SUFFIXES and pathlib.PurePosixPath(name).name not in (".env", ".env.example"):
                    continue
                info = zf.getinfo(name)
                if info.file_size > 3_000_000:
                    continue
                try:
                    text = zf.read(name).decode("utf-8", "replace")
                except (RuntimeError, UnicodeError, zipfile.BadZipFile):
                    continue
                _scan_text(name, text, f"zip:{archive.name}", findings)
                scanned_members += 1

    high = [f for f in findings if f["severity"] == "HIGH"]
    info = [f for f in findings if f["severity"] == "INFO"]
    report = {
        "scanned_tracked_files": scanned_files,
        "scanned_archive_members": scanned_members,
        "high_severity_count": len(high),
        "informational_count": len(info),
        "high_severity": high,
        "informational": info,
        "policy": "HIGH fails the gate. INFO is reported for a human decision. No secret values are stored in this report.",
        "outcome": "FAIL" if high else "PASS",
    }
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"scanned {scanned_files} tracked files + {scanned_members} archive text members")
    for item in high:
        print(f"  HIGH {item['path']}:{item['line']} {item['kind']} len={item['value_length']} fp={item['sha256_prefix']}")
    for item in info:
        print(f"  INFO {item['path']}:{item['line']} {item['kind']} len={item['value_length']} fp={item['sha256_prefix']}")
    print(f"wrote {args.out} — {report['outcome']}")
    return 1 if high else 0


if __name__ == "__main__":
    sys.exit(main())
