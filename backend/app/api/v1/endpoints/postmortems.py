"""API Endpoints for SRE Incident Post-Mortems."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user_optional, get_current_user
from app.services.postmortem_service import postmortem_service, PostMortemCreate, PostMortemRecord

router = APIRouter(prefix="/postmortems", tags=["Post-Mortems"])


@router.get("", response_model=List[PostMortemRecord])
def list_postmortems(
    auth_user: Optional[dict] = Depends(get_current_user_optional),
):
    """List historical SRE post-mortems and verified lessons."""
    user_id = auth_user.get("id") if auth_user else None
    return postmortem_service.list_postmortems(user_id=user_id)


@router.post("", response_model=PostMortemRecord)
async def create_postmortem(
    pm_data: PostMortemCreate,
    auth_user: dict = Depends(get_current_user),
):
    """Record a structured post-mortem after incident resolution.
    
    Extracts reusable lessons and automatically retains them into the user's Hindsight memory bank.
    """
    user_id = auth_user.get("id")
    record = await postmortem_service.record_postmortem(pm_data=pm_data, user_id=user_id)
    return record


@router.get("/{pm_id}", response_model=PostMortemRecord)
def get_postmortem(
    pm_id: str,
    auth_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Retrieve details for a single post-mortem record."""
    record = postmortem_service.get_postmortem(pm_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Post-mortem '{pm_id}' not found.")
    return record
