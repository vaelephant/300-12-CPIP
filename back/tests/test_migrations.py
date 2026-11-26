from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_alembic_upgrade_and_seed_are_replayable(tmp_path):
    db_path = tmp_path / "migration.db"
    env = os.environ.copy()
    env["HCC_CIP_DATABASE_URL"] = f"sqlite:///{db_path}"
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        [sys.executable, "-m", "app.seed"],
        cwd=ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    with sqlite3.connect(db_path) as conn:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        patients = conn.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
        observations = conn.execute("SELECT COUNT(*) FROM observations").fetchone()[0]
    assert {"users", "patients", "encounters", "observations", "patient_snapshots", "audit_events"} <= tables
    assert users == 8
    assert patients == 4
    assert observations == 9
