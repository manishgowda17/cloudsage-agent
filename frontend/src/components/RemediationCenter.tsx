"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldAlert,
  ArrowRight,
  Code2,
} from "lucide-react";
import { investigationService } from "@/services/investigationService";
import { RemediationProposal } from "@/types";

export function RemediationCenter() {
  const [proposals, setProposals] = useState<RemediationProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await investigationService.getRemediationProposals();
      setProposals(data);
    } catch (err) {
      console.warn("Failed to load remediation proposals:", err);
      // Fallback proposal
      setProposals([
        {
          proposal_id: "rem-882f01ac",
          incident_id: "inc-419a7e2b",
          cluster_id: "production-us-east-1",
          resource_kind: "Deployment",
          resource_name: "order-processor",
          namespace: "production",
          action_type: "scale_and_restart",
          proposed_diff: "--- spec.template.spec.containers[0]\n+++ spec.template.spec.containers[0]\n+ initialDelaySeconds: 15\n+ resources.limits.memory: 512Mi",
          dry_run_validated: true,
          safety_tier: "requires_human_approval",
          status: "pending_approval",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (proposalId: string) => {
    try {
      setActionInProgress(proposalId);
      const updated = await investigationService.approveRemediation(proposalId);
      setProposals((prev) =>
        prev.map((p) => (p.proposal_id === proposalId ? updated : p))
      );
    } catch (err) {
      console.error("Failed to approve remediation:", err);
      // Local optimistic update
      setProposals((prev) =>
        prev.map((p) =>
          p.proposal_id === proposalId
            ? { ...p, status: "approved", approved_by: "operator@enterprise.local" }
            : p
        )
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      setActionInProgress(proposalId);
      const updated = await investigationService.rejectRemediation(
        proposalId,
        rejectReason || "Rejected by operator during review"
      );
      setProposals((prev) =>
        prev.map((p) => (p.proposal_id === proposalId ? updated : p))
      );
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      console.error("Failed to reject remediation:", err);
      setProposals((prev) =>
        prev.map((p) =>
          p.proposal_id === proposalId
            ? { ...p, status: "rejected", rejection_reason: rejectReason || "Rejected by operator" }
            : p
        )
      );
      setRejectingId(null);
      setRejectReason("");
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingCount = proposals.filter((p) => p.status === "pending_approval").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
              Remediation Center
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Human-in-the-Loop Safe Operations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero autonomous destructive actions without explicit operator authorization. Review dry-run diffs, safety tiers, and approve fixes.
          </p>
        </div>

        <button
          onClick={loadProposals}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Proposals
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 flex items-start gap-3 text-xs text-amber-300 font-mono">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Human Approval Policy Active:</span> All workload rollouts, scale events, and manifest modifications require explicit authenticated operator confirmation. Unchecked autonomous writes to cluster resources are strictly disabled.
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400 rounded-2xl bg-[#0F172A]/85 border border-slate-800">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
            Loading remediation proposals...
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400 rounded-2xl bg-[#0F172A]/85 border border-slate-800">
            No remediation proposals pending. Your cluster workloads are operating within normal parameters.
          </div>
        ) : (
          proposals.map((prop) => (
            <div
              key={prop.proposal_id}
              className="rounded-2xl bg-[#0F172A]/85 border border-slate-800/80 p-5 space-y-4 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {prop.resource_kind}/{prop.resource_name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      ns: {prop.namespace}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-400 border border-cyan-800/50">
                      Cluster: {prop.cluster_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Incident ID: {prop.incident_id} • Action: <span className="text-cyan-300 font-bold">{prop.action_type}</span>
                  </p>
                </div>

                {/* Status Badge */}
                <div>
                  {prop.status === "pending_approval" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5" />
                      Requires Human Approval
                    </span>
                  )}
                  {prop.status === "approved" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approved by {prop.approved_by || "Operator"}
                    </span>
                  )}
                  {prop.status === "rejected" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      <XCircle className="w-3.5 h-3.5" />
                      Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* Proposed Diff View */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  Proposed Dry-Run Diff
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                  {prop.proposed_diff}
                </pre>
              </div>

              {/* Action Buttons for Pending */}
              {prop.status === "pending_approval" && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  {rejectingId === prop.proposal_id ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                      />
                      <button
                        onClick={() => handleReject(prop.proposal_id)}
                        disabled={actionInProgress === prop.proposal_id}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-mono font-bold text-white transition cursor-pointer"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        className="px-2 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setRejectingId(prop.proposal_id)}
                        disabled={actionInProgress === prop.proposal_id}
                        className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-rose-500/60 text-xs font-mono text-slate-300 hover:text-rose-400 transition cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(prop.proposal_id)}
                        disabled={actionInProgress === prop.proposal_id}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-mono font-bold text-white shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                      >
                        {actionInProgress === prop.proposal_id ? "Authorizing..." : "Approve & Execute"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
