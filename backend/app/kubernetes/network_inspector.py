"""Network Inspector Component.

Inspects Kubernetes Services and Endpoints to detect selector mismatches,
missing backend endpoints, and network misconfigurations.
"""

from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.kubernetes.kubectl_executor import KubectlExecutor, kubectl_executor


class NetworkInspector:
    """Evaluates service routing and endpoint alignment."""

    def __init__(self, executor: Optional[KubectlExecutor] = None):
        self.executor = executor or kubectl_executor

    def inspect(
        self,
        namespace: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Inspect Services and corresponding Endpoints within target context."""
        svc_args = ["get", "svc", "-o", "json"]
        if namespace:
            svc_args.extend(["-n", namespace])
        else:
            svc_args.append("-A")

        svc_result = self.executor.execute(svc_args, parse_json=True, context=context)

        ep_args = ["get", "endpoints", "-o", "json"]
        if namespace:
            ep_args.extend(["-n", namespace])
        else:
            ep_args.append("-A")

        ep_result = self.executor.execute(ep_args, parse_json=True, context=context)

        if not svc_result.success or not svc_result.data:
            logger.warning(f"Failed to fetch services: {svc_result.error_message or svc_result.stderr}")
            return {
                "healthy": False,
                "total_services": 0,
                "problematic_services": [],
                "error": svc_result.error_message or "Unable to retrieve services",
            }

        svc_items = svc_result.data.get("items", []) if isinstance(svc_result.data, dict) else []
        ep_items = ep_result.data.get("items", []) if (ep_result.success and isinstance(ep_result.data, dict)) else []

        endpoints_map: Dict[str, Any] = {}
        for ep in ep_items:
            ep_meta = ep.get("metadata", {})
            key = f"{ep_meta.get('namespace', 'default')}/{ep_meta.get('name')}"
            endpoints_map[key] = ep

        problematic_services: List[Dict[str, Any]] = []

        for svc in svc_items:
            svc_meta = svc.get("metadata", {})
            svc_spec = svc.get("spec", {})
            
            name = svc_meta.get("name", "unknown")
            svc_ns = svc_meta.get("namespace", "default")
            svc_type = svc_spec.get("type", "ClusterIP")
            selector = svc_spec.get("selector")
            cluster_ip = svc_spec.get("clusterIP")
            
            if name == "kubernetes" and svc_ns == "default":
                continue

            if selector:
                key = f"{svc_ns}/{name}"
                ep = endpoints_map.get(key)
                
                subsets = ep.get("subsets", []) if ep else []
                has_active_endpoints = any(len(s.get("addresses", [])) > 0 for s in subsets)
                not_ready_addresses = [
                    addr.get("ip") for s in subsets for addr in s.get("notReadyAddresses", [])
                ]

                if not has_active_endpoints:
                    issue_desc = "No ready backend pod endpoints found for service selector"
                    if not_ready_addresses:
                        issue_desc += f" ({len(not_ready_addresses)} pod(s) not ready)"

                    problematic_services.append({
                        "name": name,
                        "namespace": svc_ns,
                        "type": svc_type,
                        "cluster_ip": cluster_ip,
                        "selector": selector,
                        "issue": issue_desc,
                        "not_ready_endpoints": not_ready_addresses,
                    })

        total_svc = len(svc_items)
        unhealthy_svc = len(problematic_services)

        logger.info(
            f"Network inspection complete (ctx: {context or 'default'}): {total_svc} services, {unhealthy_svc} with endpoint routing issues"
        )

        return {
            "healthy": unhealthy_svc == 0,
            "total_services": total_svc,
            "unhealthy_count": unhealthy_svc,
            "problematic_services": problematic_services,
        }


# Global default instance
network_inspector = NetworkInspector()
