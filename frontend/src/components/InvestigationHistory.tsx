"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { InvestigationHistoryItem } from "@/types";

interface InvestigationHistoryProps {
  items: InvestigationHistoryItem[];
  onSelectHistoryItem?: (item: InvestigationHistoryItem) => void;
}

export const InvestigationHistory: React.FC<InvestigationHistoryProps> = ({
  items,
  onSelectHistoryItem,
}) => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.root_cause?.toLowerCase().includes(q) ||
      item.namespace?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q) ||
      item.explanation?.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item: InvestigationHistoryItem) => {
    if (onSelectHistoryItem) {
      onSelectHistoryItem(item);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="rounded-3xl bg-[#0F172A]/85 backdrop-blur-2xl border border-slate-800/80 p-12 text-center shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <History className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-black text-white font-mono">
          No Past Investigations Recorded
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          Execute an investigation on a live cluster, GitHub repository, or YAML manifest to record your first diagnostic triage in the database.
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#0F172A]/85 backdrop-blur-2xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-lg">
      {/* Header Bar */}
      <div className="px-6 sm:px-8 py-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-mono">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Diagnostic Incident History</span>
          </h3>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search history by root cause..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#080C14] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 transition shadow-inner font-medium"
          />
        </div>
      </div>

      {/* Observability Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold font-mono">
              <th className="py-3.5 px-6 sm:px-8">Timestamp</th>
              <th className="py-3.5 px-4">Namespace</th>
              <th className="py-3.5 px-4">Diagnosed Root Cause</th>
              <th className="py-3.5 px-4">Confidence</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-6 sm:px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredItems.map((item, idx) => {
              const rowId = item.id || idx;
              const isExpanded = expandedId === rowId;
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Recent";

              return (
                <React.Fragment key={rowId}>
                  <tr
                    className={`transition-colors cursor-pointer group ${
                      isExpanded ? "bg-slate-850/90" : "hover:bg-slate-800/40"
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : rowId)}
                  >
                    <td className="py-4 px-6 sm:px-8 text-slate-400 font-mono whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formattedDate}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-[11px] font-bold border border-slate-800 text-cyan-300">
                        {item.namespace || "default"}
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-sm">
                      <p className="font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {item.root_cause}
                      </p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        {item.confidence || 90}%
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        {item.status || "Completed"}
                      </span>
                    </td>
                    <td className="py-4 px-6 sm:px-8 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-500/30 transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Load</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <div className="p-1 rounded text-slate-500">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Incident Details Drawer */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="p-0 border-b border-slate-800 bg-[#0A0E17]/80">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="p-5 sm:p-6 space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                                Detailed Root Cause Analysis
                              </span>
                              <p className="text-slate-300 leading-relaxed font-mono text-[11px] mt-1">
                                {item.explanation || item.root_cause}
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-1">
                              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-400">
                                Suggested Remediation
                              </span>
                              <p className="text-emerald-200 leading-relaxed font-mono text-[11px] mt-1">
                                {item.suggested_fix || "Inspect resource configuration and apply schema patches."}
                              </p>
                            </div>
                          </div>

                          {item.kubectl_command && (
                            <div className="p-3.5 rounded-2xl bg-[#05080F] border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between gap-3 shadow-inner">
                              <code className="truncate">{item.kubectl_command}</code>
                              <button
                                type="button"
                                onClick={() => handleSelect(item)}
                                className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer border border-cyan-400/30"
                              >
                                <span>Inspect in Workspace</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
