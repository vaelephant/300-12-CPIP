from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import LoginRequest, TokenResponse, UserOut
from app.db import get_db
from app.domain.models import User
from app.errors import ApiError, unauthorized
from app.security import create_access_token, verify_password
from app.services.audit import record_audit
from app.services.login_limiter import record_failure, reset, retry_after

router = APIRouter(tags=["auth"])


def user_out(user: User) -> UserOut:
    return UserOut(
        user_id=user.id,
        employee_no=user.employee_no,
        name=user.display_name,
        role=user.role,
        data_scope=user.data_scope,
        department_id=user.department_id,
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    ip = request.client.host if request.client else None
    wait = retry_after(body.employee_no, ip)
    if wait > 0:
        raise ApiError(429, "RATE_LIMITED", f"登录失败次数过多，请在 {wait} 秒后重试")
    user = db.scalar(select(User).where(User.employee_no == body.employee_no))
    if user is None or not user.active or not verify_password(body.password, user.password_hash):
        record_failure(body.employee_no, ip)
        record_audit(
            request=request,
            actor=user,
            actor_id=body.employee_no,
            actor_role="ANONYMOUS",
            action="AUTH_LOGIN",
            object_type="AUTH",
            object_id=body.employee_no,
            result="DENIED",
            detail="工号或密码错误",
        )
        raise unauthorized("工号或密码错误")
    reset(body.employee_no, ip)
    token, expires_in = create_access_token(user.id)
    record_audit(
        request=request,
        actor=user,
        action="AUTH_LOGIN",
        object_type="AUTH",
        object_id=user.id,
        result="SUCCESS",
        detail=f"登录成功 · {uuid.uuid4().hex[:8]}",
    )
    return TokenResponse(access_token=token, expires_in=expires_in, user=user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return user_out(user)
