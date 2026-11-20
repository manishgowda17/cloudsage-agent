"""Local Edge Infrastructure Defect & Incident Analyzer."""

import os
import uuid
from typing import Any, Dict, List, Optional

try:
    from normalizer.schemas import ErrorCategory, NodeHealthRecord, NormalizedIncident, PodHealthRecord
    from privacy.gateway import PrivacyGateway
except (ImportError, ValueError):
    from ..normalizer.schemas import ErrorCategory, NodeHealthRecord, NormalizedIncident, PodHealthRecord
    from ..privacy.gateway import PrivacyGateway


class LocalDefectAnalyzer:
    """Evaluates infrastructure defects locally on the customer's cluster or node."""

    def __init__(self, privacy_gateway: Optional[PrivacyGateway] = None):
        self.privacy = privacy_gateway or PrivacyGateway()

    def analyze_pod_issue(
        self,
        pod: PodHealthRecord,
        events: Optional[List[Dict[str, Any]]] = None,
    ) -> Optional[NormalizedIncident]:
        """Diagnose a degraded pod completely on-premise without cloud roundtrips."""
        reason = (pod.error_reason or pod.last_state_terminated_reason or "").strip()
        combined_text = f"{reason} {pod.phase}"
        if events:
            for ev in events:
                combined_text += f" {ev.get('reason', '')} {ev.get('message', '')}"

        combined_lower = combined_text.lower()

        # 1. CrashLoopBackOff
        if "crashloopbackoff" in combined_lower or (pod.restart_count > 3 and "error" in combined_lower):
            prob = f"Container repeatedly crashing in pod '{pod.pod_name}' (Restart Count: {pod.restart_count})"
            fix = "Inspect application startup logs, verify required environment configuration, and check entrypoint arguments."
            return self._build_incident(
                category=ErrorCategory.CRASH_LOOP,
                severity="critical" if pod.restart_count > 5 else "warning",
                pod=pod,
                problem_summary=prob,
                suggested_action=fix,
                evidence=f"Restarts: {pod.restart_count}, Termination Reason: {reason or 'CrashLoopBackOff'}",
            )

        # 2. OOMKilled
        if "oomkilled" in combined_lower or "exit code 137" in combined_lower:
            prob = f"Pod '{pod.pod_name}' killed due to Out Of Memory (OOMKilled, exit code 137)"
            fix = "Increase container memory limits and requests in deployment spec (e.g. bump limit by 50-100%)."
            return self._build_incident(
                category=ErrorCategory.OOM_KILLED,
                severity="critical",
                pod=pod,
                problem_summary=prob,
                suggested_action=fix,
                evidence="Kernel OOM killer invoked. Exit code 137 observed.",
            )

        # 3. ImagePullBackOff / ErrImagePull
        if any(term in combined_lower for term in ["imagepullbackoff", "errimagepull"]):
            prob = f"Kubernetes cannot pull container image for pod '{pod.pod_name}'"
            fix = "Verify container image repository, tag existence, and imagePullSecrets credentials."
            return self._build_incident(
                category=ErrorCategory.IMAGE_PULL_FAILURE,
                severity="warning",
                pod=pod,
                problem_summary=prob,
                suggested_action=fix,
                evidence=f"Pod image pull failure detected. Reason: {reason or 'ImagePullBackOff'}",
            )

        # 4. ProbeFailure
        if any(term in combined_lower for term in ["probe failed", "readiness probe", "liveness probe"]):
            prob = f"Health probe failed for pod '{pod.pod_name}'"
            fix = "Verify probe endpoint HTTP path, container port alignment, and initialDelaySeconds."
            return self._build_incident(
                category=ErrorCategory.PROBE_FAILURE,
                severity="warning",
                pod=pod,
                problem_summary=prob,
                suggested_action=fix,
                evidence="Readiness/Liveness probe returning non-2xx status code or connection timeout.",
            )

        # 5. SchedulingFailure
        if any(term in combined_lower for term in ["failedscheduling", "insufficient cpu", "insufficient memory"]):
            prob = f"Pod '{pod.pod_name}' cannot be scheduled on any cluster node"
            fix = "Adjust resource requests or scale cluster node pool to accommodate pending workloads."
            return self._build_incident(
                category=ErrorCategory.SCHEDULING_FAILURE,
                severity="critical",
                pod=pod,
                problem_summary=prob,
                suggested_action=fix,
                evidence="Scheduler unable to place pod due to insufficient node CPU/memory or taints.",
            )

        # If restarted multiple times without explicit reason
        if pod.restart_count >= 3:
            return self._build_incident(
                category=ErrorCategory.UNKNOWN,
                severity="warning",
                pod=pod,
                problem_summary=f"Unstable pod '{pod.pod_name}' with {pod.restart_count} restarts",
                suggested_action="Check container logs and health probes for intermittent failures.",
                evidence=f"High restart count: {pod.restart_count}",
            )

        return None

    def analyze_node_issue(self, node: NodeHealthRecord) -> Optional[NormalizedIncident]:
        """Diagnose degraded or pressurized node conditions."""
        if not node.is_ready:
            return NormalizedIncident(
                incident_id=f"inc-{uuid.uuid4().hex[:8]}",
                category=ErrorCategory.NODE_PRESSURE,
                severity="critical",
                resource_kind="Node",
                resource_name=node.node_name,
                namespace="kube-system",
                problem_summary=f"Node '{node.node_name}' is in NotReady state",
                anonymized_evidence="Kubelet condition Ready is False or Unknown.",
                suggested_action="Check kubelet daemon status, container runtime (containerd/CRI-O), and network overlay.",
                confidence=0.98,
                tags=["node", "kubelet", "critical"],
            )

        if node.memory_pressure:
            return NormalizedIncident(
                incident_id=f"inc-{uuid.uuid4().hex[:8]}",
                category=ErrorCategory.RESOURCE_EXHAUSTION,
                severity="warning",
                resource_kind="Node",
                resource_name=node.node_name,
                namespace="kube-system",
                problem_summary=f"Node '{node.node_name}' reporting MemoryPressure",
                anonymized_evidence=f"Memory utilization: {node.memory_utilization_pct}%",
                suggested_action="Drain low-priority pods or increase node memory allocation.",
                confidence=0.95,
                tags=["node", "memory-pressure"],
            )

        return None

    def _build_incident(
        self,
        category: ErrorCategory,
        severity: str,
        pod: PodHealthRecord,
        problem_summary: str,
        suggested_action: str,
        evidence: str,
    ) -> NormalizedIncident:
        # Sanitize text through privacy gateway
        clean_problem, _ = self.privacy.redact_text(problem_summary)
        clean_action, _ = self.privacy.redact_text(suggested_action)
        clean_evidence, _ = self.privacy.redact_text(evidence)

        inc_id = f"inc-{uuid.uuid4().hex[:8]}"
        return NormalizedIncident(
            incident_id=inc_id,
            category=category,
            severity=severity,
            resource_kind="Pod",
            resource_name=pod.pod_name,
            namespace=pod.namespace,
            problem_summary=clean_problem,
            anonymized_evidence=clean_evidence,
            suggested_action=clean_action,
            confidence=0.95,
            tags=[category.value.lower(), f"ns:{pod.namespace}", "local-analysis"],
        )
