"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { ValidationEvidenceItem, InvestigationLimitation } from "@/types";

interface ValidationEvidenceSectionProps {
  evidence: ValidationEvidenceItem[];
  limitations: InvestigationLimitation[];
}

export const ValidationEvidenceSection: React.FC<ValidationEvidenceSectionProps> = ({
  evidence = [],
  limitations = [],
}) => {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PASSED" | "FAILED" | "SKIPPED">("ALL");
  const [expandedLimitations, setExpandedLimitations] = useState(true);

  const passedCount = evidence.filter((e) => e.status === "PASSED").length;
  const failedCount = evidence.filter((e) => e.status === "FAILED").length;
  const skippedCount = evidence.filter((e) => e.status === "SKIPPED" || e.status === "UNAVAILABLE").length;

  const filteredEvidence = evidence.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "PASSED") return item.status === "PASSED";
    if (activeFilter === "FAILED") return item.status === "FAILED";
    if (activeFilter === "SKIPPED") return item.status === "SKIPPED" || item.status === "UNAVAILABLE";
    return true;
  });

  // Group evidence by target_layer
  const layers = Array.from(new Set(filteredEvidence.map((e) => e.target_layer || "General")));

  return (
    <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono text-white tracking-tight uppercase flex items-center gap-2">
              <span>Validation Evidence & Engine Verification</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
                {evidence.length} Checks Run
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Audit log of all static, structural, semantic, and telemetry checks evaluated during this investigation
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-slate-800 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({evidence.length})
          </button>
          <button
            onClick={() => setActiveFilter("PASSED")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
              activeFilter === "PASSED"
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold"
                : "text-slate-400 hover:text-emerald-400"
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Passed ({passedCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter("FAILED")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
              activeFilter === "FAILED"
                ? "bg-rose-950/80 text-rose-400 border border-rose-800/60 font-semibold"
                : "text-slate-400 hover:text-rose-400"
            }`}
          >
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Failed ({failedCount})</span>
          </button>
          {skippedCount > 0 && (
            <button
              onClick={() => setActiveFilter("SKIPPED")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
                activeFilter === "SKIPPED"
                  ? "bg-amber-950/80 text-amber-400 border border-amber-800/60 font-semibold"
                  : "text-slate-400 hover:text-amber-400"
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Skipped ({skippedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Limitations Card (if any) */}
      {limitations.length > 0 && (
        <div className="rounded-2xl bg-amber-950/20 border border-amber-800/40 p-4 space-y-3">
          <div
            onClick={() => setExpandedLimitations(!expandedLimitations)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold font-mono tracking-wide uppercase">
                Environmental & Scope Limitations ({limitations.length})
              </span>
            </div>
            <button className="text-amber-400 hover:text-amber-300">
              {expandedLimitations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {expandedLimitations && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {limitations.map((lim, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-900/90 border border-amber-900/40 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                      {lim.limitation_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-slate-200 text-xs font-medium leading-relaxed">{lim.message}</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong className="text-amber-300/90">Impact on findings: </strong>
                    {lim.impact_on_report}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checks List Grouped by Layer */}
      {filteredEvidence.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 font-mono">
          No checks match the current filter selection.
        </div>
      ) : (
        <div className="space-y-4">
          {layers.map((layer) => {
            const layerChecks = filteredEvidence.filter((c) => (c.target_layer || "General") === layer);
            if (layerChecks.length === 0) return null;

            return (
              <div key={layer} className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    {layer} Layer ({layerChecks.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {layerChecks.map((check) => {
                    const isPassed = check.status === "PASSED";
                    const isFailed = check.status === "FAILED";
                    const isSkipped = check.status === "SKIPPED" || check.status === "UNAVAILABLE";

                    return (
                      <div
                        key={check.check_id}
                        className={`rounded-xl border p-3 flex flex-col justify-between transition-colors ${
                          isFailed
                            ? "bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60"
                            : isPassed
                            ? "bg-slate-900/50 border-slate-800/80 hover:border-slate-700/70"
                            : "bg-amber-950/20 border-amber-900/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {isFailed && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            {isSkipped && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {check.check_name}
                            </span>
                          </div>

                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                              isPassed
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                                : isFailed
                                ? "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                                : "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                            }`}
                          >
                            {check.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed font-mono line-clamp-2">
                          {check.details}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
