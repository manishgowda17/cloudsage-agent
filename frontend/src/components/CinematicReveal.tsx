"use client";

import React, { useState, useEffect } from "react";
import { KineticTypography } from "./KineticTypography";
import { SwirlingVortex } from "./SwirlingVortex";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Server,
  Zap,
  CheckCircle,
  X,
  Layers,
  GitBranch,
  Activity,
  Cpu,
} from "lucide-react";

interface CinematicRevealProps {
  isOpen: boolean;
  onClose: () => void;
  onExplore: () => void;
}

export const CinematicReveal: React.FC<CinematicRevealProps> = ({
  isOpen,
  onClose,
  onExplore,
}) => {
  const [phase, setPhase] = useState<"buildup" | "typography" | "materialize" | "complete">("buildup");

  useEffect(() => {
    if (!isOpen) {
      setPhase("buildup");
      return;
    }

    const t1 = setTimeout(() => setPhase("typography"), 400);
    const t2 = setTimeout(() => setPhase("materialize"), 1200);
    const t3 = setTimeout(() => setPhase("complete"), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Dynamic Swirling Distortion Vortex */}
      <SwirlingVortex intensity="dramatic" blurAmount={65} activeSurge={phase !== "complete"} />

      {/* Main Experience Container */}
      <div className="relative w-full max-w-4xl bg-[#0B0F19]/95 backdrop-blur-3xl border border-cyan-500/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_-15px_rgba(6,182,212,0.3)] overflow-hidden text-center">
        {/* Soft Fluid Background Flares */}
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Skip / Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition z-20 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          aria-label="Close Reveal"
        >
          <span>Skip</span>
          <X className="w-4 h-4" />
        </button>

        {/* Phase A & B: Kinetic Typography Story Reveal */}
        <div className="mb-8 pt-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold mb-4 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>The Autonomous Diagnostic Mesh</span>
          </div>

          <KineticTypography
            text="From Kubernetes chaos to deterministic clarity."
            as="h2"
            delayMs={150}
            staggerMs={24}
            className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight justify-center flex flex-wrap"
            highlightWord="clarity."
            highlightClass="text-cyan-400 font-black inline-block opacity-100"
          />

          <p
            className={`text-slate-300 text-sm sm:text-base mt-4 max-w-2xl mx-auto leading-relaxed transition-all duration-700 ${
              phase !== "buildup"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            Cloud-native systems fail silently in the gaps between runtime telemetry and static GitOps manifests. The agent fuses live cluster state, GitHub repositories, and YAML archives to isolate probe anomalies and synthesize exact remediation commands.
          </p>
        </div>

        {/* Phase C: Dimensional Infrastructure Intelligence Pillars */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8 transition-all duration-700 relative z-10 ${
            phase === "materialize" || phase === "complete"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95"
          }`}
        >
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 text-left hover:border-cyan-500/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white mb-1">
              Multi-Source Ingest
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Audits live clusters, remote GitHub repos, and raw YAML/ZIP archives.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 text-left hover:border-indigo-500/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white mb-1">
              Probe Failure Triage
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Isolates liveness death loops, readiness dropouts, and timing thresholds.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 text-left hover:border-rose-500/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white mb-1">
              Cross-Layer Signals
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Correlates container crash events with stderr logs and selector drift.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 text-left hover:border-emerald-500/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white mb-1">
              Verified Fix Engine
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Outputs deterministic, copy-pasteable kubectl patch and apply commands.
            </p>
          </div>
        </div>

        {/* Phase D & E: Exploration CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
          <button
            onClick={() => {
              onExplore();
              onClose();
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/20 border border-cyan-400/30 transition-all flex items-center justify-center gap-2 group hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>Enter Diagnostic Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
          >
            Explore Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
