"""Kubernetes Cluster Discovery & Context Manager.

Discovers all Kubernetes clusters and contexts configured in the local kubeconfig,
tests their reachability, and provides context-switching support for investigations.
"""

import json
from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.kubernetes.kubectl_executor import KubectlExecutor, kubectl_executor


class ClusterManager:
    """Manages discovery and health inspection of local Kubernetes clusters."""

    def __init__(self, executor: Optional[KubectlExecutor] = None):
        self.executor = executor or kubectl_executor

    def get_clusters(self) -> Dict[str, Any]:
        """Discover all configured clusters and contexts from local kubeconfig."""
        logger.info("Discovering local Kubernetes clusters from kubeconfig...")
        result = self.executor.execute(["config", "view", "-o", "json"], parse_json=True)

        if not result.success or not result.data:
            logger.warning(f"Failed to parse kubeconfig via kubectl: {result.error_message}")
            return {
                "current_context": None,
                "clusters": [],
                "error": "No kubeconfig found or kubectl is unable to read configuration",
            }

        config_data = result.data if isinstance(result.data, dict) else {}
        current_context = config_data.get("current-context")
        
        # Build map of cluster definitions
        clusters_map: Dict[str, Dict[str, Any]] = {}
        for c in config_data.get("clusters", []):
            c_name = c.get("name")
            c_info = c.get("cluster", {})
            if c_name:
                clusters_map[c_name] = c_info

        # Extract contexts
        context_items = config_data.get("contexts", [])
        discovered_clusters: List[Dict[str, Any]] = []

        for ctx in context_items:
            ctx_name = ctx.get("name")
            ctx_details = ctx.get("context", {})
            cluster_name = ctx_details.get("cluster")
            cluster_info = clusters_map.get(cluster_name, {})
            server_url = cluster_info.get("server", "unknown")

            is_current = ctx_name == current_context

            # Ping cluster reachability with short timeout
            is_reachable, reachability_msg = self._check_reachability(ctx_name)

            discovered_clusters.append({
                "name": cluster_name or ctx_name,
                "context": ctx_name,
                "server": server_url,
                "is_current": is_current,
                "status": "connected" if is_reachable else "unreachable",
                "message": reachability_msg,
            })

        logger.info(f"Discovered {len(discovered_clusters)} Kubernetes context(s)")

        return {
            "current_context": current_context,
            "clusters": discovered_clusters,
        }

    def _check_reachability(self, context_name: str) -> tuple[bool, str]:
        """Test if the cluster control plane is responding."""
        result = self.executor.execute(
            ["--context", context_name, "cluster-info", "--request-timeout=2s"]
        )
        if result.success:
            return True, "Cluster API responding normally"
        
        err_lower = (result.stderr or result.error_message or "").lower()
        if "connectex" in err_lower or "refused" in err_lower:
            return False, "Control plane offline or actively refusing connections"
        elif "timed out" in err_lower:
            return False, "Connection to cluster API timed out"
        elif "certificate" in err_lower or "unauthorized" in err_lower:
            return False, "Authentication/certificate error accessing cluster"
        
        return False, "Cluster endpoint unreachable"


# Global default instance
cluster_manager = ClusterManager()
