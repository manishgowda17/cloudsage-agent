"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Brain,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  Loader2,
  BookmarkCheck,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
} from "lucide-react";
import { investigationService } from "@/services/investigationService";
import { PostMortemRecord, PostMortemCreate, DiagnosisResult } from "@/types";

interface PostMortemWorkflowProps {
  initialIncident?: DiagnosisResult | null;
  onPostMortemRetained?: (record: PostMortemRecord) => void;
}

export function PostMortemWorkflow({
  initialIncident,
  onPostMortemRetained,
}: PostMortemWorkflowProps) {
  const [records, setRecords] = useState<PostMortemRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(initialIncident));
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Form State
  const [incidentTitle, setIncidentTitle] = useState(
    initialIncident ? `Incident: ${initialIncident.root_cause.slice(0, 50)}` : ""
  );
  const [incidentId, setIncidentId] = useState(
    initialIncident?.incident_id || `inc-${Date.now().toString().slice(-6)}`
  );
  const [resourceKind, setResourceKind] = useState("Deployment");
  const [resourceName, setResourceName] = useState("payments-api");
  const [namespace, setNamespace] = useState("default");
  const [summary, setSummary] = useState(
    initialIncident?.explanation || ""
  );
  const [rootCause, setRootCause] = useState(
    initialIncident?.root_cause || ""
  );
  const [stepsWorked, setStepsWorked] = useState(
    initialIncident?.fix || ""
  );
  const [stepsFailed, setStepsFailed] = useState("");
  const [runbookUsed, setRunbookUsed] = useState("RB-K8S-001");
  const [ttd, setTtd] = useState<number>(3);
  const [ttr, setTtr] = useState<number>(8);
  const [preventiveActions, setPreventiveActions] = useState(
    initialIncident?.prevention || "Implement static CI/CD schema validation and contract checks."
  );
  const [keyLessons, setKeyLessons] = useState(
    "Always verify application health endpoints in unit test contracts before deploying Kubernetes manifests."
  );

  const loadPostMortems = async () => {
    try {
      const data = await investigationService.getPostMortems();
      setRecords(data);
      if (data.length > 0 && !expandedRecordId) {
        setExpandedRecordId(data[0].id);
      }
    } catch (e) {
      console.warn("Failed to load post-mortems:", e);
    }
  };

  useEffect(() => {
    loadPostMortems();
  }, []);

  useEffect(() => {
    if (initialIncident) {
      setShowForm(true);
      setIncidentTitle(`Incident: ${initialIncident.root_cause.slice(0, 50)}`);
      setIncidentId(initialIncident.incident_id || `inc-${Date.now().toString().slice(-6)}`);
      setRootCause(initialIncident.root_cause);
      setSummary(initialIncident.explanation || "");
      setStepsWorked(initialIncident.fix || "");
      setPreventiveActions(initialIncident.prevention || "");
    }
  }, [initialIncident]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);

    const payload: PostMortemCreate = {
      incident_id: incidentId,
      incident_title: incidentTitle,
      resource_kind: resourceKind,
      resource_name: resourceName,
      namespace,
      summary,
      root_cause: rootCause,
      resolution_steps_taken: stepsWorked,
      steps_that_worked: stepsWorked,
      steps_that_failed: stepsFailed || undefined,
      runbook_used: runbookUsed,
      time_to_detect_minutes: ttd,
      time_to_resolve_minutes: ttr,
      preventive_actions: preventiveActions,
      key_lessons: keyLessons,
      was_successful: true,
    };

    try {
      const newRecord = await investigationService.createPostMortem(payload);
      setSuccessMsg(`Post-Mortem '${newRecord.incident_title}' successfully recorded and retained into Hindsight memory bank.`);
      setShowForm(false);
      await loadPostMortems();
      setExpandedRecordId(newRecord.id);
      if (onPostMortemRetained) {
        onPostMortemRetained(newRecord);
      }
    } catch (err: any) {
      console.error("Failed to create post-mortem:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight font-mono">SRE Post-Mortem & Memory Retention</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Record root-cause analyses, effective and ineffective remediation steps, and retain reusable engineering lessons directly into Hindsight.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 0 20px -3px rgba(6, 182, 212, 0.4)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center gap-2 self-start md:self-center cursor-pointer"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? "Close Editor" : "New Post-Mortem"}</span>
        </motion.button>
      </motion.div>

      {/* Success Banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm font-mono"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Structured Post-Mortem Submission Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-xl overflow-hidden"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-white">
                Structured Incident Learning Entry
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                Auto-Retains to Hindsight Bank
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-300">Incident Title</label>
                <input
                  type="text"
                  required
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="e.g. Payments API Probe Mismatch 404 Outage"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 font-semibold font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300">Resource Kind</label>
                  <input
                    type="text"
                    value={resourceKind}
                    onChange={(e) => setResourceKind(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300">Resource Name</label>
                  <input
                    type="text"
                    value={resourceName}
                    onChange={(e) => setResourceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-slate-300">What Happened? (Operational Summary)</label>
              <textarea
                required
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe symptoms, traffic impact, and alerts triggered..."
                className="w-full p-3 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 leading-relaxed font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-slate-300">Root Cause Identified</label>
              <textarea
                required
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Underlying technical root cause (e.g. misconfigured probe path, missing env, memory limit)..."
                className="w-full p-3 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-emerald-300 focus:outline-none focus:border-cyan-400 leading-relaxed font-mono"
              />
            </div>

            {/* Visual Separation of Effective vs Ineffective Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                <label className="text-xs font-mono font-extrabold text-emerald-300 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Effective Remediation (What Worked)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={stepsWorked}
                  onChange={(e) => setStepsWorked(e.target.value)}
                  placeholder="The exact manifest patch or kubectl command that successfully restored health..."
                  className="w-full p-3 rounded-xl bg-[#05080F] border border-emerald-500/40 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400 leading-relaxed font-mono shadow-inner"
                />
              </div>

              <div className="space-y-1 p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30">
                <label className="text-xs font-mono font-extrabold text-rose-300 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ineffective Steps (What Failed)</span>
                </label>
                <textarea
                  rows={3}
                  value={stepsFailed}
                  onChange={(e) => setStepsFailed(e.target.value)}
                  placeholder="Actions taken that did NOT work (e.g. pod restarts without manifest updates)..."
                  className="w-full p-3 rounded-xl bg-[#05080F] border border-rose-500/40 text-xs text-rose-200 focus:outline-none focus:border-rose-400 leading-relaxed font-mono shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-300">Runbook Applied</label>
                <input
                  type="text"
                  value={runbookUsed}
                  onChange={(e) => setRunbookUsed(e.target.value)}
                  placeholder="e.g. RB-K8S-001"
                  className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-300">Time to Detect (mins)</label>
                <input
                  type="number"
                  value={ttd}
                  onChange={(e) => setTtd(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-300">Time to Resolve (mins)</label>
                <input
                  type="number"
                  value={ttr}
                  onChange={(e) => setTtr(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-slate-300">Preventive Action Items</label>
              <input
                type="text"
                required
                value={preventiveActions}
                onChange={(e) => setPreventiveActions(e.target.value)}
                placeholder="e.g. Add static OpenAPI lint check in CI pipeline to prevent deployment of broken paths."
                className="w-full px-3.5 py-2 rounded-xl bg-[#080C14] border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Prominent Lesson Highlight Box */}
            <div className="space-y-1 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 shadow-inner">
              <label className="text-xs font-mono font-extrabold text-indigo-300 flex items-center gap-1.5 mb-1">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Key Engineering Lesson (What should Hindsight remember?)</span>
              </label>
              <textarea
                required
                rows={2}
                value={keyLessons}
                onChange={(e) => setKeyLessons(e.target.value)}
                placeholder="Core lesson that Hindsight will recall during future similar investigations..."
                className="w-full p-3 rounded-xl bg-[#05080F] border border-indigo-500/40 text-xs text-indigo-200 focus:outline-none focus:border-indigo-400 leading-relaxed font-mono shadow-inner"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Retaining into Hindsight...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit & Retain in Hindsight</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Historical Post-Mortems List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1">
          <span>Historical SRE Post-Mortems ({records.length})</span>
          <span className="text-[11px] text-slate-500 font-normal">Stored in Application & Hindsight Long-Term Memory</span>
        </div>

        {records.map((r, idx) => {
          const isExp = expandedRecordId === r.id;
          return (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 overflow-hidden shadow-md hover:border-cyan-500/40 transition-all"
            >
              <div
                onClick={() => setExpandedRecordId(isExp ? null : r.id)}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-850/80 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {r.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-slate-300 font-mono border border-slate-800">
                      {r.resource_kind}/{r.resource_name}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">{r.incident_title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-3xl line-clamp-1">{r.summary}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                    <BookmarkCheck className="w-3 h-3 text-emerald-400" /> Retained in Hindsight
                  </span>
                  <div className="p-1 rounded-lg bg-slate-900 text-slate-400">
                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expandable Details Drawer */}
              <AnimatePresence>
                {isExp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 border-t border-slate-800 space-y-4 bg-[#080C14] text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-slate-400">Root Cause</span>
                          <p className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 font-mono text-[11px] leading-relaxed">
                            {r.root_cause}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-emerald-400">Effective Remediation</span>
                          <p className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-200 font-mono text-[11px] leading-relaxed">
                            {r.steps_that_worked}
                          </p>
                        </div>
                      </div>

                      {r.steps_that_failed && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-rose-400">What Did Not Work</span>
                          <p className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 text-rose-200 text-[11px] leading-relaxed font-mono">
                            {r.steps_that_failed}
                          </p>
                        </div>
                      )}

                      {/* Lesson Retained Card */}
                      <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 text-slate-200 space-y-1.5 shadow-inner">
                        <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                          <Brain className="w-3.5 h-3.5 text-indigo-400" /> Lesson Retained for Future Agent Recall
                        </span>
                        <p className="text-xs text-indigo-200 font-bold leading-relaxed font-mono">
                          "{r.key_lessons}"
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800 font-mono">
                        <div>
                          Runbook: <span className="font-bold text-slate-300">{r.runbook_used || "N/A"}</span>
                        </div>
                        <div>
                          TTD: <span className="font-bold text-slate-300">{r.time_to_detect_minutes ?? 4}m</span> | TTR: <span className="font-bold text-slate-300">{r.time_to_resolve_minutes ?? 11}m</span>
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
