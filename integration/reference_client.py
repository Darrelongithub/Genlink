"""A TEST-ONLY reference caller for ``POST /api/v1/integration/adapt``.

This is deliberately *not* shipped Genlink code. It exists so the failure behaviour of
the integration contract is executable rather than a paragraph in a document:

* a base URL is **required** — there is no implicit ``localhost``;
* loopback hosts are refused unless the caller opts in explicitly (a browser must never
  call a learner's own machine; a co-located server-side caller may choose to);
* retries are bounded and only happen on transport errors, timeouts and 429/502/503/504;
  a 401 or a 422 is a caller bug and is *not* retried, which is what prevents a retry storm;
* every attempt (including retries) carries the same ``Idempotency-Key`` derived from the
  request body, so a duplicate submission is recognisable to any future server-side
  deduplication. The current endpoint is stateless and deterministic, so a duplicate is
  harmless and answers identically anyway;
* a response that violates the frozen schema is treated like an outage, never trusted;
* when Adapt cannot answer, the caller serves its **standard content**, explicitly labelled
  ``adapted: false``. It is never presented as an adapted lesson and must not be charged
  as an adapted action.

Standard library only: this module is used by the release gate and by
``test_reference_client.py`` with fake HTTP servers, with no AI credentials anywhere.
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations

import contextlib
import copy
import hashlib
import http.client
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:  # works both as ``python -m unittest discover -s integration`` and as a direct file
    from .contract.validate import ContractError, validate_request, validate_response
except ImportError:  # pragma: no cover - direct-script import path
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from contract.validate import ContractError, validate_request, validate_response

_PATH = "/api/v1/integration/adapt"
_RETRYABLE_STATUS = {429, 502, 503, 504}
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"}


@dataclass
class AdaptResult:
    """The outcome of one logical adaptation request, however many HTTP attempts it took."""

    source: str  # "adapt" | "standard_content"
    payload: dict[str, Any]
    attempts: int = 0
    elapsed_ms: int = 0
    status: int | None = None
    error: str | None = None
    idempotency_key: str | None = None
    retry_after_s: list[float] = field(default_factory=list)

    @property
    def adapted(self) -> bool:
        return self.source == "adapt"


def idempotency_key(body: dict[str, Any]) -> str:
    """Stable across retries of the *same* logical request; different learners differ."""
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:32]


def _require_url(base_url: str, allow_loopback: bool) -> str:
    if not base_url or not isinstance(base_url, str):
        raise ValueError("an explicit Adapt base URL is required; there is no localhost default")
    parsed = urllib.parse.urlparse(base_url if "://" in base_url else f"https://{base_url}")
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError(f"Adapt base URL is not usable: {base_url!r}")
    if not allow_loopback and parsed.hostname.lower() in _LOOPBACK_HOSTS:
        raise ValueError(
            "refusing a loopback Adapt URL without allow_loopback=True: browser code must "
            "call its own origin, never a learner's localhost"
        )
    return base_url.rstrip("/")


def _fallback(
    standard_content: dict[str, Any], *, learner_id: str | None, reason: str,
    attempts: int, elapsed_ms: int, status: int | None, key: str,
    waits: list[float],
) -> AdaptResult:
    payload = copy.deepcopy(standard_content)
    payload["adapted"] = False
    payload["source"] = "standard_content"
    payload["learner_id"] = learner_id
    payload["fallback_reason"] = reason
    payload["notice"] = (
        "Adapt could not answer; this is the caller's standard content, not an adapted lesson."
    )
    return AdaptResult(
        source="standard_content", payload=payload, attempts=attempts,
        elapsed_ms=elapsed_ms, status=status, error=reason,
        idempotency_key=key, retry_after_s=list(waits),
    )


def adapt(
    base_url: str,
    request: dict[str, Any],
    *,
    standard_content: dict[str, Any],
    token: str | None = None,
    timeout_s: float = 2.0,
    max_attempts: int = 3,
    backoff_s: float = 0.05,
    allow_loopback: bool = False,
    opener: Any | None = None,
    sleep: Any = time.sleep,
) -> AdaptResult:
    """Ask Adapt for one lesson; fall back to ``standard_content`` if it cannot answer.

    ``max_attempts`` counts the first send, so ``3`` means at most two retries. Bounded
    and small by default: a retry storm is worse than a standard-content fallback.
    """
    started = time.monotonic()

    def elapsed() -> int:
        return int((time.monotonic() - started) * 1000)
    base = _require_url(base_url, allow_loopback)
    learner_id = (request.get("learner") or {}).get("id") if isinstance(request, dict) else None
    key = idempotency_key(request) if isinstance(request, dict) else "invalid"
    waits: list[float] = []

    try:
        validate_request(request)
    except (ContractError, ValueError) as exc:
        return _fallback(
            standard_content, learner_id=learner_id, reason=f"invalid_request: {exc}",
            attempts=0, elapsed_ms=elapsed(), status=None, key=key, waits=waits,
        )

    raw = json.dumps(request, ensure_ascii=False).encode("utf-8")
    do_open = opener.open if opener is not None else urllib.request.urlopen
    last_status: int | None = None
    last_reason = "no_attempt"

    for attempt in range(1, max(1, max_attempts) + 1):
        headers = {
            "Content-Type": "application/json",
            "Idempotency-Key": key,
            "Accept": "application/json",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(
            base + _PATH, data=raw, headers=headers, method="POST",
        )
        wait = 0.0
        try:
            with do_open(req, timeout=timeout_s) as response:
                last_status = int(getattr(response, "status", 200) or 200)
                body = response.read()
            parsed = json.loads(body.decode("utf-8"))
            validate_response(parsed)
            return AdaptResult(
                source="adapt", payload=parsed, attempts=attempt, elapsed_ms=elapsed(),
                status=last_status, idempotency_key=key, retry_after_s=waits,
            )
        except urllib.error.HTTPError as exc:
            last_status = int(exc.code)
            reason = f"http_{exc.code}"
            if last_status in _RETRYABLE_STATUS:
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                try:
                    wait = min(float(retry_after), max(backoff_s, 0.05) * 8) if retry_after else 0.0
                except (TypeError, ValueError):
                    wait = 0.0
            with contextlib.suppress(Exception):
                exc.close()
            last_reason = reason
            if last_status not in _RETRYABLE_STATUS:
                break
        except (urllib.error.URLError, http.client.IncompleteRead, http.client.HTTPException, TimeoutError, ConnectionError, OSError) as exc:
            # IncompleteRead is the exact shape of "the server died mid-response": it is
            # raised by http.client while reading a 200 whose Content-Length never arrived.
            # It is NOT a subclass of URLError, so without this clause a connection
            # interruption crashes the caller instead of serving standard content.
            last_reason = f"transport_{type(exc).__name__}"
            last_status = None
        except (ValueError, UnicodeDecodeError, ContractError) as exc:
            # A 200 that is not the contract is an outage for a typed caller, not a lesson.
            last_reason = f"invalid_response_{type(exc).__name__}"
            break

        if attempt >= max(1, max_attempts):
            break
        wait = wait if wait > 0 else backoff_s * (2 ** (attempt - 1))
        waits.append(round(wait, 4))
        sleep(wait)

    return _fallback(
        standard_content, learner_id=learner_id,
        reason=f"adapt_unavailable: {last_reason}", attempts=attempt,
        elapsed_ms=elapsed(), status=last_status, key=key, waits=waits,
    )
