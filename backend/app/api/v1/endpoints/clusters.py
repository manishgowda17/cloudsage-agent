from fastapi import APIRouter
from app.models.schemas import ClustersResponse
from app.kubernetes.cluster_manager import cluster_manager

router = APIRouter()


@router.get("/clusters", response_model=ClustersResponse, tags=["clusters"])
async def get_clusters():
    """Discover all Kubernetes clusters configured in local kubeconfig."""
    return cluster_manager.get_clusters()
