from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.domain.enums import Role
from app.domain.models import User
from app.errors import forbidden, unauthorized
from app.security import decode_access_token
from app.services.audit import record_audit

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        record_audit(
            request=request,
            actor=None,
            action="API_ACCESS",
            object_type="AUTH",
            object_id="anonymous",
            result="DENIED",
            detail="缺少 Bearer 凭证",
        )
        raise unauthorized("缺少登录凭证")
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        record_audit(
            request=request,
            actor=None,
            action="API_ACCESS",
            object_type="AUTH",
            object_id="invalid-token",
            result="DENIED",
            detail="令牌无效或过期",
        )
        raise
    user_id = payload.get("sub")
    user = db.get(User, user_id) if user_id else None
    if user is None or not user.active:
        record_audit(
            request=request,
            actor=None,
            action="API_ACCESS",
            object_type="AUTH",
            object_id=str(user_id),
            result="DENIED",
            detail="用户不存在或已停用",
        )
        raise unauthorized("用户不存在或已停用")
    return user


def require_record_role(user: User = Depends(get_current_user)) -> User:
    if user.role not in {Role.CLINICIAN.value, Role.EXPERT.value, Role.NURSE.value}:
        raise forbidden("当前角色不具备患者记录访问权限")
    return user
