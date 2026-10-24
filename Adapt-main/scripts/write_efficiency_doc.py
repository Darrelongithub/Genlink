#!/usr/bin/env python3
"""Regenerate ``docs/EFFICIENCY.md`` from the code's own tables.

The backend test ``test_the_docs_carry_the_same_table_the_code_does`` fails when the
document is missing or a name drifts out of it. The document was missing from the
committed tree entirely (the archive has no ``docs/`` directory), which is a real
release-gate failure, not a documentation nit. Generate rather than hand-copy so the
table cannot quietly go stale::

    .venv/bin/python scripts/write_efficiency_doc.py

Only the tables come from code. Every number that would be a *measurement*
(latency, tokens actually spent, money) is labelled unmeasured unless a real run
is recorded in RELEASE_READINESS.md. No model key is needed to run this script.
"""

from __future__ import annotations

from pathlib import Path

from adapt.ai import routing as RT
from adapt.ai import static_context as SC
from adapt.ai.llm import estimate_tokens
from adapt.security.ratelimit import DEFAULT_LIMITS

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "EFFICIENCY.md"


def main() -> None:
    sizes = SC.sizes()
    rows = RT.public_table()
    lines = [
        "# Efficiency: fewer calls, cheaper calls, the right model",
        "",
        "Generated from `adapt.ai.static_context`, `adapt.ai.routing` and",
        "`adapt.security.ratelimit` by `scripts/write_efficiency_doc.py` on 2026-10-23.",
        "The backend suite asserts that every name below stays in this file.",
        "",
        "**Honesty boundary.** These are the *configured* ceilings and the *estimated* size of",
        "static prompt heads (`estimate_tokens`, a character-based estimate, not a provider",
        "bill). No live provider latency, token spend or cost has been measured on this build:",
        "no Gemini key has ever been configured here. Measured local-call timings are recorded",
        "in `RELEASE_READINESS.md` and are labelled with what exactly was measured.",
        "",
        f"## Static prompt heads: {len(SC.names())}",
        "",
        "Each head is identical for every learner and must never carry learner text. A head",
        "large enough to be worth caching is reused across calls; the tail stays per request.",
        "",
        "| head | chars | estimated tokens |",
        "| --- | ---: | ---: |",
    ]
    for name in SC.names():
        row = sizes[name]
        lines.append(f"| `{name}` | {row['chars']} | {row['est_tokens']} |")
    lines += [
        "",
        f"The estimator in use is `estimate_tokens`; sanity value for a 40-character string:"
        f" {estimate_tokens(['x' * 40])} estimated token(s).",
        "",
        f"## Task routing: {len(RT.TASKS)} registered purposes",
        "",
        "| purpose | class | one call | joins | shared static head | why |",
        "| --- | --- | :---: | --- | :---: | --- |",
    ]
    for row in rows:
        joins = ", ".join(f"`{j}`" for j in row["joins"]) or "—"
        why = str(row["why"]).replace("|", "\\|").replace("\n", " ")
        lines.append(
            f"| `{row['task']}` | {row['class']} | {'yes' if row['one_call'] else 'no'} | "
            f"{joins} | {'yes' if row['shared_context'] else 'no'} | {why} |"
        )
    lines += [
        "",
        "Class meanings: " + "; ".join(f"**{k}** — {v}" for k, v in RT.TIER_MEANING.items()) + ".",
        "",
        "A join is two decisions that need the same reading of the same words. It is one call,",
        "never an extra call. `subject_placement` joins `topic_resolve` and `subject_leanings`;",
        "the separate purposes still exist for callers that need only one half.",
        "",
        "## Per-minute ceilings actually configured",
        "",
        "| scope | rate/min | burst |",
        "| --- | ---: | ---: |",
    ]
    for scope, (rate, burst) in sorted(DEFAULT_LIMITS.items()):
        lines.append(f"| `{scope}` | {rate:g} | {burst:g} |")
    lines += [
        "",
        "These are guards, not measurements of throughput. A load test's measured p50/p95 and",
        "error counts live in `RELEASE_READINESS.md`; a table of ceilings is not evidence that",
        "the service sustained them.",
        "",
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
