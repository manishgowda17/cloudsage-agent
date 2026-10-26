"""Deployment Inspector Component.

Inspects Kubernetes deployments to detect rollout failures, replica discrepancies,
and degraded deployment conditions.
"""

from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.kubernetes.kubectl_executor import KubectlExecutor, kubectl_executor


class DeploymentInspector:
    """Evaluates deployment health and rollout status."""

    def __init__(self, executor: Optional[KubectlExecutor] = None):
        self.executor = executor or kubectl_executor

    def inspect(
        self,
        namespace: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Inspect all deployments or those within a target namespace and context."""
        args = ["get", "deployments", "-o", "json"]
        if namespace:
            args.extend(["-n", namespace])
        else:
            args.append("-A")

        result = self.executor.execute(args, parse_json=True, context=context)

        if not result.success or not result.data:
            logger.warning(f"Failed to fetch deployments: {result.error_message or result.stderr}")
            return {
                "healthy": False,
                "total_deployments": 0,
                "unhealthy_count": 0,
                "problematic_deployments": [],
                "error": result.error_message or "Unable to retrieve deployments",
            }

        deploy_items = result.data.get("items", []) if isinstance(result.data, dict) else []
        problematic_deployments: List[Dict[str, Any]] = []

        for item in deploy_items:
            metadata = item.get("metadata", {})
            spec = item.get("spec", {})
            status = item.get("status", {})

            name = metadata.get("name", "unknown")
            deploy_ns = metadata.get("namespace", "default")
            
            desired_replicas = spec.get("replicas", 1)
            ready_replicas = status.get("readyReplicas", 0)
            available_replicas = status.get("availableReplicas", 0)
            unavailable_replicas = status.get("unavailableReplicas", 0)
            updated_replicas = status.get("updatedReplicas", 0)

            is_degraded = False
            reasons = []

            if desired_replicas > 0 and available_replicas < desired_replicas:
                is_degraded = True
                reasons.append(
                    f"Available replicas ({available_replicas}) lower than desired ({desired_replicas})"
                )

            if unavailable_replicas > 0:
                is_degraded = True
                reasons.append(f"{unavailable_replicas} replica(s) currently unavailable")

            conditions = status.get("conditions", [])
            for cond in conditions:
                cond_type = cond.get("type")
                cond_status = cond.get("status")
                cond_reason = cond.get("reason", "")
                cond_msg = cond.get("message", "")

                if cond_type == "Progressing" and cond_status == "False":
                    is_degraded = True
                    reasons.append(f"Rollout stalled: {cond_reason} - {cond_msg}")
                elif cond_type == "Available" and cond_status == "False":
                    is_degraded = True
                    reasons.append(f"Deployment unavailable: {cond_reason} - {cond_msg}")

            if is_degraded:
                problematic_deployments.append({
                    "name": name,
                    "namespace": deploy_ns,
                    "desired_replicas": desired_replicas,
                    "available_replicas": available_replicas,
                    "unavailable_replicas": unavailable_replicas,
                    "updated_replicas": updated_replicas,
                    "issues": reasons,
                })

        total = len(deploy_items)
        unhealthy = len(problematic_deployments)

        logger.info(
            f"Deployment inspection complete (ctx: {context or 'default'}): {total} total, {unhealthy} unhealthy"
        )

        return {
            "healthy": unhealthy == 0,
            "total_deployments": total,
            "unhealthy_count": unhealthy,
            "problematic_deployments": problematic_deployments,
        }


# Global default instance
deployment_inspector = DeploymentInspector()
