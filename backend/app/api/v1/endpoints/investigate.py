from typing import Optional
from fastapi import APIRouter, Body
from app.models.schemas import InvestigationRequest, InvestigationResponse
from app.services.investigation import InvestigationService

router = APIRouter()


@router.post("/investigate", response_model=InvestigationResponse, tags=["investigation"])
async def trigger_investigation(payload: Optional[InvestigationRequest] = Body(default=None)):
    """API v1 on-demand trigger for investigating cluster health."""
    namespace = payload.namespace if payload else None
    context = (payload.context or payload.cluster) if payload else None
    scenario = payload.scenario if payload else None

    result = await InvestigationService.run_investigation(
        namespace=namespace,
        context=context,
        scenario=scenario,
    )
    return result
