"""API Endpoints for Kubernetes SRE Runbooks."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.auth import get_current_user_optional
from app.models.schemas import RunbookItemSchema
from app.services.runbook_service import runbook_service

router = APIRouter(prefix="/runbooks", tags=["Runbooks"])


@router.get("", response_model=List[RunbookItemSchema])
def list_runbooks(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    auth_user: Optional[dict] = Depends(get_current_user_optional),
):
    """List curated, battle-tested Kubernetes SRE runbooks."""
    return runbook_service.list_runbooks(category=category)


@router.get("/{runbook_id}", response_model=RunbookItemSchema)
def get_runbook(
    runbook_id: str,
    auth_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Retrieve detailed SRE runbook including step-by-step procedures, prerequisites, and rollback guidance."""
    rb = runbook_service.get_runbook(runbook_id)
    if not rb:
        raise HTTPException(status_code=404, detail=f"Runbook '{runbook_id}' not found.")
    return rb
