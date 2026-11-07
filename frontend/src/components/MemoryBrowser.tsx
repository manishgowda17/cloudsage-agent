"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Tag,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  BookmarkCheck,
  ShieldAlert,
} from "lucide-react";
import { investigationService } from "@/services/investigationService";
import { HindsightMemoryItem } from "@/types";

interface MemoryBrowserProps {
  userBankId?: string;
  onSelectMemorySnippet?: (text: string) => void;
}

export function MemoryBrowser({ userBankId, onSelectMemorySnippet }: MemoryBrowserProps) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [memories, setMemories] = useState<HindsightMemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tagsList = [
    { label: "All Records", tag: null },
    { label: "Probes", tag: "probe-failure" },
    { label: "CrashLoop", tag: "crashloop" },
    { label: "OOMKilled", tag: "oom" },
    { label: "Selectors", tag: "selector-mismatch" },
    { label: "Post-Mortems", tag: "post-mortem" },
    { label: "Validated Fixes", tag: "status:validated_fix" },
  ];

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const data = await investigationService.getHindsightMemories(query, selectedTag || undefined);
      setMemories(data.memories || []);
      setTotalCount(data.total_count || 0);
    } catch (e) {
      console.warn("Failed to query Hindsight memory bank:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [selectedTag]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center shadow-inner">
              <Brain className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight font-mono">Operational Incident Memory</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Browse and search verified historical incident memories retained across cluster investigations, GitOps audits, and SRE post-mortems.
          </p>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMemories()}
              placeholder="Search memories (e.g. readiness probe, Exit 137, selector mismatch)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 font-mono shadow-inner"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={fetchMemories}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm border border-cyan-400/30 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Search Bank</span>
          </motion.button>
        </div>

        {/* Tag Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {tagsList.map((t, idx) => {
            const isSel = selectedTag === t.tag;
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTag(t.tag)}
                className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition cursor-pointer ${
                  isSel
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {t.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Memory Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1">
          <span>Stored Incident Memories ({memories.length})</span>
          <span className="text-[11px] text-slate-500 font-normal">Ranked by Hindsight hs-rerank-1 Cross-Encoder</span>
        </div>

        {memories.length === 0 && !loading && (
          <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-12 text-center space-y-3">
            <Brain className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white font-mono">No Memories Matching Filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Run an investigation or submit an SRE post-mortem to retain verified incident resolutions into Hindsight long-term memory.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((m, idx) => {
            const cardId = m.id || `mem-${idx}`;
            const isExpanded = expandedId === cardId;
            const isPostMortem = m.tags?.some((t) => t.toLowerCase().includes("post-mortem"));

            return (
              <motion.div
                key={cardId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className={`rounded-3xl bg-[#0F172A]/85 border transition-all p-5 sm:p-6 space-y-3 flex flex-col justify-between shadow-sm hover:shadow-md ${
                  isPostMortem ? "border-indigo-500/40 hover:border-indigo-400/60" : "border-slate-800 hover:border-cyan-500/40"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/30">
                        {m.id?.slice(0, 14) || `mem-${idx}`}
                      </span>
                      {isPostMortem && (
                        <span className="font-mono text-[9px] font-extrabold uppercase text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30">
                          Post-Mortem
                        </span>
                      )}
                    </div>
                    {m.similarity_score && (
                      <span className="font-mono text-[11px] font-black text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                        {m.similarity_score}% Match
                      </span>
                    )}
                  </div>

                  <div
                    onClick={() => setExpandedId(isExpanded ? null : cardId)}
                    className="p-3.5 rounded-2xl bg-[#05080F] border border-slate-850 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner cursor-pointer"
                  >
                    {isExpanded ? m.text : `${m.text.slice(0, 240)}${m.text.length > 240 ? "..." : ""}`}
                  </div>

                  {m.text.length > 240 && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : cardId)}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <span>{isExpanded ? "Collapse context" : "Expand full memory context"}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {m.tags?.slice(0, 3).map((t, ti) => (
                      <span key={ti} className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                        {t}
                      </span>
                    ))}
                  </div>

                  {onSelectMemorySnippet && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onSelectMemorySnippet(m.text)}
                      className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Load into Investigation</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
