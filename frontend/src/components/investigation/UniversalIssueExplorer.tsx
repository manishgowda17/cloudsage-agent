"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileCode2,
  AlertTriangle,
  AlertCircle,
  Info,
  Maximize2,
  Minimize2,
  BookOpen,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { NormalizedFinding, FindingGroup } from "@/types";

interface UniversalIssueExplorerProps {
  findings: NormalizedFinding[];
  findingGroups: FindingGroup[];
}

export const UniversalIssueExplorer: React.FC<UniversalIssueExplorerProps> = ({
  findings,
  findingGroups,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grouped" | "individual">("grouped");
  const [sortBy, setSortBy] = useState<"priority" | "resource" | "category">("priority");

  // Accordion Expansions State
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [technicalTabState, setTechnicalTabState] = useState<Record<string, "simple" | "technical">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic Categories from Actual Data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    findings.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    return Array.from(cats);
  }, [findings]);

  // Filtering & Sorting Findings
  const filteredFindings = useMemo(() => {
    return findings
      .filter((f) => {
        if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
        if (categoryFilter !== "ALL" && f.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = f.title.toLowerCase().includes(q);
          const matchResource = f.affected_resource.toLowerCase().includes(q);
          const matchFile = (f.file_path || "").toLowerCase().includes(q);
          const matchExpl = f.technical_explanation.toLowerCase().includes(q);
          const matchSimple = f.simple_explanation.toLowerCase().includes(q);
          return matchTitle || matchResource || matchFile || matchExpl || matchSimple;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const rank: Record<string, number> = { ERROR: 3, WARNING: 2, INFO: 1 };
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        }
        if (sortBy === "resource") {
          return a.affected_resource.localeCompare(b.affected_resource);
        }
        return a.category.localeCompare(b.category);
      });
  }, [findings, severityFilter, categoryFilter, searchQuery, sortBy]);

  // Filtering & Sorting Groups
  const filteredGroups = useMemo(() => {
    return findingGroups
      .filter((g) => {
        if (severityFilter !== "ALL" && g.severity !== severityFilter) return false;
        if (categoryFilter !== "ALL" && g.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = g.title.toLowerCase().includes(q);
          const matchDesc = g.pattern_description.toLowerCase().includes(q);
          const matchRes = g.affected_resources.some((r) => r.toLowerCase().includes(q));
          return matchTitle || matchDesc || matchRes;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const rank: Record<string, number> = { ERROR: 3, WARNING: 2, INFO: 1 };
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        }
        return b.occurrence_count - a.occurrence_count;
      });
  }, [findingGroups, severityFilter, categoryFilter, searchQuery, sortBy]);

  // Toggle Single Expand
  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand / Collapse All
  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    if (viewMode === "grouped") {
      filteredGroups.forEach((g) => (next[g.group_id] = true));
    } else {
      filteredFindings.forEach((f) => (next[f.id] = true));
    }
    setExpandedItems(next);
  };

  const handleCollapseAll = () => {
    setExpandedItems({});
  };

  // Copy helper with visual feedback
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityPill = (sev: string) => {
    switch (sev) {
      case "ERROR":
        return "bg-rose-500/15 text-rose-300 border-rose-500/40";
      case "WARNING":
        return "bg-amber-500/15 text-amber-300 border-amber-500/40";
      default:
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
    }
  };

  return (
    <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-black font-mono text-white tracking-tight uppercase flex items-center gap-2">
            <span>Universal Diagnostic Findings Explorer</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {findings.length} Finding(s) across {findingGroups.length} Group(s)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Search, filter, and inspect verified defects with dual simple vs technical presentation levels
          </p>
        </div>

        {/* View Mode Toggle: Grouped vs Individual */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="inline-flex p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Intelligent Groups ({filteredGroups.length})
            </button>
            <button
              onClick={() => setViewMode("individual")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                viewMode === "individual"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Individual Findings ({filteredFindings.length})
            </button>
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExpandAll}
              title="Expand All"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCollapseAll}
              title="Collapse All"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Search & Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        {/* Search Input */}
        <div className="relative flex items-center lg:col-span-2">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by workload, filename, rule, or error message..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#060911] border border-slate-800 focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500 shadow-inner"
          />
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#060911] border border-slate-800 focus:outline-none focus:border-cyan-400 text-slate-200 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="ERROR">Errors Only</option>
            <option value="WARNING">Warnings Only</option>
            <option value="INFO">Informational Only</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#060911] border border-slate-800 focus:outline-none focus:border-cyan-400 text-slate-200 cursor-pointer truncate"
          >
            <option value="ALL">All Issue Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Findings Display Canvas */}
      {viewMode === "grouped" ? (
        /* --- GROUPED FINDINGS VIEW --- */
        <div className="space-y-3.5">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#060911] border border-slate-800 text-slate-400 text-xs font-mono">
              No finding groups match the selected filter criteria.
            </div>
          ) : (
            filteredGroups.map((grp) => {
              const isExpanded = expandedItems[grp.group_id] ?? false;

              return (
                <div
                  key={grp.group_id}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition overflow-hidden text-xs font-mono"
                >
                  {/* Group Header Banner */}
                  <div
                    onClick={() => toggleExpand(grp.group_id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-850 transition"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${getSeverityPill(
                          grp.severity
                        )}`}
                      >
                        {grp.severity}
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                            {grp.title}
                          </h4>
                          <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/30 font-bold">
                            {grp.occurrence_count} Occurrence(s)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                          {grp.pattern_description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        {grp.affected_resources.length} resource(s) affected
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expandable Group Body */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#060A13] space-y-4">
                      {/* Affected Resources List */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">
                          Affected Kubernetes Workloads:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {grp.affected_resources.map((res, ri) => (
                            <span
                              key={ri}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-cyan-300 font-bold text-xs"
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Common Verified Fix */}
                      <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start justify-between gap-3 text-emerald-200">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                            Recommended Unified Correction
                          </span>
                          <p className="text-xs font-sans leading-relaxed">{grp.common_fix}</p>
                        </div>
                        <button
                          onClick={() => handleCopyText(`grp-fix-${grp.group_id}`, grp.common_fix)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedId === `grp-fix-${grp.group_id}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === `grp-fix-${grp.group_id}` ? "Copied" : "Copy Fix"}</span>
                        </button>
                      </div>

                      {/* Individual Findings Breakdown inside Group */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Detailed Occurrences ({grp.findings.length}):
                        </span>
                        {grp.findings.map((f) => (
                          <FindingDetailCard
                            key={f.id}
                            finding={f}
                            isExpanded={expandedItems[f.id] ?? false}
                            activeTab={technicalTabState[f.id] ?? "simple"}
                            onToggleExpand={() => toggleExpand(f.id)}
                            onSetTab={(tab) =>
                              setTechnicalTabState((prev) => ({ ...prev, [f.id]: tab }))
                            }
                            onCopy={handleCopyText}
                            copiedId={copiedId}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* --- INDIVIDUAL FINDINGS VIEW --- */
        <div className="space-y-3">
          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#060911] border border-slate-800 text-slate-400 text-xs font-mono">
              No individual findings match the selected filter criteria.
            </div>
          ) : (
            filteredFindings.map((f) => (
              <FindingDetailCard
                key={f.id}
                finding={f}
                isExpanded={expandedItems[f.id] ?? false}
                activeTab={technicalTabState[f.id] ?? "simple"}
                onToggleExpand={() => toggleExpand(f.id)}
                onSetTab={(tab) =>
                  setTechnicalTabState((prev) => ({ ...prev, [f.id]: tab }))
                }
                onCopy={handleCopyText}
                copiedId={copiedId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Sub-component: Reusable Finding Detail Card with Simple vs Technical Tabs
// -----------------------------------------------------------------------------
interface FindingDetailCardProps {
  finding: NormalizedFinding;
  isExpanded: boolean;
  activeTab: "simple" | "technical";
  onToggleExpand: () => void;
  onSetTab: (tab: "simple" | "technical") => void;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}

const FindingDetailCard: React.FC<FindingDetailCardProps> = ({
  finding,
  isExpanded,
  activeTab,
  onToggleExpand,
  onSetTab,
  onCopy,
  copiedId,
}) => {
  const getSeverityPill = (sev: string) => {
    switch (sev) {
      case "ERROR":
        return "bg-rose-500/15 text-rose-300 border-rose-500/40";
      case "WARNING":
        return "bg-amber-500/15 text-amber-300 border-amber-500/40";
      default:
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition overflow-hidden text-xs font-mono">
      {/* Finding Summary Bar */}
      <div
        onClick={onToggleExpand}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-850 transition"
      >
        <div className="flex items-center gap-2.5 truncate">
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${getSeverityPill(
              finding.severity
            )}`}
          >
            {finding.severity}
          </span>
          <span className="text-white font-bold truncate">{finding.affected_resource}</span>
          <span className="text-slate-400 hidden sm:inline truncate">
            {finding.title}
          </span>
          {finding.line && (
            <span className="text-cyan-400 text-[10px] bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-500/30 shrink-0">
              line {finding.line}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-500 hidden md:inline">
            {finding.category}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expandable Dual-View Presentation */}
      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#05080F] space-y-4">
          {/* View Switcher: Simple Explanation vs Technical Details */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetTab("simple")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "simple"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Simple Explanation
              </button>
              <button
                type="button"
                onClick={() => onSetTab("technical")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "technical"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Technical Details
              </button>
            </div>

            <button
              onClick={() =>
                onCopy(
                  finding.id,
                  `Issue: ${finding.title}\nResource: ${finding.affected_resource}\nExplanation: ${finding.technical_explanation}\nFix: ${finding.recommended_fix}`
                )
              }
              className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
            >
              {copiedId === finding.id ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedId === finding.id ? "Copied" : "Copy Diagnostic"}</span>
            </button>
          </div>

          {/* TAB 1: Simple Explanation */}
          {activeTab === "simple" ? (
            <div className="space-y-3 text-xs font-sans">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                  What is the problem?
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {finding.simple_explanation}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                  Why should you care?
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {finding.potential_impact}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                  What needs to be fixed?
                </span>
                <p className="text-emerald-200 font-medium leading-relaxed">
                  {finding.recommended_fix}
                </p>
              </div>
            </div>
          ) : (
            /* TAB 2: Technical Details */
            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Resource</span>
                  <span className="text-white font-bold">{finding.affected_resource}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Source File</span>
                  <span className="text-cyan-300 truncate block">{finding.file_path || "Live Cluster"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Field / Location</span>
                  <span className="text-indigo-300 truncate block">
                    {finding.field || "spec"} {finding.line ? `(line ${finding.line})` : ""}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">
                  Original Diagnostic Telemetry Message
                </span>
                <p className="text-slate-200 leading-relaxed">{finding.technical_explanation}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">
                  Validation Evidence
                </span>
                <p className="text-slate-300 leading-relaxed">{finding.evidence}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start justify-between gap-3 text-emerald-200">
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                    Technical Remediation Instructions
                  </span>
                  <p className="leading-relaxed">{finding.recommended_fix}</p>
                </div>
                <button
                  onClick={() => onCopy(`tech-fix-${finding.id}`, finding.recommended_fix)}
                  className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedId === `tech-fix-${finding.id}` ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedId === `tech-fix-${finding.id}` ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
