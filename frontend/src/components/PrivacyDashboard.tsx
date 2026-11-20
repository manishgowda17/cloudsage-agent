"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Database,
  ArrowRight,
} from "lucide-react";

export function PrivacyDashboard() {
  const [allowlist] = useState<string[]>([
    "cluster_health",
    "node_health",
    "pod_health",
    "resource_utilization",
    "error_categories",
    "incident_counts",
    "anonymized_incident_summaries",
    "alert_context",
    "reliability_scores",
    "approved_diagnostic_metadata",
  ]);

  const [prohibited] = useState<string[]>([
    "raw_logs",
    "raw_manifest",
    "env / envFrom variables",
    "Kubernetes secrets & tokens",
    "AWS credentials (AKIA / Secrets)",
    "Bearer / JWT authorization tokens",
    "Database connection strings",
    "Customer PII & identity payloads",
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
              Privacy & Data Policies
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Fail-Closed Enforced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-trust telemetry policy: Raw application logs, secrets, and customer credentials strictly remain on-premise.
          </p>
        </div>
      </div>

      {/* Privacy Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-sans">Edge Redactions</p>
            <p className="text-2xl font-black text-white font-mono">100%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Pre-export regex & structured</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-sans">Blocked Exfiltration</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">0 Leaks</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Prohibited keys auto-rejected</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-sans">Hindsight Memory Scope</p>
            <p className="text-sm font-bold text-slate-200 font-mono">Private Network Only</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Zero public internet exposure</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-sans">Offline Persistence</p>
            <p className="text-sm font-bold text-white font-mono">SQLite Local Queue</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Zero cloud data loss</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Two-Column Allowlist vs Prohibited */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approved Metadata Allowlist */}
        <div className="rounded-2xl bg-[#0F172A]/85 border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Approved Metadata Export Allowlist
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Only the following structured metadata categories are permitted to exit the customer cluster:
          </p>
          <div className="space-y-2">
            {allowlist.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-950/20 border border-emerald-900/30 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prohibited Sensitive Fields */}
        <div className="rounded-2xl bg-[#0F172A]/85 border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Strictly Prohibited Fields (Never Exported)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Any telemetry containing these fields is rejected and blocked by the Privacy Gateway:
          </p>
          <div className="space-y-2">
            {prohibited.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-mono text-rose-300 bg-rose-950/20 border border-rose-900/30 px-3 py-1.5 rounded-lg">
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture Principles Box */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 space-y-3">
        <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          The ClusterSage Privacy Contract
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Sensitive data stays local. Intelligence operates at the edge. Approved metadata powers centralized fleet visibility. If the Privacy Gateway encounters any ambiguous, corrupted, or unclassified data, it executes a <strong>fail-closed</strong> response and suppresses export.
        </p>
      </div>
    </div>
  );
}
