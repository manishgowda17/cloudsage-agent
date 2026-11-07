"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Share2,
  FileDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  UniversalInvestigationReport,
  DiagnosisResult,
  HindsightMetadata,
  RunbookItem,
} from "@/types";

import { InvestigationOverviewCard } from "./InvestigationOverviewCard";
import { ExecutiveSummarySection } from "./ExecutiveSummarySection";
import { HealthAssessmentBadge } from "./HealthAssessmentBadge";
import { InvestigationStatsBar } from "./InvestigationStatsBar";
import { RootCauseAnalysisCard } from "./RootCauseAnalysisCard";
import { UniversalIssueExplorer } from "./UniversalIssueExplorer";
import { RemediationPanel } from "./RemediationPanel";
import { ValidationEvidenceSection } from "./ValidationEvidenceSection";
import { TechnicalDetailsDrawer } from "./TechnicalDetailsDrawer";

interface UniversalReportViewProps {
  report: UniversalInvestigationReport;
  diagnosis?: DiagnosisResult | null;
  hindsightMeta?: HindsightMetadata | null;
  onOpenPostMortemForIncident?: (incident: DiagnosisResult) => void;
  onReinvestigate?: () => void;
}

export const UniversalReportView: React.FC<UniversalReportViewProps> = ({
  report,
  diagnosis,
  hindsightMeta,
  onOpenPostMortemForIncident,
  onReinvestigate,
}) => {
  const [expandedRunbook, setExpandedRunbook] = useState<string | null>(null);

  const runbooks = diagnosis?.recommended_runbooks || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-7"
    >
      {/* SECTION A: Investigation Overview Header */}
      <InvestigationOverviewCard
        metadata={report.metadata}
        source={report.source}
        assessment={report.assessment}
      />

      {/* SECTION B: Executive SRE Summary (Answers 5 Essential Questions) */}
      <ExecutiveSummarySection
        summary={report.executive_summary}
        assessment={report.assessment}
      />

      {/* SECTION C & D: Health Assessment & Truth-based Dynamic Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-center">
          <HealthAssessmentBadge assessment={report.assessment} />
        </div>
        <div className="lg:col-span-7 flex flex-col justify-center">
          <InvestigationStatsBar stats={report.statistics} />
        </div>
      </div>

      {/* SECTION E: Ranked Root Cause Analysis */}
      <RootCauseAnalysisCard rootCauses={report.root_causes} />

      {/* SECTION F: Universal Issue Explorer (Grouped vs Individual Findings, Dual Explanation Tabs) */}
      <UniversalIssueExplorer
        findings={report.findings}
        findingGroups={report.finding_groups}
      />

      {/* SECTION G: Prioritized Remediation Panel (P0-P3, Executable kubectl, Patch Diff Preview, Verification) */}
      <RemediationPanel
        remediations={report.remediations}
        diagnosis={diagnosis}
        onOpenPostMortemForIncident={onOpenPostMortemForIncident}
      />

      {/* SECTION H: Hindsight Memory Intelligence & SRE Runbooks */}
      {((hindsightMeta && hindsightMeta.recalled_memories.length > 0) || runbooks.length > 0) && (
        <div className="space-y-6">
          {/* Recalled Hindsight Memories */}
          {hindsightMeta && hindsightMeta.recalled_memories.length > 0 && (
            <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono uppercase tracking-tight">
                      Historical Incident Memories Recalled ({hindsightMeta.recalled_count})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Isolated tenant knowledge graph retrieved similar past outages and verified fixes
                    </p>
                  </div>
                </div>
                {hindsightMeta.bank_id && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-xl border border-cyan-800/60 self-start sm:self-center">
                    Bank: {hindsightMeta.bank_id}
                  </span>
                )}
              </div>

              {hindsightMeta.influence_summary && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 leading-relaxed font-mono">
                  {hindsightMeta.influence_summary}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {hindsightMeta.recalled_memories.slice(0, 4).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono uppercase font-bold text-cyan-400">
                        {m.type || "incident_memory"}
                      </span>
                      {m.similarity_score !== undefined && (
                        <span className="font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                          {Math.round(m.similarity_score * (m.similarity_score <= 1 ? 100 : 1))}% match
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 leading-relaxed font-mono text-[11px] line-clamp-3">
                      {m.text}
                    </p>
                    {m.tags && m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {m.tags.slice(0, 3).map((t, ti) => (
                          <span
                            key={ti}
                            className="px-2 py-0.5 rounded text-[9px] bg-slate-950 text-slate-400 font-mono border border-slate-800"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SRE Runbooks */}
          {runbooks.length > 0 && (
            <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono uppercase tracking-tight">
                      Correlated SRE Runbooks ({runbooks.length})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Standard operating procedures matched to observed root cause
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-800/50">
                  Verified Procedures
                </span>
              </div>

              <div className="space-y-3">
                {runbooks.map((rb) => {
                  const isExp = expandedRunbook === rb.id;
                  return (
                    <div
                      key={rb.id}
                      className="rounded-2xl bg-slate-900/70 border border-slate-800/90 overflow-hidden text-xs transition"
                    >
                      <div
                        onClick={() => setExpandedRunbook(isExp ? null : rb.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                              {rb.id}
                            </span>
                            <span className="font-bold text-white">{rb.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{rb.summary}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {rb.historical_success_rate !== undefined && (
                            <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                              {rb.historical_success_rate}% Success
                            </span>
                          )}
                          {isExp ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExp && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 border-t border-slate-800 space-y-4 bg-[#070A11] text-slate-300">
                              {rb.prerequisites && rb.prerequisites.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Prerequisites:
                                  </p>
                                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                                    {rb.prerequisites.map((p, pi) => (
                                      <li key={pi}>{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {rb.steps && rb.steps.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                                    Execution Sequence:
                                  </span>
                                  <div className="space-y-2">
                                    {rb.steps.map((st) => (
                                      <div
                                        key={st.step_number}
                                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1"
                                      >
                                        <p className="font-bold text-white">
                                          Step {st.step_number}: {st.title}
                                        </p>
                                        <p className="text-slate-400">{st.description}</p>
                                        {st.command && (
                                          <code className="block p-2 rounded-lg bg-[#05080F] font-mono text-cyan-300 text-[10px] mt-1 border border-slate-800">
                                            {st.command}
                                          </code>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {rb.rollback_guidance && (
                                <div className="pt-2 border-t border-slate-800/70 text-[11px]">
                                  <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block mb-0.5">
                                    Rollback Guidance:
                                  </span>
                                  <p className="text-slate-400">{rb.rollback_guidance}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION I: Validation Evidence & Engine Verification */}
      <ValidationEvidenceSection
        evidence={report.validation_evidence || []}
        limitations={report.limitations || []}
      />

      {/* SECTION J: Technical Telemetry & Raw Diagnostics Drawer */}
      <TechnicalDetailsDrawer
        rawDetails={report.raw_details}
        investigationId={report.metadata.id}
        sourceName={report.source.source_name}
      />
    </motion.div>
  );
};
