from fastapi import APIRouter
from app.api.v1.endpoints import (
    investigate,
    clusters,
    hindsight,
    runbooks,
    postmortems,
    agent,
    fleet,
    remediation,
)

api_router = APIRouter()
api_router.include_router(investigate.router, tags=["investigation"])
api_router.include_router(clusters.router, tags=["clusters"])
api_router.include_router(hindsight.router, tags=["hindsight"])
api_router.include_router(runbooks.router, tags=["runbooks"])
api_router.include_router(postmortems.router, tags=["postmortems"])
api_router.include_router(agent.router, tags=["agent-ingestion"])
api_router.include_router(fleet.router, tags=["fleet-analytics"])
api_router.include_router(remediation.router, tags=["remediation"])
