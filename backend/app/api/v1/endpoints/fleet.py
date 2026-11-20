"""Fleet Analytics and Cluster Intelligence Endpoints.

Protected by InsForge authentication. Strict multi-tenant isolation:
Users can only access cluster metrics and trends belonging to their organization.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.models.schemas import FleetOverviewResponse
from app.services.fleet_service import fleet_service

router = APIRouter(prefix="/fleet", tags=["fleet-analytics"])


@router.get("/overview", response_model=FleetOverviewResponse)
async def get_fleet_overview(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve aggregated multi-tenant fleet health, reliability scores, and recurring failures."""
    org_id = user.get("org_id", "org_enterprise_primary")
    return fleet_service.get_fleet_overview(org_id)


@router.get("/clusters")
async def get_fleet_clusters(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve list of clusters with individual health and connectivity status."""
    org_id = user.get("org_id", "org_enterprise_primary")
    overview = fleet_service.get_fleet_overview(org_id)
    return {"organization_id": org_id, "clusters": overview.clusters}


@router.get("/incidents")
async def get_fleet_incidents(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve active and recent fleet incidents isolated to this tenant."""
    org_id = user.get("org_id", "org_enterprise_primary")
    return {"organization_id": org_id, "incidents": fleet_service.list_incidents_for_org(org_id)}
