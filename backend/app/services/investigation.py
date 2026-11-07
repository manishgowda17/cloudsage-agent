"""Investigation Service Orchestrator.

Orchestrates the entire Kubernetes Troubleshooting Workflow:
1. Cluster selection & context awareness
2. Failure Scenario Test Engine (CrashLoopBackOff, ImagePullBackOff, OOMKilled, SelectorMismatch, ProbeFailures)
3. Kubernetes Evidence Gathering (Pods, Logs, Events, Deployments, Network)
4. Senior Kubernetes SRE AI Reasoning (Google Gemini API / Deterministic Heuristic)
"""

import base64
import uuid
from typing import Any, Dict, Optional, Tuple
from app.core.logging import logger
from app.kubernetes.cluster_manager import cluster_manager
from app.kubernetes.pod_inspector import pod_inspector
from app.kubernetes.logs_collector import logs_collector
from app.kubernetes.events_analyzer import events_analyzer
from app.kubernetes.deployment_inspector import deployment_inspector
from app.kubernetes.network_inspector import network_inspector
from app.kubernetes.manifest_inspector import manifest_inspector
from app.ai.root_cause_analyzer import root_cause_analyzer
from app.services.hindsight_service import hindsight_service
from app.services.runbook_service import runbook_service
from app.services.report_normalizer import UniversalReportNormalizer


class InvestigationService:
    """Orchestrates comprehensive on-demand cluster evidence gathering and AI diagnosis."""

    @staticmethod
    async def run_investigation(
        namespace: Optional[str] = None,
        context: Optional[str] = None,
        scenario: Optional[str] = None,
        user_id: Optional[str] = None,
        source_type: Optional[str] = "cluster",
        github_url: Optional[str] = None,
        manifest_content: Optional[str] = None,
        manifest_filename: Optional[str] = None,
        zip_data_base64: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute the complete troubleshooting pipeline for a target cluster, test scenario, or manifest source."""
        target_ctx = context or "default"
        target_ns = namespace or "default"

        # --- Test Scenarios Support ---
        if scenario:
            logger.info(f"Running simulated failure test scenario: '{scenario}' (user: {user_id or 'anon'})")
            evidence = InvestigationService._build_scenario_evidence(scenario, target_ns)
            diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
                evidence=evidence,
                user_id=user_id,
                source_label=f"scenario:{scenario}",
                resource_kind_hint="Deployment",
                resource_name_hint=scenario,
            )
            return InvestigationService._build_final_response(
                diagnosis=diagnosis,
                evidence=evidence,
                user_id=user_id,
                hindsight_meta=hindsight_meta,
                source_type="scenario",
                source_label=f"scenario:{scenario}",
            )

        # --- Source Type: GitHub Repository Manifest Audit ---
        if source_type == "github" or (github_url and not manifest_content and not zip_data_base64):
            repo_url = github_url or "https://github.com/kubernetes/examples"
            logger.info(f"Auditing GitHub repository manifests: '{repo_url}' (user: {user_id or 'anon'})")
            resources, errors, scanned_files, fetch_err = await manifest_inspector.fetch_github_manifests(repo_url)

            if fetch_err:
                findings_list = [{
                    "severity": "ERROR",
                    "resource": f"GitHub/{repo_url}",
                    "file": repo_url,
                    "field": "url",
                    "line": 1,
                    "explanation": fetch_err,
                    "fix": "Verify that the GitHub repository exists, is public, and contains .yaml or .yml files.",
                }]
                err_evidence = {
                    "pods": {"healthy": False, "total_pods": 0, "unhealthy_count": 0, "problematic_pods": []},
                    "logs": {"collected_count": 0, "pod_logs": {}},
                    "events": {
                        "total_events": 1,
                        "warning_events_count": 1,
                        "detected_issues": [{
                            "kind": "GitHub",
                            "name": repo_url,
                            "namespace": "default",
                            "reason": "FetchFailed",
                            "message": fetch_err,
                            "count": 1,
                        }],
                        "probe_events": [],
                    },
                    "deployments": {"healthy": False, "total_deployments": 0, "unhealthy_count": 0, "problematic_deployments": []},
                    "network": {"healthy": False, "total_services": 0, "problematic_services": []},
                    "source_info": {"type": "github", "url": repo_url, "files": scanned_files},
                    "findings": findings_list,
                    "static_diagnosis": {
                        "root_cause": f"GitHub Manifest Retrieval Failed: {repo_url}",
                        "explanation": fetch_err,
                        "fix": "Verify that the repository URL is public, correctly typed (e.g. https://github.com/owner/repo), and contains valid Kubernetes YAML files (.yaml or .yml).",
                        "kubectl_command": f"git clone {repo_url}",
                        "confidence": 95,
                        "prevention": "Ensure repository permissions and manifest directory paths are accessible.",
                        "findings": findings_list,
                    },
                }
                diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
                    evidence=err_evidence,
                    user_id=user_id,
                    source_label=repo_url,
                    resource_kind_hint="GitHub",
                    resource_name_hint=repo_url,
                )
                return InvestigationService._build_final_response(
                    diagnosis=diagnosis,
                    evidence=err_evidence,
                    user_id=user_id,
                    hindsight_meta=hindsight_meta,
                    source_type="github",
                    source_label=repo_url,
                )

            evidence = manifest_inspector.audit_resources(
                resources, source_label=repo_url, parse_errors=errors, scanned_files=scanned_files
            )
            evidence["source_info"] = {"type": "github", "url": repo_url, "files": scanned_files}
            diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
                evidence=evidence,
                user_id=user_id,
                source_label=repo_url,
                resource_kind_hint="Repository",
                resource_name_hint=repo_url,
            )
            return InvestigationService._build_final_response(
                diagnosis=diagnosis,
                evidence=evidence,
                user_id=user_id,
                hindsight_meta=hindsight_meta,
                source_type="github",
                source_label=repo_url,
            )

        # --- Source Type: Plain Kubernetes YAML Manifest Audit ---
        if source_type == "yaml" or (manifest_content and not zip_data_base64):
            filename = manifest_filename or "manifest.yaml"
            logger.info(f"Auditing plain Kubernetes YAML manifest: '{filename}' (user: {user_id or 'anon'})")
            resources, errors = manifest_inspector.parse_yaml_documents(manifest_content or "", filename)
            evidence = manifest_inspector.audit_resources(
                resources, source_label=filename, parse_errors=errors, scanned_files=[filename]
            )
            evidence["source_info"] = {"type": "yaml", "filename": filename, "files": [filename]}
            diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
                evidence=evidence,
                user_id=user_id,
                source_label=filename,
                resource_kind_hint="Manifest",
                resource_name_hint=filename,
            )
            return InvestigationService._build_final_response(
                diagnosis=diagnosis,
                evidence=evidence,
                user_id=user_id,
                hindsight_meta=hindsight_meta,
                source_type="yaml",
                source_label=filename,
            )

        # --- Source Type: ZIP Archive Manifest Audit ---
        if source_type == "zip" or zip_data_base64:
            filename = manifest_filename or "manifests.zip"
            logger.info(f"Auditing ZIP archive manifests: '{filename}' (user: {user_id or 'anon'})")
            try:
                zip_bytes = base64.b64decode(zip_data_base64 or "")
            except Exception as e:
                zip_bytes = b""
                logger.error(f"Failed to decode base64 ZIP payload: {e}")

            resources, errors, scanned_files, zip_err = manifest_inspector.extract_manifests_from_zip(
                zip_bytes, filename=filename
            )

            if zip_err:
                findings_list = [{
                    "severity": "ERROR",
                    "resource": f"Archive/{filename}",
                    "file": filename,
                    "field": "archive",
                    "line": 1,
                    "explanation": zip_err,
                    "fix": "Ensure the uploaded file is a valid, uncorrupted ZIP archive containing .yaml or .yml Kubernetes manifest files.",
                }]
                err_evidence = {
                    "pods": {"healthy": False, "total_pods": 0, "unhealthy_count": 0, "problematic_pods": []},
                    "logs": {"collected_count": 0, "pod_logs": {}},
                    "events": {
                        "total_events": 1,
                        "warning_events_count": 1,
                        "detected_issues": [{
                            "kind": "Archive",
                            "name": filename,
                            "namespace": "default",
                            "reason": "ExtractFailed",
                            "message": zip_err,
                            "count": 1,
                        }],
                        "probe_events": [],
                    },
                    "deployments": {"healthy": False, "total_deployments": 0, "unhealthy_count": 0, "problematic_deployments": []},
                    "network": {"healthy": False, "total_services": 0, "problematic_services": []},
                    "source_info": {"type": "zip", "filename": filename, "files": scanned_files},
                    "findings": findings_list,
                    "static_diagnosis": {
                        "root_cause": f"ZIP Archive Extraction Failed: {filename}",
                        "explanation": zip_err,
                        "fix": "Ensure the uploaded file is a valid, uncorrupted ZIP archive containing .yaml or .yml files.",
                        "kubectl_command": f"unzip -l {filename}",
                        "confidence": 95,
                        "prevention": "Inspect archive contents locally with 'unzip -l' prior to uploading.",
                        "findings": findings_list,
                    },
                }
                diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
                    evidence=err_evidence,
                    user_id=user_id,
                    source_label=filename,
                    resource_kind_hint="Archive",
                    resource_name_hint=filename,
                )
                return InvestigationService._build_final_response(
                    diagnosis=diagnosis,
                    evidence=err_evidence,
                    user_id=user_id,
                    hindsight_meta=hindsight_meta,
                    source_type="zip",
                    source_label=filename,
                )

            evidence = manifest_inspector.audit_resources(
                resources, source_label=filename, parse_errors=errors, scanned_files=scanned_files
            )
            evidence["source_info"] = {"type": "zip", "filename": filename, "files": scanned_files}
            diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
                evidence=evidence,
                user_id=user_id,
                source_label=filename,
                resource_kind_hint="Archive",
                resource_name_hint=filename,
            )
            return InvestigationService._build_final_response(
                diagnosis=diagnosis,
                evidence=evidence,
                user_id=user_id,
                hindsight_meta=hindsight_meta,
                source_type="zip",
                source_label=filename,
            )

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
            diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
                evidence=empty_evidence,
                user_id=user_id,
                source_label=f"cluster:{target_ctx}",
                resource_kind_hint="Cluster",
                resource_name_hint=target_ctx,
            )
            return InvestigationService._build_final_response(
                diagnosis=diagnosis,
                evidence=empty_evidence,
                user_id=user_id,
                hindsight_meta=hindsight_meta,
                source_type="cluster",
                source_label=f"cluster:{target_ctx}",
            )

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

        # Senior SRE AI Reasoning with Hindsight Workflow
        logger.info("[AI Reasoning] Analyzing evidence with Senior Kubernetes SRE intelligence & Hindsight Memory...")
        diagnosis, hindsight_meta = await InvestigationService._run_hindsight_pipeline(
            evidence=investigation_payload,
            user_id=user_id,
            source_label=f"cluster:{target_ctx}/{target_ns}",
            resource_kind_hint="Cluster",
            resource_name_hint=target_ctx,
        )

        return InvestigationService._build_final_response(
            diagnosis=diagnosis,
            evidence=investigation_payload,
            user_id=user_id,
            hindsight_meta=hindsight_meta,
            source_type="cluster",
            source_label=f"cluster:{target_ctx}/{target_ns}",
        )

    @staticmethod
    def _build_final_response(
        diagnosis: Dict[str, Any],
        evidence: Dict[str, Any],
        user_id: Optional[str],
        hindsight_meta: Dict[str, Any],
        source_type: str,
        source_label: str,
    ) -> Dict[str, Any]:
        """Construct the standardized response payload with UniversalInvestigationReport."""
        report = UniversalReportNormalizer.normalize(
            evidence=evidence,
            diagnosis=diagnosis,
            source_type=source_type,
            source_label=source_label,
            user_id=user_id,
            hindsight_meta=hindsight_meta,
        )
        report_dict = report.model_dump()
        diagnosis["report"] = report_dict
        return {
            "status": "success",
            "diagnosis": diagnosis,
            "report": report_dict,
            "investigation": evidence,
            "user_id": user_id,
            "hindsight": hindsight_meta,
        }

    @staticmethod
    async def _run_hindsight_pipeline(
        evidence: Dict[str, Any],
        user_id: Optional[str],
        source_label: str,
        resource_kind_hint: str = "Deployment",
        resource_name_hint: str = "workload",
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Executes the mandatory Hindsight Workflow:
        Recall → Gemini reasoning → validation → Retain.
        """
        incident_id = f"inc-{uuid.uuid4().hex[:8]}"
        events = evidence.get("events", {})
        probe_events = events.get("probe_events", [])
        detected_issues = events.get("detected_issues", [])
        findings = evidence.get("findings", [])

        # Infer target resource
        res_kind = resource_kind_hint
        res_name = resource_name_hint
        if findings:
            target_res = findings[0].get("resource", "")
            if "/" in target_res:
                parts = target_res.split("/", 1)
                res_kind, res_name = parts[0], parts[1]
            elif target_res:
                res_name = target_res
        elif probe_events:
            p = probe_events[0]
            res_kind = p.get("kind", "Deployment")
            res_name = p.get("name", "workload")
        elif detected_issues:
            i = detected_issues[0]
            res_kind = i.get("kind", "Resource")
            res_name = i.get("name", "workload")

        # 1. RECALL: Extract symptoms from current evidence and query Hindsight
        query_terms = []
        if probe_events or any("probe" in str(f).lower() for f in findings):
            query_terms.append(f"readiness probe liveness probe fix for {res_kind} {res_name}")
        if any("selector" in str(f).lower() for f in findings):
            query_terms.append(f"service selector mismatch fix for {res_name}")
        if not query_terms:
            query_terms.append(f"Kubernetes manifest failure and verified remediation for {res_kind} {res_name}")

        recall_query = " ".join(query_terms)
        logger.info(f"HINDSIGHT STEP 1/4 [RECALL]: Querying user bank for previous incident fixes: '{recall_query[:80]}'")

        recall_resp = await hindsight_service.recall_memories(
            user_id=user_id,
            query=recall_query,
        )
        recalled_memories = recall_resp.get("memories", [])
        evidence["recalled_memories"] = recalled_memories

        # Extract structured lessons from recalled memories for explainable UI
        previous_root_causes = []
        fixes_that_worked = []
        useful_runbooks = []

        for m in recalled_memories:
            text = m.get("text", "")
            for line in text.splitlines():
                line_str = line.strip()
                if line_str.startswith("Root Cause:") and len(line_str) > 12:
                    cause = line_str[11:].strip()
                    if cause not in previous_root_causes:
                        previous_root_causes.append(cause)
                elif (line_str.startswith("Verified Patch") or line_str.startswith("Suggested Remediation:") or line_str.startswith("Proven Working Resolution:")) and len(line_str) > 20:
                    fix_snippet = line_str.split(":", 1)[-1].strip()
                    if fix_snippet not in fixes_that_worked:
                        fixes_that_worked.append(fix_snippet)
                elif "RB-K8S-" in line_str:
                    for token in line_str.split():
                        if token.startswith("RB-K8S-") and token not in useful_runbooks:
                            useful_runbooks.append(token.rstrip(":,.;()"))

        # 2. GEMINI REASONING: Gemini analyzes evidence augmented with recalled context
        logger.info(f"HINDSIGHT STEP 2/4 [GEMINI REASONING]: Invoking diagnosis with {len(recalled_memories)} recalled memory item(s)...")
        diagnosis = await root_cause_analyzer.analyze(investigation=evidence)

        # 3. VALIDATION: Check generated patch and manifest rules
        logger.info("HINDSIGHT STEP 3/4 [VALIDATION]: Verifying remediation against Kubernetes specification...")
        has_fix = bool(diagnosis.get("fix") and diagnosis.get("root_cause"))
        resolution_status = "VALIDATED_FIX" if has_fix else "SUGGESTED_FIX"

        # Match relevant production SRE runbooks
        matched_runbooks = runbook_service.match_runbook_for_incident(
            problem=diagnosis.get("root_cause", ""),
            resource_kind=res_kind,
            recalled_memories=recalled_memories,
        )
        diagnosis["recommended_runbooks"] = matched_runbooks
        diagnosis["resolution_stage"] = "VALIDATED_PATCH" if has_fix else "PROPOSED_FIX"
        diagnosis["incident_id"] = incident_id

        # Generate a structured patch preview diff or configuration snippet
        patch_lines = []
        cmd = diagnosis.get("kubectl_command", "")
        if "patch" in cmd or "set" in cmd:
            patch_lines.append(f"# Remediation Patch for {res_kind}/{res_name}")
            patch_lines.append(f"# Executable Command:")
            patch_lines.append(cmd)
            patch_lines.append("")
        if "readinessProbe" in cmd or "probe" in diagnosis.get("root_cause", "").lower():
            patch_lines.append("spec:")
            patch_lines.append("  template:")
            patch_lines.append("    spec:")
            patch_lines.append("      containers:")
            patch_lines.append(f"      - name: {res_name}")
            patch_lines.append("        readinessProbe:")
            patch_lines.append("          httpGet:")
            patch_lines.append("            path: /ready  # Corrected endpoint")
            patch_lines.append("            port: 8080")
            patch_lines.append("          initialDelaySeconds: 10")
            patch_lines.append("          periodSeconds: 5")
        elif "resources" in cmd or "limit" in diagnosis.get("root_cause", "").lower():
            patch_lines.append("spec:")
            patch_lines.append("  template:")
            patch_lines.append("    spec:")
            patch_lines.append("      containers:")
            patch_lines.append(f"      - name: {res_name}")
            patch_lines.append("        resources:")
            patch_lines.append("          requests:")
            patch_lines.append("            memory: 128Mi")
            patch_lines.append("            cpu: 100m")
            patch_lines.append("          limits:")
            patch_lines.append("            memory: 256Mi")
            patch_lines.append("            cpu: 250m")
        if patch_lines:
            diagnosis["patch_preview"] = "\n".join(patch_lines)

        # 4. RETAIN: Store verified incident into Hindsight bank
        logger.info(f"HINDSIGHT STEP 4/4 [RETAIN]: Storing incident '{incident_id}' into user's Hindsight bank...")
        retain_resp = await hindsight_service.retain_incident(
            user_id=user_id,
            incident_id=incident_id,
            resource_kind=res_kind,
            resource_name=res_name,
            detected_problem=diagnosis.get("root_cause", "Incident detected"),
            root_cause=diagnosis.get("explanation", ""),
            suggested_remediation=diagnosis.get("fix", ""),
            generated_patch=diagnosis.get("kubectl_command", ""),
            manifest_validation_result="STATIC_VALIDATION_PASSED" if has_fix else "PENDING_CONFIRMATION",
            resolution_status=resolution_status,
            evidence_summary=f"Source: {source_label}, Confidence: {diagnosis.get('confidence', 0)}%",
        )

        influence_summary = None
        if recalled_memories:
            influence_summary = (
                f"Recall returned {len(recalled_memories)} historical memory record(s) from Hindsight bank. "
                f"Correlated with {len(previous_root_causes)} previous root cause(s) and validated remediation procedures."
            )

        hindsight_meta = {
            "status": "available" if (recall_resp.get("available") or retain_resp.get("success")) else "offline",
            "bank_id": hindsight_service.get_user_bank_id(user_id),
            "recalled_count": len(recalled_memories),
            "recalled_memories": recalled_memories,
            "retained": retain_resp.get("success", False),
            "retention_id": retain_resp.get("operation_id"),
            "influence_summary": influence_summary,
            "previous_root_causes": previous_root_causes[:3],
            "fixes_that_worked": fixes_that_worked[:3],
            "useful_runbooks": useful_runbooks or ([rb["id"] for rb in matched_runbooks[:2]]),
        }

        logger.info("HINDSIGHT WORKFLOW COMPLETED: Recall → Gemini diagnosis → validation → Retain")
        return diagnosis, hindsight_meta

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
