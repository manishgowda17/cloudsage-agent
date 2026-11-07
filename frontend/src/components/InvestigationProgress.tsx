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
    <div className="relative bg-white/80 backdrop-blur-2xl border border-sky-100/90 rounded-3xl p-6 sm:p-7 mb-7 shadow-[0_20px_50px_-15px_rgba(30,58,138,0.08)] overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-700 animate-pulse" />
          Live Diagnostic Pipeline
          {isActive && (
            <span className="text-[10px] font-bold bg-sky-100 text-blue-800 border border-sky-200 px-2 py-0.5 rounded-full animate-pulse">
              Active Stream
            </span>
          )}
        </h3>
        <span className="text-xs font-bold text-slate-600 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full">
          {completedCount} of {steps.length} Phases Complete
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isInProgress = step.status === "in_progress";

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs transition-all ${
                isCompleted
                  ? "bg-emerald-50/80 border-emerald-200/90 text-emerald-950 shadow-2xs"
                  : isInProgress
                  ? "bg-gradient-to-r from-blue-50 to-sky-50 border-blue-400 text-blue-950 shadow-md ring-2 ring-blue-500/20 scale-[1.02]"
                  : "bg-slate-50/70 border-slate-200/70 text-slate-400"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isInProgress ? (
                <Loader2 className="w-4 h-4 text-blue-700 animate-spin shrink-0" />
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
