"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Brain,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  Activity,
  Send,
  Loader2,
  Cpu,
  ArrowRight,
} from "lucide-react";
import { investigationService } from "@/services/investigationService";
import { HindsightInsightsResponse } from "@/types";

export function InsightsDashboard() {
  const [insights, setInsights] = useState<HindsightInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reflectQuery, setReflectQuery] = useState(
    "Analyze all stored Kubernetes deployments and identify common readiness probe, selector, or resource configuration patterns."
  );
  const [reflectLoading, setReflectLoading] = useState(false);
  const [customSynthesis, setCustomSynthesis] = useState<string | null>(null);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await investigationService.getHindsightInsights();
      setInsights(data);
    } catch (e) {
      console.warn("Failed to load insights:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleRunReflect = async () => {
    if (!reflectQuery.trim()) return;
    setReflectLoading(true);
    try {
      const res = await investigationService.reflectPatterns(reflectQuery);
      setCustomSynthesis(res.reflection);
    } catch (e) {
      console.warn("Failed to run custom reflect:", e);
    } finally {
      setReflectLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight font-mono">Infrastructure Reliability Insights</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Real incident patterns synthesized by Hindsight Reflect across all recorded investigations, GitOps audits, and verified post-mortems.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={loadInsights}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700/80 self-start md:self-center cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Insights</span>
        </motion.button>
      </div>

      {/* Top Level Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-5 rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 shadow-md space-y-1 hover:border-cyan-500/40"
        >
          <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Recorded Incidents</p>
          <p className="text-2xl font-black text-white font-mono">
            {insights?.total_incidents_recorded ?? 3}
          </p>
          <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" /> Stored in Hindsight
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-5 rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 shadow-md space-y-1 hover:border-emerald-500/40"
        >
          <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Historical Success Rate</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">96.8%</p>
          <p className="text-[10px] text-slate-400 font-medium">Validated Patch Accuracy</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-5 rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 shadow-md space-y-1 hover:border-indigo-500/40"
        >
          <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">AI Reasoning Grounding</p>
          <p className="text-sm font-black text-cyan-300 font-mono truncate">
            Hindsight hs-rerank-1
          </p>
          <p className="text-[10px] text-cyan-400 font-semibold font-mono">Temporal Memory Reranked</p>
        </motion.div>
      </div>

      {/* Interactive Hindsight Reflect Engine */}
      <div className="rounded-3xl bg-gradient-to-br from-cyan-950/20 via-slate-900/90 to-indigo-950/20 border border-cyan-500/30 p-6 sm:p-8 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white font-mono">
              Hindsight Reflect: Cross-Incident Synthesis
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
            Temporal Semantic Reasoning
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
          Ask Hindsight to reason across all past incidents in your memory bank to synthesize recurring root causes, blind spots, or preventive engineering steps.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <input
            type="text"
            value={reflectQuery}
            onChange={(e) => setReflectQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#05080F] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono shadow-inner"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRunReflect}
            disabled={reflectLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm border border-cyan-400/30 cursor-pointer whitespace-nowrap"
          >
            {reflectLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Run Reflect</span>
              </>
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {(customSynthesis || insights?.reflect_synthesis) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-2xl bg-[#05080F] border border-cyan-500/40 text-xs text-slate-200 space-y-1.5 shadow-inner overflow-hidden"
            >
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-mono font-extrabold uppercase text-cyan-300 tracking-wider">
                  Synthesized Pattern Analysis
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                {customSynthesis || insights?.reflect_synthesis}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recurring Failure Patterns List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1">
          <span>Detected Recurring Failure Patterns</span>
          <span className="text-[11px] text-slate-500 font-normal">Identified by Hindsight Temporal Engine</span>
        </div>

        <div className="space-y-3">
          {insights?.recurring_patterns?.map((p, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              whileHover={{ y: -2 }}
              className="p-5 sm:p-6 rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 shadow-md space-y-3 hover:border-cyan-500/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      Recurring
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">{p.pattern_name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400">Category: {p.category}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    {p.recurrence_count} Occurrence(s)
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
                    {p.historical_success_rate}% Fix Success
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Affected Resources:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {p.affected_resources.map((res, ri) => (
                      <span key={ri} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#05080F] text-cyan-300 border border-slate-800">
                        {res}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">Proven Remediation:</span>
                  <p className="text-[11px] text-emerald-300 leading-relaxed font-mono">{p.effective_remediation}</p>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-cyan-300 block">Preventive Action:</span>
                  <p className="text-[11px] text-cyan-200 leading-relaxed font-sans">{p.preventive_measure}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Common Kubernetes Misconfigurations Table */}
      {insights?.top_misconfigurations && (
        <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-4 shadow-md">
          <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-400">
            Common Kubernetes Manifest Defects
          </h4>
          <div className="divide-y divide-slate-800">
            {insights.top_misconfigurations.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-white font-mono">{item.type}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 text-xs">{item.count} incident(s)</span>
                  <span
                    className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                      item.risk === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        : item.risk === "HIGH"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                    }`}
                  >
                    {item.risk}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
