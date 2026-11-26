#!/usr/bin/env python3
"""Restore a SQLite backup after taking a pre-restore safety copy.

This is a local/demo tool. Production PostgreSQL restore uses pg_restore and a
separate runbook with approval.
"""
from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
from datetime import UTC, datetime
from pathlib import Path


def database_path() -> Path:
    url = os.getenv("HCC_CIP_DATABASE_URL", "sqlite:///./hcc-cip.db")
    if not url.startswith("sqlite:///"):
        raise SystemExit("restore script only supports SQLite")
    return Path(url.removeprefix("sqlite:///")).expanduser()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("backup", type=Path)
    parser.add_argument("--database", type=Path, default=None)
    parser.add_argument("--yes", action="store_true", help="confirm replacing the target database")
    args = parser.parse_args()
    if not args.backup.exists():
        raise SystemExit(f"backup not found: {args.backup}")
    target = args.database or database_path()
    if not args.yes:
        raise SystemExit("refusing to overwrite database without --yes")
    with sqlite3.connect(args.backup) as check:
        if check.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit("backup integrity check failed")
    if target.exists():
        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        safety = target.with_name(f"{target.stem}.pre-restore-{stamp}{target.suffix}")
        with sqlite3.connect(target) as src, sqlite3.connect(safety) as dst:
            src.backup(dst)
        print(f"pre-restore safety copy: {safety}")
    with sqlite3.connect(args.backup) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    print(f"restored {args.backup} -> {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
