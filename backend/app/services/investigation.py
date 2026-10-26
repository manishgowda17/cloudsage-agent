"""Investigation Service Orchestrator.

Orchestrates the entire Kubernetes Troubleshooting Workflow:
1. Cluster selection & context awareness
2. Failure Scenario Test Engine (CrashLoopBackOff, ImagePullBackOff, OOMKilled, SelectorMismatch, ProbeFailures)
3. Kubernetes Evidence Gathering (Pods, Logs, Events, Deployments, Network)
4. Senior Kubernetes SRE AI Reasoning (Google Gemini API / Deterministic Heuristic)
"""

from typing import Any, Dict, Optional
from app.core.logging import logger
from app.kubernetes.cluster_manager import cluster_manager
from app.kubernetes.pod_inspector import pod_inspector
from app.kubernetes.logs_collector import logs_collector
from app.kubernetes.events_analyzer import events_analyzer
from app.kubernetes.deployment_inspector import deployment_inspector
from app.kubernetes.network_inspector import network_inspector
from app.ai.root_cause_analyzer import root_cause_analyzer


class InvestigationService:
    """Orchestrates comprehensive on-demand cluster evidence gathering and AI diagnosis."""

    @staticmethod
    async def run_investigation(
        namespace: Optional[str] = None,
        context: Optional[str] = None,
        scenario: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute the complete troubleshooting pipeline for a target cluster or test scenario."""
        target_ctx = context or "default"
        target_ns = namespace or "default"

        # --- Test Scenarios Support ---
        if scenario:
            logger.info(f"Running simulated failure test scenario: '{scenario}'")
            evidence = InvestigationService._build_scenario_evidence(scenario, target_ns)
            diagnosis = await root_cause_analyzer.analyze(investigation=evidence)
            return {
                "status": "success",
                "diagnosis": diagnosis,
                "investigation": evidence,
            }

        # --- Real Cluster Investigation ---
        logger.info(f"Initiating investigation on context: '{target_ctx}', namespace: '{target_ns}'")

        # Check cluster reachability before probing
        is_reachable, reachability_msg = cluster_manager._check_reachability(target_ctx)
        if not is_reachable:
            logger.warning(f"Cluster context '{target_ctx}' is unreachable: {reachability_msg}")
            empty_evidence = {
                "pods": {"healthy": False, "total_pods": 0, "unhealthy_count": 0, "problematic_pods": []},
                "logs": {"collected_count": 0, "pod_logs": {}},
                "events": {"total_events": 0, "warning_events_count": 0, "detected_issues": [], "probe_events": []},
                "deployments": {"healthy": False, "total_deployments": 0, "unhealthy_count": 0, "problematic_deployments": []},
                "network": {"healthy": False, "total_services": 0, "problematic_services": []},
                "cluster_error": reachability_msg,
            }
            diagnosis = await root_cause_analyzer.analyze(investigation=empty_evidence)
            return {
                "status": "success",
                "diagnosis": diagnosis,
                "investigation": empty_evidence,
            }

        # 1. Pods (with liveness & readiness probes)
        logger.info("[Evidence 1/5] Inspecting Pod health, lifecycle states, and probes...")
        pods_evidence = pod_inspector.inspect(namespace=namespace, context=context)

        # 2. Logs for problematic pods
        problematic_pods = pods_evidence.get("problematic_pods", [])
        logger.info(f"[Evidence 2/5] Collecting logs for {len(problematic_pods)} problematic pod(s)...")
        logs_evidence = logs_collector.collect(problematic_pods=problematic_pods, context=context)

        # 3. Events (including probe failure events)
        logger.info("[Evidence 3/5] Analyzing cluster events for warning & probe failure signals...")
        events_evidence = events_analyzer.analyze(namespace=namespace, context=context)

        # 4. Deployments
        logger.info("[Evidence 4/5] Inspecting deployment replica alignment and rollout status...")
        deployments_evidence = deployment_inspector.inspect(namespace=namespace, context=context)

        # 5. Network
        logger.info("[Evidence 5/5] Inspecting service routing and backend endpoints...")
        network_evidence = network_inspector.inspect(namespace=namespace, context=context)

        investigation_payload = {
            "pods": pods_evidence,
            "logs": logs_evidence,
            "events": events_evidence,
            "deployments": deployments_evidence,
            "network": network_evidence,
        }

        # Senior SRE AI Reasoning (Google Gemini API / Heuristic)
        logger.info("[AI Reasoning] Analyzing evidence with Senior Kubernetes SRE intelligence...")
        diagnosis = await root_cause_analyzer.analyze(investigation=investigation_payload)

        return {
            "status": "success",
            "diagnosis": diagnosis,
            "investigation": investigation_payload,
        }

    @staticmethod
    def _build_scenario_evidence(scenario: str, namespace: str) -> Dict[str, Any]:
        """Construct realistic evidence payloads for all failure scenarios."""
        scenario_key = scenario.lower()

        # Scenario: Liveness / Readiness Probe Failure
        if "probe" in scenario_key or "liveness" in scenario_key or "readiness" in scenario_key:
            is_liveness = "liveness" in scenario_key
            status_name = "LivenessProbeFailed" if is_liveness else "ReadinessProbeFailed"
            pod_name = f"catalog-api-7b89f-{'live' if is_liveness else 'ready'}42"
            
            probe_err_msg = (
                "Liveness probe failed: HTTP probe failed with statuscode: 500"
                if is_liveness
                else "Readiness probe failed: HTTP probe failed with statuscode: 503 (database connection timeout)"
            )

            return {
                "pods": {
                    "healthy": False,
                    "total_pods": 2,
                    "unhealthy_count": 1,
                    "problematic_pods": [{
                        "name": pod_name,
                        "namespace": namespace,
                        "status": status_name,
                        "phase": "Running",
                        "restart_count": 5 if is_liveness else 0,
                        "details": [
                            f"Container 'catalog': {'Restarted 5 times. Liveness probe failed' if is_liveness else 'Running but failing readinessProbe. Traffic isolated.'}"
                        ],
                        "containers": [{
                            "name": "catalog",
                            "ready": not is_liveness,
                            "restart_count": 5 if is_liveness else 0,
                            "probes": {
                                "has_liveness": True,
                                "liveness_config": "HTTP /healthz:8080 (delay=5s, period=10s)",
                                "has_readiness": True,
                                "readiness_config": "HTTP /ready:8080 (delay=3s, period=5s)",
                            }
                        }]
                    }]
                },
                "logs": {
                    "collected_count": 1,
                    "pod_logs": {
                        f"{namespace}/{pod_name}": {
                            "error_patterns_detected": [
                                f"ERROR: Health check failed: {probe_err_msg}"
                            ],
                            "recent_log_sample": [
                                "Starting HTTP health server on port 8080...",
                                f"ERROR: Health check endpoint returned 50x: {probe_err_msg}"
                            ]
                        }
                    }
                },
                "events": {
                    "total_events": 4,
                    "warning_events_count": 2,
                    "detected_issues": [
                        {
                            "kind": "Pod",
                            "name": pod_name,
                            "namespace": namespace,
                            "reason": "Unhealthy",
                            "message": probe_err_msg,
                            "count": 6
                        }
                    ],
                    "probe_events": [
                        {
                            "kind": "Pod",
                            "name": pod_name,
                            "namespace": namespace,
                            "reason": "Unhealthy",
                            "message": probe_err_msg,
                            "count": 6
                        }
                    ]
                },
                "deployments": {
                    "healthy": False,
                    "total_deployments": 1,
                    "unhealthy_count": 1,
                    "problematic_deployments": [{
                        "name": "catalog-api",
                        "namespace": namespace,
                        "desired_replicas": 1,
                        "available_replicas": 0,
                        "unavailable_replicas": 1,
                        "issues": ["Deployment has 1 unready replica"]
                    }]
                },
                "network": {
                    "healthy": False,
                    "total_services": 1,
                    "unhealthy_count": 1,
                    "problematic_services": [{
                        "name": "catalog-service",
                        "namespace": namespace,
                        "type": "ClusterIP",
                        "selector": {"app": "catalog-api"},
                        "issue": "No ready backend pod endpoints found for service selector (1 pod not ready)"
                    }]
                }
            }

        elif "crashloop" in scenario_key:
            return {
                "pods": {
                    "healthy": False,
                    "total_pods": 3,
                    "unhealthy_count": 1,
                    "problematic_pods": [{
                        "name": "payment-service-679bc489fb-xyz12",
                        "namespace": namespace,
                        "status": "CrashLoopBackOff",
                        "phase": "Running",
                        "restart_count": 8,
                        "details": ["Container 'payment-api': CrashLoopBackOff - back-off 5m0s restarting failed container"]
                    }]
                },
                "logs": {
                    "collected_count": 1,
                    "pod_logs": {
                        f"{namespace}/payment-service-679bc489fb-xyz12": {
                            "error_patterns_detected": [
                                "FATAL: Missing environment variable DATABASE_URL. Cannot connect to database."
                            ],
                            "recent_log_sample": [
                                "Starting payment-service v1.0.0...",
                                "FATAL: Missing environment variable DATABASE_URL. Cannot connect to database."
                            ]
                        }
                    }
                },
                "events": {
                    "total_events": 5,
                    "warning_events_count": 2,
                    "detected_issues": [{
                        "kind": "Pod",
                        "name": "payment-service-679bc489fb-xyz12",
                        "namespace": namespace,
                        "reason": "BackOff",
                        "message": "Back-off restarting failed container payment-api in pod payment-service-679bc489fb-xyz12",
                        "count": 14
                    }],
                    "probe_events": []
                },
                "deployments": {
                    "healthy": False,
                    "total_deployments": 1,
                    "unhealthy_count": 1,
                    "problematic_deployments": [{
                        "name": "payment-service",
                        "namespace": namespace,
                        "desired_replicas": 1,
                        "available_replicas": 0,
                        "unavailable_replicas": 1,
                        "issues": ["Available replicas (0) lower than desired (1)"]
                    }]
                },
                "network": {"healthy": True, "total_services": 1, "problematic_services": []}
            }

        elif "image" in scenario_key:
            return {
                "pods": {
                    "healthy": False,
                    "total_pods": 2,
                    "unhealthy_count": 1,
                    "problematic_pods": [{
                        "name": "auth-service-58df86455b-4rt5y",
                        "namespace": namespace,
                        "status": "ImagePullBackOff",
                        "phase": "Pending",
                        "restart_count": 0,
                        "details": ["Container 'auth-api': ImagePullBackOff - Back-off pulling image 'nginx:nonexistent-tag-v999-invalid'"]
                    }]
                },
                "logs": {"collected_count": 0, "pod_logs": {}},
                "events": {
                    "total_events": 4,
                    "warning_events_count": 2,
                    "detected_issues": [
                        {
                            "kind": "Pod",
                            "name": "auth-service-58df86455b-4rt5y",
                            "namespace": namespace,
                            "reason": "Failed",
                            "message": "Failed to pull image 'nginx:nonexistent-tag-v999-invalid': rpc error: code = NotFound",
                            "count": 4
                        },
                        {
                            "kind": "Pod",
                            "name": "auth-service-58df86455b-4rt5y",
                            "namespace": namespace,
                            "reason": "FailedPull",
                            "message": "Error: ErrImagePull",
                            "count": 4
                        }
                    ],
                    "probe_events": []
                },
                "deployments": {
                    "healthy": False,
                    "total_deployments": 1,
                    "unhealthy_count": 1,
                    "problematic_deployments": [{
                        "name": "auth-service",
                        "namespace": namespace,
                        "desired_replicas": 1,
                        "available_replicas": 0,
                        "unavailable_replicas": 1,
                        "issues": ["1 replica(s) currently unavailable"]
                    }]
                },
                "network": {"healthy": True, "total_services": 1, "problematic_services": []}
            }

        elif "oom" in scenario_key:
            return {
                "pods": {
                    "healthy": False,
                    "total_pods": 2,
                    "unhealthy_count": 1,
                    "problematic_pods": [{
                        "name": "analytics-worker-9988ffbc-qw78p",
                        "namespace": namespace,
                        "status": "OOMKilled",
                        "phase": "Running",
                        "restart_count": 4,
                        "details": ["Container 'worker' terminated due to OOMKilled (Exit 137)"]
                    }]
                },
                "logs": {
                    "collected_count": 1,
                    "pod_logs": {
                        f"{namespace}/analytics-worker-9988ffbc-qw78p": {
                            "error_patterns_detected": ["Allocating memory beyond limits... Killed (OOM)"],
                            "recent_log_sample": ["Allocating memory beyond limits... Killed"]
                        }
                    }
                },
                "events": {
                    "total_events": 3,
                    "warning_events_count": 1,
                    "detected_issues": [{
                        "kind": "Pod",
                        "name": "analytics-worker-9988ffbc-qw78p",
                        "namespace": namespace,
                        "reason": "Killing",
                        "message": "Stopping container worker due to Out Of Memory condition",
                        "count": 4
                    }],
                    "probe_events": []
                },
                "deployments": {
                    "healthy": False,
                    "total_deployments": 1,
                    "unhealthy_count": 1,
                    "problematic_deployments": [{
                        "name": "analytics-worker",
                        "namespace": namespace,
                        "desired_replicas": 1,
                        "available_replicas": 0,
                        "unavailable_replicas": 1,
                        "issues": ["Available replicas (0) lower than desired (1)"]
                    }]
                },
                "network": {"healthy": True, "total_services": 1, "problematic_services": []}
            }

        elif "selector" in scenario_key or "service" in scenario_key or "network" in scenario_key:
            return {
                "pods": {
                    "healthy": True,
                    "total_pods": 1,
                    "unhealthy_count": 0,
                    "problematic_pods": []
                },
                "logs": {"collected_count": 0, "pod_logs": {}},
                "events": {"total_events": 2, "warning_events_count": 0, "detected_issues": [], "probe_events": []},
                "deployments": {"healthy": True, "total_deployments": 1, "unhealthy_count": 0, "problematic_deployments": []},
                "network": {
                    "healthy": False,
                    "total_services": 1,
                    "unhealthy_count": 1,
                    "problematic_services": [{
                        "name": "order-service",
                        "namespace": namespace,
                        "type": "ClusterIP",
                        "cluster_ip": "10.96.44.120",
                        "selector": {"app": "order-processor"},
                        "issue": "No ready backend pod endpoints found for service selector (Target pods labeled app: orders-backend)"
                    }]
                }
            }

        # Default fallback scenario
        return {
            "pods": {"healthy": True, "total_pods": 0, "unhealthy_count": 0, "problematic_pods": []},
            "logs": {"collected_count": 0, "pod_logs": {}},
            "events": {"total_events": 0, "warning_events_count": 0, "detected_issues": [], "probe_events": []},
            "deployments": {"healthy": True, "total_deployments": 0, "unhealthy_count": 0, "problematic_deployments": []},
            "network": {"healthy": True, "total_services": 0, "problematic_services": []}
        }
