from typing import Optional
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.models.schemas import (
    HealthResponse,
    InvestigationResponse,
    InvestigationRequest,
    ClustersResponse,
)
from app.kubernetes.cluster_manager import cluster_manager
from app.services.investigation import InvestigationService
from app.api.v1.router import api_router

# Setup structured logger
logger = setup_logging()

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Kubernetes Troubleshooting Agent - Evidence Gathering Engine & Orchestrator",
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root health endpoint
@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Service health check endpoint."""
    logger.info("Health check ping received")
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME
    )

# Clusters discovery endpoint
@app.get("/clusters", response_model=ClustersResponse, tags=["clusters"])
async def list_clusters():
    """List all Kubernetes clusters and contexts configured in local kubeconfig."""
    return cluster_manager.get_clusters()

# Core on-demand investigation endpoint
@app.post("/investigate", response_model=InvestigationResponse, tags=["investigation"])
async def investigate(payload: Optional[InvestigationRequest] = Body(default=None)):
    """Run on-demand Kubernetes investigation to collect troubleshooting evidence and AI SRE diagnosis."""
    namespace = payload.namespace if payload else None
    context = (payload.context or payload.cluster) if payload else None
    scenario = payload.scenario if payload else None

    result = await InvestigationService.run_investigation(
        namespace=namespace,
        context=context,
        scenario=scenario,
    )
    return result

# Include modular API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
