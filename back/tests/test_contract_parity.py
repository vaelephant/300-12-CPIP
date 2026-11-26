from __future__ import annotations

from pathlib import Path

import yaml

from app.main import app

CONTRACT = Path(__file__).resolve().parents[2] / "contracts" / "openapi.yaml"


def contract_paths() -> dict[str, set[str]]:
    spec = yaml.safe_load(CONTRACT.read_text())
    result: dict[str, set[str]] = {}
    for path, operations in spec["paths"].items():
        methods = {
            method.upper()
            for method in operations
            if method.lower() in {"get", "post", "put", "patch", "delete"}
        }
        result[path] = methods
    return result


def live_paths() -> dict[str, set[str]]:
    result: dict[str, set[str]] = {}
    for path, operations in app.openapi()["paths"].items():
        normalized = path.removeprefix("/api/v1")
        result[normalized] = {
            method.upper()
            for method in operations
            if method.lower() in {"get", "post", "put", "patch", "delete"}
        }
    return result


def test_contract_and_live_api_paths_match():
    """Every proposed contract path must be implemented and documented."""
    expected = contract_paths()
    actual = live_paths()
    assert set(expected) - set(actual) == set(), "contract paths missing in app"
    assert set(actual) - set(expected) == set(), "app paths missing in contract"
    for path, methods in expected.items():
        assert methods == actual[path], f"method mismatch for {path}: {methods} != {actual[path]}"
