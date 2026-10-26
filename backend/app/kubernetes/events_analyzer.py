"""Events Analyzer Component.

Inspects Kubernetes events across the cluster. Detects warning conditions including:
- Liveness Probe Failures (Unhealthy probe events, Killing container)
- Readiness Probe Failures (Unhealthy probe events, endpoint isolation)
- FailedScheduling, BackOff, FailedMount, FailedPull, ErrImagePull.
"""

from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.kubernetes.kubectl_executor import KubectlExecutor, kubectl_executor

WATCH_REASONS = {
    "FailedScheduling",
    "BackOff",
    "FailedMount",
    "FailedPull",
    "ErrImagePull",
    "Unhealthy",
    "FailedCreate",
    "Failed",
    "Killing",
    "NodeNotReady",
}


class EventsAnalyzer:
    """Analyzes Kubernetes cluster events for actionable anomalies including probe failures."""

    def __init__(self, executor: Optional[KubectlExecutor] = None):
        self.executor = executor or kubectl_executor

    def analyze(
        self,
        namespace: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetch and summarize warning events with dedicated probe telemetry."""
        args = ["get", "events", "-o", "json"]
        if namespace:
            args.extend(["-n", namespace])
        else:
            args.append("-A")

        result = self.executor.execute(args, parse_json=True, context=context)

        if not result.success or not result.data:
            logger.warning(f"Failed to fetch events: {result.error_message or result.stderr}")
            return {
                "total_events": 0,
                "warning_events_count": 0,
                "detected_issues": [],
                "probe_events": [],
                "error": result.error_message or "Unable to retrieve events",
            }

        event_items = result.data.get("items", []) if isinstance(result.data, dict) else []
        warning_events: List[Dict[str, Any]] = []
        probe_events: List[Dict[str, Any]] = []

        for item in event_items:
            event_type = item.get("type", "Normal")
            reason = item.get("reason", "")
            message = item.get("message", "")
            count = item.get("count", 1)
            
            involved_object = item.get("involvedObject", {})
            obj_kind = involved_object.get("kind", "Unknown")
            obj_name = involved_object.get("name", "Unknown")
            obj_ns = involved_object.get("namespace", "default")
            
            last_timestamp = item.get("lastTimestamp") or item.get("eventTime")

            event_record = {
                "kind": obj_kind,
                "name": obj_name,
                "namespace": obj_ns,
                "reason": reason,
                "message": message,
                "count": count,
                "last_timestamp": last_timestamp,
            }

            # Check for probe specific events (Liveness / Readiness / Startup)
            msg_lower = message.lower()
            if "probe failed" in msg_lower or "liveness" in msg_lower or "readiness" in msg_lower:
                probe_events.append(event_record)

            if event_type == "Warning" or reason in WATCH_REASONS:
                warning_events.append(event_record)

        warning_events.sort(key=lambda x: x.get("count", 1), reverse=True)

        logger.info(
            f"Events analysis complete (ctx: {context or 'default'}): {len(event_items)} total events, "
            f"{len(warning_events)} warnings, {len(probe_events)} probe failures"
        )

        return {
            "total_events": len(event_items),
            "warning_events_count": len(warning_events),
            "detected_issues": warning_events[:30],
            "probe_events": probe_events[:15],
        }


# Global default instance
events_analyzer = EventsAnalyzer()
