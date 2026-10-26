"use client";

import React, { useState } from "react";
import { DiagnosisResult } from "@/types";
import { AlertTriangle, Check, Copy, Terminal, ShieldCheck, Wrench, Lightbulb } from "lucide-react";

interface RootCauseCardProps {
  diagnosis: DiagnosisResult;
  namespace?: string;
}

export const RootCauseCard: React.FC<RootCauseCardProps> = ({ diagnosis, namespace }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (diagnosis.kubectl_command) {
      navigator.clipboard.writeText(diagnosis.kubectl_command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confidenceScore = diagnosis.confidence || 90;
  const confidenceColor =
    confidenceScore >= 85
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : confidenceScore >= 70
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-rose-400 bg-rose-500/10 border-rose-500/20";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-6">
      {/* Top Banner */}
      <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-semibold text-white">Diagnosis & Root Cause Analysis</h3>
          {namespace && (
            <span className="text-[11px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
              ns: {namespace}
            </span>
          )}
        </div>

        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${confidenceColor}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Confidence: {confidenceScore}%
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Root Cause Callout */}
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-1">
            Root Cause Identified
          </p>
          <p className="text-base font-semibold text-white leading-snug">
            {diagnosis.root_cause}
          </p>
        </div>

        {/* Operational Explanation */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Operational Impact & Explanation
          </h4>
          <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/40 p-3 rounded-lg border border-slate-800">
            {diagnosis.explanation}
          </p>
        </div>

        {/* Suggested Fix */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-blue-400" />
            Suggested Remediation Fix
          </h4>
          <p className="text-sm text-slate-200 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
            {diagnosis.fix}
          </p>
        </div>

        {/* kubectl Command Snippet */}
        {diagnosis.kubectl_command && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Recommended kubectl Command
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-black/60 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 overflow-x-auto select-all">
              {diagnosis.kubectl_command}
            </div>
          </div>
        )}

        {/* Prevention */}
        {diagnosis.prevention && (
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span className="font-semibold text-slate-300">SRE Prevention Tip: </span>
            {diagnosis.prevention}
          </div>
        )}
      </div>
    </div>
  );
};
