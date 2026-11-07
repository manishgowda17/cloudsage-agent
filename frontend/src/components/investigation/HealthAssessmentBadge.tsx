"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Activity,
} from "lucide-react";
import { OverallAssessment } from "@/types";

interface HealthAssessmentBadgeProps {
  assessment: OverallAssessment;
}

export const HealthAssessmentBadge: React.FC<HealthAssessmentBadgeProps> = ({
  assessment,
}) => {
  const getVisuals = () => {
    switch (assessment.status) {
      case "CRITICAL":
        return {
          icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
          borderColor: "border-rose-500/40",
          bgColor: "bg-rose-950/25",
          textColor: "text-rose-300",
          barColor: "bg-rose-500",
        };
      case "UNHEALTHY":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          borderColor: "border-amber-500/40",
          bgColor: "bg-amber-950/25",
          textColor: "text-amber-300",
          barColor: "bg-amber-500",
        };
      case "ATTENTION_REQUIRED":
        return {
          icon: <AlertCircle className="w-5 h-5 text-amber-300" />,
          borderColor: "border-amber-400/30",
          bgColor: "bg-amber-950/15",
          textColor: "text-amber-200",
          barColor: "bg-amber-400",
        };
      case "HEALTHY":
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          borderColor: "border-emerald-500/40",
          bgColor: "bg-emerald-950/25",
          textColor: "text-emerald-300",
          barColor: "bg-emerald-500",
        };
      default:
        return {
          icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
          borderColor: "border-slate-700",
          bgColor: "bg-slate-900/60",
          textColor: "text-slate-300",
          barColor: "bg-slate-500",
        };
    }
  };

  const visuals = getVisuals();

  return (
    <div
      className={`rounded-3xl border ${visuals.borderColor} ${visuals.bgColor} p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4`}
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-2xl bg-[#070A11] border border-slate-800 shrink-0">
          {visuals.icon}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Overall Infrastructure Assessment
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
              {assessment.validation_type}
            </span>
          </div>
          <h4 className={`text-base sm:text-lg font-black font-mono tracking-tight ${visuals.textColor}`}>
            {assessment.status_display}: {assessment.summary_headline}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            {assessment.is_live_cluster
              ? "Assessment evaluated live cluster telemetry, container restarts, and runtime probe states."
              : "Assessment evaluated static manifest AST schemas and cross-resource links. Live cluster state not probed."}
          </p>
        </div>
      </div>

      {/* Severity Score Indicator */}
      <div className="shrink-0 space-y-1.5 min-w-[140px] text-right self-end md:self-center">
        <div className="flex justify-between text-xs font-mono font-bold">
          <span className="text-slate-400">Severity Risk</span>
          <span className={visuals.textColor}>{assessment.severity_score}/100</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
          <div
            className={`h-full ${visuals.barColor} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.max(assessment.severity_score, 4)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
