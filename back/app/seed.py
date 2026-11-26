from __future__ import annotations

import json
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.domain.hcc_pathway import HCC_SURGERY_GRAPH, HCC_SURGERY_RULES
from app.domain.models import Department, Encounter, Observation, PathwayTemplate, PathwayVersion, Patient, User
from app.services.pathways import content_hash, validate_pathway
from app.security import hash_password

DEMO_PASSWORD = "cpip-demo"

DEPARTMENTS = [
    ("dept-hpb", "肝胆外科 · 肝癌中心", "CLINICAL"),
    ("dept-intervention", "介入科", "CLINICAL"),
    ("dept-oncology", "肿瘤内科", "CLINICAL"),
    ("dept-admin", "院务管理", "ADMIN"),
]

USERS = [
    ("U-001", "RH0001", "王建国", "ADMIN", "ALL_NO_RECORD", "dept-admin"),
    ("U-002", "RH0102", "周敏", "MEDICAL_AFFAIRS", "ORG", "dept-admin"),
    ("U-003", "RH0218", "张启明", "EXPERT", "DEPT", "dept-hpb"),
    ("U-004", "RH0236", "李文博", "CLINICIAN", "DEPT", "dept-hpb"),
    ("U-005", "RH0451", "赵倩", "NURSE", "DEPT", "dept-hpb"),
    ("U-006", "RH0009", "林海", "EXECUTIVE", "ORG", "dept-admin"),
    ("U-007", "RH0311", "陈立", "CLINICIAN", "DEPT", "dept-intervention"),
    ("U-008", "RH0166", "王海峰", "EXPERT", "DEPT", "dept-intervention"),
]

PATIENTS = [
    {
        "id": "HCC-DEMO-001",
        "display_name": "陈志远",
        "sex": "M",
        "birth_date": date(1968, 3, 12),
        "external_id": "MRN-DEMO-001",
        "department_id": "dept-hpb",
    },
    {
        "id": "HCC-DEMO-002",
        "display_name": "王丽华",
        "sex": "F",
        "birth_date": date(1970, 7, 8),
        "external_id": "MRN-DEMO-002",
        "department_id": "dept-hpb",
    },
    {
        "id": "HCC-DEMO-003",
        "display_name": "李国强",
        "sex": "M",
        "birth_date": date(1963, 11, 21),
        "external_id": "MRN-DEMO-003",
        "department_id": "dept-hpb",
    },
    {
        "id": "HCC-DEMO-INTERV-001",
        "display_name": "张建军",
        "sex": "M",
        "birth_date": date(1959, 5, 4),
        "external_id": "MRN-DEMO-101",
        "department_id": "dept-intervention",
    },
]

ENCOUNTERS = [
    ("ENC-HCC-001", "HCC-DEMO-001", "dept-hpb", "肝胆外科 · 肝癌中心", "肝胆外科 3 病区", "03-12", "张启明"),
    ("ENC-HCC-002", "HCC-DEMO-002", "dept-hpb", "肝胆外科 · 肝癌中心", "肝胆外科 2 病区", "02-08", "张启明"),
    ("ENC-HCC-003", "HCC-DEMO-003", "dept-hpb", "肝胆外科 · 肝癌中心", "肝胆外科 1 病区", "01-05", "陈立"),
    ("ENC-HCC-101", "HCC-DEMO-INTERV-001", "dept-intervention", "介入科", "介入科 1 病区", "11-02", "陈立"),
]

OBSERVATIONS = [
    ("OBS-AFP-001", "HCC-DEMO-001", "ENC-HCC-001", "LAB", "AFP", "甲胎蛋白 AFP", 86.4, None, "ng/mL", "KNOWN", "< 20 ng/mL", "ABNORMAL", "2026-11-24T00:00:00+00:00"),
    ("OBS-INR-001", "HCC-DEMO-001", "ENC-HCC-001", "LAB", "INR", "国际标准化比值 INR", 1.12, None, "1", "KNOWN", "0.8–1.2", "NORMAL", "2026-11-24T00:00:00+00:00"),
    ("OBS-PLT-001", "HCC-DEMO-001", "ENC-HCC-001", "LAB", "PLT", "血小板计数", 168, None, "10^9/L", "KNOWN", "125–350 ×10^9/L", "NORMAL", "2026-11-24T00:00:00+00:00"),
    ("OBS-ALB-001", "HCC-DEMO-001", "ENC-HCC-001", "LAB", "ALB", "白蛋白", 38.1, None, "g/L", "KNOWN", "35–55 g/L", "NORMAL", "2026-11-24T00:00:00+00:00"),
    ("OBS-ICG-001", "HCC-DEMO-001", "ENC-HCC-001", "FUNCTION", "ICG_R15", "ICG R15", 12.4, None, "%", "KNOWN", "< 10%", "ABNORMAL", "2026-11-25T02:00:00+00:00"),
    ("OBS-MRI-001", "HCC-DEMO-001", "ENC-HCC-001", "IMAGING", "MRI_LIVER", "上腹部增强 MRI", 32, "肝右叶 S6 段异常强化灶，最大径 32mm；未见门静脉癌栓及肝外转移。", "mm", "KNOWN", None, "ABNORMAL", "2026-11-24T02:45:00+00:00"),
    ("OBS-NRS-001", "HCC-DEMO-001", "ENC-HCC-001", "ASSESSMENT", "NRS2002", "营养风险筛查 NRS 2002", None, None, None, "UNKNOWN", "0–7", "UNKNOWN", "2026-11-25T01:00:00+00:00"),
    ("OBS-NRS-002", "HCC-DEMO-001", "ENC-HCC-001", "ASSESSMENT", "NRS2002", "营养风险筛查 NRS 2002（补充）", 2, "评分 2 分，低风险；由责任医生补充并签名。", "分", "KNOWN", "0–7", "NORMAL", "2026-11-26T03:05:00+00:00"),
    ("OBS-TEMP-001", "HCC-DEMO-001", "ENC-HCC-001", "VITAL", "TEMP", "体温", 37.6, None, "°C", "KNOWN", "36.0–37.2 °C", "ABNORMAL", "2026-11-27T01:40:00+00:00"),
]


def seed(db: Session) -> dict[str, int]:
    counts = {"departments": 0, "users": 0, "pathways": 0, "patients": 0, "encounters": 0, "observations": 0}
    for dept_id, name, dept_type in DEPARTMENTS:
        if db.get(Department, dept_id) is None:
            db.add(Department(id=dept_id, name=name, type=dept_type))
            counts["departments"] += 1

    db.flush()
    password_hash = hash_password(DEMO_PASSWORD)
    for user_id, employee_no, name, role, scope, dept_id in USERS:
        if db.scalar(select(User).where(User.employee_no == employee_no)) is None:
            db.add(
                User(
                    id=user_id,
                    employee_no=employee_no,
                    display_name=name,
                    role=role,
                    data_scope=scope,
                    department_id=dept_id,
                    password_hash=password_hash,
                    active=True,
                )
            )
            counts["users"] += 1

    db.flush()
    if db.get(PathwayTemplate, "PW-HCC-001") is None:
        validation = validate_pathway(HCC_SURGERY_GRAPH, HCC_SURGERY_RULES)
        db.add(
            PathwayTemplate(
                id="PW-HCC-001",
                name="肝癌手术临床路径",
                disease_code="C22.0",
                department_id="dept-hpb",
                created_by="U-003",
                current_published_version_id="PV-HCC-130",
            )
        )
        db.add(
            PathwayVersion(
                id="PV-HCC-130",
                template_id="PW-HCC-001",
                version="1.3.0",
                status="PUBLISHED",
                graph_json=json.dumps(HCC_SURGERY_GRAPH, ensure_ascii=False),
                rules_json=json.dumps(HCC_SURGERY_RULES, ensure_ascii=False),
                content_hash=content_hash(HCC_SURGERY_GRAPH, HCC_SURGERY_RULES),
                created_by="U-003",
                published_at=datetime(2026, 10, 12, 1, 0, tzinfo=UTC),
                approved_by="U-002",
                validation_json=json.dumps(validation, ensure_ascii=False),
            )
        )
        counts["pathways"] += 1

    db.flush()
    for data in PATIENTS:
        if db.get(Patient, data["id"]) is None:
            db.add(
                Patient(
                    **data,
                    synthetic=True,
                    source_system="SYNTHETIC",
                    diagnosis_code="C22.0",
                    diagnosis_name="肝细胞癌",
                    status="ACTIVE",
                )
            )
            counts["patients"] += 1

    db.flush()
    for enc_id, patient_id, dept_id, dept_name, ward, bed, attending in ENCOUNTERS:
        if db.get(Encounter, enc_id) is None:
            db.add(
                Encounter(
                    id=enc_id,
                    patient_id=patient_id,
                    type="INPATIENT",
                    department_id=dept_id,
                    department_name=dept_name,
                    ward=ward,
                    bed=bed,
                    attending_name=attending,
                    admitted_at=datetime(2026, 11, 23, 6, 20, tzinfo=UTC),
                    status="ADMITTED",
                    source_system="SYNTHETIC-HIS",
                )
            )
            counts["encounters"] += 1

    db.flush()
    for row in OBSERVATIONS:
        obs_id = row[0]
        if db.get(Observation, obs_id) is None:
            (
                _,
                patient_id,
                encounter_id,
                category,
                code,
                display,
                value_num,
                value_text,
                unit,
                value_status,
                reference_range,
                interpretation,
                occurred_at,
            ) = row
            occurred = datetime.fromisoformat(occurred_at)
            db.add(
                Observation(
                    id=obs_id,
                    patient_id=patient_id,
                    encounter_id=encounter_id,
                    category=category,
                    code=code,
                    display=display,
                    value_num=value_num,
                    value_text=value_text,
                    unit=unit,
                    value_status=value_status,
                    reference_range=reference_range,
                    interpretation=interpretation,
                    occurred_at=occurred,
                    recorded_at=occurred,
                    source_system="SYNTHETIC-LIS",
                )
            )
            counts["observations"] += 1

    db.commit()
    return counts


def main() -> None:
    with SessionLocal() as db:
        counts = seed(db)
    print(f"seed complete: {counts} (password for demo users: {DEMO_PASSWORD})")


if __name__ == "__main__":
    main()
