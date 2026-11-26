from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, TypeDecorator


class UTCDateTime(TypeDecorator):
    """Store timestamps in UTC and return timezone-aware datetimes on all DBs.

    SQLite drops timezone information; this decorator normalises at the boundary
    so API responses are always RFC 3339 UTC and comparisons are safe.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect):  # noqa: ANN001
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect):  # noqa: ANN001
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
