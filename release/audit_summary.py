#!/usr/bin/env python3
"""Summarise dependency-audit JSON into a release decision, without upgrading anything.

``npm audit --fix --force`` and unpinned ``pip install -U`` are deliberately NOT
used: they change the dependency graph while a gate is running, which is how a
release is "green" on code nobody tested. This script only reports.

Usage (both inputs optional; a missing/failed audit is reported as NOT RUN)::

    .venv/bin/python release/audit_summary.py \\
        --npm release-artifacts/npm-audit.json \\
        --pip release-artifacts/pip-audit.json \\
        --out release/evidence/dependency-audit.json

Exit code is 0 unless the report itself could not be written. A vulnerability is
evidence for the release decision in RELEASE_READINESS.md, not a surprise rewrite
of the lockfiles.
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]


def _read(path: str | None) -> tuple[str, Any]:
    if not path:
        return "NOT RUN", None
    file = ROOT / path
    if not file.exists():
        return "NOT RUN (file missing)", None
    try:
        return "OK", json.loads(file.read_text(encoding="utf-8"))
    except Exception as exc:
        return f"UNPARSEABLE ({type(exc).__name__})", None


def _npm(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        return {"status": "no data"}
    meta = data.get("metadata") or {}
    vulns = meta.get("vulnerabilities") or {}
    advisories = []
    for name, row in (data.get("vulnerabilities") or {}).items():
        advisories.append({
            "package": name,
            "severity": row.get("severity"),
            "is_direct": row.get("isDirect"),
            "fix_available": row.get("fixAvailable"),
            "via": [v.get("title") if isinstance(v, dict) else str(v) for v in (row.get("via") or [])][:3],
        })
    return {
        "status": "OK",
        "counts": {k: vulns.get(k, 0) for k in ("info", "low", "moderate", "high", "critical", "total")},
        "advisories": sorted(advisories, key=lambda a: {"critical": 0, "high": 1, "moderate": 2,
                                                         "low": 3, "info": 4}.get(str(a["severity"]), 9))[:25],
    }


def _pip(data: Any) -> dict[str, Any]:
    if isinstance(data, dict):
        items = data.get("dependencies") or []
    elif isinstance(data, list):
        items = data
    else:
        return {"status": "no data"}
    rows = []
    affected = 0
    for item in items:
        vulns = item.get("vulns") or []
        if vulns:
            affected += 1
        for vuln in vulns:
            rows.append({
                "package": item.get("name"), "installed": item.get("version"),
                "id": vuln.get("id"), "fix_versions": vuln.get("fix_versions"),
                "description": (vuln.get("description") or "")[:180],
            })
    # de-duplicate: pip-audit can list the same PYSEC id twice for one package
    seen: set[tuple[str, str]] = set()
    unique = []
    for row in rows:
        key = (str(row["package"]), str(row["id"]))
        if key not in seen:
            seen.add(key)
            unique.append(row)
    return {"status": "OK", "scanned_packages": len(items),
            "affected_packages": affected, "advisory_count": len(unique),
            "advisories": unique[:25]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--npm")
    parser.add_argument("--npm-root", help="optional audit JSON for the root Genlink lockfile")
    parser.add_argument("--pip")
    parser.add_argument("--out", default="release/evidence/dependency-audit.json")
    args = parser.parse_args()
    npm_state, npm_data = _read(args.npm)
    npm_root_state, npm_root_data = _read(args.npm_root)
    pip_state, pip_data = _read(args.pip)
    report = {
        "policy": "report only; no automatic fixes, no --force, no unpinned upgrades",
        "npm": {"state": npm_state, **_npm(npm_data)},
        "npm_genlink_root": {"state": npm_root_state, **_npm(npm_root_data)},
        "pip": {"state": pip_state, **_pip(pip_data)},
        "gate_effect": "informational: vulnerabilities are carried into RELEASE_READINESS.md decisions",
    }
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    except OSError as exc:
        print(f"could not write report: {exc}", file=sys.stderr)
        return 1
    print(f"npm audit (Adapt frontend): {npm_state} {report['npm'].get('counts', {})}")
    print(f"npm audit (root Genlink): {npm_root_state} {report['npm_genlink_root'].get('counts', {})}")
    print(f"pip audit: {pip_state} affected={report['pip'].get('affected_packages')} advisories={report['pip'].get('advisory_count')}")
    print(f"wrote {args.out} (no dependency was changed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
