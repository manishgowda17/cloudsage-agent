from fastapi import APIRouter
from app.api.v1.endpoints import investigate, clusters

api_router = APIRouter()
api_router.include_router(investigate.router, tags=["investigation"])
api_router.include_router(clusters.router, tags=["clusters"])
