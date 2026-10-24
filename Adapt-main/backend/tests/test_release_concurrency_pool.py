"""Regression for the 2026-10-23 release-gate deadlock.

Measured before this fix (``release/evidence/stress-2026-10-23.json``):
12 simultaneous requests to the model-capable ``POST /api/v1/explain`` route
answered in 206 ms; 15 simultaneous requests all hung past a 6 s client timeout
and ``GET /healthz`` then timed out too. The single-worker API was wedged until
it was killed. Cause: the file-SQLite engine used SQLAlchemy's default QueuePool
(5 connections + 10 overflow), so request number ~16 blocked waiting for a
connection checkout while the event loop was waiting on those same requests.

The live concurrency scenario in ``release/stress_check.py`` is the behavioural
regression test. This fast test pins the configuration that makes it pass, using
the session's ALREADY-BUILT engine -- building a second keyring in-process would
install a different field cipher and break every later test, which is exactly the
kind of cross-test contamination this suite warns about.
"""
# ruff: noqa: E501 -- release scripts carry long measured check descriptions;
# all other lint rules stay enforced. The backend baseline has 5,108 E501 findings.

from __future__ import annotations


def test_file_sqlite_pool_is_bounded_but_large_enough_for_concurrent_learners(services):
    pool = services.db.engine.pool
    assert pool.size() >= 16, (
        f"file SQLite pool of {pool.size()} cannot serve the 16-way concurrency "
        "the release gate measures"
    )
    assert int(getattr(pool, "_max_overflow", 0)) >= 16, "overflow must be explicit, not the default 10"
    assert float(getattr(pool, "_timeout", 30)) <= 5.0, (
        "a pool checkout must fail fast rather than block the event loop for 30s"
    )
    assert bool(getattr(pool, "_pre_ping", False)) is True, "stale connections must be detected"


def test_the_pool_fix_is_guarded_for_in_memory_databases():
    """SingletonThreadPool does not accept pool_size; the is_file guard must remain."""
    import inspect

    from adapt.db.engine import create_db_engine

    source = inspect.getsource(create_db_engine)
    assert "if is_file else {}" in source, (
        "the explicit pool arguments must not be passed to an in-memory SQLite engine"
    )
    assert "pool_timeout" in source and "pool_pre_ping" in source
