import { apiClient } from "./api";
import { HealthResponse, InvestigationResponse, ClustersResponse } from "@/types";

export interface InvestigationParams {
  namespace?: string;
  context?: string;
  cluster?: string;
  scenario?: string;
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

  async triggerInvestigation(params?: InvestigationParams | string): Promise<InvestigationResponse> {
    const payload = typeof params === "string" ? { namespace: params } : params;
    const response = await apiClient.post<InvestigationResponse>("/investigate", {
      namespace: payload?.namespace || null,
      context: payload?.context || null,
      cluster: payload?.cluster || null,
      scenario: payload?.scenario || null,
    });
    return response.data;
  },
};
