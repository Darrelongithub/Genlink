#!/usr/bin/env python3
# ruff: noqa: E501 -- this release script prints long diagnostic paths and command lines.
"""Diff-aware Python lint gate.

The backend already has 5,108 Ruff findings and 217 mypy errors at the release
baseline. Failing CI on that inherited debt would be noise, but letting new code
add more would be a real regression. So this gate runs Ruff on every *changed*
Python file and fails only for findings on lines this branch added. The full
baseline counts are reported in the JSON output for the release decision.

Usage::

    .venv/bin/python release/lint_changed.py --working-tree
    .venv/bin/python release/lint_changed.py --base origin/main

``mypy`` is intentionally report-only here: its 217 baseline errors are recorded
in RELEASE_READINESS.md, not silently reclassified as clean. Frontend type
checking is a hard gate via ``tsc --noEmit`` in ``npm run lint``.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import py_compile
import re
import subprocess
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND = ROOT / "Adapt-main" / "backend"
HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")


def _git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout


def _changed_files(base: str | None) -> list[tuple[pathlib.Path, bool]]:
    """Return (path, is_untracked)."""
    out: list[tuple[pathlib.Path, bool]] = []
    if base is None:
        raw = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all", "-z"],
                             cwd=ROOT, capture_output=True, text=True, check=True).stdout
        for entry in raw.split("\0"):
            if not entry or len(entry) < 4:
                continue
            code, path = entry[:2], entry[3:]
            if "D" in code:
                continue
            full = ROOT / path
            if any(part in {".venv", "node_modules", "__pycache__"} for part in full.parts):
                continue
            if full.suffix == ".py" and full.exists():
                out.append((full, "?" in code))
    else:
        raw = _git("diff", "--name-only", "-z", f"{base}...HEAD")
        for path in raw.split("\0"):
            if not path:
                continue
            full = ROOT / path
            if full.suffix == ".py" and full.exists():
                out.append((full, False))
    return sorted(set(out), key=lambda pair: str(pair[0]))


def _added_lines(path: pathlib.Path, base: str | None, untracked: bool) -> set[int]:
    tracked_check = subprocess.run(
        ["git", "ls-files", "--error-unmatch", str(path.relative_to(ROOT))],
        cwd=ROOT, capture_output=True,
    ).returncode == 0
    if untracked or (base is None and not tracked_check):
        try:
            return set(range(1, len(path.read_text(encoding="utf-8", errors="replace").splitlines()) + 1))
        except OSError:
            return set()
    args = ["diff", "-U0"] + ([base + "...HEAD"] if base else []) + ["--", str(path.relative_to(ROOT))]
    text = _git(*args)
    lines: set[int] = set()
    for line in text.splitlines():
        match = HUNK.match(line)
        if match:
            start = int(match.group(1))
            count = int(match.group(2) or "1")
            lines.update(range(start, start + max(count, 0)))
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="compare against this ref (e.g. origin/main)")
    parser.add_argument("--working-tree", action="store_true", help="lint uncommitted work")
    parser.add_argument("--out", default="release/evidence/lint-changed.json")
    args = parser.parse_args()
    base = None if args.working_tree else (args.base or "origin/main")
    if not args.working_tree:
        try:
            _git("rev-parse", "--verify", base)  # type: ignore[arg-type]
        except subprocess.CalledProcessError:
            print(f"base ref {base!r} not found; falling back to --working-tree", file=sys.stderr)
            base = None

    files = _changed_files(base)
    py_files = [path for path, _ in files if path.suffix == ".py"]
    report: dict[str, Any] = {
        "base": base or "working tree",
        "changed_python_files": [str(p.relative_to(ROOT)) for p in py_files],
        "files": [], "compile_errors": [],
        "diff_findings": [], "baseline_findings": 0,
        "policy": "fail only for Ruff findings on lines added by this branch; full baseline is reported, not hidden",
    }
    for path, untracked in files:
        proc = subprocess.run(
            [sys.executable, "-m", "ruff", "check", "--force-exclude",
             "--output-format", "json", str(path)],
            cwd=BACKEND, capture_output=True, text=True,
        )
        try:
            diagnostics = json.loads(proc.stdout or "[]")
        except json.JSONDecodeError:
            diagnostics = []
        added = _added_lines(path, base, untracked)
        new = [d for d in diagnostics if d.get("location", {}).get("row") in added]
        report["baseline_findings"] += len(diagnostics)
        report["files"].append({
            "path": str(path.relative_to(ROOT)), "untracked": untracked,
            "ruff_findings_in_file": len(diagnostics),
            "ruff_findings_on_added_lines": len(new),
            "added_lines": len(added),
        })
        for item in new:
            report["diff_findings"].append({
                "path": str(path.relative_to(ROOT)), "line": item["location"]["row"],
                "code": item["code"], "message": item["message"],
            })
        try:
            py_compile.compile(str(path), doraise=True)
        except py_compile.PyCompileError as exc:
            report["compile_errors"].append(str(exc))

    failed = bool(report["diff_findings"] or report["compile_errors"])
    report["outcome"] = "FAIL" if failed else "PASS"
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"diff-aware lint: {len(py_files)} changed Python files, "
          f"{report['baseline_findings']} Ruff findings in those files, "
          f"{len(report['diff_findings'])} on added lines")
    for item in report["diff_findings"]:
        print(f"  FAIL {item['path']}:{item['line']} {item['code']} {item['message']}")
    for error in report["compile_errors"]:
        print(f"  FAIL compile: {error}")
    print(f"wrote {out.relative_to(ROOT)} — {report['outcome']}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
