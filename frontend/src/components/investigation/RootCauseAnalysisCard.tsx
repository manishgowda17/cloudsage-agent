"use client";

import React from "react";
import {
  AlertOctagon,
  Cpu,
  FileCheck2,
  HelpCircle,
  TrendingDown,
  Wrench,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { RootCauseItem } from "@/types";

interface RootCauseAnalysisCardProps {
  rootCauses: RootCauseItem[];
}

export const RootCauseAnalysisCard: React.FC<RootCauseAnalysisCardProps> = ({
  rootCauses,
}) => {
  if (!rootCauses || rootCauses.length === 0) return null;

  return (
    <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono text-white tracking-tight uppercase">
              Root Cause Analysis
            </h3>
            <p className="text-[11px] text-slate-400">
              Verified underlying causes isolated from surface symptoms and correlated by impact
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase">
          Evidence Confirmed
        </span>
      </div>

      {/* Root Causes List */}
      <div className="space-y-5">
        {rootCauses.map((rc, idx) => (
          <div
            key={rc.id || idx}
            className="rounded-2xl bg-slate-900/50 border border-slate-800/90 p-5 space-y-4 text-xs font-mono"
          >
            {/* Title & Rank */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  RANK #{rc.rank || idx + 1}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {rc.title}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Diagnosis Confidence:</span>
                <span className="text-xs font-black text-emerald-400">{rc.confidence}%</span>
              </div>
            </div>

            {/* Structured 6-Point Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. What Happened? */}
              <div className="p-3.5 rounded-xl bg-[#060A13] border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-cyan-400" /> 1. What happened?
                </span>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  {rc.what_happened}
                </p>
              </div>

              {/* 2. Why Did It Happen? */}
              <div className="p-3.5 rounded-xl bg-[#060A13] border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> 2. Why did it happen?
                </span>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  {rc.why_it_happened}
                </p>
              </div>

              {/* 3. Affected Resources */}
              <div className="p-3.5 rounded-xl bg-[#060A13] border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" /> 3. Affected Workloads ({rc.affected_resources.length})
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {rc.affected_resources.map((res, rIdx) => (
                    <span
                      key={rIdx}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[11px] text-cyan-300 font-bold"
                    >
                      {res}
                    </span>
                  ))}
                </div>
              </div>

              {/* 4. Potential Consequence */}
              <div className="p-3.5 rounded-xl bg-[#060A13] border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-amber-400" /> 4. Potential Consequence
                </span>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  {rc.potential_consequence}
                </p>
              </div>

              {/* 5. Supporting Evidence */}
              <div className="p-3.5 rounded-xl bg-[#060A13] border border-slate-800/80 space-y-1 md:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-slate-400" /> 5. Supporting Diagnostic Evidence
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-sans text-xs pt-0.5">
                  {rc.supporting_evidence.map((ev, eIdx) => (
                    <li key={eIdx}>{ev}</li>
                  ))}
                </ul>
              </div>

              {/* 6. Resolution Summary */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1 md:col-span-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" /> 6. How can it be resolved?
                </span>
                <p className="text-emerald-200 font-sans leading-relaxed text-xs font-medium">
                  {rc.resolution_summary}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
