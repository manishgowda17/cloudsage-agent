"""Pod Inspector Component.

Inspects Kubernetes pods across namespaces or in a target namespace.
Detects unhealthy states including:
- Liveness Probe Failures (container restarts triggered by liveness probe)
- Readiness Probe Failures (running container not ready to accept traffic)
- CrashLoopBackOff, ImagePullBackOff, Pending, Error, OOMKilled, ContainerCreating.
"""

from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.kubernetes.kubectl_executor import KubectlExecutor, kubectl_executor

UNHEALTHY_REASONS = {
    "CrashLoopBackOff",
    "ImagePullBackOff",
    "ErrImagePull",
    "OOMKilled",
    "Error",
    "ContainerCannotRun",
    "CreateContainerConfigError",
    "CreateContainerError",
}


class PodInspector:
    """Inspects pods and categorizes cluster health, including probe diagnostics."""

    def __init__(self, executor: Optional[KubectlExecutor] = None):
        self.executor = executor or kubectl_executor

    def inspect(
        self,
        namespace: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Inspect all pods or pods within a specified namespace and context."""
        args = ["get", "pods", "-o", "json"]
        if namespace:
            args.extend(["-n", namespace])
        else:
            args.append("-A")

        result = self.executor.execute(args, parse_json=True, context=context)

        if not result.success or not result.data:
            logger.warning(f"Failed to fetch pods: {result.error_message or result.stderr}")
            return {
                "healthy": False,
                "total_pods": 0,
                "unhealthy_count": 0,
                "problematic_pods": [],
                "error": result.error_message or "Unable to connect to Kubernetes cluster",
            }

        pod_items = result.data.get("items", []) if isinstance(result.data, dict) else []
        problematic_pods: List[Dict[str, Any]] = []

        for pod in pod_items:
            pod_metadata = pod.get("metadata", {})
            pod_spec = pod.get("spec", {})
            pod_status = pod.get("status", {})
            
            name = pod_metadata.get("name", "unknown")
            pod_ns = pod_metadata.get("namespace", "default")
            phase = pod_status.get("phase", "Unknown")

            is_unhealthy = False
            detected_status = phase
            reason_details = []
            total_restarts = 0
            container_diagnostics = []

            # Map container specs to inspect probes
            spec_containers = {c.get("name"): c for c in pod_spec.get("containers", [])}

            container_statuses = pod_status.get("containerStatuses", [])
            init_container_statuses = pod_status.get("initContainerStatuses", [])
            all_container_statuses = container_statuses + init_container_statuses

            for c_status in all_container_statuses:
                c_name = c_status.get("name")
                c_spec = spec_containers.get(c_name, {})
                restarts = c_status.get("restartCount", 0)
                total_restarts += restarts
                state = c_status.get("state", {})
                last_state = c_status.get("lastState", {})
                is_ready = c_status.get("ready", False)

                waiting = state.get("waiting")
                terminated = state.get("terminated")
                running = state.get("running")
                last_terminated = last_state.get("terminated")

                # Probe configuration extraction
                liveness_probe = c_spec.get("livenessProbe")
                readiness_probe = c_spec.get("readinessProbe")
                startup_probe = c_spec.get("startupProbe")

                probe_info = {
                    "has_liveness": bool(liveness_probe),
                    "liveness_config": self._format_probe(liveness_probe) if liveness_probe else None,
                    "has_readiness": bool(readiness_probe),
                    "readiness_config": self._format_probe(readiness_probe) if readiness_probe else None,
                }

                container_info = {
                    "name": c_name,
                    "ready": is_ready,
                    "restart_count": restarts,
                    "probes": probe_info,
                }

                # 1. Check Readiness Probe Failure: Running but not ready with readinessProbe defined
                if running and not is_ready and readiness_probe:
                    is_unhealthy = True
                    detected_status = "ReadinessProbeFailed"
                    reason_details.append(
                        f"Container '{c_name}' is Running but failing Readiness Probe ({probe_info['readiness_config']}). Traffic is blocked."
                    )

                # 2. Check Liveness Probe Failure: restarts with liveness probe configured
                if restarts > 0 and liveness_probe:
                    # Check if last termination was due to liveness failure or general crash
                    if last_terminated:
                        last_exit = last_terminated.get("exitCode", 0)
                        last_reason = last_terminated.get("reason", "")
                        if last_exit in [1, 137, 143] and not is_unhealthy:
                            detected_status = "LivenessProbeFailed"
                            reason_details.append(
                                f"Container '{c_name}' restarted {restarts} time(s). Liveness Probe ({probe_info['liveness_config']}) likely failed."
                            )

                # 3. Check waiting container state (CrashLoopBackOff, ImagePullBackOff, etc.)
                if waiting:
                    reason = waiting.get("reason", "")
                    message = waiting.get("message", "")
                    if reason in UNHEALTHY_REASONS or "BackOff" in reason:
                        is_unhealthy = True
                        detected_status = reason
                        reason_details.append(f"Container '{c_name}': {reason} - {message}")
                    elif reason == "ContainerCreating" and restarts > 0:
                        is_unhealthy = True
                        detected_status = "ContainerCreating (stuck)"
                        reason_details.append(f"Container '{c_name}' stuck in ContainerCreating")

                # 4. Check terminated state
                if terminated:
                    exit_code = terminated.get("exitCode", 0)
                    reason = terminated.get("reason", "")
                    message = terminated.get("message", "")
                    if reason == "OOMKilled" or exit_code == 137:
                        is_unhealthy = True
                        detected_status = "OOMKilled"
                        reason_details.append(f"Container '{c_name}' terminated due to OOMKilled (Exit 137)")
                    elif exit_code != 0:
                        is_unhealthy = True
                        detected_status = reason or f"Error (Exit {exit_code})"
                        reason_details.append(f"Container '{c_name}' failed with exit code {exit_code}: {message}")

                container_diagnostics.append(container_info)

            # Check Pod Ready condition
            conditions = pod_status.get("conditions", [])
            for cond in conditions:
                c_type = cond.get("type")
                c_status = cond.get("status")
                c_reason = cond.get("reason", "")
                c_msg = cond.get("message", "")

                if c_type == "Ready" and c_status == "False":
                    if c_reason == "ContainersNotReady" and not is_unhealthy:
                        is_unhealthy = True
                        if not detected_status or detected_status == "Running":
                            detected_status = "ReadinessProbeFailed"
                        reason_details.append(f"Pod not ready: {c_msg}")

            if phase in ["Failed", "Error"]:
                is_unhealthy = True
                detected_status = phase
                reason_details.append(pod_status.get("message", "Pod phase is Failed"))
            elif phase == "Pending":
                for cond in conditions:
                    if cond.get("type") == "PodScheduled" and cond.get("status") == "False":
                        is_unhealthy = True
                        detected_status = "Pending (SchedulingFailed)"
                        reason_details.append(cond.get("message", "Failed to schedule pod"))

            if is_unhealthy:
                problematic_pods.append({
                    "name": name,
                    "namespace": pod_ns,
                    "status": detected_status,
                    "phase": phase,
                    "restart_count": total_restarts,
                    "details": reason_details,
                    "containers": container_diagnostics,
                })

        total_pods = len(pod_items)
        unhealthy_count = len(problematic_pods)
        healthy = unhealthy_count == 0

        logger.info(
            f"Pod inspection complete (ctx: {context or 'default'}): {total_pods} total pods, {unhealthy_count} unhealthy (probes inspected)"
        )

        return {
            "healthy": healthy,
            "total_pods": total_pods,
            "unhealthy_count": unhealthy_count,
            "problematic_pods": problematic_pods,
        }

    def _format_probe(self, probe_dict: Dict[str, Any]) -> str:
        """Format probe details into a concise readable string."""
        if not probe_dict:
            return "none"

        probe_type = "unknown"
        target = ""

        if "httpGet" in probe_dict:
            hg = probe_dict["httpGet"]
            probe_type = "HTTP"
            target = f"{hg.get('path', '/')}:{hg.get('port')}"
        elif "tcpSocket" in probe_dict:
            ts = probe_dict["tcpSocket"]
            probe_type = "TCP"
            target = f"port {ts.get('port')}"
        elif "exec" in probe_dict:
            ex = probe_dict["exec"]
            probe_type = "Exec"
            cmd = " ".join(ex.get("command", []))
            target = f"cmd '{cmd[:25]}'"

        initial_delay = probe_dict.get("initialDelaySeconds", 0)
        period = probe_dict.get("periodSeconds", 10)
        return f"{probe_type} {target} (delay={initial_delay}s, period={period}s)"


# Global default instance
pod_inspector = PodInspector()
