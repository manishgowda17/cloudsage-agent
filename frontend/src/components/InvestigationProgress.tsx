"use client";

import React from "react";
import { CheckCircle2, Loader2, Circle, Activity, Sparkles } from "lucide-react";
import { ProgressStep } from "@/types";

interface InvestigationProgressProps {
  steps: ProgressStep[];
  isActive: boolean;
}

export const InvestigationProgress: React.FC<InvestigationProgressProps> = ({
  steps,
  isActive,
}) => {
  if (!isActive && steps.every((s) => s.status === "pending")) {
    return null;
  }

  const completedCount = steps.filter((s) => s.status === "completed").length;

  return (
    <div className="bg-white/85 backdrop-blur-xl border border-blue-200/80 rounded-2xl p-5 mb-6 shadow-luminous transition-all">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
          Live Investigation Telemetry Pipeline
          {isActive && (
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
              Active Triage
            </span>
          )}
        </h3>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {completedCount} of {steps.length} Phases Complete
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isInProgress = step.status === "in_progress";

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs transition-all ${
                isCompleted
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-xs"
                  : isInProgress
                  ? "bg-blue-50 border-blue-300 text-blue-900 shadow-sm ring-2 ring-blue-500/20"
                  : "bg-slate-50/60 border-slate-200/70 text-slate-400"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isInProgress ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span className="font-bold truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
