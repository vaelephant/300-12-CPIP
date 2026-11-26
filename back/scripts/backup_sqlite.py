#!/usr/bin/env python3
"""Create and verify a SQLite online backup for local/demo deployments."""
from __future__ import annotations

import argparse
import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path


def database_path() -> Path:
    url = os.getenv("HCC_CIP_DATABASE_URL", "sqlite:///./hcc-cip.db")
    if not url.startswith("sqlite:///"):
        raise SystemExit("backup script only supports SQLite; use pg_dump for PostgreSQL")
    return Path(url.removeprefix("sqlite:///")).expanduser()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", type=Path, default=None)
    parser.add_argument("--out-dir", type=Path, default=Path("backups"))
    args = parser.parse_args()
    source = args.database or database_path()
    if not source.exists():
        raise SystemExit(f"database not found: {source}")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    target = args.out_dir / f"hcc-cip-{stamp}.db"
    with sqlite3.connect(source) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    with sqlite3.connect(target) as check:
        result = check.execute("PRAGMA integrity_check").fetchone()[0]
        users = check.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        tables = {row[0] for row in check.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if result != "ok":
        target.unlink(missing_ok=True)
        raise SystemExit(f"backup integrity check failed: {result}")
    required = {"patients", "pathway_versions", "enrollment_evaluations", "plans", "tasks", "audit_events"}
    if not required <= tables:
        raise SystemExit(f"backup is missing required tables: {sorted(required - tables)}")
    print(f"backup ok: {target} · integrity={result} · users={users}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
