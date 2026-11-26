from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import LoginRequest, TokenResponse, UserOut
from app.db import get_db
from app.domain.models import User
from app.errors import unauthorized
from app.security import create_access_token, verify_password
from app.services.audit import record_audit

router = APIRouter(tags=["auth"])


def user_out(user: User) -> UserOut:
    return UserOut(
        user_id=user.id,
        name=user.display_name,
        role=user.role,
        data_scope=user.data_scope,
        department_id=user.department_id,
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.employee_no == body.employee_no))
    if user is None or not user.active or not verify_password(body.password, user.password_hash):
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
