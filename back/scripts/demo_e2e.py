#!/usr/bin/env python3
"""Run the V0.6 synthetic HCC end-to-end flow against a running backend.

Usage:
  python3 back/scripts/demo_e2e.py [--base-url http://127.0.0.1:8000/api/v1]

This script is a development acceptance exercise, not a clinical workflow.
"""
from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime, timedelta

import httpx


def require(response: httpx.Response, status: int = 200) -> dict:
    if response.status_code != status:
        raise SystemExit(f"{response.request.method} {response.request.url} -> {response.status_code}: {response.text}")
    return response.json()


def login(client: httpx.Client, employee_no: str) -> dict[str, str]:
    body = require(client.post("/auth/login", json={"employee_no": employee_no, "password": "cpip-demo"}))
    return {"Authorization": f"Bearer {body['access_token']}"}


def snapshot_payload(missing: list[str], refs: list[str]) -> dict:
    return {
        "as_of": datetime.now(UTC).isoformat(),
        "staging": {"system": "CNLC", "version": "2024", "value": "Ⅰb"},
        "liver_reserve": {"child_pugh": "A", "albi": -2.41},
        "performance_status": {"ecog": 0},
        "tumor": {
            "max_diameter_mm": 32,
            "number": 1,
            "location": "肝右叶 S6 段",
            "vascular_invasion": False,
            "extrahepatic_metastasis": False,
        },
        "observation_refs": refs,
        "missing_fields": missing,
        "ruleset_version": "HCC-RULES-0.6.0",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api/v1")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    with httpx.Client(base_url=base, timeout=10) as client:
        health = require(client.get("/health"))
        print(f"[ok] health {health['status']} · db={health['database']} · external={health['external_services']}")
        clinician = login(client, "RH0236")
        expert = login(client, "RH0218")
        medical = login(client, "RH0102")

        versions = require(client.get("/pathways", headers=clinician))["items"]
        version = next((item for item in versions if item["status"] == "PUBLISHED"), None)
        if version is None:
            raise SystemExit("no published pathway; run seed first")
        version_id = version["version_id"]
        print(f"[ok] published pathway {version['template_id']} / {version['version']} / {version_id}")

        refs = ["OBS-AFP-001", "OBS-INR-001", "OBS-PLT-001", "OBS-ICG-001", "OBS-MRI-001"]
        pending_snapshot = require(
            client.post("/patients/HCC-DEMO-001/snapshots", headers=clinician, json=snapshot_payload(["assessment.nrs2002"], refs)),
            201,
        )
        pending_eval = require(
            client.post(
                "/enrollment/evaluate",
                headers=clinician,
                json={"patient_id": "HCC-DEMO-001", "snapshot_id": pending_snapshot["snapshot_id"], "pathway_version_id": version_id},
            )
        )
        assert pending_eval["decision"] == "PENDING_SUPPLEMENT"
        assert pending_eval["auto_enroll_allowed"] is False
        print(f"[ok] UNKNOWN blocks auto-enrollment: {pending_eval['decision']}")

        final_snapshot = require(
            client.post(
                "/patients/HCC-DEMO-001/snapshots",
                headers=clinician,
                json=snapshot_payload([], refs + ["OBS-NRS-002"]),
            ),
            201,
        )
        final_eval = require(
            client.post(
                "/enrollment/evaluate",
                headers=clinician,
                json={"patient_id": "HCC-DEMO-001", "snapshot_id": final_snapshot["snapshot_id"], "pathway_version_id": version_id},
            )
        )
        assert final_eval["decision"] == "ELIGIBLE"
        instance = require(
            client.post(
                "/instances",
                headers=clinician,
                json={
                    "patient_id": "HCC-DEMO-001",
                    "pathway_version_id": version_id,
                    "enrollment_evaluation_id": final_eval["evaluation_id"],
                    "doctor_confirmed": True,
                },
            ),
            201,
        )
        print(f"[ok] instance {instance['instance_id']}")

        plan = require(
            client.post(
                f"/instances/{instance['instance_id']}/plans",
                headers=clinician,
                json={"snapshot_id": final_snapshot["snapshot_id"], "ruleset_version": "HCC-RULES-0.6.0"},
            ),
            201,
        )
        require(client.post(f"/plans/{plan['plan_id']}/submit", headers=clinician))
        approved = require(client.post(f"/plans/{plan['plan_id']}/approve", headers=expert, json={"comment": "E2E 审核"}))
        assert approved["status"] == "APPROVED"
        active = require(client.post(f"/plans/{plan['plan_id']}/activate", headers=clinician))
        assert active["status"] == "ACTIVE"
        print(f"[ok] plan {plan['plan_id']} approved and activated with {len(active['tasks'])} tasks")

        tasks = require(client.get(f"/tasks?instance_id={instance['instance_id']}", headers=clinician))["items"]
        admission = next(task for task in tasks if task["node_key"] == "admission")
        for target in ("READY", "IN_PROGRESS"):
            admission = require(
                client.post(
                    f"/tasks/{admission['task_id']}/transition",
                    headers=clinician,
                    json={"to_status": target, "expected_version": admission["version"]},
                )
            )
        admission = require(
            client.post(
                f"/tasks/{admission['task_id']}/transition",
                headers=clinician,
                json={"to_status": "COMPLETED", "expected_version": admission["version"], "result_summary": "E2E 评估完成"},
            )
        )
        assert admission["status"] == "COMPLETED"
        print("[ok] task transition PENDING -> COMPLETED with dependency/version checks")

        variation = require(
            client.post(
                "/variations",
                headers=clinician,
                json={
                    "patient_id": "HCC-DEMO-001",
                    "instance_id": instance["instance_id"],
                    "type": "CLINICAL",
                    "severity": "MEDIUM",
                    "title": "E2E 术后体温轻度升高",
                    "description": "合成演示变异",
                },
            ),
            201,
        )
        replan = require(client.post(f"/variations/{variation['variation_id']}/replan", headers=clinician), 201)
        assert replan["status"] == "DRAFT"
        print(f"[ok] variation {variation['variation_id']} -> replan {replan['plan_id']}")

        now = datetime.now(UTC)
        followup = require(
            client.post(
                "/followups",
                headers=clinician,
                json={
                    "patient_id": "HCC-DEMO-001",
                    "instance_id": instance["instance_id"],
                    "window_start": now.isoformat(),
                    "window_end": (now + timedelta(days=14)).isoformat(),
                    "channel": "PHONE",
                    "consent_status": "GRANTED",
                    "owner": "赵倩",
                },
            ),
            201,
        )
        require(
            client.post(
                f"/followups/{followup['followup_id']}/contacts",
                headers=clinician,
                json={"channel": "PHONE", "outcome": "REACHED", "structured_extract": {"symptoms": ["乏力"]}, "confirmed_by_human": True},
            )
        )
        escalated = require(
            client.post(
                f"/followups/{followup['followup_id']}/escalate",
                headers=clinician,
                json={"reason": "AFP 较基线升高，人工复核"},
            )
        )
        assert escalated["risk_level"] == "HIGH"
        require(
            client.post(
                f"/followups/{followup['followup_id']}/close",
                headers=clinician,
                json={"reason": "已安排门诊复核"},
            )
        )
        print("[ok] follow-up contact -> HIGH risk escalation -> human closure")

        outcome = require(
            client.post(
                "/patients/HCC-DEMO-001/outcomes",
                headers=clinician,
                json={
                    "instance_id": instance["instance_id"],
                    "treatment_type": "肝段切除术",
                    "evaluation_standard": "RECIST",
                    "observed_at": now.isoformat(),
                    "recurrence": "NONE",
                    "progression": False,
                    "response": "UNKNOWN",
                },
            ),
            201,
        )
        print(f"[ok] outcome {outcome['outcome_id']}")

        summary = require(client.get("/analytics/summary", headers=medical))
        audit = require(client.get("/audit-events?page_size=5", headers=medical))
        print(f"[ok] analytics metrics={len(summary['metrics'])} · recent audit={len(audit['items'])}")
        print("\nE2E demo passed (synthetic data; clinical_use=false).")
        return 0


if __name__ == "__main__":
    sys.exit(main())
