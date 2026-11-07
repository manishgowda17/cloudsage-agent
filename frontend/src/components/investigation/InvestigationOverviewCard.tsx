"use client";

import React from "react";
import {
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  GitBranch,
  Server,
  FileCode2,
  Clock,
  Shield,
  Activity,
  Cpu,
} from "lucide-react";
import { SourceInformation, InvestigationMetadata, OverallAssessment } from "@/types";

interface InvestigationOverviewCardProps {
  metadata: InvestigationMetadata;
  source: SourceInformation;
  assessment: OverallAssessment;
}

export const InvestigationOverviewCard: React.FC<InvestigationOverviewCardProps> = ({
  metadata,
  source,
  assessment,
}) => {
  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "github":
        return <GitBranch className="w-4 h-4 text-cyan-400" />;
      case "zip":
        return <FolderArchive className="w-4 h-4 text-amber-400" />;
      case "yaml":
        return <FileCode2 className="w-4 h-4 text-blue-400" />;
      case "helm":
        return <Layers className="w-4 h-4 text-indigo-400" />;
      default:
        return <Server className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "UNHEALTHY":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "ATTENTION_REQUIRED":
        return "bg-amber-400/10 text-amber-300 border-amber-400/30";
      case "HEALTHY":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  // Format ISO timestamp into clean local string
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " (" + d.toLocaleDateString() + ")";
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black font-mono tracking-wider uppercase border flex items-center gap-1.5 ${getStatusBadge(
                assessment.status
              )}`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>{assessment.status_display}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase">
              {assessment.validation_type === "LIVE_TELEMETRY" ? "Live Cluster Telemetry" : "Static AST Verification"}
            </span>

            <span className="text-[11px] font-mono text-slate-400">
              ID: {metadata.id}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {metadata.title}
          </h2>
        </div>

        {/* Confidence & Timing Pill */}
        <div className="flex items-center gap-3 self-start md:self-center shrink-0">
          <div className="px-3.5 py-2 rounded-2xl bg-[#060A13] border border-slate-800 text-right">
            <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Confidence</p>
            <p className="text-sm font-black font-mono text-emerald-400">{assessment.confidence}%</p>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-[#060A13] border border-slate-800 text-right">
            <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Duration</p>
            <p className="text-sm font-black font-mono text-cyan-400">{metadata.duration_ms || 320}ms</p>
          </div>
        </div>
      </div>

      {/* Target Source Grid Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            {getSourceIcon(source.source_type)} Source Type
          </span>
          <p className="text-white font-bold capitalize truncate">{source.source_type}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Target Source / Name
          </span>
          <p className="text-cyan-300 font-bold truncate" title={source.source_name}>
            {source.source_name}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Resources Inspected
          </span>
          <p className="text-white font-bold">{source.resources_count} Workload(s)</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Executed At
          </span>
          <p className="text-slate-300 font-medium truncate">{formatTime(metadata.timestamp)}</p>
        </div>
      </div>
    </div>
  );
};
