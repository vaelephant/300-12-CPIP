from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.s2_serializers import latest_approval, version_out
from app.api.schemas import (
    PageMeta,
    PathwayCreate,
    PathwayOverviewListOut,
    PathwayOverviewOut,
    PathwayListOut,
    PathwayVersionCreate,
    PathwayVersionOut,
    ValidationResultOut,
)
from app.db import get_db
from app.domain.enums import Role
from app.domain.models import (
    Approval,
    Department,
    PathwayInstance,
    PathwayTemplate,
    PathwayVersion,
    User,
)
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.pathways import content_hash, validate_pathway

router = APIRouter(tags=["pathways"])

EDITOR_ROLES = {Role.CLINICIAN.value, Role.EXPERT.value}


def _require_editor(user: User) -> None:
    if user.role not in EDITOR_ROLES:
        raise forbidden("当前角色无权编辑路径")


def _version_or_404(db: Session, version_id: str) -> PathwayVersion:
    version = db.get(PathwayVersion, version_id)
    if version is None:
        raise not_found("路径版本不存在")
    return version


def _audit(request: Request, user: User, action: str, object_id: str, detail: str | None = None) -> None:
    record_audit(request=request, actor=user, action=action, object_type="PATHWAY_VERSION", object_id=object_id, result="SUCCESS", detail=detail)


@router.get("/pathways", response_model=PathwayListOut)
def list_pathways(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathwayListOut:
    templates = db.scalars(select(PathwayTemplate).order_by(PathwayTemplate.created_at.desc())).all()
    latest: list[PathwayVersion] = []
    for template in templates:
        version = db.scalar(
            select(PathwayVersion)
            .where(PathwayVersion.template_id == template.id)
            .order_by(PathwayVersion.created_at.desc())
        )
        if version:
            latest.append(version)
    total = len(latest)
    items = latest[(page - 1) * page_size : page * page_size]
    return PathwayListOut(items=[version_out(db, item) for item in items], meta=PageMeta(page=page, page_size=page_size, total=total))


@router.get("/pathways/overview", response_model=PathwayOverviewListOut)
def pathway_overview(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathwayOverviewListOut:
    templates = db.scalars(select(PathwayTemplate).order_by(PathwayTemplate.created_at.desc())).all()
    items: list[PathwayOverviewOut] = []
    for template in templates:
        versions = db.scalars(
            select(PathwayVersion).where(PathwayVersion.template_id == template.id).order_by(PathwayVersion.created_at.desc())
        ).all()
        if not versions:
            continue
        current = db.get(PathwayVersion, template.current_published_version_id) if template.current_published_version_id else versions[0]
        if current is None:
            current = versions[0]
        version_ids = [version.id for version in versions]
        instance_count = db.scalar(
            select(func.count()).select_from(PathwayInstance).where(PathwayInstance.pathway_version_id.in_(version_ids))
        ) or 0
        owner = db.get(User, current.created_by)
        department = db.get(Department, template.department_id)
        graph = json.loads(current.graph_json)
        items.append(
            PathwayOverviewOut(
                template_id=template.id,
                name=template.name,
                disease_code=template.disease_code,
                department_name=department.name if department else None,
                current_version_id=current.id,
                current_version=current.version,
                status=current.status,
                owner_name=owner.display_name if owner else None,
                instance_count=instance_count,
                version_count=len(versions),
                node_count=len(graph.get("nodes", [])),
                updated_at=current.published_at or current.created_at,
            )
        )
    record_audit(
        request=request,
        actor=user,
        action="PATHWAY_OVERVIEW",
        object_type="PATHWAY",
        object_id="*",
        result="SUCCESS",
        detail=f"count={len(items)}",
    )
    return PathwayOverviewListOut(items=items, meta=PageMeta(page=1, page_size=len(items) or 1, total=len(items)))


@router.post("/pathways", response_model=PathwayVersionOut, status_code=201)
def create_pathway(
    body: PathwayCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathwayVersionOut:
    _require_editor(user)
    if not user.department_id:
        raise forbidden("用户未归属科室，不能创建路径")
    template_id = f"PW-{uuid.uuid4().hex[:12].upper()}"
    version_id = f"PV-{uuid.uuid4().hex[:12].upper()}"
    validation = validate_pathway(body.graph.model_dump(), body.rules)
    template = PathwayTemplate(id=template_id, name=body.name, disease_code="C22.0", department_id=user.department_id, created_by=user.id)
    version = PathwayVersion(
        id=version_id,
        template_id=template_id,
        version=body.version,
        status="DRAFT",
        graph_json=json.dumps(body.graph.model_dump(), ensure_ascii=False),
        rules_json=json.dumps(body.rules, ensure_ascii=False),
        content_hash=content_hash(body.graph.model_dump(), body.rules),
        created_by=user.id,
        validation_json=json.dumps(validation, ensure_ascii=False),
    )
    db.add_all([template, version])
    db.commit()
    _audit(request, user, "PATHWAY_CREATE", version_id, f"template={template_id}")
    return version_out(db, version)


@router.get("/pathways/{pathway_id}/versions", response_model=list[PathwayVersionOut])
def list_pathway_versions(
    pathway_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PathwayVersionOut]:
    template = db.get(PathwayTemplate, pathway_id)
    if template is None:
        raise not_found("路径模板不存在")
    versions = db.scalars(
        select(PathwayVersion).where(PathwayVersion.template_id == pathway_id).order_by(PathwayVersion.created_at.desc())
    ).all()
    return [version_out(db, version) for version in versions]


@router.post("/pathways/{pathway_id}/versions", response_model=PathwayVersionOut, status_code=201)
def create_pathway_version(
    pathway_id: str,
    body: PathwayVersionCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathwayVersionOut:
    _require_editor(user)
    template = db.get(PathwayTemplate, pathway_id)
    if template is None:
        raise not_found("路径模板不存在")
    duplicate = db.scalar(
        select(PathwayVersion.id).where(PathwayVersion.template_id == pathway_id, PathwayVersion.version == body.version)
    )
    if duplicate:
        raise conflict("VERSION_EXISTS", "该版本号已存在")
    graph, rules = body.graph.model_dump(), body.rules
    validation = validate_pathway(graph, rules)
    version = PathwayVersion(
        id=f"PV-{uuid.uuid4().hex[:12].upper()}",
        template_id=pathway_id,
        version=body.version,
        status="DRAFT",
        graph_json=json.dumps(graph, ensure_ascii=False),
        rules_json=json.dumps(rules, ensure_ascii=False),
        content_hash=content_hash(graph, rules),
        created_by=user.id,
        validation_json=json.dumps(validation, ensure_ascii=False),
    )
    db.add(version)
    db.commit()
    _audit(request, user, "PATHWAY_VERSION_CREATE", version.id, f"pathway={pathway_id}, version={body.version}")
    return version_out(db, version)


@router.post("/pathway-versions/{version_id}/validate", response_model=ValidationResultOut)
def validate_pathway_version(
    version_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ValidationResultOut:
    _require_editor(user)
    version = _version_or_404(db, version_id)
    if version.status in {"PUBLISHED", "RETIRED"}:
        raise conflict("VERSION_IMMUTABLE", "已发布或已退役版本不可修改")
    graph = json.loads(version.graph_json)
    rules = json.loads(version.rules_json)
    result = validate_pathway(graph, rules)
    version.validation_json = json.dumps(result, ensure_ascii=False)
    version.content_hash = content_hash(graph, rules)
    db.commit()
    _audit(request, user, "PATHWAY_VERSION_VALIDATE", version_id, f"passed={result['passed']}")
    return ValidationResultOut(
        valid=result["passed"],
        errors=result["errors"],
        warnings=result["warnings"],
        content_hash=result.get("content_hash"),
    )


@router.post("/pathway-versions/{version_id}/submit", response_model=PathwayVersionOut)
def submit_pathway_version(
    version_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathwayVersionOut:
    _require_editor(user)
    version = _version_or_404(db, version_id)
    if version.status != "DRAFT":
        raise conflict("INVALID_VERSION_STATE", "仅草稿版本可提交审核")
    graph, rules = json.loads(version.graph_json), json.loads(version.rules_json)
    result = validate_pathway(graph, rules)
    version.validation_json = json.dumps(result, ensure_ascii=False)
    if not result["passed"]:
        db.commit()
        raise conflict("VALIDATION_FAILED", "图结构或规则校验未通过，不能提交审核")
    version.status = "IN_REVIEW"
    version.submitted_at = datetime.now(UTC)
    approval = Approval(
        id=f"AP-{uuid.uuid4().hex[:12].upper()}",
        object_type="PATHWAY_VERSION",
        object_id=version.id,
        status="PENDING",
        risk="MEDIUM",
        requested_by=user.id,
    )
    db.add(approval)
    db.commit()
    _audit(request, user, "PATHWAY_VERSION_SUBMIT", version_id, f"approval={approval.id}")
    return version_out(db, version)


@router.post("/pathway-versions/{version_id}/publish", response_model=PathwayVersionOut)
def publish_pathway_version(
    version_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathwayVersionOut:
    if user.role != Role.MEDICAL_AFFAIRS.value:
        raise forbidden("仅医务处可以发布路径版本")
    version = _version_or_404(db, version_id)
    if version.status != "IN_REVIEW":
        raise conflict("INVALID_VERSION_STATE", "仅审核中版本可以发布")
    approval = latest_approval(db, "PATHWAY_VERSION", version.id)
    if approval is None or approval.status != "APPROVED":
        raise conflict("APPROVAL_REQUIRED", "路径版本尚未获得审批通过")
    validation = json.loads(version.validation_json or "{}")
    if not validation.get("passed"):
        raise conflict("VALIDATION_FAILED", "版本校验未通过，不能发布")
    version.status = "PUBLISHED"
    version.published_at = datetime.now(UTC)
    version.approved_by = approval.reviewer
    # Freeze all previously published versions for this template.
    previous = db.scalars(
        select(PathwayVersion).where(
            PathwayVersion.template_id == version.template_id,
            PathwayVersion.id != version.id,
            PathwayVersion.status == "PUBLISHED",
        )
    ).all()
    for item in previous:
        item.status = "RETIRED"
    template = db.get(PathwayTemplate, version.template_id)
    if template:
        template.current_published_version_id = version.id
    db.commit()
    _audit(request, user, "PATHWAY_VERSION_PUBLISH", version_id, f"approval={approval.id}")
    return version_out(db, version)
