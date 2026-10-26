"""Confidence Engine Component.

Calculates realistic confidence scores (0-100) based on signal convergence
across pod statuses, logs, warning events, deployments, and networking.
"""

from typing import Any, Dict, List


class ConfidenceEngine:
    """Evaluates telemetry strength to produce an explainable confidence score."""

    @staticmethod
    def calculate_confidence(investigation: Dict[str, Any]) -> int:
        """Compute an objective confidence score from investigation telemetry."""
        pods = investigation.get("pods", {})
        logs = investigation.get("logs", {})
        events = investigation.get("events", {})
        deployments = investigation.get("deployments", {})
        network = investigation.get("network", {})

        # If everything is clean
        if (
            pods.get("healthy", True)
            and deployments.get("healthy", True)
            and network.get("healthy", True)
            and events.get("warning_events_count", 0) == 0
        ):
            return 98

        score = 50  # Baseline for detected anomaly

        # 1. Pod state specificity
        prob_pods: List[Dict[str, Any]] = pods.get("problematic_pods", [])
        if prob_pods:
            # High specificity statuses
            specific_statuses = {"CrashLoopBackOff", "ImagePullBackOff", "OOMKilled", "ErrImagePull"}
            if any(p.get("status") in specific_statuses for p in prob_pods):
                score += 20
            else:
                score += 10

        # 2. Corroborating log signatures
        pod_logs = logs.get("pod_logs", {})
        has_detected_errors = any(
            len(p_log.get("error_patterns_detected", [])) > 0
            for p_log in pod_logs.values()
        )
        if has_detected_errors:
            score += 20
        elif logs.get("collected_count", 0) > 0:
            score += 10

        # 3. Matching warning events
        detected_issues = events.get("detected_issues", [])
        if detected_issues:
            score += 10

        # Cap at 98 for heuristic, minimum 45
        return max(45, min(score, 96))
