"use client";

import React from "react";
import { ClusterItem } from "@/types";
import {
  Server,
  CheckCircle,
  AlertCircle,
  Play,
  FlaskConical,
  Activity,
  Zap,
} from "lucide-react";

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
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 mb-6 shadow-luminous transition-all">
      {/* Clusters Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            Configured Kubernetes Clusters
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select an active context from your local kubeconfig to trigger on-demand SRE diagnostics.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          {clusters.length} Context{clusters.length === 1 ? "" : "s"} Discovered
        </span>
      </div>

      {/* Cluster Grid Cards */}
      {clusters.length === 0 ? (
        <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
          No clusters found in local kubeconfig (~/.kube/config).
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-6">
          {clusters.map((c) => {
            const isSelected = selectedContext === c.context;
            const isConnected = c.status === "connected";

            return (
              <div
                key={c.context}
                onClick={() => !isLoading && onSelectCluster(c)}
                className={`relative group cursor-pointer p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-400/80 shadow-md ring-2 ring-blue-500/20"
                    : "bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {c.name}
                    </span>
                    {c.is_current && (
                      <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200">
                        Default
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isConnected
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Ready
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-slate-400" /> Offline
                      </>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 font-mono truncate mb-3">
                  {c.server}
                </p>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium truncate max-w-[140px]">
                    {c.context}
                  </span>
                  <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" /> Investigate
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Failure Scenario Test Bench */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
            Quick Failure Scenarios Test Bench
          </span>
          <span className="text-[11px] text-slate-400">
            Simulate real incident signatures
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "crashloop",
              label: "CrashLoopBackOff",
              desc: "Missing DATABASE_URL",
              color: "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700",
            },
            {
              id: "imagepull",
              label: "ImagePullBackOff",
              desc: "Invalid Image Tag",
              color: "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700",
            },
            {
              id: "oom",
              label: "OOMKilled",
              desc: "Memory Limit (Exit 137)",
              color: "hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700",
            },
            {
              id: "selector",
              label: "Selector Mismatch",
              desc: "Service Routing Error",
              color: "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
            },
            {
              id: "liveness",
              label: "Liveness Probe Failure",
              desc: "Unhealthy Restart Loop",
              color: "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 font-medium",
            },
            {
              id: "readiness",
              label: "Readiness Probe Failure",
              desc: "ContainersNotReady Traffic Isolation",
              color: "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 font-medium",
            },
          ].map((sc) => (
            <button
              key={sc.id}
              disabled={isLoading}
              onClick={() => onRunScenario(sc.id)}
              className={`px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ${sc.color} disabled:opacity-50`}
            >
              <Zap className="w-3 h-3 text-slate-400" />
              <span>{sc.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
