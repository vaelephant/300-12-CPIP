from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from app.config import settings

_lock = threading.Lock()
_failures: dict[str, deque[float]] = defaultdict(deque)


def _key(employee_no: str, ip: str | None) -> str:
    return f"{employee_no.lower()}|{ip or 'unknown'}"


def record_failure(employee_no: str, ip: str | None) -> None:
    now = time.monotonic()
    with _lock:
        bucket = _failures[_key(employee_no, ip)]
        bucket.append(now)
        while bucket and now - bucket[0] > settings.login_window_seconds:
            bucket.popleft()


def reset(employee_no: str, ip: str | None) -> None:
    with _lock:
        _failures.pop(_key(employee_no, ip), None)


def retry_after(employee_no: str, ip: str | None) -> int:
    now = time.monotonic()
    with _lock:
        bucket = _failures.get(_key(employee_no, ip))
        if not bucket:
            return 0
        while bucket and now - bucket[0] > settings.login_window_seconds:
            bucket.popleft()
        if len(bucket) < settings.login_max_failures:
            return 0
        return max(1, int(settings.login_window_seconds - (now - bucket[0])))


def reset_all() -> None:
    with _lock:
        _failures.clear()
