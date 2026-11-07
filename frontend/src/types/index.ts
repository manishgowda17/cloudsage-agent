export interface HealthResponse {
  status: string;
  service: string;
}

export interface ClusterItem {
  name: string;
  context: string;
  server: string;
  is_current: boolean;
  status: "connected" | "unreachable";
  message?: string;
}

export interface ClustersResponse {
  current_context: string | null;
  clusters: ClusterItem[];
  error?: string | null;
}

export interface ManifestFinding {
  severity: "ERROR" | "WARNING" | "INFO";
  resource: string;
  file?: string;
  field?: string;
  line?: number;
  explanation: string;
  fix: string;
}

export interface RunbookStep {
  step_number: number;
  title: string;
  description: string;
  command?: string;
  verification?: string;
}

export interface RunbookItem {
  id: string;
  title: string;
  category: string;
  severity_applicability: string[];
  summary: string;
  prerequisites: string[];
  steps: RunbookStep[];
  validation_instructions: string;
  rollback_guidance: string;
  risks_and_blast_radius: string;
  historical_success_rate: number;
  verified_in_cluster: boolean;
  tags: string[];
  relevance_score?: number;
  relevance_reason?: string;
}

export interface PostMortemRecord {
  id: string;
  incident_id: string;
  incident_title: string;
  resource_kind: string;
  resource_name: string;
  namespace: string;
  summary: string;
  root_cause: string;
  resolution_steps_taken: string;
  steps_that_worked: string;
  steps_that_failed?: string;
  runbook_used?: string;
  time_to_detect_minutes?: number;
  time_to_resolve_minutes?: number;
  preventive_actions: string;
  key_lessons: string;
  was_successful: boolean;
  created_at: string;
  user_id?: string;
  retained_in_hindsight?: boolean;
  hindsight_operation_id?: string;
}

export interface PostMortemCreate {
  incident_id: string;
  incident_title: string;
  resource_kind?: string;
  resource_name: string;
  namespace?: string;
  summary: string;
  root_cause: string;
  resolution_steps_taken: string;
  steps_that_worked: string;
  steps_that_failed?: string;
  runbook_used?: string;
  time_to_detect_minutes?: number;
  time_to_resolve_minutes?: number;
  preventive_actions: string;
  key_lessons: string;
  was_successful?: boolean;
}

export interface FailurePatternInsight {
  pattern_name: string;
  category: string;
  recurrence_count: number;
  affected_resources: string[];
  effective_remediation: string;
  preventive_measure: string;
  historical_success_rate: number;
}

export interface HindsightInsightsResponse {
  bank_id: string;
  total_incidents_recorded: number;
  recurring_patterns: FailurePatternInsight[];
  reflect_synthesis: string;
  top_misconfigurations: { type: string; count: number; risk: string }[];
}

export interface InvestigationMetadata {
  id: string;
  title: string;
  timestamp: string;
  duration_ms?: number;
  status: "COMPLETED" | "FAILED" | "INCOMPLETE";
  environment?: string;
}

export interface SourceInformation {
  source_type: "cluster" | "github" | "yaml" | "zip" | "helm" | string;
  source_name: string;
  target_namespace?: string;
  scanned_files: string[];
  resources_count: number;
  checks_performed_count: number;
  branch?: string;
  commit?: string;
}

export interface ExecutiveSummary {
  what_was_investigated: string;
  what_was_discovered: string;
  most_important_problem: string;
  potential_impact: string;
  recommended_action: string;
  plain_text_summary: string;
}

export interface OverallAssessment {
  status: "CRITICAL" | "UNHEALTHY" | "ATTENTION_REQUIRED" | "HEALTHY" | "INCONCLUSIVE";
  status_display: string;
  severity_score: number;
  confidence: number;
  summary_headline: string;
  is_live_cluster: boolean;
  validation_type: "LIVE_TELEMETRY" | "STATIC_AST" | "MULTI_SOURCE";
}

export interface InvestigationStatistics {
  total_resources_inspected: number;
  total_checks_performed: number;
  errors_count: number;
  warnings_count: number;
  info_count: number;
  passed_checks_count: number;
  failed_checks_count: number;
  skipped_checks_count: number;
  security_findings_count: number;
}

export interface RootCauseItem {
  id: string;
  rank: number;
  title: string;
  what_happened: string;
  why_it_happened: string;
  affected_resources: string[];
  supporting_evidence: string[];
  potential_consequence: string;
  resolution_summary: string;
  confidence: number;
  is_confirmed: boolean;
}

export interface NormalizedFinding {
  id: string;
  title: string;
  severity: "ERROR" | "WARNING" | "INFO";
  category:
    | "Critical errors"
    | "Configuration errors"
    | "Security issues"
    | "Resource & performance"
    | "Networking & routing"
    | "Availability & reliability"
    | "Best-practice warnings"
    | "Syntax & schema"
    | string;
  affected_resource: string;
  file_path?: string;
  line?: number;
  column?: number;
  field?: string;
  simple_explanation: string;
  technical_explanation: string;
  root_cause_id?: string;
  evidence: string;
  potential_impact: string;
  recommended_fix: string;
  yaml_snippet?: string;
}

export interface FindingGroup {
  group_id: string;
  title: string;
  category: string;
  severity: "ERROR" | "WARNING" | "INFO";
  pattern_description: string;
  occurrence_count: number;
  affected_resources: string[];
  affected_files: string[];
  findings: NormalizedFinding[];
  common_fix: string;
}

export interface RemediationRecommendation {
  priority: "P0" | "P1" | "P2" | "P3";
  priority_label: string;
  title: string;
  problem_statement: string;
  proposed_correction: string;
  expected_outcome: string;
  kubectl_command?: string;
  patch_diff?: string;
  affected_resources: string[];
  supporting_evidence: string;
  verification_steps: string;
}

export interface ValidationEvidenceItem {
  check_id: string;
  check_name: string;
  target_layer: string;
  status: "PASSED" | "FAILED" | "SKIPPED" | "UNAVAILABLE";
  details: string;
}

export interface InvestigationLimitation {
  limitation_type: string;
  message: string;
  impact_on_report: string;
}

export interface UniversalInvestigationReport {
  metadata: InvestigationMetadata;
  source: SourceInformation;
  executive_summary: ExecutiveSummary;
  assessment: OverallAssessment;
  statistics: InvestigationStatistics;
  root_causes: RootCauseItem[];
  findings: NormalizedFinding[];
  finding_groups: FindingGroup[];
  remediations: RemediationRecommendation[];
  validation_evidence: ValidationEvidenceItem[];
  limitations: InvestigationLimitation[];
  raw_details?: Record<string, any>;
}

export interface DiagnosisResult {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_command: string;
  confidence: number;
  prevention?: string;
  findings?: ManifestFinding[];
  historical_context?: string;
  recommended_runbooks?: RunbookItem[];
  resolution_stage?: "PROPOSED_FIX" | "GENERATED_PATCH" | "VALIDATED_PATCH" | "APPLIED_FIX" | "VERIFIED_SUCCESSFUL";
  patch_preview?: string;
  incident_id?: string;
  report?: UniversalInvestigationReport;
}

export interface HindsightMemoryItem {
  id?: string;
  text: string;
  type?: string;
  tags?: string[];
  context?: string;
  similarity_score?: number;
}

export interface HindsightMetadata {
  status: "available" | "offline" | "degraded";
  bank_id?: string;
  recalled_count: number;
  recalled_memories: HindsightMemoryItem[];
  retained: boolean;
  retention_id?: string;
  influence_summary?: string;
  previous_root_causes?: string[];
  fixes_that_worked?: string[];
  useful_runbooks?: string[];
}

export interface HindsightStatus {
  status: string;
  hindsight_url: string;
  hindsight_control_plane_url: string;
  sdk_available: boolean;
  user_bank_id?: string;
}

export interface HindsightReflectResponse {
  available: boolean;
  bank_id: string;
  query: string;
  reflection: string;
  based_on?: any[];
}

export interface InvestigationEvidence {
  pods: Record<string, any>;
  logs: Record<string, any>;
  events: Record<string, any>;
  deployments: Record<string, any>;
  network: Record<string, any>;
  cluster_error?: string;
  recalled_memories?: HindsightMemoryItem[];
}

export interface InvestigationResponse {
  status: string;
  diagnosis: DiagnosisResult;
  report?: UniversalInvestigationReport;
  investigation?: InvestigationEvidence;
  user_id?: string;
  hindsight?: HindsightMetadata;
}

export interface InvestigationHistoryItem {
  id?: string;
  created_at: string;
  root_cause: string;
  namespace: string;
  confidence: number;
  status: string;
  explanation?: string;
  suggested_fix?: string;
  kubectl_command?: string;
}

export type ProgressStepId =
  | "pods"
  | "logs"
  | "events"
  | "deployments"
  | "network"
  | "ai"
  | "complete";

export interface ProgressStep {
  id: ProgressStepId;
  label: string;
  status: "pending" | "in_progress" | "completed";
}
