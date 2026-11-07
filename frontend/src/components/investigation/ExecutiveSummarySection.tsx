"use client";

import React, { useState } from "react";
import {
  Sparkles,
  HelpCircle,
  Search,
  AlertOctagon,
  TrendingDown,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ExecutiveSummary, OverallAssessment } from "@/types";

interface ExecutiveSummarySectionProps {
  summary: ExecutiveSummary;
  assessment: OverallAssessment;
}

export const ExecutiveSummarySection: React.FC<ExecutiveSummarySectionProps> = ({
  summary,
  assessment,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullNarrative, setShowFullNarrative] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.plain_text_summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono text-white tracking-tight uppercase">
              Executive SRE Summary
            </h3>
            <p className="text-[11px] text-slate-400">
              Clear diagnostic synthesis answering 5 essential reliability questions
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono text-cyan-300 transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy Brief"}</span>
        </button>
      </div>

      {/* The 5 Key Executive Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Q1: What was investigated? */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Search className="w-3 h-3 text-cyan-400" /> 1. What was investigated?
          </span>
          <p className="text-xs text-slate-200 leading-relaxed font-normal">
            {summary.what_was_investigated}
          </p>
        </div>

        {/* Q2: What was discovered? */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3 text-indigo-400" /> 2. What was discovered?
          </span>
          <p className="text-xs text-slate-200 leading-relaxed font-normal">
            {summary.what_was_discovered}
          </p>
        </div>

        {/* Q3: Most important problem */}
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1.5 md:col-span-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <AlertOctagon className="w-3 h-3 text-rose-400" /> 3. What is the most important problem?
          </span>
          <p className="text-xs sm:text-sm text-rose-200 leading-relaxed font-bold font-mono">
            {summary.most_important_problem}
          </p>
        </div>

        {/* Q4: Potential Impact */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3 text-amber-400" /> 4. Potential Impact
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {summary.potential_impact}
          </p>
        </div>

        {/* Q5: What should the user do next? */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3 text-emerald-400" /> 5. Recommended Action
          </span>
          <p className="text-xs text-emerald-200 leading-relaxed font-normal">
            {summary.recommended_action}
          </p>
        </div>
      </div>

      {/* Expandable Plain Text Narrative */}
      <div className="pt-1">
        <button
          onClick={() => setShowFullNarrative(!showFullNarrative)}
          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
        >
          <span>{showFullNarrative ? "Hide Full Executive Narrative" : "View Full Executive Narrative"}</span>
          {showFullNarrative ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showFullNarrative && (
          <div className="mt-2.5 p-4 rounded-2xl bg-[#060911] border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono">
            {summary.plain_text_summary}
          </div>
        )}
      </div>
    </div>
  );
};
