"""Root Cause Analyzer Component.

Consumes the investigation payload, correlates multi-layer Kubernetes evidence
(including Liveness and Readiness probe failures), invokes LLM reasoning via
Google Gemini API, and falls back to deterministic Senior SRE rules when API
keys are absent or endpoints are unreachable.
"""

from typing import Any, Dict, List
from app.core.logging import logger
from app.ai.prompt_builder import SYSTEM_PROMPT, PromptBuilder
from app.ai.llm_client import LLMClient, llm_client
from app.ai.confidence_engine import ConfidenceEngine
from app.ai.fix_engine import FixRecommendationEngine


class RootCauseAnalyzer:
    """Analyzes Kubernetes evidence to determine root causes and remediation."""

    def __init__(self, client: LLMClient = llm_client):
        self.llm = client

    async def analyze(self, investigation: Dict[str, Any]) -> Dict[str, Any]:
        """Run root cause analysis on the collected investigation evidence."""
        logger.info("Executing Senior Kubernetes SRE Root Cause Analysis...")

        static_diagnosis = investigation.get("static_diagnosis")

        # 1. Attempt LLM Reasoning via Google Gemini API
        if self.llm.is_configured:
            user_prompt = PromptBuilder.build_user_prompt(investigation)
            llm_result = await self.llm.generate_diagnosis(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )

            if llm_result and "root_cause" in llm_result:
                logger.info("Successfully received diagnosis from Google Gemini LLM")
                diagnosis = self._sanitize_diagnosis(llm_result, investigation)
                if investigation.get("findings"):
                    diagnosis["findings"] = investigation["findings"]
                elif static_diagnosis and "findings" in static_diagnosis:
                    diagnosis["findings"] = static_diagnosis["findings"]
                return diagnosis

        # 2. Use Static Diagnosis directly for YAML, GitHub, and ZIP audits
        if static_diagnosis:
            logger.info("Employing deterministic Senior SRE Static Manifest Diagnosis")
            res_diag = dict(static_diagnosis)
            recalled_memories = investigation.get("recalled_memories", [])
            if recalled_memories and not res_diag.get("historical_context"):
                res_diag["historical_context"] = "\n".join(
                    [f"• {m.get('text', '')}" if isinstance(m, dict) else f"• {str(m)}" for m in recalled_memories[:3]]
                )
            return res_diag

        # 3. Fallback to Senior SRE Heuristic Engine for cluster telemetry
        logger.info("Employing Senior SRE Deterministic Correlation Engine")
        res_diag = self._heuristic_sre_analysis(investigation)
        recalled_memories = investigation.get("recalled_memories", [])
        if recalled_memories and not res_diag.get("historical_context"):
            res_diag["historical_context"] = "\n".join(
                [f"• {m.get('text', '')}" if isinstance(m, dict) else f"• {str(m)}" for m in recalled_memories[:3]]
            )
        return res_diag

    def _sanitize_diagnosis(
        self, llm_result: Dict[str, Any], investigation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Ensure all required fields exist and conform to schema."""
        confidence = llm_result.get("confidence")
        if not isinstance(confidence, (int, float)) or confidence <= 0:
            confidence = ConfidenceEngine.calculate_confidence(investigation)
        else:
            confidence = int(min(100, max(0, confidence)))

        recalled_memories = investigation.get("recalled_memories", [])
        hist_context = None
        if recalled_memories:
            hist_context = "\n".join(
                [f"• {m.get('text', '')}" if isinstance(m, dict) else f"• {str(m)}" for m in recalled_memories[:3]]
            )

        diagnosis = {
            "root_cause": str(llm_result.get("root_cause", "Anomaly detected in cluster")),
            "explanation": str(llm_result.get("explanation", "Failure detected during investigation")),
            "fix": str(llm_result.get("fix", "Inspect resource configuration")),
            "kubectl_command": str(llm_result.get("kubectl_command", "kubectl get pods -A")),
            "prevention": str(
                llm_result.get(
                    "prevention",
                    "Add health probes and automate manifest validation in deployment pipelines.",
                )
            ),
            "confidence": confidence,
            "historical_context": hist_context,
        }
        if investigation.get("findings"):
            diagnosis["findings"] = investigation["findings"]
        return diagnosis

    def _heuristic_sre_analysis(self, investigation: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic SRE correlation based on evidence patterns."""
        if investigation.get("static_diagnosis"):
            return investigation["static_diagnosis"]

        pods = investigation.get("pods", {})
        logs = investigation.get("logs", {})
        events = investigation.get("events", {})
        deployments = investigation.get("deployments", {})
        network = investigation.get("network", {})
        cluster_err = investigation.get("cluster_error")

        # Case 1: Manifest / Repository / ZIP Audit (Evaluated first for static manifest inputs)
        manifest_audit = investigation.get("manifest_audit")
        source_info = investigation.get("source_info", {})
        if manifest_audit or source_info.get("type") in ("yaml", "github", "zip"):
            source_label = (
                (manifest_audit.get("source_label") if manifest_audit else None)
                or source_info.get("url")
                or source_info.get("filename")
                or "manifest.yaml"
            )

            # Check if source fetching failed (e.g., GitHub 404 or invalid ZIP)
            if cluster_err:
                return {
                    "root_cause": f"Failed to ingest Kubernetes manifests from {source_label}.",
                    "explanation": f"Source ingestion error: {cluster_err}. The specified repository or archive could not be parsed.",
                    "fix": "Verify that the repository URL is public, accessible, and contains valid Kubernetes YAML files (.yaml or .yml).",
                    "kubectl_command": f"curl -s {source_label[:80]} | kubectl apply -f - --dry-run=client",
                    "prevention": "Ensure repositories have proper branch protection and keep manifests in standard /k8s or /deploy directories.",
                    "confidence": 95,
                }

            probe_issues = events.get("probe_events", [])
            detected_issues = events.get("detected_issues", [])

            # Check probe configuration issues in manifest
            if probe_issues:
                first_probe = probe_issues[0]
                reason = first_probe.get("reason", "ProbeMissing")
                res_name = first_probe.get("name", "workload")
                return {
                    "root_cause": f"Probe configuration deficiency in '{res_name}' ({source_label}).",
                    "explanation": first_probe.get("message", "Container workload is missing liveness or readiness probes."),
                    "fix": (
                        f"Add livenessProbe and readinessProbe to the container spec in {source_label}.\n"
                        "Example:\n"
                        "  livenessProbe:\n"
                        "    httpGet:\n"
                        "      path: /healthz\n"
                        "      port: 8080\n"
                        "    initialDelaySeconds: 15\n"
                        "    periodSeconds: 10\n"
                        "  readinessProbe:\n"
                        "    httpGet:\n"
                        "      path: /ready\n"
                        "      port: 8080\n"
                        "    initialDelaySeconds: 5\n"
                        "    periodSeconds: 5"
                    ),
                    "kubectl_command": f"kubectl apply -f {source_label}",
                    "prevention": "Enforce admission controllers (e.g., Kyverno or OPA Gatekeeper) requiring health probes on all production workloads.",
                    "confidence": 96,
                }

            # Check selector mismatches and resource limits
            if detected_issues:
                first_issue = detected_issues[0]
                reason = first_issue.get("reason", "ConfigurationError")
                res_name = first_issue.get("name", "workload")
                msg = first_issue.get("message", "Configuration defect detected in Kubernetes manifest.")

                if "Selector" in reason or "Selector" in msg:
                    return {
                        "root_cause": f"Selector mismatch in '{res_name}' ({source_label}).",
                        "explanation": msg,
                        "fix": "Ensure 'spec.selector.matchLabels' matches 'spec.template.metadata.labels' exactly.",
                        "kubectl_command": f"kubectl apply -f {source_label}",
                        "prevention": "Use Kustomize or Helm to generate aligned labels automatically across deployments and services.",
                        "confidence": 95,
                    }
                elif "Memory" in reason or "Limit" in msg:
                    return {
                        "root_cause": f"Missing memory limit in '{res_name}' ({source_label}).",
                        "explanation": msg,
                        "fix": "Specify 'resources.limits.memory' and 'resources.requests.memory' to prevent host OOM kills.",
                        "kubectl_command": f"kubectl apply -f {source_label}",
                        "prevention": "Define LimitRanges in your namespaces to automatically supply default memory and CPU limits.",
                        "confidence": 94,
                    }
                else:
                    return {
                        "root_cause": f"Manifest defect in '{res_name}': {reason}.",
                        "explanation": msg,
                        "fix": f"Review and patch {source_label} to align with Kubernetes API standards.",
                        "kubectl_command": f"kubectl apply -f {source_label}",
                        "prevention": "Run 'kube-linter' or 'kubeconform' in CI/CD pipeline before applying manifests.",
                        "confidence": 92,
                    }

            # All manifests compliant
            return {
                "root_cause": f"All Kubernetes manifests in '{source_label}' comply with production standards.",
                "explanation": f"Inspected {manifest_audit.get('total_resources', 0) if manifest_audit else 0} resource(s). Probes, selectors, and resource limits are properly defined.",
                "fix": "Manifests are verified and ready for deployment.",
                "kubectl_command": f"kubectl apply -f {source_label} --dry-run=server",
                "prevention": "Continuously scan repository commits with automated pre-commit hooks.",
                "confidence": 98,
            }

        # Case 2: Live Cluster Control Plane Unreachable
        if cluster_err:
            return {
                "root_cause": "Unable to connect to Kubernetes cluster.",
                "explanation": (
                    f"kubectl could not connect to the API server: {cluster_err}. "
                    "The local control plane is offline, shutting down, or actively refusing connections."
                ),
                "fix": (
                    "Please verify:\n"
                    "1. Cluster access: Ensure Docker Desktop, Minikube, or Kind is running.\n"
                    "2. Kubeconfig path: Verify ~/.kube/config is valid.\n"
                    "3. Context: Check 'kubectl config current-context'."
                ),
                "kubectl_command": "kubectl cluster-info",
                "prevention": "Configure local container runtime to autostart and monitor control plane health.",
                "confidence": 99,
            }

        prob_pods: List[Dict[str, Any]] = pods.get("problematic_pods", [])
        pod_logs: Dict[str, Any] = logs.get("pod_logs", {})
        prob_deployments: List[Dict[str, Any]] = deployments.get("problematic_deployments", [])
        prob_services: List[Dict[str, Any]] = network.get("problematic_services", [])
        warning_events: List[Dict[str, Any]] = events.get("detected_issues", [])
        probe_events: List[Dict[str, Any]] = events.get("probe_events", [])

        # Check for Probe Events in cluster events
        probe_event_text = " ".join([p.get("message", "") for p in probe_events]).lower()

        if prob_pods:
            primary_pod = prob_pods[0]
            pod_name = primary_pod.get("name", "unknown")
            namespace = primary_pod.get("namespace", "default")
            status = primary_pod.get("status", "Unknown")
            details = primary_pod.get("details", [])
            details_text = " ".join(details).lower()
            
            log_entry = pod_logs.get(f"{namespace}/{pod_name}", {})
            detected_errors = log_entry.get("error_patterns_detected", [])
            log_text = " ".join(detected_errors).lower()

            # --- Check Liveness Probe Failure ---
            if (
                status == "LivenessProbeFailed"
                or "liveness probe failed" in details_text
                or "liveness probe failed" in probe_event_text
                or "failed liveness probe" in probe_event_text
            ):
                fix, cmd, prev = FixRecommendationEngine.recommend("pod", pod_name, namespace, "liveness")
                return {
                    "root_cause": f"Liveness probe failure in pod '{pod_name}'.",
                    "explanation": (
                        f"Kubelet detected that pod '{pod_name}' failed its configured livenessProbe. "
                        "Because the health endpoint did not respond with 2xx or timed out, "
                        "Kubelet terminated and restarted the container to attempt self-healing."
                    ),
                    "fix": fix,
                    "kubectl_command": f"kubectl describe pod {pod_name} -n {namespace}",
                    "prevention": prev,
                    "confidence": 95,
                }

            # --- Check Readiness Probe Failure ---
            if (
                status == "ReadinessProbeFailed"
                or "readiness probe failed" in details_text
                or "readiness probe failed" in probe_event_text
                or "failing readiness probe" in details_text
            ):
                fix, cmd, prev = FixRecommendationEngine.recommend("pod", pod_name, namespace, "readiness")
                return {
                    "root_cause": f"Readiness probe failure in pod '{pod_name}'.",
                    "explanation": (
                        f"Pod '{pod_name}' is Running, but failing its readinessProbe. "
                        "Traffic routing is blocked: Kubernetes Endpoints controller has removed "
                        "this pod from active service endpoints until the readiness check passes."
                    ),
                    "fix": fix,
                    "kubectl_command": f"kubectl describe pod {pod_name} -n {namespace}",
                    "prevention": prev,
                    "confidence": 95,
                }

            # Correlate missing environment variables
            if "env" in log_text or "database_url" in log_text or "variable" in log_text:
                return {
                    "root_cause": f"Missing environment variable: DATABASE_URL in pod '{pod_name}'.",
                    "explanation": (
                        f"Pod '{pod_name}' in namespace '{namespace}' is in {status}. "
                        "The application crashed immediately upon startup because required variable 'DATABASE_URL' is unset."
                    ),
                    "fix": "Add the missing secret or configmap value for DATABASE_URL to the deployment environment.",
                    "kubectl_command": f"kubectl set env deployment/{pod_name} DATABASE_URL=postgresql://user:pass@postgres:5432/db -n {namespace}",
                    "prevention": "Use ConfigMaps and Secrets with schema validation in your deployment manifests.",
                    "confidence": 94,
                }

            # Correlate ImagePullBackOff / ErrImagePull
            if "image" in status.lower() or "pull" in status.lower() or any("pull" in str(e).lower() for e in detected_errors):
                return {
                    "root_cause": f"Invalid container image tag or repository for pod '{pod_name}'.",
                    "explanation": (
                        f"Pod '{pod_name}' is in '{status}'. The Kubelet failed to pull the specified image tag "
                        "from the registry. The image tag does not exist or credentials are missing."
                    ),
                    "fix": "Update the deployment image tag to a valid image existing in the registry.",
                    "kubectl_command": f"kubectl set image deployment/{pod_name} {pod_name}=nginx:alpine -n {namespace}",
                    "prevention": "Avoid using nonexistent or mutable tags; configure imagePullSecrets for private registries.",
                    "confidence": 96,
                }

            # Correlate OOMKilled
            if "oom" in status.lower() or "137" in status or any("oom" in str(e).lower() for e in detected_errors):
                return {
                    "root_cause": f"Container in pod '{pod_name}' exceeded memory limit (OOMKilled - Exit 137).",
                    "explanation": (
                        f"Pod '{pod_name}' was terminated by the Linux kernel OOM killer because its memory usage "
                        "exceeded the container limit defined in the resource specification."
                    ),
                    "fix": "Increase memory requests and limits for the container in the deployment specification.",
                    "kubectl_command": f"kubectl set resources deployment/{pod_name} --limits=memory=256Mi --requests=memory=128Mi -n {namespace}",
                    "prevention": "Profile container memory requirements under peak load and set appropriate cgroup headroom.",
                    "confidence": 97,
                }

            # Generic CrashLoopBackOff
            if status == "CrashLoopBackOff":
                err_detail = detected_errors[0] if detected_errors else "Fatal exception during startup"
                return {
                    "root_cause": f"Container entrypoint in pod '{pod_name}' is crashing repeatedly.",
                    "explanation": f"Pod '{pod_name}' is stuck in CrashLoopBackOff: {err_detail}.",
                    "fix": f"Review recent error logs and update container parameters or dependencies for '{pod_name}'.",
                    "kubectl_command": f"kubectl logs {pod_name} -n {namespace} --previous",
                    "prevention": "Ensure graceful exception handling and add structured startup health probes.",
                    "confidence": 91,
                }

        # Scenario: Service Selector Mismatch
        if prob_services:
            svc = prob_services[0]
            svc_name = svc.get("name", "unknown")
            svc_ns = svc.get("namespace", "default")
            selector = svc.get("selector", {})
            return {
                "root_cause": f"Service selector does not match pod labels for service '{svc_name}'.",
                "explanation": (
                    f"Service '{svc_name}' in namespace '{svc_ns}' has no active backend endpoints. "
                    f"Its selector {selector} does not match the labels on any running backend pods."
                ),
                "fix": "Update the service selector labels to match the target deployment pod template labels.",
                "kubectl_command": f"kubectl patch svc {svc_name} -p '{{\"spec\":{{\"selector\":{{\"app\":\"orders-backend\"}}}}}}' -n {svc_ns}",
                "prevention": "Standardize label naming conventions across Services and Deployments using shared Helm templates.",
                "confidence": 93,
            }

        # Case: Degraded Deployment
        if prob_deployments:
            dep = prob_deployments[0]
            dep_name = dep.get("name", "unknown")
            dep_ns = dep.get("namespace", "default")
            issues = dep.get("issues", ["Replica mismatch"])
            return {
                "root_cause": f"Deployment '{dep_name}' rollout stalled: {issues[0]}.",
                "explanation": f"Deployment has {dep.get('unavailable_replicas', 1)} unavailable replica(s) in namespace '{dep_ns}'.",
                "fix": "Inspect deployment conditions and roll back or patch the deployment specification.",
                "kubectl_command": f"kubectl rollout status deployment {dep_name} -n {dep_ns}",
                "prevention": "Implement progressive rollouts with automated rollback triggers.",
                "confidence": 88,
            }

        # Case: Warning Events
        if warning_events:
            event = warning_events[0]
            return {
                "root_cause": f"Cluster anomaly: {event.get('reason')} on {event.get('kind')} '{event.get('name')}'.",
                "explanation": event.get("message", "Repeated warning event reported by Kubernetes controller"),
                "fix": f"Inspect resource '{event.get('name')}' in namespace '{event.get('namespace')}'.",
                "kubectl_command": f"kubectl describe {event.get('kind', 'pod').lower()} {event.get('name')} -n {event.get('namespace', 'default')}",
                "prevention": "Set up Alertmanager alerts for recurring Kubernetes warning events.",
                "confidence": 82,
            }

        # Healthy Cluster
        return {
            "root_cause": "No critical Kubernetes issues detected. Cluster appears healthy.",
            "explanation": "All inspected pods are running, probes are passing, deployments have desired replicas, and services have active endpoints.",
            "fix": "No corrective action required.",
            "kubectl_command": "kubectl get pods,deployments,services -A",
            "prevention": "Continue maintaining continuous observability and synthetic health checks.",
            "confidence": 98,
        }


# Global default instance
root_cause_analyzer = RootCauseAnalyzer()
