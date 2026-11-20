"""Remediation Center and Human-in-the-Loop Operations API.

Supports:
- Listing proposed remediation actions
- Human-in-the-loop approval workflow
- Audit logging of approvals/rejections
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.models.schemas import RemediationProposal
from app.services.fleet_service import fleet_service

router = APIRouter(prefix="/remediation", tags=["remediation"])


@router.get("/proposals", response_model=List[RemediationProposal])
async def list_proposals(user: Dict[str, Any] = Depends(get_current_user)):
    """List pending and historical remediation proposals for the authenticated organization."""
    org_id = user.get("org_id", "org_enterprise_primary")
    return fleet_service.list_remediation_proposals(org_id)


@router.post("/{proposal_id}/approve", response_model=RemediationProposal)
async def approve_remediation(
    proposal_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Explicit human approval to authorize remediation execution."""
    org_id = user.get("org_id", "org_enterprise_primary")
    user_email = user.get("email", "operator@enterprise.local")
    try:
        return fleet_service.approve_remediation(org_id, proposal_id, user_email)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))


@router.post("/{proposal_id}/reject", response_model=RemediationProposal)
async def reject_remediation(
    proposal_id: str,
    reason: str = Body(..., embed=True),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Explicit human rejection of a proposed remediation action."""
    org_id = user.get("org_id", "org_enterprise_primary")
    try:
        return fleet_service.reject_remediation(org_id, proposal_id, reason)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
