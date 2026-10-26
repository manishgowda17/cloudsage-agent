from typing import Any, Dict, Optional
from fastapi import APIRouter, Body, Depends
from app.models.schemas import InvestigationRequest, InvestigationResponse
from app.services.investigation import InvestigationService
from app.core.auth import get_current_user

router = APIRouter()


@router.post("/investigate", response_model=InvestigationResponse, tags=["investigation"])
async def trigger_investigation(
    payload: Optional[InvestigationRequest] = Body(default=None),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """API v1 on-demand trigger for investigating cluster health (Protected by InsForge Auth)."""
    namespace = payload.namespace if payload else None
    context = (payload.context or payload.cluster) if payload else None
    scenario = payload.scenario if payload else None

    result = await InvestigationService.run_investigation(
        namespace=namespace,
        context=context,
        scenario=scenario,
        user_id=user.get("id"),
    )
    return result
