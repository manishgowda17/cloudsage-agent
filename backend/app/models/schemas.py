"""Pydantic schemas for request/response validation."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(default="healthy", description="Current service health status")
    service: str = Field(default="ai-kubernetes-agent", description="Service identifier")


class ClusterItem(BaseModel):
    """Discovered Kubernetes cluster/context details."""
    name: str = Field(description="Cluster or context name")
    context: str = Field(description="Kubeconfig context identifier")
    server: str = Field(description="Cluster API server endpoint")
    is_current: bool = Field(default=False, description="Whether this is the current active context")
    status: str = Field(default="unreachable", description="Cluster reachability (connected | unreachable)")
    message: Optional[str] = Field(default=None, description="Diagnostic message")


class ClustersResponse(BaseModel):
    """List of all clusters found in local kubeconfig."""
    current_context: Optional[str] = None
    clusters: List[ClusterItem] = []
    error: Optional[str] = None


class InvestigationRequest(BaseModel):
    """Parameters for on-demand cluster investigation."""
    namespace: Optional[str] = Field(
        default=None,
        description="Target Kubernetes namespace (e.g. 'default', or null for all namespaces)"
    )
    context: Optional[str] = Field(
        default=None,
        description="Target Kubernetes context name from kubeconfig"
    )
    cluster: Optional[str] = Field(
        default=None,
        description="Target cluster name"
    )
    scenario: Optional[str] = Field(
        default=None,
        description="Optional failure test scenario (crashloop, imagepull, oom, selector)"
    )


class DiagnosisResult(BaseModel):
    """AI SRE Diagnosis result schema."""
    root_cause: str = Field(description="Identified root cause")
    explanation: str = Field(description="Operational explanation of the issue")
    fix: str = Field(description="Actionable remediation steps")
    kubectl_command: str = Field(description="Exact kubectl command to remediate or inspect")
    confidence: int = Field(description="Confidence percentage (0-100)")
    prevention: Optional[str] = Field(default=None, description="Preventative recommendation")


class InvestigationResponse(BaseModel):
    """Top-level investigation response payload."""
    status: str = Field(default="success")
    diagnosis: DiagnosisResult
    investigation: Optional[Dict[str, Any]] = Field(default=None, description="Underlying Kubernetes evidence")
