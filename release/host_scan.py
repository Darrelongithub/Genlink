#!/usr/bin/env python3
"""Browser-host contract scan: browser code must never call localhost directly.

Checks both halves of this repository:

* the live Adapt Next.js app under ``Adapt-main/frontend/src``;
* the Genlink Vite app that currently exists ONLY inside the committed archive
  ``genink-school-of-the-elites-main (1).zip`` (read in memory, never extracted).

It flags *network calls* and *base-URL assignments* aimed at loopback, plus a
browser module reading a non-``NEXT_PUBLIC_`` process.env variable (undefined in
the browser). A loopback string inside a security origin allowlist is reported as
a note, not a violation: it is not a request.

Run::

    .venv/bin/python release/host_scan.py --out release/evidence/host-scan.json
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import zipfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOOPBACK = r"(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)"
CALL = re.compile(
    rf"(?i)\b(?:fetch|axios\.(?:get|post|put|patch|delete)|\.open)\s*\(\s*[\"'`]https?://{LOOPBACK}(?::\d+)?"
)
BASE_ASSIGNMENT = re.compile(
    rf"(?i)\b(?:const|let|var)\s+\w*(?:API|BASE|URL|HOST|ORIGIN)\w*\s*(?::[^=]+)?=\s*[\"'`]https?://{LOOPBACK}(?::\d+)?"
)
ENV_READ = re.compile(r"\bprocess\.env\.([A-Z0-9_]+)")
LOOPBACK_MENTION = re.compile(rf"(?i)https?:(?:\\/\\/|//){LOOPBACK}(?::\d+)?")
BROWSER_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".html"}
SKIP_NAME = re.compile(r"(?i)(\.test\.|test_|tests-e2e|/__tests__/|\.spec\.)")


def _violations(path: str, text: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for number, line in enumerate(text.splitlines(), 1):
        if CALL.search(line):
            out.append({"path": path, "line": number, "kind": "browser_network_call_to_loopback"})
        if BASE_ASSIGNMENT.search(line):
            out.append({"path": path, "line": number, "kind": "browser_base_url_is_loopback"})
        for match in ENV_READ.finditer(line):
            name = match.group(1)
            if not name.startswith("NEXT_PUBLIC_"):
                out.append({"path": path, "line": number, "kind": "browser_reads_server_env", "variable": name})
    return out


def _notes(path: str, text: str) -> list[dict[str, Any]]:
    return [
        {"path": path, "line": number, "kind": "loopback_string_in_non_call_context"}
        for number, line in enumerate(text.splitlines(), 1)
        if LOOPBACK_MENTION.search(line) and not CALL.search(line) and not BASE_ASSIGNMENT.search(line)
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="release/evidence/host-scan.json")
    args = parser.parse_args()

    violations: list[dict[str, Any]] = []
    notes: list[dict[str, Any]] = []
    files = 0
    members = 0

    adapt_sources = [ROOT / "Adapt-main" / "frontend" / "src"]
    # main extracted a second, refactored Adapt copy at the top level on 2026-10-23.
    # Scan it too when present so the gate does not silently cover only the older path.
    if (ROOT / "adapt" / "frontend" / "src").exists():
        adapt_sources.append(ROOT / "adapt" / "frontend" / "src")
    for adapt_src in adapt_sources:
        for path in sorted(adapt_src.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in BROWSER_SUFFIXES:
                continue
            rel = str(path.relative_to(ROOT))
            if SKIP_NAME.search(rel):
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            violations.extend(_violations(rel, text))
            notes.extend(_notes(rel, text))
            files += 1

    # Genlink was also extracted to the repository root on main. Prefer the real
    # source tree; fall back to the archive on older checkouts.
    genlink_src = ROOT / "src"
    if genlink_src.exists():
        for path in sorted(genlink_src.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in BROWSER_SUFFIXES:
                continue
            rel = str(path.relative_to(ROOT))
            if SKIP_NAME.search(rel):
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            violations.extend(_violations(rel, text))
            notes.extend(_notes(rel, text))
            members += 1
        index = ROOT / "index.html"
        if index.exists():
            text = index.read_text(encoding="utf-8", errors="replace")
            violations.extend(_violations("index.html", text))
            notes.extend(_notes("index.html", text))
            members += 1

    archive = ROOT / "genink-school-of-the-elites-main (1).zip"
    if archive.exists():
        with zipfile.ZipFile(archive) as zf:
            for name in zf.namelist():
                if name.endswith("/") or pathlib.PurePosixPath(name).suffix.lower() not in BROWSER_SUFFIXES:
                    continue
                if SKIP_NAME.search(name) or "/supabase/functions/" in name:  # server-side Deno functions
                    continue
                if not name.startswith("genink-school-of-the-elites-main/src/") and not name.endswith("index.html"):
                    continue
                info = zf.getinfo(name)
                if info.file_size > 2_000_000:
                    continue
                text = zf.read(name).decode("utf-8", "replace")
                label = f"zip:{archive.name}:{name}"
                violations.extend(_violations(label, text))
                notes.extend(_notes(label, text))
                members += 1

    report = {
        "adapt_browser_files_scanned": files,
        "genlink_browser_files_scanned": members,
        "genlink_source": "root src/ (extracted on main)" if (ROOT / "src").exists() else "archive only",
        "violations": violations,
        "informational_loopback_mentions": notes[:40],
        "informational_count": len(notes),
        "policy": "A browser network call or base URL aimed at loopback is a release blocker: in the hosted preview the learner's own machine is not the server. Origin-allowlist regexes and test/config files are informational.",
        "outcome": "FAIL" if violations else "PASS",
    }
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"scanned {files} Adapt browser files + {members} Genlink browser files")
    for item in violations:
        print(f"  FAIL {item['path']}:{item['line']} {item['kind']}")
    for item in notes[:8]:
        print(f"  note {item['path']}:{item['line']} {item['kind']}")
    print(f"wrote {args.out} — {report['outcome']}")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
