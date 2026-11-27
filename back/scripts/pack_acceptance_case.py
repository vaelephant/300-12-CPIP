#!/usr/bin/env python3
"""Print and verify the financing demo acceptance case pack bindings.

Usage (from repo root or back/):
  python3 back/scripts/pack_acceptance_case.py
  python3 back/scripts/pack_acceptance_case.py --check-api

Does not invent clinical data. Binds existing seed + contracts assets.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASE_PATH = ROOT / "contracts" / "examples" / "hcc-surgery-case.json"

PACK = {
    "name": "HCC financing acceptance pack",
    "clinical_use": False,
    "contract_case": "HCC-ACC-001",
    "contract_path": str(CASE_PATH.relative_to(ROOT)),
    "seed_patient_id": "HCC-DEMO-001",
    "pathway_template_id": "PW-HCC-001",
    "published_version_id": "PV-HCC-130",
    "demo_accounts": ["RH0236", "RH0218", "RH0102", "RH0001"],
    "runbook": "docs/FINANCING-DEMO-RUNBOOK.md",
    "api_e2e": "back/scripts/demo_e2e.py",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-api", action="store_true", help="GET /health and confirm seed patient via API")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api/v1")
    args = parser.parse_args()

    if not CASE_PATH.exists():
        print(f"[fail] missing contract case: {CASE_PATH}", file=sys.stderr)
        return 1

    case = json.loads(CASE_PATH.read_text(encoding="utf-8"))
    case_id = case.get("case_id") or case.get("id") or case.get("meta", {}).get("case_id")
    print("[ok] acceptance pack")
    for key, value in PACK.items():
        print(f"  {key}: {value}")
    print(f"  contract_file_case_id: {case_id}")

    if not args.check_api:
        print("\nNext: make seed && make e2e  ·  or follow docs/FINANCING-DEMO-RUNBOOK.md")
        return 0

    try:
        import httpx
    except ImportError:
        print("[fail] httpx required for --check-api", file=sys.stderr)
        return 1

    base = args.base_url.rstrip("/")
    with httpx.Client(base_url=base, timeout=10) as client:
        health = client.get("/health")
        if health.status_code != 200:
            print(f"[fail] health {health.status_code}: {health.text}", file=sys.stderr)
            return 1
        print(f"[ok] health {health.json().get('status')}")

        login = client.post("/auth/login", json={"employee_no": "RH0236", "password": "cpip-demo"})
        if login.status_code != 200:
            print(f"[fail] login {login.status_code}: {login.text}", file=sys.stderr)
            return 1
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        patient = client.get(f"/patients/{PACK['seed_patient_id']}", headers=headers)
        if patient.status_code != 200:
            print(f"[fail] patient {patient.status_code}: {patient.text}", file=sys.stderr)
            return 1
        print(f"[ok] seed patient {PACK['seed_patient_id']} · {patient.json().get('display_name')}")

        pathways = client.get("/pathways/overview", headers=headers)
        if pathways.status_code != 200:
            print(f"[fail] pathways {pathways.status_code}", file=sys.stderr)
            return 1
        items = pathways.json().get("items", [])
        match = next((p for p in items if p.get("template_id") == PACK["pathway_template_id"]), None)
        if not match:
            print(f"[fail] template {PACK['pathway_template_id']} not in overview", file=sys.stderr)
            return 1
        print(f"[ok] pathway {match['template_id']} · v{match.get('current_version')} · {match.get('status')}")

    print("\n[ok] acceptance pack verified against running API")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
