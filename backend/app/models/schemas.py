"""Pydantic schemas for request/response validation."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(default="healthy", description="Current service health status")
    service: str = Field(default="ai-kubernetes-agent", description="Service identifier")


class ClusterItem(BaseModel):
    """Discovered Kubernetes cluster/context details."""
    name: str = Field(description="Cluster or context name")
    context: str = Field(description="Kubeconfig context identifier")
    server: str = Field(description="Cluster API server endpoint")
    is_current: bool = Field(default=False, description="Whether this is the current active context")
    status: str = Field(default="unreachable", description="Cluster reachability (connected | unreachable)")
    message: Optional[str] = Field(default=None, description="Diagnostic message")


class ClustersResponse(BaseModel):
    """List of all clusters found in local kubeconfig."""
    current_context: Optional[str] = None
    clusters: List[ClusterItem] = []
    error: Optional[str] = None


class InvestigationRequest(BaseModel):
    """Parameters for on-demand cluster investigation or manifest audit."""
    namespace: Optional[str] = Field(
        default=None,
        description="Target Kubernetes namespace (e.g. 'default', or null for all namespaces)"
    )
    context: Optional[str] = Field(
        default=None,
        description="Target Kubernetes context name from kubeconfig"
    )
    cluster: Optional[str] = Field(
        default=None,
        description="Target cluster name"
    )
    scenario: Optional[str] = Field(
        default=None,
        description="Optional failure test scenario (crashloop, imagepull, oom, selector, liveness, readiness)"
    )
    source_type: Optional[str] = Field(
        default="cluster",
        description="Source mode: 'cluster' | 'github' | 'yaml' | 'zip'"
    )
    github_url: Optional[str] = Field(
        default=None,
        description="GitHub repository URL containing Kubernetes manifests or Helm charts"
    )
    manifest_content: Optional[str] = Field(
        default=None,
        description="Raw Kubernetes YAML manifest content"
    )
    manifest_filename: Optional[str] = Field(
        default=None,
        description="Manifest filename (e.g., deployment.yaml)"
    )
    zip_data_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded ZIP file containing Kubernetes manifests"
    )


class ManifestFinding(BaseModel):
    """Detailed finding from static manifest audit."""
    severity: str = Field(description="Issue severity: ERROR, WARNING, or INFO")
    resource: str = Field(description="Affected Kubernetes resource (e.g. Deployment/web)")
    file: Optional[str] = Field(default=None, description="Source file name or path")
    field: Optional[str] = Field(default=None, description="Problematic field path")
    line: Optional[int] = Field(default=None, description="Line number where issue occurs")
    explanation: str = Field(description="Detailed explanation of the issue")
    fix: str = Field(description="Actionable remediation steps for this finding")


class RunbookStepSchema(BaseModel):
    step_number: int
    title: str
    description: str
    command: Optional[str] = None
    verification: Optional[str] = None


class RunbookItemSchema(BaseModel):
    id: str
    title: str
    category: str
    severity_applicability: List[str] = Field(default_factory=list)
    summary: str
    prerequisites: List[str] = Field(default_factory=list)
    steps: List[RunbookStepSchema] = Field(default_factory=list)
    validation_instructions: str = ""
    rollback_guidance: str = ""
    risks_and_blast_radius: str = ""
    historical_success_rate: float = 95.0
    verified_in_cluster: bool = True
    tags: List[str] = Field(default_factory=list)
    relevance_score: Optional[int] = None
    relevance_reason: Optional[str] = None


# ============================================================================
# Universal Investigation Report Schemas (Application-Wide Standard)
# ============================================================================

class InvestigationMetadata(BaseModel):
    """Metadata regarding the execution of an investigation."""
    id: str = Field(description="Unique investigation or incident identifier")
    title: str = Field(description="Human-readable investigation title")
    timestamp: str = Field(description="ISO 8601 execution timestamp")
    duration_ms: Optional[int] = Field(default=None, description="Execution duration in milliseconds")
    status: str = Field(default="COMPLETED", description="COMPLETED | FAILED | INCOMPLETE")
    environment: Optional[str] = Field(default=None, description="Environment or cluster context label")


class SourceInformation(BaseModel):
    """Normalized source intelligence across clusters, GitOps repos, YAML & ZIPs."""
    source_type: str = Field(description="cluster | github | yaml | zip | helm")
    source_name: str = Field(description="Target repository, context name, or filename")
    target_namespace: Optional[str] = Field(default=None, description="Kubernetes namespace inspected")
    scanned_files: List[str] = Field(default_factory=list, description="List of scanned files or manifest documents")
    resources_count: int = Field(default=0, description="Total Kubernetes resources parsed or observed")
    checks_performed_count: int = Field(default=0, description="Total discrete rules/checks evaluated")
    branch: Optional[str] = Field(default=None, description="Git branch if applicable")
    commit: Optional[str] = Field(default=None, description="Git commit hash if applicable")


class ExecutiveSummary(BaseModel):
    """Five-point executive intelligence briefing answering core SRE questions."""
    what_was_investigated: str = Field(description="1. What was investigated?")
    what_was_discovered: str = Field(description="2. What was discovered?")
    most_important_problem: str = Field(description="3. What is the most important problem?")
    potential_impact: str = Field(description="4. What is the potential operational impact?")
    recommended_action: str = Field(description="5. What should the user/operator do next?")
    plain_text_summary: str = Field(description="Synthesized executive overview paragraph")


class OverallAssessment(BaseModel):
    """Truth-based health and risk assessment of the inspected infrastructure."""
    status: str = Field(description="CRITICAL | UNHEALTHY | ATTENTION_REQUIRED | HEALTHY | INCONCLUSIVE")
    status_display: str = Field(description="Formatted human label: e.g. 'Critical Outage Risk'")
    severity_score: int = Field(default=0, description="Calculated risk score (0-100)")
    confidence: int = Field(default=95, description="Confidence percentage (0-100)")
    summary_headline: str = Field(description="High-level assessment headline")
    is_live_cluster: bool = Field(default=False, description="Whether assessment inspected live cluster runtime")
    validation_type: str = Field(default="STATIC_AST", description="LIVE_TELEMETRY | STATIC_AST | MULTI_SOURCE")


class InvestigationStatistics(BaseModel):
    """Truth-based dynamic metrics supported by actual investigation evidence."""
    total_resources_inspected: int = 0
    total_checks_performed: int = 0
    errors_count: int = 0
    warnings_count: int = 0
    info_count: int = 0
    passed_checks_count: int = 0
    failed_checks_count: int = 0
    skipped_checks_count: int = 0
    security_findings_count: int = 0


class RootCauseItem(BaseModel):
    """Detailed root cause explanation ordered by operational impact."""
    id: str
    rank: int = 1
    title: str
    what_happened: str
    why_it_happened: str
    affected_resources: List[str] = Field(default_factory=list)
    supporting_evidence: List[str] = Field(default_factory=list)
    potential_consequence: str
    resolution_summary: str
    confidence: int = 90
    is_confirmed: bool = True


class NormalizedFinding(BaseModel):
    """Individual granular issue with dual presentation levels (simple vs technical)."""
    id: str
    title: str
    severity: str = Field(description="ERROR | WARNING | INFO")
    category: str = Field(description="Critical errors | Configuration errors | Security issues | Resource & performance | Networking & routing | Availability & reliability | Best-practice warnings | Syntax & schema")
    affected_resource: str
    file_path: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None
    field: Optional[str] = None
    simple_explanation: str
    technical_explanation: str
    root_cause_id: Optional[str] = None
    evidence: str
    potential_impact: str
    recommended_fix: str
    yaml_snippet: Optional[str] = None


class FindingGroup(BaseModel):
    """Intelligently grouped issues sharing the same verified underlying defect."""
    group_id: str
    title: str
    category: str
    severity: str
    pattern_description: str
    occurrence_count: int
    affected_resources: List[str] = Field(default_factory=list)
    affected_files: List[str] = Field(default_factory=list)
    findings: List[NormalizedFinding] = Field(default_factory=list)
    common_fix: str


class RemediationRecommendation(BaseModel):
    """Prioritized actionable remediation step."""
    priority: str = Field(description="P0 | P1 | P2 | P3")
    priority_label: str = Field(description="P0 — Critical / Immediate | P1 — High Priority | P2 — Medium Priority | P3 — Low Priority")
    title: str
    problem_statement: str
    proposed_correction: str
    expected_outcome: str
    kubectl_command: Optional[str] = None
    patch_diff: Optional[str] = None
    affected_resources: List[str] = Field(default_factory=list)
    supporting_evidence: str = ""
    verification_steps: str = ""


class ValidationEvidenceItem(BaseModel):
    """Itemized proof of checks performed, passed, failed, or skipped."""
    check_id: str
    check_name: str
    target_layer: str
    status: str = Field(description="PASSED | FAILED | SKIPPED | UNAVAILABLE")
    details: str


class InvestigationLimitation(BaseModel):
    """Explicit declaration of unavailable tools or environmental constraints."""
    limitation_type: str
    message: str
    impact_on_report: str


class UniversalInvestigationReport(BaseModel):
    """The canonical, standardized investigation report structure across all sources."""
    metadata: InvestigationMetadata
    source: SourceInformation
    executive_summary: ExecutiveSummary
    assessment: OverallAssessment
    statistics: InvestigationStatistics
    root_causes: List[RootCauseItem] = Field(default_factory=list)
    findings: List[NormalizedFinding] = Field(default_factory=list)
    finding_groups: List[FindingGroup] = Field(default_factory=list)
    remediations: List[RemediationRecommendation] = Field(default_factory=list)
    validation_evidence: List[ValidationEvidenceItem] = Field(default_factory=list)
    limitations: List[InvestigationLimitation] = Field(default_factory=list)
    raw_details: Optional[Dict[str, Any]] = None


class DiagnosisResult(BaseModel):
    """AI SRE Diagnosis result schema."""
    root_cause: str = Field(description="Identified root cause")
    explanation: str = Field(description="Operational explanation of the issue")
    fix: str = Field(description="Actionable remediation steps")
    kubectl_command: str = Field(description="Exact kubectl command to remediate or inspect")
    confidence: int = Field(description="Confidence percentage (0-100)")
    prevention: Optional[str] = Field(default=None, description="Preventative recommendation")
    findings: Optional[List[ManifestFinding]] = Field(
        default=None,
        description="Granular findings list from manifest and configuration analysis"
    )
    historical_context: Optional[str] = Field(
        default=None,
        description="Historical incident lessons and context retrieved from Hindsight"
    )
    recommended_runbooks: List[RunbookItemSchema] = Field(
        default_factory=list,
        description="Curated SRE runbooks matched to this incident with historical success evidence"
    )
    resolution_stage: str = Field(
        default="VALIDATED_PATCH",
        description="PROPOSED_FIX | GENERATED_PATCH | VALIDATED_PATCH | APPLIED_FIX | VERIFIED_SUCCESSFUL"
    )
    patch_preview: Optional[str] = Field(
        default=None,
        description="Unified YAML diff or patched manifest configuration preview"
    )
    incident_id: Optional[str] = Field(
        default=None,
        description="Unique identifier for this investigated incident"
    )
    report: Optional[UniversalInvestigationReport] = Field(
        default=None,
        description="Standardized Universal Investigation Report adhering to SRE contract"
    )


class HindsightMemoryItem(BaseModel):
    """Individual recalled memory snippet from Hindsight."""
    id: Optional[str] = None
    text: str
    type: Optional[str] = "memory"
    tags: List[str] = Field(default_factory=list)
    context: Optional[str] = None
    similarity_score: Optional[float] = None


class HindsightMetadata(BaseModel):
    """Hindsight memory integration tracking for an investigation."""
    status: str = Field(default="available", description="'available' | 'offline' | 'degraded'")
    bank_id: Optional[str] = Field(default=None, description="User-scoped Hindsight memory bank")
    recalled_count: int = Field(default=0, description="Count of historical memories recalled")
    recalled_memories: List[HindsightMemoryItem] = Field(default_factory=list)
    retained: bool = Field(default=False, description="Whether current incident was retained")
    retention_id: Optional[str] = Field(default=None, description="Hindsight operation ID")
    influence_summary: Optional[str] = Field(default=None, description="How memory influenced reasoning")
    previous_root_causes: List[str] = Field(default_factory=list, description="Historical root causes recalled")
    fixes_that_worked: List[str] = Field(default_factory=list, description="Historical fixes that succeeded")
    useful_runbooks: List[str] = Field(default_factory=list, description="Runbooks correlated with past success")


class HindsightMemoriesQuery(BaseModel):
    """Query parameters for searching Hindsight memory bank."""
    query: Optional[str] = ""
    tag: Optional[str] = None
    limit: int = 50


class HindsightMemoriesResponse(BaseModel):
    """Response containing browsable memory bank records."""
    bank_id: str
    total_count: int
    memories: List[HindsightMemoryItem] = Field(default_factory=list)


class FailurePatternInsight(BaseModel):
    pattern_name: str
    category: str
    recurrence_count: int
    affected_resources: List[str]
    effective_remediation: str
    preventive_measure: str
    historical_success_rate: float


class HindsightInsightsResponse(BaseModel):
    """Synthesized reliability insights and pattern analysis."""
    bank_id: str
    total_incidents_recorded: int
    recurring_patterns: List[FailurePatternInsight] = Field(default_factory=list)
    reflect_synthesis: str = ""
    top_misconfigurations: List[Dict[str, Any]] = Field(default_factory=list)


class HindsightReflectRequest(BaseModel):
    """Request payload for Hindsight Reflect synthesis."""
    query: str = Field(description="Synthesis question (e.g. 'What recurring probe failures have occurred?')")


class HindsightReflectResponse(BaseModel):
    """Reflect response synthesized by Hindsight."""
    available: bool = True
    bank_id: str
    query: str
    reflection: str
    based_on: List[Any] = Field(default_factory=list)


class HindsightStatusResponse(BaseModel):
    """Status of Hindsight integration."""
    status: str
    hindsight_url: str
    hindsight_control_plane_url: str
    sdk_available: bool
    user_bank_id: Optional[str] = None


class InvestigationResponse(BaseModel):
    """Top-level investigation response payload."""
    status: str = Field(default="success")
    diagnosis: DiagnosisResult
    report: Optional[UniversalInvestigationReport] = Field(
        default=None,
        description="Standardized Universal Investigation Report across all sources"
    )
    investigation: Optional[Dict[str, Any]] = Field(default=None, description="Underlying Kubernetes evidence")
    user_id: Optional[str] = Field(default=None, description="Authenticated user ID who triggered investigation")
    hindsight: Optional[HindsightMetadata] = Field(default=None, description="Hindsight agent memory intelligence")
