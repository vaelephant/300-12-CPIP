from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analytics import router as analytics_router
from app.api.approvals import router as approvals_router
from app.api.assessments import router as assessments_router
from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.clinical_events import router as events_router
from app.api.enrollment import router as enrollment_router
from app.api.followup_alerts import router as followup_alerts_router
from app.api.followups import router as followups_router
from app.api.health import router as health_router
from app.api.instances import router as instances_router
from app.api.knowledge import router as knowledge_router
from app.api.outcomes import router as outcomes_router
from app.api.predictions import router as predictions_router
from app.api.reassessments import router as reassessments_router
from app.api.patients import router as patients_router
from app.api.patient_detail import router as patient_detail_router
from app.api.pathways import router as pathways_router
from app.api.snapshots import router as snapshots_router
from app.api.tasks import router as tasks_router
from app.api.variations import router as variations_router
from app.config import settings
from app.db import init_db
from app.errors import register_exception_handlers
from app.middleware import RequestIDMiddleware


def create_app() -> FastAPI:
    app = FastAPI(
        title="HCC-CIP API",
        version="0.6.0",
        description="HCC-CIP V0.6 backend — HCC (C22.0) only. Synthetic/demo data by default.",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    settings.validate_runtime()
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )
    register_exception_handlers(app)
    api_prefix = "/api/v1"
    app.include_router(health_router, prefix=api_prefix)
    app.include_router(auth_router, prefix=api_prefix)
    app.include_router(patients_router, prefix=api_prefix)
    app.include_router(patient_detail_router, prefix=api_prefix)
    app.include_router(events_router, prefix=api_prefix)
    app.include_router(snapshots_router, prefix=api_prefix)
    app.include_router(audit_router, prefix=api_prefix)
    app.include_router(pathways_router, prefix=api_prefix)
    app.include_router(enrollment_router, prefix=api_prefix)
    app.include_router(instances_router, prefix=api_prefix)
    app.include_router(tasks_router, prefix=api_prefix)
    app.include_router(approvals_router, prefix=api_prefix)
    app.include_router(variations_router, prefix=api_prefix)
    app.include_router(followups_router, prefix=api_prefix)
    app.include_router(followup_alerts_router, prefix=api_prefix)
    app.include_router(outcomes_router, prefix=api_prefix)
    app.include_router(assessments_router, prefix=api_prefix)
    app.include_router(analytics_router, prefix=api_prefix)
    app.include_router(knowledge_router, prefix=api_prefix)
    app.include_router(predictions_router, prefix=api_prefix)
    app.include_router(reassessments_router, prefix=api_prefix)
    if settings.auto_create_tables:
        init_db()
    return app


app = create_app()
