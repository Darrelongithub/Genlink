"""FastAPI dependencies: who is this, and are they allowed to ask right now.

Two things are enforced here rather than in each route, because routes forget:

* **Authentication.** An httpOnly, SameSite=Lax cookie holding an opaque token; the
  token is stored only as a hash, and the row keeps an Argon2id-verified session.
  The learner id is *never* taken from a query parameter -- guessing an id must not
  read somebody's learning history.
* **CSRF + rate limits.** Mutations need the double-submit CSRF header, and every
  mutating scope gets a token bucket so a runaway browser tab cannot burn the free
  Gemini quota (which would silently downgrade the demo for the rest of the day).

In ``mode=local`` a loopback caller may pass ``X-ADAPT-Debug-Student`` so a judge
can drive the API with curl. That is the only identity shortcut in the codebase, it
is refused for any non-loopback peer, and it never applies in tunnel mode.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..db.engine import get_db
from ..db.models import Student
from ..security import auth
from ..security.middleware import MUTATING, audit_event, client_ip, origin_ok
from ..services import AppServices, current

log = logging.getLogger("adapt.api.deps")


def services(request: Request | None = None) -> AppServices:
    return current()


def settings(request: Request | None = None) -> Settings:
    return current().settings


def _active_settings() -> Settings:
    """Return the built service configuration, tolerating narrow test doubles."""
    svcs = current()
    return getattr(svcs, "settings", None) or get_settings()


def db_session(request: Request) -> Session:
    """One session per request, always closed, never leaked across the await."""
    session = get_db().sessionmaker()
    request.state.db = session
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _cookie_token(request: Request, st: Settings) -> str | None:
    return request.cookies.get(st.cookie_name) or _bearer(request)


def _bearer(request: Request) -> str | None:
    raw = request.headers.get("authorization") or ""
    if raw.lower().startswith("bearer "):
        return raw[7:].strip() or None
    return None


def student_from_request(request: Request, s: Session = Depends(db_session)) -> Student:
    st = get_settings()
    debug_id = request.headers.get("x-adapt-debug-student")
    if debug_id and st.mode == "local":
        peer = (client_ip(request) or "") if request.client is None else (request.client.host or "")
        if peer in ("127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1") or peer.startswith("127."):
            student = s.get(Student, debug_id)
            if student is not None and student.deleted_at is None:
                return student
    row = auth.lookup_session(s, _cookie_token(request, st))
    if row is None:
        raise HTTPException(status_code=401, detail="not signed in")
    student = s.get(Student, row.student_id)
    if student is None or student.deleted_at is not None:
        raise HTTPException(status_code=401, detail="learner not found")
    request.state.auth_session = row
    return student


def same_origin(request: Request) -> None:
    """Refuse a state-changing request that a *different* site started.

    ``SameSite=Lax`` protects requests that *carry* a session cookie. It cannot protect
    the three routes that *mint* one: a cross-site form post to ``/login`` carries the
    attacker's credentials and the browser happily stores the session cookie the reply
    sets, so the victim ends up studying inside the attacker's account -- and every
    record they create is then readable by the attacker. The same trick enrols a victim
    in an account the attacker controls through ``/students``.

    Non-browser callers send no ``Origin`` and are unaffected (``origin_ok`` returns True
    for them, and they were never the target of this): the guard is exactly as wide as
    the browser behaviour that creates the hole.
    """
    if origin_ok(request, _active_settings()):
        return
    origin = (request.headers.get("origin") or "")[:120]
    log.warning("cross_site_request_rejected path=%s origin=%s", request.url.path, origin)
    audit_event(
        request,
        action="origin_rejected",
        outcome="denied",
        detail={"path": request.url.path, "origin": origin},
    )
    raise HTTPException(
        status_code=403,
        detail={
            "error": "origin_not_allowed",
            "message": "this request came from another site; open the app from its own address",
        },
    )


def require_csrf(request: Request, student: Student = Depends(student_from_request)) -> Student:
    """Double-submit CSRF check, on the methods that can change something.

    Only *mutating* methods are checked, which is what the module docstring above has
    always claimed ("Mutations need the double-submit CSRF header"). Checking safe
    methods too was not extra safety, it was a breakage:

    * ``rate(scope)`` depends on this, so every rate-limited **read** inherited the
      requirement. ``GET /content/pack``, ``GET /content/breakdown`` and
      ``GET /lesson/concepts`` answered 403 to any caller that did not know to attach
      a token to a GET — which is what the browser's own ``get()`` helper does, so the
      subject screen's pack/breakdown fetch failed in the running app while the test
      suite passed (``learner["headers"]`` always carries the token, so no test could
      see it).
    * Cross-site reads are already covered: the session cookie is ``SameSite=Lax``, so a
      cross-site subresource request never carries it, and a response an attacker cannot
      read is not a CSRF risk. Quota burn — the one thing a forged GET could do — is what
      the token bucket in ``rate()`` is for.

    ``GET /items/{id}/reveal`` is the read that spoils a question, and it stays
    rate-limited; its own docstring records that reading it persists nothing.
    """
    if request.method in MUTATING and not origin_ok(request, _active_settings()):
        # Defence in depth next to the token: a cross-site form post cannot read the
        # token, and it also cannot fake an Origin. Checked before the token so a
        # forgery is refused for being a forgery, not merely for lacking a header.
        audit_event(
            request,
            action="origin_rejected",
            outcome="denied",
            detail={"path": request.url.path},
        )
        raise HTTPException(
            status_code=403,
            detail={
                "error": "origin_not_allowed",
                "message": "this request came from another site; open the app from its own address",
            },
        )
    row = getattr(request.state, "auth_session", None)
    if row is not None and request.method in MUTATING:
        provided = request.headers.get("x-csrf-token")
        if not provided and _beacon_path(request):
            # One exception, and it is a real constraint rather than a convenience:
            # ``navigator.sendBeacon`` cannot set a request header, so the event flush on
            # page-hide has nowhere to put a header. It is allowed to carry the token in
            # the query string *only* on the telemetry append route. Everywhere else the
            # header is required, because a token in a URL is a token in an access log and
            # in a ``Referer`` -- and a CSRF token that leaks is not a CSRF token.
            provided = request.query_params.get("csrf")
        if not auth.check_csrf(row, provided):
            raise HTTPException(status_code=403, detail="csrf token missing or wrong")
    return student


def _beacon_path(request: Request) -> bool:
    """The two telemetry append routes, which are the only ones a browser beacons to."""
    path = request.url.path.rstrip("/")
    return path.endswith("/events")


def rate(scope: str):
    """Token bucket per (scope, student) -- see ``security/ratelimit.py``."""

    def _dep(request: Request, student: Student = Depends(require_csrf)) -> Student:
        svcs = current()
        ok, retry = svcs.limiter.allow(scope, f"{scope}:{student.id}")
        if not ok:
            raise HTTPException(
                status_code=429,
                detail={"error": "rate_limited", "retry_after_s": round(retry, 2), "scope": scope},
                headers={"retry-after": str(int(retry) + 1)},
            )
        return student

    return _dep


def issue_login(
    response: Response, s: Session, student: Student, *, request: Request | None = None
) -> dict[str, Any]:
    issued = auth.create_session(
        s,
        student.id,
        ip=(client_ip(request) if request is not None else None),
        user_agent=(request.headers.get("user-agent") if request is not None else None),
    )
    st = get_settings()
    response.set_cookie(
        st.cookie_name,
        issued.token,
        httponly=True,
        samesite="lax",
        secure=st.mode == "tunnel" or st.require_https,
        max_age=st.session_ttl_hours * 3600,
        path="/",
    )
    response.set_cookie(
        st.csrf_cookie_name,
        issued.csrf,
        httponly=False,  # read by the browser script to echo back in a header
        samesite="lax",
        secure=st.mode == "tunnel" or st.require_https,
        max_age=st.session_ttl_hours * 3600,
        path="/",
    )
    return {
        "student_id": student.id,
        "csrf_token": issued.csrf,
        "expires_at": issued.session.expires_at.isoformat(),
        "mode": st.mode,
    }


def clear_login(response: Response, request: Request) -> None:
    st = get_settings()
    for name in (st.cookie_name, st.csrf_cookie_name):
        response.delete_cookie(name, path="/")


def shared_bank_write(request: Request) -> None:
    """Refuse a *shared*-state mutation from a learner session on a public deployment.

    ``POST /numbas/import`` can add questions the whole bank will serve, and
    ``POST /learning/train`` refits the cohort BKT priors that every mastery number is
    computed from. Both are correct in ``mode=local``, where the person at the terminal
    is the operator and usually the learner. Neither is correct on a tunnel: there, a
    signed-in learner would be able to rewrite what another learner is taught and graded
    on. So a public instance has to be *deliberately* shared -- the same phrase that
    gates guest creation -- or the door stays shut and says so.
    """
    st = get_settings()
    if st.mode != "tunnel":
        return
    from ..security import auth

    if not auth.demo_passphrase_required():
        raise HTTPException(
            status_code=403,
            detail={
                "error": "shared_mutation_locked",
                "note": "this instance is publicly reachable, and this call changes what every learner is taught or measured by",
                "next": "run it on the local instance, or set ADAPT_DEMO_PASSPHRASE and send X-ADAPT-Demo-Passphrase",
            },
        )
    if not auth.check_demo_passphrase(request.headers.get("x-adapt-demo-passphrase")):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "demo_passphrase_required",
                "next": "send X-ADAPT-Demo-Passphrase: <the phrase the operator set>",
            },
        )


def llm_guard(request: Request) -> None:
    """Shared 'don't melt the free tier' check for expensive endpoints."""
    svcs = current()
    llm = getattr(svcs.ai2, "llm", None)
    if llm is None:
        return
    info = llm.available() if callable(getattr(llm, "available", None)) else {}
    head = (info or {}).get("headroom") or {}
    if info.get("configured") and int(head.get("calls_left") or 0) <= 0:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "model_budget_exhausted",
                "note": (
                    "the free Gemini budget for today is spent. Teaching continues from the "
                    "local tutor and your own materials; nothing is lost, it is just less fluent"
                ),
                "headroom": head,
            },
        )


# --------------------------------------------------------------------------- #
# operator authority
# --------------------------------------------------------------------------- #

#: ``Student.role`` values that carry platform authority. Nothing writes this column from
#: a request body, which is what makes it an authority rather than a claim: the two ways
#: to be an operator are (a) this column, set by the CLI/an operator, or (b) an operator
#: token in the environment, which no learner can read.
OPERATOR_ROLES = frozenset({"operator", "admin"})


def _operator_token(request: Request) -> str | None:
    header = request.headers.get("x-adapt-operator-token")
    if header:
        return header.strip() or None
    return _bearer(request)


def _csrf_for_cookie_auth(request: Request) -> None:
    """A cookie-authenticated mutation still needs the CSRF token.

    An operator token sent as a Bearer header is not a cookie, so it cannot be replayed by
    a third-party page; a browser session can, which is why the rule follows the *method
    of authentication* rather than the route.
    """
    if request.method not in MUTATING:
        return
    if _bearer(request) is not None:
        # The credential travelled in a header the browser had to be told to send, so a
        # third-party page cannot produce this request. Note the rule is about the
        # *credential used for this request*, not about whether a cookie also happens to
        # be present: an operator script that keeps a learner cookie in its cookie jar
        # while sending a bearer token must not be forced to fetch a CSRF token too.
        return
    row = getattr(request.state, "auth_session", None)
    if row is None:
        return
    if not auth.check_csrf(row, request.headers.get("x-csrf-token")):
        raise HTTPException(status_code=403, detail="csrf token missing or wrong")


@dataclass(frozen=True)
class Actor:
    """Who is acting. Either a platform operator token, or a signed-in learner with a role.

    An operator token is a *complete* credential: it identifies the operator without a
    ``students`` row, which is what allows a deployment to run its admin plane from a
    script with no browser, no cookie and no learner account at all. That is also why this
    is not simply ``student_from_request`` plus a role check -- it used to be, and an
    operator script then failed with "not signed in".
    """

    id: str
    role: str
    student: Student | None = None
    via: str = "role"


def require_operator(request: Request, s: Session = Depends(db_session)) -> Actor:
    """Platform authority: an operator token from the environment, or an operator role.

    Before this dependency existed, ``Student.role`` was written by the CLI and read by
    nobody: the shared-state mutations were reachable by any signed-in learner in
    ``mode=local``, with the only defence being a tunnel-mode check. Role is now
    load-bearing on this plane, and the check is deliberately an OR: a deployment with an
    operator token does not also need to hand out database roles, and a deployment with
    roles does not have to export a second secret.
    """
    import hmac
    import os

    expected = os.environ.get("ADAPT_OPERATOR_TOKEN") or ""
    provided = _operator_token(request)
    if expected and provided and hmac.compare_digest(expected, provided):
        # A header credential cannot be replayed by a third-party page, so no CSRF check.
        return Actor(id="operator:token", role="operator", via="token")

    row = auth.lookup_session(s, _cookie_token(request, get_settings()))
    if row is not None:
        student = s.get(Student, row.student_id)
        if (
            student is not None
            and student.deleted_at is None
            and str(student.role or "") in OPERATOR_ROLES
        ):
            request.state.auth_session = row
            _csrf_for_cookie_auth(request)
            return Actor(id=student.id, role=str(student.role), student=student, via="role")

    denied_id = row.student_id if row is not None else None
    audit_event(
        request,
        action="operator_denied",
        outcome="denied",
        actor=denied_id,
        detail={"path": request.url.path},
    )
    raise HTTPException(
        status_code=403,
        detail={
            "error": "operator_required",
            "message": "this call changes shared or institutional state; it needs operator authority",
            "next": (
                "send the value of ADAPT_OPERATOR_TOKEN as a bearer token, or sign in as an "
                "account whose role is operator"
            ),
        },
    )


def idempotency_key(request: Request) -> str | None:
    """The client's retry key, bounded. Absent is allowed; blank after trimming is not a key."""
    raw = request.headers.get("idempotency-key")
    if raw is None:
        return None
    value = raw.strip()
    if not value:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_idempotency_key",
                "message": "Idempotency-Key was sent empty",
                "next": "omit the header, or send a stable value of at most 120 characters",
            },
        )
    if len(value) > 120:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_idempotency_key",
                "message": "Idempotency-Key is longer than 120 characters",
            },
        )
    return value


__all__ = [
    "OPERATOR_ROLES",
    "Actor",
    "db_session",
    "idempotency_key",
    "issue_login",
    "llm_guard",
    "rate",
    "require_csrf",
    "require_operator",
    "same_origin",
    "services",
    "settings",
    "shared_bank_write",
    "student_from_request",
]
