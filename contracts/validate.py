#!/usr/bin/env python3
"""Validate HCC-CIP V0.6 domain schemas, OpenAPI shape, and synthetic acceptance case.

Requires: Python 3.11+, jsonschema, PyYAML.
Usage: python3 contracts/validate.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

ROOT = Path(__file__).resolve().parent
SCHEMAS = ROOT / "schemas"
CASE = ROOT / "examples" / "hcc-surgery-case.json"
OPENAPI = ROOT / "openapi.yaml"

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print(f"FAIL  {msg}")


def ok(msg: str) -> None:
    print(f"OK    {msg}")


def load_schemas() -> dict[str, Draft202012Validator]:
    validators: dict[str, Draft202012Validator] = {}
    for path in sorted(SCHEMAS.glob("*.schema.json")):
        schema = json.loads(path.read_text())
        try:
            Draft202012Validator.check_schema(schema)
        except SchemaError as exc:
            fail(f"schema {path.name}: {exc.message}")
            continue
        validators[path.stem.replace(".schema", "")] = Draft202012Validator(schema)
    if len(validators) < 12:
        fail(f"expected >=12 schemas, found {len(validators)}")
    else:
        ok(f"{len(validators)} JSON schemas are valid Draft 2020-12")
    return validators


def validate(validators: dict[str, Draft202012Validator], name: str, data: Any) -> None:
    validator = validators.get(name)
    if validator is None:
        fail(f"missing schema {name}")
        return
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.absolute_path))
    if errors:
        for e in errors[:5]:
            at = "/".join(str(p) for p in e.absolute_path) or "<root>"
            fail(f"{name} at {at}: {e.message}")
    else:
        ok(f"{name} matches contract")


def require(cond: bool, msg: str) -> None:
    ok(msg) if cond else fail(msg)


def check_case(validators: dict[str, Draft202012Validator]) -> None:
    case = json.loads(CASE.read_text())
    require(case.get("case_version") == "0.6.0", "case declares contract version 0.6.0")
    require(case.get("synthetic") is True, "case is explicitly synthetic")
    require(case["patient"]["diagnosis_code"] == "C22.0", "case is HCC C22.0 only")

    validate(validators, "patient", case["patient"])
    validate(validators, "encounter", case["encounter"])
    for obs in case["observations"]:
        validate(validators, "observation", obs)
    validate(validators, "snapshot", case["snapshot"])
    validate(validators, "snapshot", case["snapshot_after_supplement"])
    validate(validators, "pathway_version", case["pathway_version"])
    for ev in case["enrollment_evaluations"]:
        validate(validators, "enrollment_evaluation", ev)
    validate(validators, "instance", case["instance"])
    validate(validators, "plan", case["plan"])
    validate(validators, "variation", case["variation"])
    validate(validators, "followup", case["followup"])
    validate(validators, "outcome", case["outcome"])
    for ev in case["audit_events"]:
        validate(validators, "audit_event", ev)

    patient_id = case["patient"]["patient_id"]
    obs_by_id = {o["observation_id"]: o for o in case["observations"]}
    require(len(obs_by_id) == len(case["observations"]), "observation IDs are unique")
    require(all(o["patient_id"] == patient_id for o in case["observations"]), "all observations belong to case patient")

    snap = case["snapshot"]
    require(all(ref in obs_by_id for ref in snap["observation_refs"]), "snapshot observation refs resolve")
    missing_unknown = [
        o for o in case["observations"]
        if o["value_status"] == "UNKNOWN" and o["observation_id"] in snap["observation_refs"]
    ]
    require(bool(missing_unknown), "snapshot contains an explicit UNKNOWN observation")
    require("assessment.nrs2002" in snap["missing_fields"], "missing NRS 2002 is declared in snapshot")

    first, second = case["enrollment_evaluations"]
    require(first["decision"] == "PENDING_SUPPLEMENT", "first evaluation requires supplement, not auto-enroll")
    require(first["auto_enroll_allowed"] is False, "UNKNOWN blocks auto-enrollment")
    require(first["completeness_tri_state"] == "UNKNOWN", "first completeness is UNKNOWN")
    require(second["decision"] == "ELIGIBLE", "second evaluation becomes ELIGIBLE after supplement")
    require(second["missing_fields"] == [], "second evaluation has no missing fields")
    require(second["snapshot_id"] == case["snapshot_after_supplement"]["snapshot_id"], "second evaluation uses supplemented snapshot")

    instance = case["instance"]
    require(instance["patient_id"] == patient_id, "instance references case patient")
    require(instance["pathway_version_id"] == case["pathway_version"]["version_id"], "instance references frozen version")
    require(instance["active_plan_id"] == case["plan"]["plan_id"], "instance active plan points to plan")

    plan = case["plan"]
    require(plan["status"] == "ACTIVE", "plan is ACTIVE in acceptance case")
    require(bool(plan.get("approved_by") and plan.get("approved_at") and plan.get("activated_at")), "plan activation is approved and time-stamped")
    task_by_id = {t["task_id"]: t for t in plan["tasks"]}
    require(len(task_by_id) == len(plan["tasks"]), "task IDs are unique")
    for task in plan["tasks"]:
        require(all(dep in task_by_id for dep in task["depends_on"]), f"task {task['task_id']} dependencies resolve")
        if task["status"] == "READY":
            require(all(task_by_id[d]["status"] == "COMPLETED" for d in task["depends_on"]), f"READY task {task['task_id']} has no incomplete dependencies")

    variation = case["variation"]
    require(variation["instance_id"] == instance["instance_id"], "variation references instance")
    require(case["expected"]["variation_does_not_auto_change_plan"] is True, "variation policy: no automatic plan mutation")

    fu = case["followup"]
    require(fu["patient_id"] == patient_id, "follow-up references patient")
    require(fu["risk_level"] == "HIGH" and fu["escalation"]["required"] is True, "danger signal marked for human escalation")
    require(fu["escalation"]["notified_at"] is not None and fu["escalation"]["acknowledged_at"] is not None, "escalation has notification and acknowledgement timestamps")
    require(all(c.get("confirmed_by_human") for c in fu["contacts"]), "structured follow-up extract is human-confirmed")
    require(fu["status"] != "CLOSED", "high-risk follow-up cannot be auto-closed")

    outcome = case["outcome"]
    require(outcome["patient_id"] == patient_id and outcome["instance_id"] == instance["instance_id"], "outcome references patient and instance")
    require(outcome["evaluation_standard"] in {"RECIST", "mRECIST"}, "outcome records evaluation standard")

    denied = [e for e in case["audit_events"] if e["result"] == "DENIED" and e["object_type"] == "PATIENT"]
    require(bool(denied), "denied object-level patient access is audited")
    require(case["expected"]["clinical_use"] is False, "case declares clinical_use=false")
    require(case["expected"]["auto_enroll_when_unknown"] is False, "acceptance expectation encodes UNKNOWN block")


def check_openapi() -> None:
    spec = yaml.safe_load(OPENAPI.read_text())
    require(spec.get("openapi") == "3.1.0", "OpenAPI is 3.1.0")
    require(spec["info"]["version"] == "0.6.0", "OpenAPI version is 0.6.0")
    paths = spec.get("paths", {})
    require(len(paths) >= 30, f"OpenAPI covers minimal endpoint list ({len(paths)} paths)")
    operation_ids: list[str] = []
    for path, item in paths.items():
        for method, operation in item.items():
            if method not in {"get", "post", "put", "patch", "delete"}:
                continue
            operation_ids.append(operation.get("operationId", ""))
    require(all(operation_ids), "every operation has an operationId")
    require(len(operation_ids) == len(set(operation_ids)), "operationIds are unique")
    refs: set[str] = set()

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for k, v in value.items():
                if k == "$ref" and isinstance(v, str):
                    refs.add(v)
                walk(v)
        elif isinstance(value, list):
            for v in value:
                walk(v)

    walk(spec)
    external = sorted({r for r in refs if r.startswith("./schemas/")})
    require(len(external) >= 10, f"OpenAPI references external JSON schemas ({len(external)})")
    for ref in external:
        require((OPENAPI.parent / ref).exists(), f"external schema exists: {ref}")


def main() -> int:
    validators = load_schemas()
    check_case(validators)
    check_openapi()
    if failures:
        print(f"\n{len(failures)} failure(s)")
        return 1
    print("\nAll contract checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
