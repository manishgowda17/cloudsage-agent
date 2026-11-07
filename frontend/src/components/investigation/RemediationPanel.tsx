"use client";

import React, { useState } from "react";
import {
  Wrench,
  Terminal,
  FileCode2,
  Check,
  Copy,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { RemediationRecommendation, DiagnosisResult } from "@/types";

interface RemediationPanelProps {
  remediations: RemediationRecommendation[];
  diagnosis?: DiagnosisResult | null;
  onOpenPostMortemForIncident?: (incident: DiagnosisResult) => void;
}

export const RemediationPanel: React.FC<RemediationPanelProps> = ({
  remediations,
  diagnosis,
  onOpenPostMortemForIncident,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedPatch, setCopiedPatch] = useState<string | null>(null);
  const [appliedFixes, setAppliedFixes] = useState<Record<string, boolean>>({});

  const handleCopyCmd = (id: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleCopyPatch = (id: string, patch: string) => {
    navigator.clipboard.writeText(patch);
    setCopiedPatch(id);
    setTimeout(() => setCopiedPatch(null), 2000);
  };

  const toggleApplied = (id: string) => {
    setAppliedFixes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "P0":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "P1":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "P2":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  if (!remediations || remediations.length === 0) return null;

  return (
    <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono text-white tracking-tight uppercase">
              Prioritized Remediation Protocol
            </h3>
            <p className="text-[11px] text-slate-400">
              Validated corrections ordered by operational priority (P0 to P3) with safety verification
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase">
          Safe Execution Mode
        </span>
      </div>

      {/* Remediation Cards */}
      <div className="space-y-4">
        {remediations.map((rem, idx) => {
          const isApplied = appliedFixes[rem.priority] ?? false;

          return (
            <div
              key={rem.priority || idx}
              className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 text-xs font-mono"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getPriorityBadge(
                      rem.priority
                    )}`}
                  >
                    {rem.priority_label}
                  </span>
                  <h4 className="text-sm font-bold text-white">{rem.title}</h4>
                </div>

                {rem.affected_resources.length > 0 && (
                  <div className="text-[10px] text-slate-400">
                    Targets: <span className="text-cyan-300 font-bold">{rem.affected_resources.join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Problem vs Correction Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-xs">
                <div className="p-3.5 rounded-xl bg-[#060911] border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                    Problem Statement
                  </span>
                  <p className="text-slate-300 leading-relaxed">{rem.problem_statement}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block">
                    Proposed Correction & Expected Outcome
                  </span>
                  <p className="text-emerald-200 leading-relaxed font-medium">
                    {rem.proposed_correction}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Outcome: {rem.expected_outcome}
                  </p>
                </div>
              </div>

              {/* Synthesized Patch Preview Diff (if available) */}
              {(rem.patch_diff || diagnosis?.patch_preview) && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-bold">
                      <FileCode2 className="w-3.5 h-3.5 text-cyan-400" /> Synthesized YAML Patch Diff
                    </span>
                    <button
                      onClick={() =>
                        handleCopyPatch(
                          rem.priority,
                          rem.patch_diff || diagnosis?.patch_preview || ""
                        )
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer text-[10px] font-bold"
                    >
                      {copiedPatch === rem.priority ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedPatch === rem.priority ? "Copied Diff" : "Copy Diff"}</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-[#05080F] border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed shadow-inner">
                    {rem.patch_diff || diagnosis?.patch_preview}
                  </pre>
                </div>
              )}

              {/* Executable kubectl Command Box */}
              {(rem.kubectl_command || diagnosis?.kubectl_command) && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Executable kubectl Command
                    </span>
                    <span className="text-[10px] text-slate-500">Explicit Operator Action Required</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#05080F] border border-slate-800 shadow-inner">
                    <code className="text-cyan-300 truncate font-mono text-xs">
                      {rem.kubectl_command || diagnosis?.kubectl_command}
                    </code>
                    <button
                      onClick={() =>
                        handleCopyCmd(
                          rem.priority,
                          rem.kubectl_command || diagnosis?.kubectl_command || ""
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer border border-cyan-400/30"
                    >
                      {copiedCmd === rem.priority ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedCmd === rem.priority ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Verification Steps */}
              {rem.verification_steps && (
                <div className="p-3 rounded-xl bg-[#060911] border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                    Verification & Health Confirmation
                  </span>
                  <p>{rem.verification_steps}</p>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleApplied(rem.priority)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isApplied
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700/80"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isApplied ? "Correction Applied & Verified" : "Mark Fix as Applied"}</span>
                  </button>

                  {onOpenPostMortemForIncident && diagnosis && (
                    <button
                      onClick={() => onOpenPostMortemForIncident(diagnosis)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Generate Post-Mortem</span>
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  Never silently overwrites live cluster manifests
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
