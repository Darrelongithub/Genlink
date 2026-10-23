"""Canonical, bounded records for learner-reviewed source material.

Candidate resources come from several providers and are copied into a subject plan after the
learner approves them.  Keeping one allowlist and one size policy at that boundary prevents a
provider payload (or an old plan written by a client) from becoming an unbounded prompt or lesson
attribution later in the flow.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlsplit

from ..security.redact import redact_text

MAX_REVIEWED_SOURCES = 20
SOURCE_FIELD_LIMITS = {
    "id": 120,
    "kind": 48,
    "title": 300,
    "snippet": 1200,
    "attribution": 240,
    "licence": 120,
    "licence_status": 160,
    "provider": 64,
    "external_id": 128,
    "provenance": 240,
}


def _clean(value: Any, *, maximum: int) -> str:
    """Bound ordinary source text while removing control characters and identity-shaped data."""
    if value is None:
        return ""
    cleaned = redact_text(str(value), max_chars=maximum).text
    # ``redact_text`` adds a human-readable truncation marker, so its return can
    # be slightly longer than the requested payload cap. This boundary is also
    # used for persisted records; enforce the hard field limit here.
    return re.sub(r"\s+", " ", cleaned).strip()[:maximum].rstrip()


def _safe_url(value: Any) -> str:
    """Keep a clickable public locator, rejecting credentials and non-web schemes."""
    candidate = str(value or "").strip()
    if not candidate or len(candidate) > 500:
        return ""
    try:
        parsed = urlsplit(candidate)
    except ValueError:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    if parsed.username or parsed.password:
        return ""
    return candidate


def normalise_reviewed_sources(
    materials: Any,
    *,
    max_rows: int = MAX_REVIEWED_SOURCES,
) -> list[dict[str, Any]]:
    """Return the only source fields that may enter a reviewed subject namespace.

    The result is deliberately JSON-shaped and bounded.  ``url`` is handled separately from
    free text so the learner can still open the approved source; snippets and provenance are
    redacted and length-limited before any caller stores or prompts them.
    """
    out: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for raw in materials or []:
        if len(out) >= max(0, min(int(max_rows), MAX_REVIEWED_SOURCES)):
            break
        if not isinstance(raw, Mapping):
            continue
        row: dict[str, Any] = {}
        for key, maximum in SOURCE_FIELD_LIMITS.items():
            value = raw.get(key)
            if value is None and key == "licence":
                value = raw.get("license")
            if value is None:
                continue
            cleaned = _clean(value, maximum=maximum)
            if cleaned:
                row[key] = cleaned
        url = _safe_url(raw.get("url") or raw.get("source_url") or raw.get("link"))
        if url:
            row["url"] = url
        authors = raw.get("authors")
        if isinstance(authors, (list, tuple)):
            cleaned_authors: list[str] = []
            for author in authors[:6]:
                cleaned = _clean(author, maximum=120)
                if cleaned:
                    cleaned_authors.append(cleaned)
            if cleaned_authors:
                row["authors"] = cleaned_authors
        if not row.get("id") and not row.get("title") and not row.get("snippet"):
            continue
        row_id = str(row.get("id") or "")
        if row_id and row_id in seen_ids:
            continue
        if row_id:
            seen_ids.add(row_id)
        out.append(row)
    return out


__all__ = ["MAX_REVIEWED_SOURCES", "normalise_reviewed_sources"]
