#!/usr/bin/env python3
# ruff: noqa: E501 -- prints full paths in release evidence.
"""Verify the extracted ``adapt/`` backend has the same pooled-engine fix.

latest main keeps the tested ``Adapt-main/`` tree AND adds a refactored top-level
``adapt/`` tree. The concurrency deadlock was measured in ``Adapt-main/backend``;
this check builds the second layout's engine in its own process (its own keyring)
and asserts the same bound, so the fix cannot be lost on only one copy.

Run::

    .venv/bin/python release/check_second_layout.py --src adapt/backend/src
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", default="adapt/backend/src")
    parser.add_argument("--out", default="release/evidence/second-layout-pool.json")
    args = parser.parse_args()
    src = (ROOT / args.src).resolve()
    if not src.exists():
        print(f"second layout not present at {src}; nothing to check")
        return 0
    sys.path.insert(0, str(src))

    data = pathlib.Path(tempfile.mkdtemp(prefix="adapt-second-layout-"))
    os.environ["ADAPT_DATA_DIR"] = str(data)
    os.environ["ADAPT_KEYFILE"] = str(data / "master.key")
    os.environ["ADAPT_DB_ENCRYPTION"] = "field-only"
    os.environ["ADAPT_MODE"] = "local"

    from adapt.config import get_settings
    from adapt.db.engine import create_db_engine

    get_settings.cache_clear()
    engine, _info = create_db_engine(get_settings())
    pool = engine.pool
    measured = {
        "src": str(src.relative_to(ROOT)),
        "pool_class": type(pool).__name__,
        "size": pool.size(),
        "max_overflow": int(getattr(pool, "_max_overflow", 0)),
        "timeout_s": float(getattr(pool, "_timeout", 30)),
        "pre_ping": bool(getattr(pool, "_pre_ping", False)),
    }
    checks = {
        "size_at_least_16": measured["size"] >= 16,
        "overflow_at_least_16": measured["max_overflow"] >= 16,
        "checkout_timeout_at_most_5s": measured["timeout_s"] <= 5,
        "pre_ping_enabled": measured["pre_ping"],
    }
    engine.dispose()
    report = {
        "measured": measured, "checks": checks,
        "outcome": "PASS" if all(checks.values()) else "FAIL",
        "note": "built in an isolated process so the field-cipher keyring cannot contaminate the main backend suite",
    }
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
