"use client";

import React, { useState, useEffect } from "react";
import { KineticTypography } from "./KineticTypography";
import { SwirlingVortex } from "./SwirlingVortex";
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Server,
  Zap,
  CheckCircle,
  X,
  Play,
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

    const t1 = setTimeout(() => setPhase("typography"), 600);
    const t2 = setTimeout(() => setPhase("materialize"), 1800);
    const t3 = setTimeout(() => setPhase("complete"), 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Background Swirling Distortion Vortex */}
      <SwirlingVortex intensity="dramatic" blurAmount={60} activeSurge={phase !== "complete"} />

      {/* Main Cinematic Container */}
      <div className="relative w-full max-w-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-floating overflow-hidden text-center">
        {/* Skip Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition z-20 flex items-center gap-1.5 text-xs font-semibold"
          aria-label="Skip Reveal"
        >
          <span>Skip</span>
          <X className="w-4 h-4" />
        </button>

        {/* Phase A & B: Kinetic Typography Reveal */}
        <div className="mb-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Autonomous Kubernetes SRE Intelligence</span>
          </div>

          <KineticTypography
            text="From Kubernetes chaos to clarity."
            as="h2"
            delayMs={200}
            staggerMs={28}
            className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight justify-center flex flex-wrap"
            highlightWord="clarity."
            highlightClass="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600"
          />

          <p
            className={`text-slate-600 text-sm sm:text-base mt-4 max-w-xl mx-auto leading-relaxed transition-all duration-700 ${
              phase !== "buildup"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            Investigate probe crashes, correlate log exceptions, and generate
            deterministic remediation commands with Google Gemini and InsForge.
          </p>
        </div>

        {/* Phase C: Dimensional Infrastructure Cards */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 transition-all duration-700 ${
            phase === "materialize" || phase === "complete"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95"
          }`}
        >
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-left">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
              <Server className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-0.5">
              Probe Diagnostics
            </h4>
            <p className="text-[11px] text-slate-500">
              Live inspection of liveness and readiness probe failures.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-left">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-0.5">
              Multi-Signal Triage
            </h4>
            <p className="text-[11px] text-slate-500">
              CrashLoop, OOMKilled (Exit 137), and Selector mismatch correlation.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-0.5">
              1-Click Remediation
            </h4>
            <p className="text-[11px] text-slate-500">
              Exact executable kubectl commands ready for immediate execution.
            </p>
          </div>
        </div>

        {/* Phase D & E: Exploration CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              onExplore();
              onClose();
            }}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group hover:scale-[1.02]"
          >
            <span>Launch Active Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition"
          >
            Close Story
          </button>
        </div>
      </div>
    </div>
  );
};
