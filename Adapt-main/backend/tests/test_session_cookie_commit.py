"""Regression: a session cookie must be usable on the request that follows login.

``db_session`` commits *after* the endpoint returns, but the ``Set-Cookie`` header is
already on that response. Without the commit in ``issue_login``, a fast client (or a
release-gate loop) can present the new cookie while its ``auth_sessions`` row is still
inside an uncommitted transaction; the next request then answers 401 for a sign-in that
just returned 200. The test checks durability from a *separate* database session before
the issuing session is closed, which is the condition the response imposes.
"""

from __future__ import annotations

import re

from fastapi import Response
from sqlalchemy import select

from adapt.api.deps import issue_login
from adapt.db.engine import get_db
from adapt.db.models import AuthSession, Student
from adapt.security import auth


def test_issued_session_row_is_visible_to_another_connection_before_return(registered_learner):
    issuing = get_db().sessionmaker()
    student = issuing.get(Student, registered_learner["student_id"])
    assert student is not None

    response = Response()
    issued = issue_login(response, student=student, s=issuing, request=None)
    assert issued["student_id"] == registered_learner["student_id"]

    cookies = response.headers.getlist("set-cookie")
    session_cookie = next((c for c in cookies if c.startswith("adapt_session=")), None)
    assert session_cookie is not None, cookies
    token = re.match(r"adapt_session=([^;]+)", session_cookie).group(1)

    # A different connection models the next HTTP request. It must see the row now,
    # not after some later request-end commit that has not happened yet.
    independent = get_db().sessionmaker()
    row = independent.execute(
        select(AuthSession).where(AuthSession.token_hash == auth.hash_token(token))
    ).scalar_one_or_none()
    try:
        assert row is not None, "session cookie was returned before its row was committed"
        assert row.revoked_at is None
        assert row.student_id == registered_learner["student_id"]
    finally:
        independent.close()
        issuing.close()
