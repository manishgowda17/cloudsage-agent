"use client";

import React, { useState } from "react";
import { DiagnosisResult, ManifestFinding } from "@/types";
import {
  AlertTriangle,
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Terminal,
  ShieldCheck,
  Wrench,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCode,
  Tag,
  Info,
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
      ? "text-emerald-800 bg-emerald-50 border-emerald-200"
      : confidenceScore >= 70
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-rose-800 bg-rose-50 border-rose-200";

  return (
    <div className="relative bg-white/90 backdrop-blur-3xl border border-sky-100/90 rounded-3xl overflow-hidden shadow-[0_30px_70px_-15px_rgba(30,58,138,0.12)] mb-8 transition-all animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/60 px-6 sm:px-8 py-4.5 border-b border-sky-100/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 shadow-2xs">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              SRE Diagnosis & Root Cause Synthesis
            </h3>
            {namespace && (
              <span className="text-[11px] text-slate-500 font-mono font-semibold">
                Context Target: {namespace}
              </span>
            )}
          </div>
        </div>

        <div className={`px-3.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${confidenceColor}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Confidence: {confidenceScore}%
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Root Cause Callout with Soft Blush Accent */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-50/90 via-pink-50/40 to-transparent border border-rose-200/90 shadow-2xs">
          <p className="text-[11px] font-black uppercase tracking-wider text-rose-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Root Cause Identified</span>
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-950 leading-snug">
            {diagnosis.root_cause}
          </p>
        </div>

        {/* Operational Explanation */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Operational Impact & Explanation
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            {diagnosis.explanation}
          </p>
        </div>

        {/* Static Manifest Findings Breakdown */}
        {diagnosis.findings && diagnosis.findings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                Detected Manifest Defects ({diagnosis.findings.length})
              </h4>
              <div className="flex items-center gap-2">
                {diagnosis.findings.filter((f) => f.severity === "ERROR").length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {diagnosis.findings.filter((f) => f.severity === "ERROR").length} Error(s)
                  </span>
                )}
                {diagnosis.findings.filter((f) => f.severity === "WARNING").length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {diagnosis.findings.filter((f) => f.severity === "WARNING").length} Warning(s)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {diagnosis.findings.map((f, idx) => {
                const isError = f.severity === "ERROR";
                const isWarning = f.severity === "WARNING";
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isError
                        ? "bg-rose-50/50 border-rose-200/90 hover:bg-rose-50/80"
                        : isWarning
                        ? "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/70"
                        : "bg-sky-50/40 border-sky-200/80 hover:bg-sky-50/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isError
                              ? "bg-rose-600 text-white"
                              : isWarning
                              ? "bg-amber-600 text-white"
                              : "bg-sky-600 text-white"
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 bg-white/80 px-2.5 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                          {f.resource}
                        </span>
                        {f.field && (
                          <span className="text-[11px] font-mono text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md">
                            field: <strong className="text-slate-800">{f.field}</strong>
                          </span>
                        )}
                      </div>

                      {f.file && (
                        <span className="text-[11px] font-mono font-medium text-slate-500 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {f.file}
                          {f.line ? `:${f.line}` : ""}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-800 font-medium leading-relaxed mb-2.5">
                      {f.explanation}
                    </p>

                    <div className="bg-white/80 rounded-xl p-2.5 border border-slate-200/80 flex items-start gap-2 text-xs">
                      <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold text-slate-700 mr-1.5">Recommended Fix:</span>
                        <span className="text-slate-800 font-mono text-[11px] select-all">{f.fix}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* When findings array is present and length is 0 (Valid Manifest) */}
        {diagnosis.findings && diagnosis.findings.length === 0 && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                All Static Checks Passed
              </p>
              <p className="text-xs text-emerald-800 leading-snug">
                No issues detected. Manifest syntax, resource schemas, container ports, probes, and resource limits conform to production standards.
              </p>
            </div>
          </div>
        )}

        {/* Suggested Remediation Fix */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-blue-700" />
            Actionable Remediation Strategy
          </h4>
          <p className="text-xs sm:text-sm text-slate-900 bg-sky-50/50 p-4 rounded-2xl border border-sky-200/70 font-semibold leading-relaxed">
            {diagnosis.fix}
          </p>
        </div>

        {/* Targeted Remediation Command */}
        {diagnosis.kubectl_command && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                Targeted Remediation Command
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 shadow-2xs"
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
            <div className="bg-slate-950 text-slate-100 p-4.5 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800 flex items-center justify-between">
              <code className="text-emerald-400 select-all whitespace-pre font-bold">
                {diagnosis.kubectl_command}
              </code>
            </div>
          </div>
        )}

        {/* Preventative Recommendations */}
        {diagnosis.prevention && (
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowPrevention(!showPrevention)}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-700 hover:text-slate-950 py-1 transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Preventative Best Practices
              </span>
              {showPrevention ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {showPrevention && (
              <p className="mt-2 text-xs text-slate-600 bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 leading-relaxed">
                {diagnosis.prevention}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
