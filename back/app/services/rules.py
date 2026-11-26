from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import Observation, Patient


class Tri(StrEnum):
    TRUE = "TRUE"
    FALSE = "FALSE"
    UNKNOWN = "UNKNOWN"


def tri_and(*values: Tri) -> Tri:
    if any(value == Tri.FALSE for value in values):
        return Tri.FALSE
    if any(value == Tri.UNKNOWN for value in values):
        return Tri.UNKNOWN
    return Tri.TRUE


def tri_or(*values: Tri) -> Tri:
    if any(value == Tri.TRUE for value in values):
        return Tri.TRUE
    if any(value == Tri.UNKNOWN for value in values):
        return Tri.UNKNOWN
    return Tri.FALSE


def tri_not(value: Tri) -> Tri:
    if value == Tri.TRUE:
        return Tri.FALSE
    if value == Tri.FALSE:
        return Tri.TRUE
    return Tri.UNKNOWN


@dataclass
class RuleOutcome:
    rule_id: str
    version: str
    result: Tri
    missing_fields: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


SUPPORTED_RULES: dict[str, str] = {
    "RULE-001": "1.2.0",
    "RULE-002": "1.1.0",
    "RULE-003": "1.0.3",
    "RULE-004": "1.3.0",
    "RULE-005": "1.0.0",
    "RULE-008": "2.0.0",
    "RULE-009": "1.1.0",
    "RULE-010": "1.0.0",
}

_OBSERVATION_CODES = {
    "assessment.nrs2002": "NRS2002",
    "lab.icg_r15": "ICG_R15",
    "lab.inr": "INR",
    "lab.plt": "PLT",
    "imaging.report": "MRI_LIVER",
    "temp": "TEMP",
}


@dataclass
class RuleContext:
    patient: Patient
    snapshot: dict[str, Any]
    observations: dict[str, Observation]

    @property
    def missing(self) -> set[str]:
        return set(self.snapshot.get("missing_fields") or [])

    def is_missing(self, key: str) -> bool:
        return key in self.missing

    def tri_from_bool(self, key: str, value: bool | None) -> Tri:
        if self.is_missing(key) or value is None:
            return Tri.UNKNOWN
        return Tri.TRUE if value else Tri.FALSE

    def num(self, key: str, code: str | None = None) -> tuple[float | None, list[str]]:
        if self.is_missing(key):
            return None, [key]
        obs_code = code or _OBSERVATION_CODES.get(key)
        if obs_code:
            obs = self.observations.get(obs_code)
            if obs is None or obs.value_status != "KNOWN" or obs.value_num is None:
                return None, [key]
            return float(obs.value_num), []
        return None, [key]

    def child_pugh(self) -> tuple[str | None, list[str]]:
        if self.is_missing("liver_reserve.child_pugh"):
            return None, ["liver_reserve.child_pugh"]
        value = (self.snapshot.get("liver_reserve") or {}).get("child_pugh")
        if value not in {"A", "B", "C"}:
            return None, ["liver_reserve.child_pugh"]
        return value, []

    def ecog(self) -> tuple[int | None, list[str]]:
        if self.is_missing("performance.ecog"):
            return None, ["performance.ecog"]
        value = (self.snapshot.get("performance_status") or {}).get("ecog")
        if value is None:
            return None, ["performance.ecog"]
        return int(value), []


def build_context(db: Session, patient: Patient, snapshot: dict[str, Any]) -> RuleContext:
    observations: dict[str, Observation] = {}
    rows = db.scalars(
        select(Observation).where(Observation.patient_id == patient.id).order_by(Observation.occurred_at.desc())
    ).all()
    for row in rows:
        observations.setdefault(row.code, row)
    return RuleContext(patient=patient, snapshot=snapshot, observations=observations)


def _rule_001(ctx: RuleContext) -> RuleOutcome:
    missing: list[str] = []
    reasons: list[str] = []
    values: list[Tri] = []
    values.append(Tri.TRUE if ctx.patient.diagnosis_code == "C22.0" else Tri.FALSE)
    child, child_missing = ctx.child_pugh()
    missing.extend(child_missing)
    if child is None:
        values.append(Tri.UNKNOWN)
    elif child in {"A", "B"}:
        values.append(Tri.TRUE)
    else:
        values.append(Tri.FALSE)
        reasons.append("Child-Pugh C 级不满足肝切除准入")
    ecog, ecog_missing = ctx.ecog()
    missing.extend(ecog_missing)
    values.append(Tri.UNKNOWN if ecog is None else (Tri.TRUE if ecog <= 1 else Tri.FALSE))
    tumor = ctx.snapshot.get("tumor") or {}
    if tumor.get("extrahepatic_metastasis") is True:
        values.append(Tri.FALSE)
        reasons.append("存在肝外转移")
    else:
        values.append(Tri.TRUE)
    number = tumor.get("number")
    values.append(Tri.UNKNOWN if number is None else (Tri.TRUE if number >= 1 else Tri.FALSE))
    result = tri_and(*values)
    if result == Tri.UNKNOWN:
        reasons.append("准入必需字段存在 UNKNOWN，不能自动视为符合")
    return RuleOutcome("RULE-001", "1.2.0", result, sorted(set(missing)), reasons)


def _rule_002(ctx: RuleContext) -> RuleOutcome:
    missing: list[str] = []
    values: list[Tri] = []
    reasons: list[str] = []
    child, child_missing = ctx.child_pugh()
    missing.extend(child_missing)
    if child is None:
        values.append(Tri.UNKNOWN)
    else:
        values.append(Tri.TRUE if child == "C" else Tri.FALSE)
        if child == "C":
            reasons.append("Child-Pugh C 级")
    tumor = ctx.snapshot.get("tumor") or {}
    values.append(Tri.TRUE if tumor.get("extrahepatic_metastasis") is True else Tri.FALSE)
    if tumor.get("extrahepatic_metastasis") is True:
        reasons.append("肝外转移")
    for key in ("liver.refractory_ascites", "liver.encephalopathy"):
        if ctx.is_missing(key):
            values.append(Tri.UNKNOWN)
            missing.append(key)
    result = tri_or(*values)
    return RuleOutcome("RULE-002", "1.1.0", result, sorted(set(missing)), reasons)


def _rule_003(ctx: RuleContext) -> RuleOutcome:
    required = [
        "assessment.nrs2002",
        "lab.icg_r15",
        "lab.inr",
        "lab.plt",
        "imaging.report",
        "staging",
        "liver_reserve",
        "performance.ecog",
    ]
    missing: list[str] = []
    for key in required:
        if key in {"staging", "liver_reserve", "performance.ecog"}:
            if ctx.is_missing(key):
                missing.append(key)
            continue
        _, item_missing = ctx.num(key)
        missing.extend(item_missing)
    if missing:
        return RuleOutcome("RULE-003", "1.0.3", Tri.UNKNOWN, sorted(set(missing)), ["必需资料未齐，按 UNKNOWN 处理"])
    return RuleOutcome("RULE-003", "1.0.3", Tri.TRUE, [], ["必需资料齐备"])


def _rule_004(ctx: RuleContext) -> RuleOutcome:
    icg, missing = ctx.num("lab.icg_r15")
    if icg is None:
        return RuleOutcome("RULE-004", "1.3.0", Tri.UNKNOWN, missing, ["ICG R15 缺失"])
    result = Tri.TRUE if icg <= 15 else Tri.FALSE
    return RuleOutcome("RULE-004", "1.3.0", result, [], [f"ICG R15={icg}%；阈值 ≤15%"])


def _rule_005(ctx: RuleContext) -> RuleOutcome:
    inr, inr_missing = ctx.num("lab.inr")
    plt, plt_missing = ctx.num("lab.plt")
    if inr is None or plt is None:
        return RuleOutcome("RULE-005", "1.0.0", Tri.UNKNOWN, sorted(set(inr_missing + plt_missing)), ["凝血指标缺失"])
    unsafe = inr > 1.5 or plt < 50
    return RuleOutcome(
        "RULE-005",
        "1.0.0",
        Tri.TRUE if unsafe else Tri.FALSE,
        [],
        [f"INR={inr}, PLT={plt}×10^9/L；安全约束{'触发' if unsafe else '未触发'}"],
    )


def _rule_008(ctx: RuleContext) -> RuleOutcome:
    missing: list[str] = []
    values: list[Tri] = []
    tumor = ctx.snapshot.get("tumor") or {}
    max_mm = tumor.get("max_diameter_mm")
    values.append(Tri.UNKNOWN if max_mm is None else (Tri.TRUE if max_mm <= 30 else Tri.FALSE))
    if max_mm is None:
        missing.append("tumor.max_diameter_mm")
    number = tumor.get("number")
    values.append(Tri.UNKNOWN if number is None else (Tri.TRUE if number <= 3 else Tri.FALSE))
    if number is None:
        missing.append("tumor.number")
    child, child_missing = ctx.child_pugh()
    missing.extend(child_missing)
    values.append(Tri.UNKNOWN if child is None else (Tri.TRUE if child in {"A", "B"} else Tri.FALSE))
    values.append(Tri.FALSE if tumor.get("extrahepatic_metastasis") is True else Tri.TRUE)
    return RuleOutcome("RULE-008", "2.0.0", tri_and(*values), sorted(set(missing)), [])


def _rule_009(ctx: RuleContext) -> RuleOutcome:
    missing: list[str] = []
    values: list[Tri] = []
    child, child_missing = ctx.child_pugh()
    missing.extend(child_missing)
    values.append(Tri.UNKNOWN if child is None else (Tri.TRUE if child in {"A", "B"} else Tri.FALSE))
    if ctx.is_missing("imaging.portal_vein_patency"):
        values.append(Tri.UNKNOWN)
        missing.append("imaging.portal_vein_patency")
    else:
        values.append(Tri.TRUE)
    values.append(Tri.FALSE if (ctx.snapshot.get("tumor") or {}).get("extrahepatic_metastasis") is True else Tri.TRUE)
    return RuleOutcome("RULE-009", "1.1.0", tri_and(*values), sorted(set(missing)), [])


def _rule_010(ctx: RuleContext) -> RuleOutcome:
    values: list[Tri] = []
    missing: list[str] = []
    child, child_missing = ctx.child_pugh()
    missing.extend(child_missing)
    values.append(Tri.UNKNOWN if child is None else (Tri.TRUE if child == "C" else Tri.FALSE))
    if ctx.is_missing("liver.refractory_ascites"):
        values.append(Tri.UNKNOWN)
        missing.append("liver.refractory_ascites")
    else:
        values.append(Tri.TRUE if (ctx.snapshot.get("liver") or {}).get("refractory_ascites") is True else Tri.FALSE)
    return RuleOutcome("RULE-010", "1.0.0", tri_or(*values), sorted(set(missing)), ["转化后手术安全约束"])


_RULES = {
    "RULE-001": _rule_001,
    "RULE-002": _rule_002,
    "RULE-003": _rule_003,
    "RULE-004": _rule_004,
    "RULE-005": _rule_005,
    "RULE-008": _rule_008,
    "RULE-009": _rule_009,
    "RULE-010": _rule_010,
}


def evaluate_rule(ctx: RuleContext, rule_id: str, version: str) -> RuleOutcome:
    supported = SUPPORTED_RULES.get(rule_id)
    if supported is None:
        return RuleOutcome(rule_id, version, Tri.UNKNOWN, [f"rule:{rule_id}"], ["规则未注册，不能默认通过"])
    if supported != version:
        return RuleOutcome(rule_id, version, Tri.UNKNOWN, [f"rule_version:{rule_id}"], ["规则版本未注册或已过期"])
    return _RULES[rule_id](ctx)


def combine_enrollment(rules: list[dict[str, Any]], ctx: RuleContext) -> dict[str, Any]:
    """Evaluate bound rules and combine admission/exclusion/completeness/safety."""
    results: list[RuleOutcome] = []
    admission_values: list[Tri] = [Tri.TRUE]
    exclusion_values: list[Tri] = [Tri.FALSE]
    completeness_values: list[Tri] = [Tri.TRUE]
    safety_values: list[Tri] = [Tri.FALSE]
    for rule in rules:
        outcome = evaluate_rule(ctx, str(rule.get("rule_id")), str(rule.get("version")))
        results.append(outcome)
        binding = rule.get("binding")
        if binding == "ADMISSION":
            admission_values.append(outcome.result)
        elif binding == "EXCLUSION":
            exclusion_values.append(outcome.result)
        elif binding == "COMPLETENESS":
            completeness_values.append(outcome.result)
        elif binding == "SAFETY":
            safety_values.append(outcome.result)

    admission = tri_and(*admission_values)
    exclusion = tri_or(*exclusion_values)
    completeness = tri_and(*completeness_values)
    safety = tri_or(*safety_values)
    missing = sorted({field for outcome in results for field in outcome.missing_fields})
    reasons = [reason for outcome in results for reason in outcome.reasons]

    if safety == Tri.TRUE:
        decision = "NOT_ELIGIBLE"
        auto_enroll = False
        reasons.append("安全约束触发，禁止自动入径")
    elif exclusion == Tri.TRUE or admission == Tri.FALSE:
        decision = "NOT_ELIGIBLE"
        auto_enroll = False
    elif admission == Tri.UNKNOWN or exclusion == Tri.UNKNOWN or completeness == Tri.UNKNOWN or safety == Tri.UNKNOWN:
        decision = "PENDING_SUPPLEMENT"
        auto_enroll = False
    else:
        decision = "ELIGIBLE"
        auto_enroll = True

    return {
        "admission": admission,
        "exclusion": exclusion,
        "completeness": completeness,
        "safety": safety,
        "decision": decision,
        "auto_enroll_allowed": auto_enroll,
        "missing_fields": missing,
        "reasons": reasons,
        "rule_results": [
            {
                "rule_id": outcome.rule_id,
                "version": outcome.version,
                "result": outcome.result.value,
                "missing_fields": outcome.missing_fields,
                "reasons": outcome.reasons,
            }
            for outcome in results
        ],
    }
