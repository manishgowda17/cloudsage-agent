"use client";

import React from "react";
import { ClusterItem } from "@/types";
import { Server, CheckCircle, AlertCircle, Play, FlaskConical } from "lucide-react";

interface ClusterSelectorProps {
  clusters: ClusterItem[];
  selectedContext: string | null;
  onSelectCluster: (cluster: ClusterItem) => void;
  onRunScenario: (scenario: string) => void;
  isLoading: boolean;
}

export const ClusterSelector: React.FC<ClusterSelectorProps> = ({
  clusters,
  selectedContext,
  onSelectCluster,
  onRunScenario,
  isLoading,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
      {/* Clusters Section Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            Local Kubernetes Clusters (from Kubeconfig)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click on any cluster to switch context and immediately trigger investigation.
          </p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          {clusters.length} Cluster{clusters.length === 1 ? "" : "s"} Found
        </span>
      </div>

      {/* Cluster Grid Cards */}
      {clusters.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 text-center">
          No clusters found in local kubeconfig (~/.kube/config).
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {clusters.map((c) => {
            const isSelected = selectedContext === c.context;
            const isConnected = c.status === "connected";

            return (
              <div
                key={c.context}
                onClick={() => !isLoading && onSelectCluster(c)}
                className={`relative group cursor-pointer p-3.5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "bg-blue-600/15 border-blue-500/50 shadow-md ring-1 ring-blue-500/30"
                    : "bg-slate-800/50 hover:bg-slate-800 border-slate-700/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-sm text-white truncate">
                      {c.name}
                    </span>
                    {c.is_current && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                        Default
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isConnected
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-700/60 text-slate-400 border border-slate-600/40"
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" /> Ready
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-slate-400" /> Offline
                      </>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-mono truncate mb-3">
                  {c.server}
                </p>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-700/40">
                  <span className="text-slate-400">Context: {c.context}</span>
                  <span className="text-blue-400 font-medium group-hover:translate-x-0.5 transition flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" /> Investigate
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Failure Scenario Test Bench */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            Test Intentional Kubernetes Failure Scenarios (AI SRE Verification)
          </span>
          <span className="text-[11px] text-slate-500">
            Powered by Google Gemini API
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onRunScenario("crashloop")}
            disabled={isLoading}
            className="text-xs bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            1. CrashLoopBackOff (Missing ENV)
          </button>
          <button
            onClick={() => onRunScenario("imagepull")}
            disabled={isLoading}
            className="text-xs bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            2. ImagePullBackOff (Bad Tag)
          </button>
          <button
            onClick={() => onRunScenario("oom")}
            disabled={isLoading}
            className="text-xs bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            3. OOMKilled (Low Memory Limit)
          </button>
          <button
            onClick={() => onRunScenario("selector")}
            disabled={isLoading}
            className="text-xs bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            4. Service Selector Mismatch
          </button>
          <button
            onClick={() => onRunScenario("liveness")}
            disabled={isLoading}
            className="text-xs bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            5. Liveness Probe Failure
          </button>
          <button
            onClick={() => onRunScenario("readiness")}
            disabled={isLoading}
            className="text-xs bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            6. Readiness Probe Failure
          </button>
        </div>
      </div>
    </div>
  );
};
