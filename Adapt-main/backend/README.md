# Adapt backend package

FastAPI, SQLite/SQLCipher and Alembic runtime for Adapt. The repository-level
`../README.md` explains development; `../PRODUCTION_RUNBOOK.md` is the deployment
and operations guide.

Clean production install from the repository root:

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install --no-deps -r backend/requirements.lock
.venv/bin/python -m pip install --no-deps ./backend
.venv/bin/adapt init
```

The wheel includes the complete migration chain and curriculum data. Do not run
an editable install in production.
