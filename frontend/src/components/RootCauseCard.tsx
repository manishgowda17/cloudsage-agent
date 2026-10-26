"use client";

import React, { useState } from "react";
import { DiagnosisResult } from "@/types";
import {
  AlertTriangle,
  Check,
  Copy,
  Terminal,
  ShieldCheck,
  Wrench,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface RootCauseCardProps {
  diagnosis: DiagnosisResult;
  namespace?: string;
}

export const RootCauseCard: React.FC<RootCauseCardProps> = ({
  diagnosis,
  namespace,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPrevention, setShowPrevention] = useState(true);

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
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : confidenceScore >= 70
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-rose-700 bg-rose-50 border-rose-200";

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl overflow-hidden shadow-floating mb-8 transition-all">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              SRE Diagnosis & Root Cause Analysis
            </h3>
            {namespace && (
              <span className="text-[11px] text-slate-500 font-mono">
                Namespace: {namespace}
              </span>
            )}
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${confidenceColor}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Confidence: {confidenceScore}%
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Root Cause Callout with Coral Highlight */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50/90 to-rose-50/40 border border-rose-200/90 shadow-xs">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 mb-1 flex items-center gap-1">
            <span>Root Cause Identified</span>
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-950 leading-snug">
            {diagnosis.root_cause}
          </p>
        </div>

        {/* Operational Explanation */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Operational Impact & Explanation
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            {diagnosis.explanation}
          </p>
        </div>

        {/* Suggested Remediation Fix */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            Actionable Remediation
          </h4>
          <p className="text-sm text-slate-800 bg-blue-50/50 p-4 rounded-xl border border-blue-200/70 font-medium">
            {diagnosis.fix}
          </p>
        </div>

        {/* 1-Click Copyable kubectl Command Snippet */}
        {diagnosis.kubectl_command && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                Targeted Remediation Command
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Command
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800 flex items-center justify-between">
              <code className="text-emerald-400 select-all whitespace-pre">
                {diagnosis.kubectl_command}
              </code>
            </div>
          </div>
        )}

        {/* Prevention Recommendations */}
        {diagnosis.prevention && (
          <div className="pt-2">
            <button
              onClick={() => setShowPrevention(!showPrevention)}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900 py-1 transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Preventative Best Practices
              </span>
              {showPrevention ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showPrevention && (
              <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                {diagnosis.prevention}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
