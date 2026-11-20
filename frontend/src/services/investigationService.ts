import { apiClient } from "./api";
import {
  HealthResponse,
  InvestigationResponse,
  ClustersResponse,
  HindsightStatus,
  HindsightReflectResponse,
  RunbookItem,
  PostMortemRecord,
  PostMortemCreate,
  HindsightInsightsResponse,
  HindsightMemoryItem,
} from "@/types";

export interface InvestigationParams {
  namespace?: string;
  context?: string;
  cluster?: string;
  scenario?: string;
  source_type?: "cluster" | "github" | "yaml" | "zip";
  github_url?: string;
  manifest_content?: string;
  manifest_filename?: string;
  zip_data_base64?: string;
}

export const investigationService = {
  async getHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>("/health");
    return response.data;
  },

  async getClusters(): Promise<ClustersResponse> {
    const response = await apiClient.get<ClustersResponse>("/clusters");
    return response.data;
  },

  async getHindsightStatus(): Promise<HindsightStatus> {
    const response = await apiClient.get<HindsightStatus>("/api/v1/hindsight/status");
    return response.data;
  },

  async reflectPatterns(query: string): Promise<HindsightReflectResponse> {
    const response = await apiClient.post<HindsightReflectResponse>("/api/v1/hindsight/reflect", {
      query,
    });
    return response.data;
  },

  async recallMemories(query: string): Promise<any> {
    const response = await apiClient.post("/api/v1/hindsight/recall", {
      query,
    });
    return response.data;
  },

  async getHindsightMemories(query?: string, tag?: string): Promise<{ bank_id: string; total_count: number; memories: HindsightMemoryItem[] }> {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (tag) params.append("tag", tag);
    const response = await apiClient.get(`/api/v1/hindsight/memories?${params.toString()}`);
    return response.data;
  },

  async getHindsightInsights(): Promise<HindsightInsightsResponse> {
    const response = await apiClient.get<HindsightInsightsResponse>("/api/v1/hindsight/insights");
    return response.data;
  },

  async getRunbooks(category?: string): Promise<RunbookItem[]> {
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await apiClient.get<RunbookItem[]>(`/api/v1/runbooks${params}`);
    return response.data;
  },

  async getRunbook(runbookId: string): Promise<RunbookItem> {
    const response = await apiClient.get<RunbookItem>(`/api/v1/runbooks/${runbookId}`);
    return response.data;
  },

  async getPostMortems(): Promise<PostMortemRecord[]> {
    const response = await apiClient.get<PostMortemRecord[]>("/api/v1/postmortems");
    return response.data;
  },

  async createPostMortem(data: PostMortemCreate): Promise<PostMortemRecord> {
    const response = await apiClient.post<PostMortemRecord>("/api/v1/postmortems", data);
    return response.data;
  },

  async triggerInvestigation(params?: InvestigationParams | string): Promise<InvestigationResponse> {
    const payload = typeof params === "string" ? { namespace: params } : params;
    const response = await apiClient.post<InvestigationResponse>("/investigate", {
      namespace: payload?.namespace || null,
      context: payload?.context || null,
      cluster: payload?.cluster || null,
      scenario: payload?.scenario || null,
      source_type: payload?.source_type || "cluster",
      github_url: payload?.github_url || null,
      manifest_content: payload?.manifest_content || null,
      manifest_filename: payload?.manifest_filename || null,
      zip_data_base64: payload?.zip_data_base64 || null,
    });
    return response.data;
  },

  // --------------------------------------------------------------------------
  // TIER 2: FLEET, EDGE AGENTS, PRIVACY & REMEDIATION ENDPOINTS
  // --------------------------------------------------------------------------
  async getFleetOverview(): Promise<import("@/types").FleetOverviewResponse> {
    const response = await apiClient.get<import("@/types").FleetOverviewResponse>("/api/v1/fleet/overview");
    return response.data;
  },

  async getRegisteredAgents(): Promise<{ organization_id: string; agents: import("@/types").EdgeAgentItem[] }> {
    const response = await apiClient.get<{ organization_id: string; agents: import("@/types").EdgeAgentItem[] }>("/api/v1/agent/agents");
    return response.data;
  },

  async getFleetIncidents(): Promise<{ organization_id: string; incidents: any[] }> {
    const response = await apiClient.get<{ organization_id: string; incidents: any[] }>("/api/v1/fleet/incidents");
    return response.data;
  },

  async getRemediationProposals(): Promise<import("@/types").RemediationProposal[]> {
    const response = await apiClient.get<import("@/types").RemediationProposal[]>("/api/v1/remediation/proposals");
    return response.data;
  },

  async approveRemediation(proposalId: string): Promise<import("@/types").RemediationProposal> {
    const response = await apiClient.post<import("@/types").RemediationProposal>(`/api/v1/remediation/${proposalId}/approve`);
    return response.data;
  },

  async rejectRemediation(proposalId: string, reason: string): Promise<import("@/types").RemediationProposal> {
    const response = await apiClient.post<import("@/types").RemediationProposal>(`/api/v1/remediation/${proposalId}/reject`, {
      reason,
    });
    return response.data;
  },
};
