"""Logs Collector Component.

Fetches and extracts concise, relevant failure diagnostics from Kubernetes pod logs.
Focuses on Exceptions, Connection failures, Missing env vars, Image failures, and
Startup errors without returning thousands of lines.
"""

import re
from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.kubernetes.kubectl_executor import KubectlExecutor, kubectl_executor

ERROR_PATTERNS = [
    re.compile(r"exception", re.IGNORECASE),
    re.compile(r"error", re.IGNORECASE),
    re.compile(r"fatal", re.IGNORECASE),
    re.compile(r"panic", re.IGNORECASE),
    re.compile(r"connection refused", re.IGNORECASE),
    re.compile(r"connect: network is unreachable", re.IGNORECASE),
    re.compile(r"timed out", re.IGNORECASE),
    re.compile(r"missing environment variable", re.IGNORECASE),
    re.compile(r"env var .* not set", re.IGNORECASE),
    re.compile(r"cannot find module", re.IGNORECASE),
    re.compile(r"crash", re.IGNORECASE),
    re.compile(r"oom", re.IGNORECASE),
    re.compile(r"failed to start", re.IGNORECASE),
    re.compile(r"traceback \(most recent call last\)", re.IGNORECASE),
]


class LogsCollector:
    """Collects targeted error logs from problematic Kubernetes pods."""

    def __init__(self, executor: Optional[KubectlExecutor] = None, max_lines_per_pod: int = 50):
        self.executor = executor or kubectl_executor
        self.max_lines_per_pod = max_lines_per_pod

    def collect(
        self,
        problematic_pods: List[Dict[str, Any]],
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Collect logs for a list of problematic pods."""
        logs_summary: Dict[str, Any] = {}

        if not problematic_pods:
            logger.info("No problematic pods provided to LogsCollector")
            return {"collected_count": 0, "pod_logs": {}}

        for pod in problematic_pods:
            pod_name = pod.get("name")
            namespace = pod.get("namespace", "default")
            
            if not pod_name:
                continue

            logger.info(f"Collecting logs for pod {pod_name} in namespace {namespace} (ctx: {context or 'default'})")
            pod_log_data = self._fetch_pod_logs(pod_name, namespace, context=context)
            logs_summary[f"{namespace}/{pod_name}"] = pod_log_data

        return {
            "collected_count": len(logs_summary),
            "pod_logs": logs_summary,
        }

    def _fetch_pod_logs(self, pod_name: str, namespace: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Fetch current and previous logs for a pod, filtering for key errors."""
        args = ["logs", pod_name, "-n", namespace, f"--tail={self.max_lines_per_pod}", "--timestamps"]
        result = self.executor.execute(args, context=context)

        raw_logs = result.stdout
        error_lines: List[str] = []
        is_previous = False

        if not raw_logs and not result.success:
            prev_args = ["logs", pod_name, "-n", namespace, f"--tail={self.max_lines_per_pod}", "--previous", "--timestamps"]
            prev_result = self.executor.execute(prev_args, context=context)
            if prev_result.success and prev_result.stdout:
                raw_logs = prev_result.stdout
                is_previous = True

        if raw_logs:
            lines = raw_logs.splitlines()
            for line in lines:
                if any(pattern.search(line) for pattern in ERROR_PATTERNS):
                    error_lines.append(line.strip())

            tail_sample = [l.strip() for l in lines[-15:]]
        else:
            tail_sample = []

        return {
            "pod_name": pod_name,
            "namespace": namespace,
            "is_previous_container_log": is_previous,
            "error_patterns_detected": list(set(error_lines))[:20],
            "recent_log_sample": tail_sample,
            "log_fetch_status": "success" if raw_logs else (result.error_message or "No logs available"),
        }


# Global default instance
logs_collector = LogsCollector()
