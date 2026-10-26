import { useMutation, useQuery } from "@tanstack/react-query";
import { investigationService, InvestigationParams } from "@/services/investigationService";

export function useClusterHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => investigationService.getHealth(),
    retry: 2,
    refetchInterval: 30000,
  });
}

export function useInvestigation() {
  return useMutation({
    mutationFn: (params?: InvestigationParams | string) =>
      investigationService.triggerInvestigation(params),
  });
}
