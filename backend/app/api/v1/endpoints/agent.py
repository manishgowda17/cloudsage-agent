"""Edge Agent Ingestion and Management API Endpoints.

Handles:
- Agent registration & identity verification
- Heartbeat beacons
- Approved metadata batch ingestion with size validation, idempotency & secret rejection
- Agent directory query (tenant-scoped)
"""

import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from app.core.auth import get_current_user
from app.core.logging import logger
from app.models.schemas import (
    AgentHeartbeatRequest,
    AgentHeartbeatResponse,
    AgentIngestBatchRequest,
    AgentIngestBatchResponse,
    AgentRegistrationRequest,
    AgentRegistrationResponse,
)
from app.services.fleet_service import fleet_service

router = APIRouter(prefix="/agent", tags=["agent-ingestion"])


@router.post("/register", response_model=AgentRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_agent(
    req: AgentRegistrationRequest,
    x_agent_key: Optional[str] = Header(None, alias="X-Agent-Key"),
):
    """Register edge agent identity."""
    if not x_agent_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required 'X-Agent-Key' header",
        )
    return fleet_service.register_agent(req, x_agent_key)


@router.post("/heartbeat", response_model=AgentHeartbeatResponse)
async def agent_heartbeat(
    req: AgentHeartbeatRequest,
    x_agent_id: Optional[str] = Header(None, alias="X-Agent-ID"),
    x_agent_key: Optional[str] = Header(None, alias="X-Agent-Key"),
):
    """Receive heartbeat beacon from edge agent."""
    agent_id = x_agent_id or req.agent_id
    if not fleet_service.authenticate_agent(agent_id, x_agent_key or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unauthorized edge agent credentials",
        )
    return fleet_service.record_heartbeat(agent_id, req)


@router.post("/ingest", response_model=AgentIngestBatchResponse)
async def ingest_metadata_batch(
    request: Request,
    batch_req: AgentIngestBatchRequest,
    x_agent_id: Optional[str] = Header(None, alias="X-Agent-ID"),
    x_agent_key: Optional[str] = Header(None, alias="X-Agent-Key"),
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """Secure metadata ingestion endpoint.
    
    Strict requirements:
    - Authenticates agent credentials server-side
    - Enforces 1MB payload size limit
    - Rejects prohibited sensitive fields
    - Supports idempotency
    """
    agent_id = x_agent_id or batch_req.agent_id
    if not fleet_service.authenticate_agent(agent_id, x_agent_key or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized agent: Invalid identity or API key",
        )

    # Read raw body bytes to verify size limit
    body_bytes = await request.body()
    try:
        return fleet_service.ingest_metadata_batch(
            agent_id=agent_id,
            payload_bytes=body_bytes,
            batch_req=batch_req,
            idempotency_key=x_idempotency_key,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(val_err),
        )


@router.get("/agents")
async def list_registered_agents(user: Dict[str, Any] = Depends(get_current_user)):
    """List registered edge agents for the authenticated user's organization."""
    # Deterministic organization resolution from user
    org_id = user.get("org_id", "org_enterprise_primary")
    return {"organization_id": org_id, "agents": fleet_service.list_agents_for_org(org_id)}


@router.get("/policy")
async def get_agent_policy(
    x_agent_id: Optional[str] = Header(None, alias="X-Agent-ID"),
    x_agent_key: Optional[str] = Header(None, alias="X-Agent-Key"),
):
    """Retrieve approved export policy for this agent's cluster."""
    if not fleet_service.authenticate_agent(x_agent_id or "", x_agent_key or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized agent request",
        )
    return {
        "allowlist": [
            "cluster_health",
            "node_health",
            "pod_health",
            "resource_utilization",
            "error_categories",
            "incident_counts",
            "anonymized_incident_summaries",
            "alert_context",
            "reliability_scores",
            "approved_diagnostic_metadata",
        ],
        "prohibited": [
            "raw_logs",
            "raw_payload",
            "secrets",
            "env",
            "passwords",
            "tokens",
        ],
        "fail_closed": True,
    }
