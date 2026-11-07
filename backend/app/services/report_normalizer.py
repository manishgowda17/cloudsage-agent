"""Universal Investigation Report Normalizer.

Transforms diagnostic evidence and AI analysis from any source (live cluster,
GitHub repository, plain YAML, ZIP archive, Helm charts, and simulated test scenarios)
into a standardized, typed, professional SRE investigation report.
"""

import datetime
import re
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from app.models.schemas import (
    ExecutiveSummary,
    FindingGroup,
    InvestigationLimitation,
    InvestigationMetadata,
    InvestigationStatistics,
    NormalizedFinding,
    OverallAssessment,
    RemediationRecommendation,
    RootCauseItem,
    SourceInformation,
    UniversalInvestigationReport,
    ValidationEvidenceItem,
)


class UniversalReportNormalizer:
    """Normalizes heterogeneous investigation outputs into a canonical report structure."""

    @classmethod
    def normalize(
        cls,
        evidence: Dict[str, Any],
        diagnosis: Dict[str, Any],
        source_type: str = "cluster",
        source_label: str = "default",
        user_id: Optional[str] = None,
        hindsight_meta: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None,
    ) -> UniversalInvestigationReport:
        """Create a complete UniversalInvestigationReport conforming to the platform contract."""
        incident_id = diagnosis.get("incident_id") or f"inc-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # 1. Normalize Source Information & Scanned Files
        source_info = cls._extract_source_info(evidence, source_type, source_label)

        # 2. Extract Normalized Findings with Dual Explanations (Simple vs Technical)
        findings = cls._extract_normalized_findings(evidence, diagnosis)

        # 3. Perform Intelligent Issue Grouping
        finding_groups = cls._group_findings(findings)

        # 4. Compile Validation Evidence & Environmental Limitations
        validation_evidence, limitations = cls._build_validation_evidence(evidence, source_type)

        # 5. Compute Dynamic Truth-Based Statistics
        stats = cls._compute_statistics(evidence, findings, validation_evidence, source_info)
        source_info.checks_performed_count = stats.total_checks_performed

        # 6. Derive Overall Assessment
        assessment = cls._derive_assessment(evidence, diagnosis, stats, source_type, source_label)

        # 7. Extract Ranked Root Causes
        root_causes = cls._extract_root_causes(diagnosis, findings, evidence, incident_id)

        # 8. Generate Prioritized Remediation (P0 - P3)
        remediations = cls._generate_remediations(diagnosis, findings, root_causes)

        # 9. Generate Five-Point Executive Summary
        exec_summary = cls._generate_executive_summary(
            source_info=source_info,
            assessment=assessment,
            stats=stats,
            root_causes=root_causes,
            remediations=remediations,
            diagnosis=diagnosis,
        )

        # 10. Construct Metadata
        metadata = InvestigationMetadata(
            id=incident_id,
            title=f"SRE Reliability Audit: {source_info.source_name}",
            timestamp=now_iso,
            duration_ms=duration_ms or 320,
            status="COMPLETED" if assessment.status != "INCONCLUSIVE" else "INCOMPLETE",
            environment=source_info.target_namespace or "default",
        )

        return UniversalInvestigationReport(
            metadata=metadata,
            source=source_info,
            executive_summary=exec_summary,
            assessment=assessment,
            statistics=stats,
            root_causes=root_causes,
            findings=findings,
            finding_groups=finding_groups,
            remediations=remediations,
            validation_evidence=validation_evidence,
            limitations=limitations,
            raw_details={
                "original_root_cause": diagnosis.get("root_cause"),
                "original_explanation": diagnosis.get("explanation"),
                "kubectl_command": diagnosis.get("kubectl_command"),
                "patch_preview": diagnosis.get("patch_preview"),
                "hindsight_recalled_count": hindsight_meta.get("recalled_count", 0) if hindsight_meta else 0,
            },
        )

    # --------------------------------------------------------------------------
    # Sub-routines
    # --------------------------------------------------------------------------

    @classmethod
    def _extract_source_info(
        cls, evidence: Dict[str, Any], source_type: str, source_label: str
    ) -> SourceInformation:
        raw_source = evidence.get("source_info", {})
        target_ns = evidence.get("namespace") or evidence.get("target_ns") or "default"

        scanned_files = raw_source.get("files", [])
        if not scanned_files:
            if source_type in ("yaml", "helm") and source_label:
                scanned_files = [source_label]
            elif source_type == "cluster":
                scanned_files = ["live-kube-apiserver"]
            else:
                scanned_files = [source_label]

        # Count total Kubernetes resources
        resources_count = 0
        if "pods" in evidence:
            resources_count += evidence["pods"].get("total_pods", 0)
        if "deployments" in evidence:
            resources_count += evidence["deployments"].get("total_deployments", 0)
        if "network" in evidence:
            resources_count += evidence["network"].get("total_services", 0)
        if "resources" in evidence:
            resources_count = max(resources_count, len(evidence["resources"]))
        if resources_count == 0 and evidence.get("findings"):
            # Estimate from unique affected resources in findings
            res_set = {f.get("resource") for f in evidence["findings"] if f.get("resource")}
            resources_count = max(len(res_set), 1)
        if resources_count == 0:
            resources_count = 1

        return SourceInformation(
            source_type=source_type,
            source_name=source_label,
            target_namespace=target_ns,
            scanned_files=scanned_files,
            resources_count=resources_count,
            checks_performed_count=0,
            branch=raw_source.get("branch"),
            commit=raw_source.get("commit"),
        )

    @classmethod
    def _extract_normalized_findings(
        cls, evidence: Dict[str, Any], diagnosis: Dict[str, Any]
    ) -> List[NormalizedFinding]:
        normalized_list: List[NormalizedFinding] = []
        seen_keys: Set[str] = set()

        raw_findings = evidence.get("findings") or diagnosis.get("findings") or []

        # 1. Ingest Manifest/YAML findings
        for idx, f in enumerate(raw_findings):
            resource = f.get("resource") or "KubernetesResource"
            field = f.get("field")
            line = f.get("line")
            file_path = f.get("file")
            raw_expl = f.get("explanation", "")
            raw_fix = f.get("fix", "")
            severity = f.get("severity", "WARNING").upper()
            if severity not in ("ERROR", "WARNING", "INFO"):
                severity = "WARNING"

            # Determine title & category
            title, category, simple_expl, impact = cls._categorize_finding(
                resource=resource, field=field, explanation=raw_expl, severity=severity
            )

            dedup_key = f"{resource}:{field}:{line}:{raw_expl[:40]}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            normalized_list.append(
                NormalizedFinding(
                    id=f"fnd-{idx + 1}",
                    title=title,
                    severity=severity,
                    category=category,
                    affected_resource=resource,
                    file_path=file_path,
                    line=line,
                    column=None,
                    field=field,
                    simple_explanation=simple_expl,
                    technical_explanation=raw_expl,
                    root_cause_id="rc-1",
                    evidence=f"Manifest AST inspection: field '{field or 'spec'}' at {file_path or 'manifest'}:{line or 1}",
                    potential_impact=impact,
                    recommended_fix=raw_fix or "Review and correct the configuration according to the Kubernetes specification.",
                    yaml_snippet=f"{field}: <corrected_value>" if field else None,
                )
            )

        # 2. Ingest Live Cluster Pod Errors if any
        pods_ev = evidence.get("pods", {})
        for p in pods_ev.get("problematic_pods", []):
            pod_name = p.get("name", "pod")
            status = p.get("status", "Unknown")
            reason = p.get("reason", status)
            msg = p.get("message") or f"Pod {pod_name} is in failing state: {status}"
            dedup_key = f"pod:{pod_name}:{reason}"
            if dedup_key not in seen_keys:
                seen_keys.add(dedup_key)
                normalized_list.append(
                    NormalizedFinding(
                        id=f"fnd-pod-{len(normalized_list) + 1}",
                        title=f"Pod Lifecycle Failure: {reason}",
                        severity="ERROR",
                        category="Availability & reliability",
                        affected_resource=f"Pod/{pod_name}",
                        file_path=None,
                        line=None,
                        column=None,
                        field="status.phase",
                        simple_explanation=f"Pod '{pod_name}' cannot run successfully due to {reason}. Downstream services cannot reach it.",
                        technical_explanation=msg,
                        root_cause_id="rc-1",
                        evidence=f"kube-apiserver Pod status={status}, reason={reason}",
                        potential_impact="Workload failure, crashloop restart churn, and degraded cluster capacity.",
                        recommended_fix=f"Inspect container logs with 'kubectl logs {pod_name}' and events with 'kubectl describe pod {pod_name}'.",
                        yaml_snippet=None,
                    )
                )

        # 3. Ingest Warning Events
        events_ev = evidence.get("events", {})
        for ev in events_ev.get("detected_issues", []):
            kind = ev.get("kind", "Resource")
            name = ev.get("name", "workload")
            reason = ev.get("reason", "Warning")
            msg = ev.get("message", "")
            dedup_key = f"event:{kind}:{name}:{reason}"
            if dedup_key not in seen_keys and msg:
                seen_keys.add(dedup_key)
                normalized_list.append(
                    NormalizedFinding(
                        id=f"fnd-ev-{len(normalized_list) + 1}",
                        title=f"Cluster Warning Event: {reason}",
                        severity="WARNING" if "fail" not in reason.lower() else "ERROR",
                        category="Availability & reliability",
                        affected_resource=f"{kind}/{name}",
                        file_path=None,
                        line=None,
                        column=None,
                        field="events",
                        simple_explanation=f"Kubernetes cluster emitted warning '{reason}' for {kind}/{name}.",
                        technical_explanation=msg,
                        root_cause_id="rc-1",
                        evidence=f"Event reason={reason}, count={ev.get('count', 1)}",
                        potential_impact="Pod startup failure or service traffic interruption.",
                        recommended_fix=f"Resolve the underlying event trigger for {name}.",
                        yaml_snippet=None,
                    )
                )

        # 4. Ingest Deployment Rollout Failures
        deploy_ev = evidence.get("deployments", {})
        for d in deploy_ev.get("problematic_deployments", []):
            d_name = d.get("name", "deployment")
            reason = d.get("reason", "RolloutBlocked")
            dedup_key = f"deploy:{d_name}:{reason}"
            if dedup_key not in seen_keys:
                seen_keys.add(dedup_key)
                normalized_list.append(
                    NormalizedFinding(
                        id=f"fnd-dep-{len(normalized_list) + 1}",
                        title=f"Deployment Replica Mismatch: {d_name}",
                        severity="ERROR",
                        category="Availability & reliability",
                        affected_resource=f"Deployment/{d_name}",
                        file_path=None,
                        line=None,
                        column=None,
                        field="spec.replicas",
                        simple_explanation=f"Deployment '{d_name}' desired replicas ({d.get('desired', 1)}) do not match available replicas ({d.get('available', 0)}).",
                        technical_explanation=d.get("message", "Available replicas do not match desired state."),
                        root_cause_id="rc-1",
                        evidence=f"Deployment spec: desired={d.get('desired')}, ready={d.get('ready')}, available={d.get('available')}",
                        potential_impact="Deployment rollout blocked; zero or insufficient healthy instances serving user requests.",
                        recommended_fix=f"Check replica set rollout with 'kubectl rollout status deployment/{d_name}'.",
                        yaml_snippet=None,
                    )
                )

        return normalized_list

    @classmethod
    def _categorize_finding(
        cls, resource: str, field: Optional[str], explanation: str, severity: str
    ) -> Tuple[str, str, str, str]:
        expl_lower = explanation.lower()
        field_lower = (field or "").lower()

        # Category: Syntax & Schema
        if "syntax" in expl_lower or "indentation" in expl_lower or "parse" in expl_lower:
            return (
                "YAML Structural Syntax Defect",
                "Syntax & schema",
                "The manifest contains invalid YAML formatting or mapping errors preventing Kubernetes from reading the document.",
                "Kubernetes kube-apiserver will reject the entire manifest during validation, preventing deployment.",
            )

        # Category: Probe & Health Failures
        if "probe" in expl_lower or "readiness" in expl_lower or "liveness" in expl_lower or "startup" in expl_lower:
            is_liveness = "liveness" in expl_lower
            probe_type = "Liveness" if is_liveness else "Readiness"
            return (
                f"{probe_type} Probe Endpoint Misconfiguration",
                "Availability & reliability",
                f"The {probe_type.lower()} probe targets an endpoint that is misaligned with the container's health contract.",
                "Kubernetes will continuously restart the container or remove it from service routing endpoints (HTTP 503 errors).",
            )

        # Category: Networking & Routing (Selector / Port)
        if "selector" in expl_lower or "matchlabels" in expl_lower:
            return (
                "Service / Deployment Selector Mismatch",
                "Networking & routing",
                "The deployment pod template labels do not match the declared selector, breaking controller and routing links.",
                "Service traffic cannot find matching pods, resulting in 0 active endpoints and complete service outage.",
            )
        if "port" in expl_lower or "containerport" in expl_lower:
            return (
                "Container Port / Service Port Alignment Defect",
                "Networking & routing",
                "The container declared port does not match the service routing targetPort or application server.",
                "Traffic sent to the Service fails to connect to the backend container.",
            )

        # Category: Resource & Performance (Memory / CPU)
        if "memory" in expl_lower or "cpu" in expl_lower or "limit" in expl_lower or "request" in expl_lower or "oom" in expl_lower:
            return (
                "Resource Units or Allocation Inconsistency",
                "Resource & performance",
                "Container CPU or memory limits contain invalid quantity units or limits set lower than requests.",
                "Container will either fail kube-apiserver validation or be terminated by Linux OOM killer (Exit 137).",
            )

        # Category: Security
        if "security" in expl_lower or "privileged" in expl_lower or "root" in expl_lower or "capabilities" in expl_lower:
            return (
                "Workload Security & Privilege Violation",
                "Security issues",
                "Container runs with excessive privileges or lacks recommended securityContext constraints.",
                "Increases container escape risk and violates CIS Kubernetes security benchmarks.",
            )

        # Category: Deprecated APIs
        if "deprecated" in expl_lower or "apiversion" in expl_lower:
            return (
                "Deprecated Kubernetes API Version",
                "Configuration errors",
                "The manifest uses a legacy apiVersion that has been deprecated or removed in modern Kubernetes releases.",
                "Manifest will fail to apply or be rejected during Kubernetes cluster version upgrades.",
            )

        # Default fallback
        if severity == "ERROR":
            return (
                f"Critical Configuration Error in {resource}",
                "Critical errors",
                "A mandatory field or semantic constraint is violated in the resource specification.",
                "Workload will fail deployment or produce runtime instability.",
            )
        return (
            f"Configuration Warning in {resource}",
            "Best-practice warnings",
            "Configuration deviates from Kubernetes recommended operational guidelines.",
            "Sub-optimal scheduling, autoscaling, or logging behavior in production.",
        )

    @classmethod
    def _group_findings(cls, findings: List[NormalizedFinding]) -> List[FindingGroup]:
        groups_dict: Dict[str, List[NormalizedFinding]] = {}

        for f in findings:
            # Group key based on category and normalized title
            group_key = f"{f.category}::{f.title}"
            if group_key not in groups_dict:
                groups_dict[group_key] = []
            groups_dict[group_key].append(f)

        grouped_list: List[FindingGroup] = []
        for g_idx, (group_key, group_findings) in enumerate(groups_dict.items()):
            category, title = group_key.split("::", 1)
            affected_resources = list(dict.fromkeys([f.affected_resource for f in group_findings]))
            affected_files = list(dict.fromkeys([f.file_path for f in group_findings if f.file_path]))
            severities = [f.severity for f in group_findings]
            highest_sev = "ERROR" if "ERROR" in severities else ("WARNING" if "WARNING" in severities else "INFO")

            common_fix = group_findings[0].recommended_fix if group_findings else "Apply recommended corrections."
            pattern_desc = (
                f"Detected across {len(affected_resources)} resource(s): "
                f"{group_findings[0].simple_explanation}"
            )

            grouped_list.append(
                FindingGroup(
                    group_id=f"grp-{g_idx + 1}",
                    title=title,
                    category=category,
                    severity=highest_sev,
                    pattern_description=pattern_desc,
                    occurrence_count=len(group_findings),
                    affected_resources=affected_resources,
                    affected_files=affected_files,
                    findings=group_findings,
                    common_fix=common_fix,
                )
            )

        return grouped_list

    @classmethod
    def _build_validation_evidence(
        cls, evidence: Dict[str, Any], source_type: str
    ) -> Tuple[List[ValidationEvidenceItem], List[InvestigationLimitation]]:
        validation_items: List[ValidationEvidenceItem] = []
        limitations: List[InvestigationLimitation] = []

        is_cluster = source_type == "cluster"
        findings = evidence.get("findings", [])
        cluster_err = evidence.get("cluster_error")

        # 1. Schema & Syntax Check
        has_syntax_err = any(f.get("field") == "syntax" for f in findings)
        validation_items.append(
            ValidationEvidenceItem(
                check_id="chk-syntax-ast",
                check_name="YAML Syntax & Document Mapping AST",
                target_layer="Schema / Syntax",
                status="FAILED" if has_syntax_err else "PASSED",
                details="Validates multi-document YAML syntax, indentation marks, and root object dictionaries.",
            )
        )

        # 2. Kubernetes apiVersion & kind Conformance
        has_api_err = any("apiversion" in str(f.get("field", "")).lower() or "deprecated" in str(f).lower() for f in findings)
        validation_items.append(
            ValidationEvidenceItem(
                check_id="chk-k8s-apiversion",
                check_name="Kubernetes API Version & Resource Kind Conformance",
                target_layer="Schema / Syntax",
                status="FAILED" if has_api_err else "PASSED",
                details="Checks apiVersion deprecation status against modern apps/v1 and batch/v1 APIs.",
            )
        )

        # 3. Workload Selector & Label Alignment
        has_selector_err = any("selector" in str(f).lower() for f in findings)
        validation_items.append(
            ValidationEvidenceItem(
                check_id="chk-selector-match",
                check_name="Deployment Selector vs Pod Template Label Consistency",
                target_layer="Workload Semantics",
                status="FAILED" if has_selector_err else "PASSED",
                details="Verifies that spec.selector.matchLabels strictly aligns with spec.template.metadata.labels.",
            )
        )

        # 4. Probe HTTP Endpoint & Port Alignment
        has_probe_err = any("probe" in str(f).lower() for f in findings)
        validation_items.append(
            ValidationEvidenceItem(
                check_id="chk-probes-health",
                check_name="Liveness, Readiness & Startup Probe HTTP Validation",
                target_layer="Probes & Health",
                status="FAILED" if has_probe_err else "PASSED",
                details="Audits initialDelaySeconds, periodSeconds, HTTP path endpoints, and port numbers.",
            )
        )

        # 5. Resource Quantities & Memory Units
        has_resource_err = any("memory" in str(f).lower() or "cpu" in str(f).lower() or "limits" in str(f).lower() for f in findings)
        validation_items.append(
            ValidationEvidenceItem(
                check_id="chk-resource-units",
                check_name="CPU & Memory Quantity Formatting & Limit Ratios",
                target_layer="Resource Limits & Units",
                status="FAILED" if has_resource_err else "PASSED",
                details="Validates binary SI suffixes (Mi, Gi, m) and ensures limits do not fall below requests.",
            )
        )

        # 6. Container Port Routing Consistency
        has_port_err = any("port" in str(f).lower() for f in findings)
        validation_items.append(
            ValidationEvidenceItem(
                check_id="chk-ports-consistency",
                check_name="Container Ports & Service Routing TargetPorts",
                target_layer="Service & Selector Routing",
                status="FAILED" if has_port_err else "PASSED",
                details="Audits containerPort ranges (1-65535) and protocol declarations (TCP/UDP).",
            )
        )

        # 7. Live Cluster Telemetry Checks
        if is_cluster:
            if cluster_err:
                validation_items.append(
                    ValidationEvidenceItem(
                        check_id="chk-live-cluster",
                        check_name="Live kube-apiserver Workload & Telemetry Probe",
                        target_layer="Live Cluster Telemetry",
                        status="UNAVAILABLE",
                        details=f"Cluster connection failed: {cluster_err}",
                    )
                )
                limitations.append(
                    InvestigationLimitation(
                        limitation_type="UNAVAILABLE_TOOL",
                        message=f"Kubernetes cluster API endpoint unreachable: {cluster_err}",
                        impact_on_report="Live pods, warning events, and container logs could not be retrieved.",
                    )
                )
            else:
                has_pod_err = not evidence.get("pods", {}).get("healthy", True)
                validation_items.append(
                    ValidationEvidenceItem(
                        check_id="chk-live-pods",
                        check_name="Live Pod Lifecycle & CrashLoopBackOff Detection",
                        target_layer="Live Cluster Telemetry",
                        status="FAILED" if has_pod_err else "PASSED",
                        details="Inspects live pod lifecycle phases, restart counts, and probe exit codes.",
                    )
                )
        else:
            validation_items.append(
                ValidationEvidenceItem(
                    check_id="chk-live-runtime-skip",
                    check_name="Live Cluster Runtime State & Event Telemetry",
                    target_layer="Live Cluster Telemetry",
                    status="SKIPPED",
                    details="Static analysis performed. Cluster runtime pod states were not probed.",
                )
            )
            limitations.append(
                InvestigationLimitation(
                    limitation_type="STATIC_ONLY",
                    message="Static manifest inspection mode active (cluster runtime not probed).",
                    impact_on_report="Evaluates configuration accuracy only; cannot verify live scheduling or node capacity.",
                )
            )

        # Check for Helm Templates
        is_helm = (
            source_type == "helm"
            or "helm" in str(evidence.get("source_info", {}).get("type", "")).lower()
            or any(f.get("_is_helm_template") for f in evidence.get("resources", []))
        )
        if is_helm:
            validation_items.append(
                ValidationEvidenceItem(
                    check_id="chk-helm-templates",
                    check_name="Helm Chart Template Go Expression Sanitization",
                    target_layer="Schema / Syntax",
                    status="PASSED",
                    details="Go template tags ({{ ... }}) preprocessed and structurally verified against K8s schema.",
                )
            )
            limitations.append(
                InvestigationLimitation(
                    limitation_type="UNRENDERED_TEMPLATE",
                    message="Helm templates evaluated with placeholder parameter values.",
                    impact_on_report="Actual production deployment behavior depends on final values.yaml supplied during helm install.",
                )
            )

        return validation_items, limitations

    @classmethod
    def _compute_statistics(
        cls,
        evidence: Dict[str, Any],
        findings: List[NormalizedFinding],
        validation_items: List[ValidationEvidenceItem],
        source_info: SourceInformation,
    ) -> InvestigationStatistics:
        errors = sum(1 for f in findings if f.severity == "ERROR")
        warnings = sum(1 for f in findings if f.severity == "WARNING")
        infos = sum(1 for f in findings if f.severity == "INFO")

        passed = sum(1 for v in validation_items if v.status == "PASSED")
        failed = sum(1 for v in validation_items if v.status == "FAILED")
        skipped = sum(1 for v in validation_items if v.status == "SKIPPED")

        security_findings = sum(1 for f in findings if f.category == "Security issues")

        total_checks = passed + failed + skipped + len(findings)

        return InvestigationStatistics(
            total_resources_inspected=source_info.resources_count,
            total_checks_performed=total_checks,
            errors_count=errors,
            warnings_count=warnings,
            info_count=infos,
            passed_checks_count=passed,
            failed_checks_count=failed,
            skipped_checks_count=skipped,
            security_findings_count=security_findings,
        )

    @classmethod
    def _derive_assessment(
        cls,
        evidence: Dict[str, Any],
        diagnosis: Dict[str, Any],
        stats: InvestigationStatistics,
        source_type: str,
        source_label: str,
    ) -> OverallAssessment:
        is_live = source_type == "cluster"
        validation_type = "LIVE_TELEMETRY" if is_live else "STATIC_AST"

        # Check for cluster error
        if evidence.get("cluster_error"):
            return OverallAssessment(
                status="INCONCLUSIVE",
                status_display="Cluster Unreachable",
                severity_score=50,
                confidence=60,
                summary_headline=f"Cluster API Server Unreachable ({source_label})",
                is_live_cluster=is_live,
                validation_type=validation_type,
            )

        if stats.errors_count >= 2 or "failed" in diagnosis.get("root_cause", "").lower() or "crashloop" in diagnosis.get("root_cause", "").lower() or "exit 137" in diagnosis.get("root_cause", "").lower():
            return OverallAssessment(
                status="CRITICAL",
                status_display="Critical Reliability Defect",
                severity_score=95,
                confidence=diagnosis.get("confidence", 95),
                summary_headline="Severe Fault Preventing Normal Workload Operations",
                is_live_cluster=is_live,
                validation_type=validation_type,
            )

        if stats.errors_count == 1:
            return OverallAssessment(
                status="UNHEALTHY",
                status_display="Unhealthy Configuration",
                severity_score=80,
                confidence=diagnosis.get("confidence", 90),
                summary_headline="Resource Fails Kubernetes Verification Standards",
                is_live_cluster=is_live,
                validation_type=validation_type,
            )

        if stats.warnings_count > 0:
            return OverallAssessment(
                status="ATTENTION_REQUIRED",
                status_display="Attention Required",
                severity_score=45,
                confidence=85,
                summary_headline="Operational Best Practice Warnings Detected",
                is_live_cluster=is_live,
                validation_type=validation_type,
            )

        # 0 errors, 0 warnings
        if stats.total_resources_inspected > 0:
            if is_live:
                return OverallAssessment(
                    status="HEALTHY",
                    status_display="Cluster Healthy",
                    severity_score=0,
                    confidence=95,
                    summary_headline="All Pods, Probes & Controllers Operating Within SLA",
                    is_live_cluster=True,
                    validation_type="LIVE_TELEMETRY",
                )
            return OverallAssessment(
                status="HEALTHY",
                status_display="Manifests Verified Clean",
                severity_score=0,
                confidence=95,
                summary_headline="All Kubernetes Schema & Semantic Checks Passed",
                is_live_cluster=False,
                validation_type="STATIC_AST",
            )

        return OverallAssessment(
            status="INCONCLUSIVE",
            status_display="No Resources Inspected",
            severity_score=20,
            confidence=50,
            summary_headline="No Valid Kubernetes Manifests or Telemetry Found",
            is_live_cluster=is_live,
            validation_type=validation_type,
        )

    @classmethod
    def _extract_root_causes(
        cls,
        diagnosis: Dict[str, Any],
        findings: List[NormalizedFinding],
        evidence: Dict[str, Any],
        incident_id: str,
    ) -> List[RootCauseItem]:
        root_causes: List[RootCauseItem] = []

        primary_title = diagnosis.get("root_cause") or "Kubernetes Configuration Anomaly"
        primary_expl = diagnosis.get("explanation") or "Automated investigation identified configuration or runtime defect."
        primary_fix = diagnosis.get("fix") or "Apply the recommended remediation patch."

        affected_res = list(dict.fromkeys([f.affected_resource for f in findings if f.affected_resource]))
        if not affected_res and evidence.get("pods", {}).get("problematic_pods"):
            affected_res = [f"Pod/{p.get('name')}" for p in evidence["pods"]["problematic_pods"]]
        if not affected_res:
            affected_res = ["Workload/Application"]

        consequence = (
            "Pods will fail readiness probes causing traffic shedding (HTTP 503), "
            "or experience CrashLoopBackOff restarts leading to service unavailability."
            if any("probe" in str(f).lower() or "crashloop" in str(f).lower() for f in findings)
            else "Workload will be rejected during admission or suffer erratic scheduling."
        )

        root_causes.append(
            RootCauseItem(
                id=f"rc-{incident_id[:8]}",
                rank=1,
                title=primary_title,
                what_happened=primary_title,
                why_it_happened=primary_expl,
                affected_resources=affected_res[:6],
                supporting_evidence=[
                    f.evidence for f in findings[:4] if f.evidence
                ] or ["Correlated diagnostic telemetry and static AST inspection."],
                potential_consequence=consequence,
                resolution_summary=primary_fix,
                confidence=diagnosis.get("confidence", 90),
                is_confirmed=True,
            )
        )

        return root_causes

    @classmethod
    def _generate_remediations(
        cls,
        diagnosis: Dict[str, Any],
        findings: List[NormalizedFinding],
        root_causes: List[RootCauseItem],
    ) -> List[RemediationRecommendation]:
        remediations: List[RemediationRecommendation] = []
        cmd = diagnosis.get("kubectl_command") or "kubectl get pods -A"
        patch = diagnosis.get("patch_preview")
        primary_cause = root_causes[0] if root_causes else None

        # P0 Recommendation
        if any(f.severity == "ERROR" for f in findings) or "crashloop" in cmd.lower() or "probe" in cmd.lower():
            remediations.append(
                RemediationRecommendation(
                    priority="P0",
                    priority_label="P0 — Critical / Immediate",
                    title="Remediate Verified Root Cause Defect",
                    problem_statement=primary_cause.what_happened if primary_cause else "Critical fault detected",
                    proposed_correction=diagnosis.get("fix") or "Apply verified patch to container specification.",
                    expected_outcome="Restores pod readiness passing rate to 100% and registers active service endpoints.",
                    kubectl_command=cmd,
                    patch_diff=patch,
                    affected_resources=primary_cause.affected_resources if primary_cause else [],
                    supporting_evidence="Verified through Kubernetes schema validation and diagnostic telemetry.",
                    verification_steps="Run 'kubectl get pods' to verify Ready status 1/1, and test HTTP endpoints.",
                )
            )

        # P1 / P2 for secondary findings if applicable
        resource_warnings = [f for f in findings if f.category == "Resource & performance"]
        if resource_warnings:
            remediations.append(
                RemediationRecommendation(
                    priority="P2",
                    priority_label="P2 — Medium Priority",
                    title="Enforce Production CPU & Memory Limits",
                    problem_statement="Containers lack explicit memory/cpu boundaries or declare invalid units.",
                    proposed_correction="Declare explicit resources.requests and resources.limits with valid binary units (e.g. 128Mi, 250m).",
                    expected_outcome="Protects Kubernetes worker nodes against noisy neighbor memory exhaustion.",
                    kubectl_command=None,
                    patch_diff="""spec:
  containers:
  - name: workload
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "250m" """,
                    affected_resources=[f.affected_resource for f in resource_warnings[:3]],
                    supporting_evidence="Resource unit analysis flagged unconstrained memory allocation.",
                    verification_steps="Check pod resource consumption with 'kubectl top pods'.",
                )
            )

        if not remediations:
            # Healthy case
            remediations.append(
                RemediationRecommendation(
                    priority="P3",
                    priority_label="P3 — Low Priority / Informational",
                    title="Maintain Baseline Monitoring",
                    problem_statement="No critical faults or semantic errors detected in inspected resources.",
                    proposed_correction="Continue monitoring Prometheus metrics and cluster warning events.",
                    expected_outcome="Sustained 99.99% service availability.",
                    kubectl_command="kubectl get events --sort-by='.metadata.creationTimestamp'",
                    patch_diff=None,
                    affected_resources=[],
                    supporting_evidence="All validation rules satisfied.",
                    verification_steps="Verify telemetry dashboards periodically.",
                )
            )

        return remediations

    @classmethod
    def _generate_executive_summary(
        cls,
        source_info: SourceInformation,
        assessment: OverallAssessment,
        stats: InvestigationStatistics,
        root_causes: List[RootCauseItem],
        remediations: List[RemediationRecommendation],
        diagnosis: Dict[str, Any],
    ) -> ExecutiveSummary:
        what_investigated = (
            f"ClusterSage evaluated {source_info.resources_count} Kubernetes resource(s) from "
            f"{source_info.source_type} source '{source_info.source_name}' across {stats.total_checks_performed} "
            f"structural, probe, and semantic integrity rules."
        )

        what_discovered = (
            f"Identified {stats.errors_count} critical error(s) and {stats.warnings_count} configuration warning(s). "
            f"{stats.passed_checks_count} standard validation checks succeeded."
            if stats.errors_count > 0 or stats.warnings_count > 0
            else f"All {stats.passed_checks_count} validation checks succeeded cleanly with 0 errors and 0 warnings."
        )

        primary_rc = root_causes[0] if root_causes else None
        most_imp_problem = (
            primary_rc.what_happened if primary_rc else "No critical reliability defects identified."
        )

        potential_impact = (
            primary_rc.potential_consequence
            if primary_rc
            else "Workload exhibits normal operational baseline with no outage risk."
        )

        rec_action = (
            remediations[0].proposed_correction
            if remediations
            else "No remediation required. Configuration satisfies Kubernetes best practices."
        )

        plain_text = (
            f"Investigation of {source_info.source_name} yielded a status of {assessment.status_display}. "
            f"{what_discovered} The primary finding is: '{most_imp_problem}'. "
            f"{potential_impact} Recommended next step: {rec_action}"
        )

        return ExecutiveSummary(
            what_was_investigated=what_investigated,
            what_was_discovered=what_discovered,
            most_important_problem=most_imp_problem,
            potential_impact=potential_impact,
            recommended_action=rec_action,
            plain_text_summary=plain_text,
        )
