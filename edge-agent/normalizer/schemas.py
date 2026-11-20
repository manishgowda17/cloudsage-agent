"""Normalized Internal Telemetry and Health Schemas."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ErrorCategory(str, Enum):
    """Categorized Kubernetes infrastructure failures."""
    CRASH_LOOP = "CrashLoopBackOff"
    OOM_KILLED = "OOMKilled"
    IMAGE_PULL_FAILURE = "ImagePullBackOff"
    PROBE_FAILURE = "ProbeFailure"
    SCHEDULING_FAILURE = "SchedulingFailure"
    RESOURCE_EXHAUSTION = "ResourceExhaustion"
    CONFIG_SYNTAX_ERROR = "ConfigSyntaxError"
    NETWORK_ROUTING = "NetworkRoutingError"
    NODE_PRESSURE = "NodePressure"
    UNKNOWN = "UnknownInfrastructureError"


class PodHealthRecord(BaseModel):
    """Normalized health status of a Pod."""
    namespace: str
    pod_name: str
    phase: str
    restart_count: int = 0
    ready_containers: int = 0
    total_containers: int = 1
    error_reason: Optional[str] = None
    last_state_terminated_reason: Optional[str] = None
    node_name: Optional[str] = None


class NodeHealthRecord(BaseModel):
    """Normalized health status of a Node."""
    node_name: str
    is_ready: bool = True
    memory_pressure: bool = False
    disk_pressure: bool = False
    pid_pressure: bool = False
    cpu_utilization_pct: float = 0.0
    memory_utilization_pct: float = 0.0
    active_pods: int = 0


class NormalizedIncident(BaseModel):
    """Structured incident record produced by Edge Agent local analysis."""
    incident_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    category: ErrorCategory
    severity: str = "warning"  # info, warning, critical
    resource_kind: str
    resource_name: str
    namespace: str
    problem_summary: str
    anonymized_evidence: str
    suggested_action: str
    confidence: float = 0.95
    tags: List[str] = Field(default_factory=list)


class ClusterHealthSummary(BaseModel):
    """High-level cluster health metrics safe for cloud export."""
    cluster_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_nodes: int = 0
    healthy_nodes: int = 0
    total_pods: int = 0
    degraded_pods: int = 0
    active_incident_count: int = 0
    reliability_score: float = 100.0
    error_distribution: Dict[str, int] = Field(default_factory=dict)
    average_cpu_pct: float = 0.0
    average_mem_pct: float = 0.0
