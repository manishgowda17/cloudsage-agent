"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  Search,
  Filter,
  Terminal,
  Zap,
} from "lucide-react";
import { investigationService } from "@/services/investigationService";
import { RunbookItem } from "@/types";

export function RunbookCatalog() {
  const [runbooks, setRunbooks] = useState<RunbookItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>("RB-K8S-001");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { label: "All Categories", val: null },
    { label: "Probes & Lifecycle", val: "Probes" },
    { label: "Application Crash", val: "Application" },
    { label: "Image & Registry", val: "Image" },
    { label: "Resource Management", val: "Resource" },
    { label: "Networking & Routing", val: "Networking" },
    { label: "Security & RBAC", val: "Security" },
  ];

  useEffect(() => {
    async function load() {
      try {
        const data = await investigationService.getRunbooks(selectedCategory || undefined);
        setRunbooks(data);
      } catch (e) {
        console.warn("Failed to load runbooks:", e);
      }
    }
    load();
  }, [selectedCategory]);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filtered = runbooks.filter((rb) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rb.title.toLowerCase().includes(q) ||
      rb.id.toLowerCase().includes(q) ||
      rb.summary.toLowerCase().includes(q) ||
      rb.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center shadow-inner">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight font-mono">SRE Battle-Tested Runbook Library</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Curated standard operating procedures (SOPs) matched by the AI agent to resolve specific Kubernetes failure signatures.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold font-mono px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 self-start md:self-center shadow-sm">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Production SOPs</span>
        </div>
      </motion.div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-5 space-y-4 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search runbooks by title, category, or symptom (e.g. readiness, crashloop, oom)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono shadow-inner"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          {categories.map((c, idx) => {
            const isSel = selectedCategory === c.val;
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(c.val)}
                className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition cursor-pointer ${
                  isSel
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {c.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Runbook List */}
      <div className="space-y-4">
        {filtered.map((rb, idx) => {
          const isExp = expandedId === rb.id;
          return (
            <motion.div
              key={rb.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 overflow-hidden shadow-md hover:border-cyan-500/40 transition-all"
            >
              <div
                onClick={() => setExpandedId(isExp ? null : rb.id)}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-850/80 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {rb.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                      {rb.category}
                    </span>
                    <h3 className="font-bold text-white text-sm font-mono">{rb.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{rb.summary}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">Success Rate</p>
                    <p className="text-xs font-mono font-black text-emerald-400">{rb.historical_success_rate}%</p>
                  </div>
                  <div className="p-1 rounded-lg bg-slate-900 text-slate-400">
                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Accordion Expansion */}
              <AnimatePresence>
                {isExp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 border-t border-slate-800 space-y-6 bg-[#080C14] text-xs">
                      {/* Prerequisites */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                          Prerequisites & Verification Checklist
                        </h4>
                        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-slate-300">
                          {rb.prerequisites.map((p, pi) => (
                            <div key={pi} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step-by-Step Resolution */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                          Step-by-Step Execution Plan
                        </h4>
                        <div className="space-y-2.5">
                          {rb.steps.map((st) => (
                            <div
                              key={st.step_number}
                              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-xs font-mono">
                                  Step {st.step_number}: {st.title}
                                </span>
                                {st.verification && (
                                  <span className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    Verify: {st.verification}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed">{st.description}</p>
                              {st.command && (
                                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#05080F] font-mono text-xs text-cyan-300 border border-slate-800">
                                  <code className="truncate">{st.command}</code>
                                  <button
                                    onClick={() => handleCopy(st.command!)}
                                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[10px] font-mono font-bold transition flex items-center gap-1 shrink-0 cursor-pointer border border-cyan-400/30"
                                  >
                                    {copiedCmd === st.command ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedCmd === st.command ? "Copied" : "Copy"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Operational Safeguards & Blast Radius */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-1">
                          <p className="font-bold text-xs flex items-center gap-1.5 text-amber-300 font-mono">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Rollback Guidance
                          </p>
                          <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">{rb.rollback_guidance}</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 space-y-1">
                          <p className="font-bold text-xs flex items-center gap-1.5 text-cyan-300 font-mono">
                            <Shield className="w-3.5 h-3.5 text-cyan-400" /> Blast Radius & Risks
                          </p>
                          <p className="text-[11px] text-cyan-200/90 leading-relaxed font-sans">{rb.risks_and_blast_radius}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
