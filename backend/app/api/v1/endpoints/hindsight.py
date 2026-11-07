"""Hindsight Memory Engine API Endpoints.

Protected by InsForge authentication to ensure strict multi-tenant isolation.
Each authenticated user interacts exclusively with their dedicated Hindsight memory bank.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Body, HTTPException, status
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.schemas import (
    HindsightStatusResponse,
    HindsightReflectRequest,
    HindsightReflectResponse,
    HindsightMemoriesResponse,
    HindsightInsightsResponse,
)
from app.services.hindsight_service import hindsight_service

router = APIRouter(prefix="/hindsight", tags=["hindsight"])


@router.get("/status", response_model=HindsightStatusResponse)
async def get_hindsight_status(user: Dict[str, Any] = Depends(get_current_user)):
    """Check Hindsight memory engine connectivity and retrieve active user bank identity."""
    is_up = await hindsight_service.is_healthy()
    bank_id = hindsight_service.get_user_bank_id(user.get("id"))
    
    return HindsightStatusResponse(
        status="connected" if is_up else "offline",
        hindsight_url=hindsight_service.base_url,
        hindsight_control_plane_url=getattr(settings, "HINDSIGHT_CONTROL_PLANE_URL", "http://localhost:9999"),
        sdk_available=hindsight_service.client is not None,
        user_bank_id=bank_id,
    )


@router.get("/memories", response_model=HindsightMemoriesResponse)
async def list_user_memories(
    query: Optional[str] = None,
    tag: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Browse and search memories stored in the user's isolated Hindsight bank."""
    user_id = user.get("id")
    res = await hindsight_service.search_bank_memories(
        user_id=user_id,
        query=query or "",
        tag=tag,
    )
    return HindsightMemoriesResponse(
        bank_id=res["bank_id"],
        total_count=res["total_count"],
        memories=res.get("memories", []),
    )


@router.get("/insights", response_model=HindsightInsightsResponse)
async def get_reliability_insights(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve recurring failure patterns, common defects, and Reflect pattern synthesis."""
    user_id = user.get("id")
    insights = await hindsight_service.get_insights(user_id=user_id)
    return HindsightInsightsResponse(
        bank_id=insights["bank_id"],
        total_incidents_recorded=insights["total_incidents_recorded"],
        recurring_patterns=insights.get("recurring_patterns", []),
        reflect_synthesis=insights.get("reflect_synthesis", ""),
        top_misconfigurations=insights.get("top_misconfigurations", []),
    )


@router.post("/recall")
async def recall_memories(
    query: str = Body(..., embed=True),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Search user's isolated Hindsight memory bank for previous relevant incident memories."""
    user_id = user.get("id")
    res = await hindsight_service.recall_memories(
        user_id=user_id,
        query=query,
    )
    return res


@router.post("/reflect", response_model=HindsightReflectResponse)
async def reflect_on_patterns(
    payload: HindsightReflectRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Synthesize cross-incident insights and recurring patterns using Hindsight Reflect."""
    user_id = user.get("id")
    res = await hindsight_service.reflect_patterns(
        user_id=user_id,
        query=payload.query,
    )
    return HindsightReflectResponse(
        available=res.get("available", False),
        bank_id=res.get("bank_id", ""),
        query=payload.query,
        reflection=res.get("reflection", "No reflection could be generated."),
        based_on=res.get("based_on", []),
    )
