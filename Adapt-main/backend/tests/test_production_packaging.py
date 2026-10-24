"""A wheel must contain everything a clean production start needs."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from zipfile import ZipFile

BACKEND = Path(__file__).resolve().parents[1]


def test_built_wheel_contains_and_runs_the_migration_chain(tmp_path):
    wheel_dir = tmp_path / "wheel"
    wheel_dir.mkdir()
    built = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            "--no-deps",
            "--no-build-isolation",
            "--wheel-dir",
            str(wheel_dir),
            str(BACKEND),
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert built.returncode == 0, built.stdout + built.stderr
    wheels = list(wheel_dir.glob("adapt_backend-*.whl"))
    assert len(wheels) == 1
    with ZipFile(wheels[0]) as archive:
        names = set(archive.namelist())
        revisions = sorted(
            path.name
            for path in (BACKEND / "src" / "adapt" / "migrations" / "versions").glob("*.py")
        )
        assert revisions
        for revision in revisions:
            assert f"adapt/migrations/versions/{revision}" in names
        assert "adapt/migrations/env.py" in names
        assert "adapt/migrations/script.py.mako" in names
        assert "adapt/curriculum/data/syllabus_map.json" in names
        archive.extractall(tmp_path / "installed")

    # Run only the extracted wheel code, with no checkout or editable install on
    # sys.path. This is the path that previously looked for site-packages' parent's
    # nonexistent ``migrations`` directory and failed before creating a database.
    script = r'''
from pathlib import Path
from sqlalchemy import inspect, text
from adapt.db.engine import Database

db = Database()
db.upgrade_schema()
db.upgrade_schema()
inspector = inspect(db.engine)
assert "students" in inspector.get_table_names()
assert "lesson_scenes" in inspector.get_table_names()
with db.engine.connect() as connection:
    assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
print(Path(db.db_file).name)
db.dispose()
'''
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("ADAPT_") and key != "PYTHONPATH"
    }
    env.update(
        PYTHONPATH=str(tmp_path / "installed"),
        ADAPT_DATA_DIR=str(tmp_path / "data"),
        ADAPT_DB_ENCRYPTION="field-only",
    )
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.strip() == "adapt.db"
