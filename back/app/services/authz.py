from __future__ import annotations

from fastapi import Request

from app.domain.enums import DataScope, Role
from app.domain.models import Patient, User
from app.errors import forbidden
from app.services.audit import record_audit

PATIENT_RECORD_ROLES = {Role.CLINICIAN.value, Role.EXPERT.value, Role.NURSE.value}


def can_access_patient(user: User, patient: Patient) -> bool:
    """Object-level patient access.

    - Only clinical roles can read patient records; administrators, medical
      affairs and executives are aggregate-only in V0.6.
    - DEPT scope requires the patient to belong to the user's department.
    - SELF scope is not enabled until an explicit assignment model exists.
    """
    if user.role not in PATIENT_RECORD_ROLES:
        return False
    if user.data_scope == DataScope.DEPT.value:
        return bool(user.department_id) and user.department_id == patient.department_id
    return False


def ensure_patient_access(request: Request, user: User, patient: Patient) -> None:
    if can_access_patient(user, patient):
        return
    record_audit(
        request=request,
        actor=user,
        action="PATIENT_VIEW",
        object_type="PATIENT",
        object_id=patient.id,
        result="DENIED",
        detail="对象级授权拒绝：角色、数据范围或科室不匹配",
    )
    raise forbidden("无权访问该患者记录（对象级授权）")


def ensure_role(user: User, *roles: Role) -> None:
    if user.role not in {role.value for role in roles}:
        raise forbidden("当前角色无权执行该操作")
