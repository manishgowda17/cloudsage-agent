"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Layers,
  FastForward,
  XCircle,
  Info,
} from "lucide-react";
import { InvestigationStatistics } from "@/types";

interface InvestigationStatsBarProps {
  stats?: InvestigationStatistics;
  statistics?: InvestigationStatistics;
}

export const InvestigationStatsBar: React.FC<InvestigationStatsBarProps> = ({
  stats: propStats,
  statistics,
}) => {
  const stats = propStats || statistics || {
    total_resources_inspected: 0,
    total_checks_performed: 0,
    errors_count: 0,
    warnings_count: 0,
    info_count: 0,
    passed_checks_count: 0,
    failed_checks_count: 0,
    skipped_checks_count: 0,
    security_findings_count: 0,
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono select-none">
      {/* 1. Errors */}
      <div className={`p-3 rounded-2xl border transition-all ${
        stats.errors_count > 0
          ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
          : "bg-slate-900/60 border-slate-800/80 text-slate-400"
      }`}>
        <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
          <XCircle className="w-3.5 h-3.5 text-rose-400" /> Errors
        </span>
        <p className={`text-lg sm:text-xl font-black mt-1 ${stats.errors_count > 0 ? "text-rose-400" : "text-slate-400"}`}>
          {stats.errors_count}
        </p>
      </div>

      {/* 2. Warnings */}
      <div className={`p-3 rounded-2xl border transition-all ${
        stats.warnings_count > 0
          ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
          : "bg-slate-900/60 border-slate-800/80 text-slate-400"
      }`}>
        <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Warnings
        </span>
        <p className={`text-lg sm:text-xl font-black mt-1 ${stats.warnings_count > 0 ? "text-amber-300" : "text-slate-400"}`}>
          {stats.warnings_count}
        </p>
      </div>

      {/* 3. Passed Checks */}
      <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
        <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Passed Checks
        </span>
        <p className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
          {stats.passed_checks_count}
        </p>
      </div>

      {/* 4. Resources Inspected */}
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-slate-300">
        <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
          <Layers className="w-3.5 h-3.5 text-indigo-400" /> Resources
        </span>
        <p className="text-lg sm:text-xl font-black text-white mt-1">
          {stats.total_resources_inspected}
        </p>
      </div>

      {/* 5. Failed Checks */}
      <div className={`p-3 rounded-2xl border transition-all ${
        stats.failed_checks_count > 0
          ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
          : "bg-slate-900/60 border-slate-800/80 text-slate-400"
      }`}>
        <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Failed Rules
        </span>
        <p className={`text-lg sm:text-xl font-black mt-1 ${stats.failed_checks_count > 0 ? "text-rose-400" : "text-slate-400"}`}>
          {stats.failed_checks_count}
        </p>
      </div>

      {/* 6. Skipped Checks */}
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-slate-400">
        <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
          <FastForward className="w-3.5 h-3.5 text-slate-400" /> Skipped
        </span>
        <p className="text-lg sm:text-xl font-black text-slate-300 mt-1">
          {stats.skipped_checks_count}
        </p>
      </div>

      {/* 7. Security Findings */}
      <div className={`p-3 rounded-2xl border transition-all col-span-2 sm:col-span-1 ${
        stats.security_findings_count > 0
          ? "bg-purple-950/30 border-purple-500/40 text-purple-300"
          : "bg-slate-900/60 border-slate-800/80 text-slate-400"
      }`}>
        <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
          <Shield className="w-3.5 h-3.5 text-purple-400" /> Security
        </span>
        <p className={`text-lg sm:text-xl font-black mt-1 ${stats.security_findings_count > 0 ? "text-purple-300" : "text-slate-400"}`}>
          {stats.security_findings_count}
        </p>
      </div>
    </div>
  );
};
