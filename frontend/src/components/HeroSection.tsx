"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  Database,
  FileCode2,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Repeat,
  RefreshCw,
  GitBranch,
  ShieldAlert,
  Server,
  Cpu,
  ChevronRight,
  Workflow,
  Search,
} from "lucide-react";
import { KineticTypography } from "@/components/KineticTypography";

interface HeroSectionProps {
  onEnterInvestigation: () => void;
  onExploreMemory: () => void;
  onViewRunbooks: () => void;
}

export function HeroSection({
  onEnterInvestigation,
  onExploreMemory,
  onViewRunbooks,
}: HeroSectionProps) {
  const [activeStage, setActiveStage] = useState<number>(2);

  const cognitiveStages = [
    {
      id: 0,
      title: "1. Intake & Telemetry",
      subtitle: "Multi-Source Manifests & Cluster State",
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      detail:
        "Ingests raw Kubernetes YAML manifests, ZIP archives, GitHub GitOps repositories, or live pod telemetry, warning events, and container logs.",
      signals: ["YAML AST Parser", "ZIP Extractor", "kube-apiserver", "GitOps Main"],
      output: "Normalized Multi-Layer Diagnostic Evidence Payload",
      metric: "5 Manifest / Runtime Sources",
      status: "READY",
      targetTab: "investigations",
    },
    {
      id: 1,
      title: "2. Incident Detection",
      subtitle: "Symptom & Failure Extraction",
      icon: <Activity className="w-4 h-4 text-rose-400" />,
      detail:
        "Detects readiness/liveness probe mismatches, CrashLoopBackOff panics, Exit 137 OOM kills, and service selector routing errors.",
      signals: ["HTTP 404 / 503 Probe Signals", "Exit Code 137", "0/0 Endpoints", "CrashLoop"],
      output: "Structured Defect Vector & Symptom Taxonomy",
      metric: "Sub-Second Pattern Triage",
      status: "ACTIVE",
      targetTab: "investigations",
    },
    {
      id: 2,
      title: "3. Hindsight Memory Recall",
      subtitle: "Semantic Historical Incident Search",
      icon: <Brain className="w-4 h-4 text-indigo-400" />,
      detail:
        "Queries user's isolated Hindsight bank before diagnosis. Recalls previously verified root causes, effective patches, and proven runbooks.",
      signals: ["Temporal BM25 Index", "hs-rerank-1 Cross-Encoder", "User-Scoped Bank"],
      output: "Ranked Historical Incident Memories & Proven Fixes",
      metric: "BM25 & Vector Reranked",
      status: "RECALLING",
      targetTab: "memory",
    },
    {
      id: 3,
      title: "4. SRE Reasoning Engine",
      subtitle: "Evidence-Backed Root Cause Synthesis",
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      detail:
        "Autonomous SRE intelligence analyzes cluster telemetry alongside recalled historical lessons to formulate verified root cause hypotheses.",
      signals: ["Senior SRE System Prompt", "Evidence Correlation", "Historical Prompt Injection"],
      output: "High-Confidence Root Cause & Explanation",
      metric: "Senior SRE Correlation",
      status: "REASONING",
      targetTab: "investigations",
    },
    {
      id: 4,
      title: "5. Patch Validation",
      subtitle: "Kubernetes Schema & Safety Verification",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      detail:
        "Synthesizes precise remediation patch, checks Kubernetes API specifications, and tags resolution status as VALIDATED_PATCH.",
      signals: ["K8s OpenAPI Schema", "Port & Probe Path Match", "Resource Limit Bounds"],
      output: "Executable Patch Diff & Validated kubectl Command",
      metric: "100% Schema Validated",
      status: "VERIFIED",
      targetTab: "investigations",
    },
    {
      id: 5,
      title: "6. Post-Mortem Learning",
      subtitle: "Continuous Infrastructure Memory",
      icon: <Repeat className="w-4 h-4 text-cyan-400" />,
      detail:
        "Records completed incident resolutions and extracts reusable engineering lessons into Hindsight, guaranteeing lessons are never forgotten.",
      signals: ["Post-Mortem Schema", "Lesson Extraction", "aretain async persistence"],
      output: "Permanent Hindsight Memory Bank Record",
      metric: "Zero Repeated Failures",
      status: "PERSISTING",
      targetTab: "postmortems",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Cinematic Main Banner with Ambient Lighting */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-8 sm:p-12 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        {/* Soft Ambient Background Highlights */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold mb-5 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]">
            <Brain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Autonomous Infrastructure Memory System</span>
          </div>

          <div className="mb-4">
            <KineticTypography
              text="Your infrastructure remembers."
              as="h1"
              delayMs={80}
              staggerMs={22}
              className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight flex flex-wrap"
              highlightWord="remembers."
              highlightClass="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400"
            />
          </div>

          <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed font-normal max-w-2xl">
            An AI Kubernetes reliability agent that learns from every incident, recalls proven fixes from persistent memory,
            recommends battle-tested runbooks, and helps your team resolve the next failure faster.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 mt-8">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 25px -4px rgba(6, 182, 212, 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnterInvestigation}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-600/20 border border-cyan-400/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Launch Investigation Center</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, borderColor: "rgba(6, 182, 212, 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onExploreMemory}
              className="px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Brain className="w-4 h-4 text-cyan-400" />
              <span>Explore Memory Bank</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, borderColor: "rgba(139, 92, 246, 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onViewRunbooks}
              className="px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>SRE Runbook Catalog</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Interactive Autonomous Reliability Lifecycle Workflow (Section Highlight) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
        className="rounded-3xl bg-[#0F172A]/85 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Workflow className="w-4 h-4 text-cyan-400" />
              <span>Interactive Autonomous Reliability Lifecycle</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              How the agent investigates incidents, consults Hindsight memory, synthesizes patches, and prevents recurrence.
            </p>
          </div>
        </div>

        {/* Connected Stages Visualization (With Animated Flow Connectors) */}
        <div className="relative">
          {/* Animated Connecting SVG Line (Visible on md and up) */}
          <div className="hidden md:block absolute top-[28px] left-[5%] right-[5%] h-0.5 -z-0 pointer-events-none">
            <svg className="w-full h-4 overflow-visible" preserveAspectRatio="none">
              <line
                x1="0%"
                y1="2"
                x2="100%"
                y2="2"
                stroke="#1e293b"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-dash-flow stroke-cyan-500/60"
              />
            </svg>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
            {cognitiveStages.map((stage) => {
              const isSelected = activeStage === stage.id;
              return (
                <motion.button
                  key={stage.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveStage(stage.id)}
                  className={`relative p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_20px_-3px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/40"
                      : "bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-xl bg-slate-950/80 shadow-inner border border-slate-800">
                      {stage.icon}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white truncate">{stage.title}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium font-mono">{stage.metric}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Deep-Dive Explainer Card with Technical Transparency */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/90 to-indigo-950/30 border border-cyan-500/30 p-5 sm:p-6 shadow-md space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-950 border border-cyan-500/30 shadow-inner">
                  {cognitiveStages[activeStage].icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      STAGE {activeStage + 1} OF 6
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    {cognitiveStages[activeStage].subtitle}
                  </h3>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 15px -2px rgba(6, 182, 212, 0.4)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (cognitiveStages[activeStage].targetTab === "memory") {
                    onExploreMemory();
                  } else if (cognitiveStages[activeStage].targetTab === "postmortems") {
                    onViewRunbooks();
                  } else {
                    onEnterInvestigation();
                  }
                }}
                className="self-start md:self-center px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer border border-cyan-400/30"
              >
                <span>Test in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {cognitiveStages[activeStage].detail}
            </p>

            {/* Technical Signal Flow Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                  Input Telemetry & Signals
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cognitiveStages[activeStage].signals.map((sig, si) => (
                    <span key={si} className="px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-800 font-mono text-[10px]">
                      {sig}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                  Synthesized Cognitive Output
                </span>
                <p className="text-xs font-mono font-bold text-cyan-300 mt-1">
                  {cognitiveStages[activeStage].output}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
