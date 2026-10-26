"use client";

import React from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          Investigation Progress
          {isActive && (
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full animate-pulse">
              Live SRE Triage
            </span>
          )}
        </h3>
        <span className="text-xs text-slate-400">
          {steps.filter((s) => s.status === "completed").length} of {steps.length} completed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isInProgress = step.status === "in_progress";

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs transition-all ${
                isCompleted
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : isInProgress
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-sm"
                  : "bg-slate-800/40 border-slate-800 text-slate-500"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isInProgress ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className="font-medium truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
