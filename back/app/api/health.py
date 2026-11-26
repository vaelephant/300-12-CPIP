from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.schemas import HealthOut
from app.db import get_db

router = APIRouter(tags=["system"])

VERSION = "0.6.0"


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "error"
    # Never claim an external integration is healthy when it is not configured.
    return HealthOut(
        version=VERSION,
        database=database,
        external_services={
            "KEE": "NOT_CONFIGURED",
            "MWM": "NOT_CONFIGURED",
            "HIS": "NOT_CONFIGURED",
            "LIS": "NOT_CONFIGURED",
            "PACS": "NOT_CONFIGURED",
        },
    )
