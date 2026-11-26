from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    ADMIN = "ADMIN"
    CLINICIAN = "CLINICIAN"
    EXPERT = "EXPERT"
    MEDICAL_AFFAIRS = "MEDICAL_AFFAIRS"
    NURSE = "NURSE"
    EXECUTIVE = "EXECUTIVE"


class DataScope(StrEnum):
    SELF = "SELF"
    DEPT = "DEPT"
    ORG = "ORG"
    ALL_NO_RECORD = "ALL_NO_RECORD"


class PatientStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DECEASED = "DECEASED"
    UNKNOWN = "UNKNOWN"


class EncounterType(StrEnum):
    INPATIENT = "INPATIENT"
    OUTPATIENT = "OUTPATIENT"
    FOLLOWUP = "FOLLOWUP"


class EncounterStatus(StrEnum):
    ADMITTED = "ADMITTED"
    DISCHARGED = "DISCHARGED"
    CANCELLED = "CANCELLED"


class ObservationCategory(StrEnum):
    LAB = "LAB"
    IMAGING = "IMAGING"
    ASSESSMENT = "ASSESSMENT"
    FUNCTION = "FUNCTION"
    VITAL = "VITAL"


class ValueStatus(StrEnum):
    KNOWN = "KNOWN"
    UNKNOWN = "UNKNOWN"


class Interpretation(StrEnum):
    NORMAL = "NORMAL"
    ABNORMAL = "ABNORMAL"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class AuditResult(StrEnum):
    SUCCESS = "SUCCESS"
    DENIED = "DENIED"
    FAILED = "FAILED"
