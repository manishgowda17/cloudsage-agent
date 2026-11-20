"""Edge Agent Telemetry Normalizer and Deduplicator."""

import hashlib
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from .schemas import ClusterHealthSummary, ErrorCategory, NodeHealthRecord, NormalizedIncident, PodHealthRecord


class TelemetryNormalizer:
    """Normalizes raw cluster telemetry, categorizes errors, and suppresses duplicate events."""

    def __init__(self, deduplication_window_seconds: int = 120):
        self.dedup_window = deduplication_window_seconds
        # Stores hash -> last_seen_epoch
        self._seen_events: Dict[str, float] = {}

    def categorize_error(self, reason: Optional[str], message: Optional[str] = None) -> ErrorCategory:
        """Classify raw error reasons and event messages into standardized ErrorCategory."""
        combined = f"{reason or ''} {message or ''}".lower()

        if "crashloopbackoff" in combined or "crashloop" in combined:
            return ErrorCategory.CRASH_LOOP
        if "oomkilled" in combined or "out of memory" in combined or "exit code 137" in combined:
            return ErrorCategory.OOM_KILLED
        if any(term in combined for term in ["imagepullbackoff", "errimagepull", "image inspect error"]):
            return ErrorCategory.IMAGE_PULL_FAILURE
        if any(term in combined for term in ["readiness probe failed", "liveness probe failed", "probe failed", "probe"]):
            return ErrorCategory.PROBE_FAILURE
        if any(term in combined for term in ["failedscheduling", "insufficient cpu", "insufficient memory", "matchpodaffinity"]):
            return ErrorCategory.SCHEDULING_FAILURE
        if any(term in combined for term in ["resourceexhaustion", "cpu pressure", "memory pressure"]):
            return ErrorCategory.RESOURCE_EXHAUSTION
        if any(term in combined for term in ["schema error", "invalid yaml", "syntaxerror", "validation error"]):
            return ErrorCategory.CONFIG_SYNTAX_ERROR
        if any(term in combined for term in ["connection refused", "dial tcp", "no route to host", "networkrouting"]):
            return ErrorCategory.NETWORK_ROUTING
        if any(term in combined for term in ["nodepressure", "memorypressure", "diskpressure"]):
            return ErrorCategory.NODE_PRESSURE

        return ErrorCategory.UNKNOWN

    def is_duplicate(self, resource_kind: str, resource_name: str, namespace: str, category: str) -> bool:
        """Suppresses duplicate event flapping within the deduplication window."""
        now = time.time()
        event_key = f"{namespace}:{resource_kind}:{resource_name}:{category}"
        event_hash = hashlib.sha256(event_key.encode("utf-8")).hexdigest()

        # Clean expired keys
        self._clean_expired(now)

        if event_hash in self._seen_events:
            last_time = self._seen_events[event_hash]
            if now - last_time < self.dedup_window:
                return True

        self._seen_events[event_hash] = now
        return False

    def _clean_expired(self, current_time: float) -> None:
        """Prune hashes older than twice the deduplication window."""
        expired = [k for k, t in self._seen_events.items() if current_time - t > (self.dedup_window * 2)]
        for k in expired:
            del self._seen_events[k]

    def build_cluster_summary(
        self,
        cluster_id: str,
        nodes: List[NodeHealthRecord],
        pods: List[PodHealthRecord],
        incidents: List[NormalizedIncident],
    ) -> ClusterHealthSummary:
        """Calculate high-level cluster health metrics and reliability score."""
        total_nodes = len(nodes)
        healthy_nodes = sum(1 for n in nodes if n.is_ready and not (n.memory_pressure or n.disk_pressure))

        total_pods = len(pods)
        degraded_pods = sum(1 for p in pods if p.error_reason or p.phase not in ("Running", "Succeeded"))

        # Calculate error distribution
        dist: Dict[str, int] = {}
        for inc in incidents:
            cat_name = inc.category.value
            dist[cat_name] = dist.get(cat_name, 0) + 1

        # Calculate reliability score: 100 - penalties
        penalty = 0.0
        if total_nodes > 0:
            unhealthy_node_ratio = (total_nodes - healthy_nodes) / total_nodes
            penalty += unhealthy_node_ratio * 40.0

        if total_pods > 0:
            degraded_pod_ratio = degraded_pods / total_pods
            penalty += degraded_pod_ratio * 40.0

        penalty += min(len(incidents) * 5.0, 20.0)
        reliability_score = max(0.0, round(100.0 - penalty, 1))

        avg_cpu = round(sum(n.cpu_utilization_pct for n in nodes) / max(total_nodes, 1), 1)
        avg_mem = round(sum(n.memory_utilization_pct for n in nodes) / max(total_nodes, 1), 1)

        return ClusterHealthSummary(
            cluster_id=cluster_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            total_nodes=total_nodes,
            healthy_nodes=healthy_nodes,
            total_pods=total_pods,
            degraded_pods=degraded_pods,
            active_incident_count=len(incidents),
            reliability_score=reliability_score,
            error_distribution=dist,
            average_cpu_pct=avg_cpu,
            average_mem_pct=avg_mem,
        )
