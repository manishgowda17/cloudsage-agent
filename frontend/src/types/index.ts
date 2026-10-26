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

export interface DiagnosisResult {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_command: string;
  confidence: number;
  prevention?: string;
}

export interface InvestigationEvidence {
  pods: Record<string, any>;
  logs: Record<string, any>;
  events: Record<string, any>;
  deployments: Record<string, any>;
  network: Record<string, any>;
  cluster_error?: string;
}

export interface InvestigationResponse {
  status: string;
  diagnosis: DiagnosisResult;
  investigation?: InvestigationEvidence;
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
