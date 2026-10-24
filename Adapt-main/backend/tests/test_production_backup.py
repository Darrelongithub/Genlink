"""Offline backup/restore must preserve learner history and the migration marker."""

from __future__ import annotations

import os
import subprocess
import sys


def test_backup_restore_round_trip_and_overwrite_refusal(tmp_path):
    # A subprocess isolates the process-wide keyring and exercises the actual CLI.
    script = r'''
import hashlib
import json
import os
import stat
from pathlib import Path

from typer.testing import CliRunner
from sqlalchemy import select
from adapt.cli import app
from adapt.db.engine import Database
from adapt.db.models import Student

root = Path(os.environ["ADAPT_DATA_DIR"])
backup = root / "backups" / "adapt.db"
runner = CliRunner()

db = Database()
db.upgrade_schema()
with db.session() as session:
    session.add(Student(id="stu_backup", display_name="Before backup", role="student"))
    revision = session.execute(select(__import__("adapt.db.models", fromlist=["Student"]).Student)).scalars().first()
    assert revision.display_name == "Before backup"
db.dispose()

created = runner.invoke(app, ["db", "backup", "--out", str(backup)])
assert created.exit_code == 0, created.output
report = json.loads(created.output)["backup"]
assert report["integrity"] == "ok"
assert report["revision"]
assert stat.S_IMODE(backup.stat().st_mode) == 0o600
expected_plain = os.environ["ADAPT_DB_ENCRYPTION"] == "field-only"
assert (backup.read_bytes()[:16] == b"SQLite format 3\x00") is expected_plain
original_hash = hashlib.sha256(backup.read_bytes()).hexdigest()

refused = runner.invoke(app, ["db", "backup", "--out", str(backup)])
assert refused.exit_code == 1
assert hashlib.sha256(backup.read_bytes()).hexdigest() == original_hash

# Change live state after the backup. Restore must recover the earlier row and
# leave a separate safety copy of this newer state.
db = Database()
with db.session() as session:
    student = session.get(Student, "stu_backup")
    student.display_name = "Changed after backup"
db.dispose()

not_confirmed = runner.invoke(app, ["db", "restore", "--from", str(backup)])
assert not_confirmed.exit_code == 2
restored = runner.invoke(app, ["db", "restore", "--from", str(backup), "--confirm"])
assert restored.exit_code == 0, restored.output
restore_report = json.loads(restored.output)
assert restore_report["integrity"] == "ok"
assert restore_report["safety_backup"]
safety = Path(restore_report["safety_backup"])
assert safety.is_file() and safety != backup
assert stat.S_IMODE((root / "adapt.db").stat().st_mode) == 0o600

db = Database()
with db.session() as session:
    assert session.get(Student, "stu_backup").display_name == "Before backup"
db.dispose()
safety_db = Database(db_file=safety)
with safety_db.session() as session:
    assert session.get(Student, "stu_backup").display_name == "Changed after backup"
safety_db.dispose()

# A non-database input cannot replace a good live database.
bad = root / "not-a-backup.db"
bad.write_text("not a database", encoding="utf-8")
rejected = runner.invoke(app, ["db", "restore", "--from", str(bad), "--confirm"])
assert rejected.exit_code == 1
db = Database()
with db.session() as session:
    assert session.get(Student, "stu_backup").display_name == "Before backup"
db.dispose()
print("backup/restore ok")
'''
    for mode in ("field-only", "auto"):
        case_dir = tmp_path / mode
        env = {
            key: value
            for key, value in os.environ.items()
            if not key.startswith("ADAPT_")
        }
        env.update(ADAPT_DATA_DIR=str(case_dir), ADAPT_DB_ENCRYPTION=mode)
        result = subprocess.run(
            [sys.executable, "-c", script],
            env=env,
            capture_output=True,
            text=True,
            timeout=180,
        )
        assert result.returncode == 0, f"{mode}:\n{result.stdout}\n{result.stderr}"
        assert result.stdout.strip() == "backup/restore ok"
