"""Fix Recommendation Engine.

Generates practical, actionable, and Kubernetes-specific remediation guidance
along with precise kubectl commands, including Liveness and Readiness probe fixes.
"""

from typing import Tuple


class FixRecommendationEngine:
    """Produces targeted fixes and kubectl commands based on detected failure patterns."""

    @staticmethod
    def recommend(
        resource_type: str,
        resource_name: str,
        namespace: str,
        issue_pattern: str,
    ) -> Tuple[str, str, str]:
        """Generate (fix_summary, kubectl_command, prevention_advice)."""
        pattern_lower = issue_pattern.lower()

        # 1. Liveness Probe Failure
        if "liveness" in pattern_lower:
            fix = (
                f"Fix the health endpoint for '{resource_name}' or increase "
                f"initialDelaySeconds / timeoutSeconds in the livenessProbe configuration."
            )
            cmd = f"kubectl edit deployment {resource_name} -n {namespace}"
            prevention = (
                "Ensure liveness probes check only local process responsiveness, not external "
                "dependencies (like databases) to avoid cascading restart loops."
            )
            return fix, cmd, prevention

        # 2. Readiness Probe Failure
        if "readiness" in pattern_lower:
            fix = (
                f"Verify application readiness check endpoint for '{resource_name}' "
                f"and ensure dependent services (DB/Cache) are reachable."
            )
            cmd = f"kubectl describe pod -l app={resource_name} -n {namespace}"
            prevention = (
                "Configure startupProbe for slow-initializing apps so readiness probes do not "
                "fail during initial container boot."
            )
            return fix, cmd, prevention

        # 3. Missing environment variable / DB connection
        if "env" in pattern_lower or "database_url" in pattern_lower or "variable" in pattern_lower:
            fix = f"Add the required environment variable or Secret reference to deployment '{resource_name}'."
            cmd = f"kubectl edit deployment {resource_name} -n {namespace}"
            prevention = "Use Kubernetes ConfigMaps and Secrets with schema validation in your CI/CD manifests."
            return fix, cmd, prevention

        # 4. Image pull failure
        if "image" in pattern_lower or "pull" in pattern_lower:
            fix = f"Verify the image tag and registry authentication credentials for deployment '{resource_name}'."
            cmd = f"kubectl describe pod -l app={resource_name} -n {namespace}"
            prevention = "Pin explicit image tags (avoid :latest) and ensure imagePullSecrets are configured."
            return fix, cmd, prevention

        # 5. OOMKilled / Memory limit
        if "oom" in pattern_lower or "137" in pattern_lower:
            fix = f"Increase the container memory limit and request for deployment '{resource_name}'."
            cmd = f"kubectl set resources deployment {resource_name} --limits=memory=512Mi --requests=memory=256Mi -n {namespace}"
            prevention = "Profile memory consumption under load and configure Vertical Pod Autoscaler (VPA)."
            return fix, cmd, prevention

        # 6. Service endpoint mismatch
        if "service" in pattern_lower or "endpoint" in pattern_lower or "selector" in pattern_lower:
            fix = f"Update Service '{resource_name}' selector to match the target Pod labels."
            cmd = f"kubectl get pods --show-labels -n {namespace}"
            prevention = "Standardize Kubernetes label conventions across Deployments and Services using shared templates."
            return fix, cmd, prevention

        # Default fallback
        fix = f"Inspect container lifecycle events and logs for '{resource_name}'."
        cmd = f"kubectl describe pod {resource_name} -n {namespace}"
        prevention = "Implement comprehensive liveness and readiness probes to detect startup failures gracefully."
        return fix, cmd, prevention
