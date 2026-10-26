"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { ClusterSelector } from "@/components/ClusterSelector";
import { InvestigationProgress } from "@/components/InvestigationProgress";
import { RootCauseCard } from "@/components/RootCauseCard";
import { InvestigationHistory } from "@/components/InvestigationHistory";
import { investigationService } from "@/services/investigationService";
import { insforgeService } from "@/services/insforge";
import {
  ClusterItem,
  DiagnosisResult,
  InvestigationHistoryItem,
  ProgressStep,
  ProgressStepId,
} from "@/types";
import {
  Play,
  Loader2,
  Lock,
  Layers,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const INITIAL_STEPS: ProgressStep[] = [
  { id: "pods", label: "Checking Pods", status: "pending" },
  { id: "logs", label: "Reading Logs", status: "pending" },
  { id: "events", label: "Analyzing Events", status: "pending" },
  { id: "deployments", label: "Inspecting Deployments", status: "pending" },
  { id: "network", label: "Checking Networking", status: "pending" },
  { id: "ai", label: "AI Reasoning", status: "pending" },
  { id: "complete", label: "Root Cause Found", status: "pending" },
];

export default function DashboardPage() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Clusters state
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  // Investigation state
  const [namespace, setNamespace] = useState("default");
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationTitle, setInvestigationTitle] = useState("Investigating Kubernetes Cluster...");
  const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<DiagnosisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<InvestigationHistoryItem[]>([]);
  const [isHealthy, setIsHealthy] = useState(true);

  // 1. Initial load
  useEffect(() => {
    checkCurrentUser();
    checkHealth();
    loadClusters();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const { data } = await insforgeService.getCurrentUser();
      if (data?.user) {
        setUser(data.user);
        loadHistory();
      }
    } catch (e) {
      console.warn("Auth check:", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const health = await investigationService.getHealth();
      setIsHealthy(health.status === "healthy");
    } catch {
      setIsHealthy(false);
    }
  };

  const loadClusters = async () => {
    try {
      const res = await investigationService.getClusters();
      if (res && res.clusters) {
        setClusters(res.clusters);
        setSelectedContext(res.current_context || (res.clusters[0]?.context ?? null));
      }
    } catch (err) {
      console.warn("Failed to fetch clusters:", err);
    }
  };

  const loadHistory = async () => {
    try {
      const items = await insforgeService.getRecentInvestigations();
      setHistoryItems(items);
    } catch (e) {
      console.warn("Failed to load history:", e);
    }
  };

  const handleSignOut = async () => {
    await insforgeService.signOut();
    setUser(null);
  };

  // Realtime step management
  const advanceStep = (stepId: ProgressStepId) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: "completed" } : s))
    );
  };

  const setInProgress = (stepId: ProgressStepId) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: "in_progress" } : s))
    );
  };

  // Main investigation trigger
  const triggerInvestigation = async (options?: { context?: string; scenario?: string }) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const targetContext = options?.context || selectedContext || undefined;
    const targetScenario = options?.scenario || undefined;

    setIsInvestigating(true);
    setErrorMsg(null);
    setCurrentDiagnosis(null);
    setInvestigationTitle(
      targetScenario
        ? `Testing Failure Scenario: ${targetScenario.toUpperCase()}...`
        : `Investigating Kubernetes Cluster [${targetContext || "default"}]...`
    );
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));

    try {
      // Step 1: Pods
      setInProgress("pods");
      await new Promise((r) => setTimeout(r, 350));
      advanceStep("pods");

      // Step 2: Logs
      setInProgress("logs");
      await new Promise((r) => setTimeout(r, 300));
      advanceStep("logs");

      // Step 3: Events
      setInProgress("events");
      await new Promise((r) => setTimeout(r, 250));
      advanceStep("events");

      // Step 4: Deployments
      setInProgress("deployments");
      await new Promise((r) => setTimeout(r, 250));
      advanceStep("deployments");

      // Step 5: Network
      setInProgress("network");
      await new Promise((r) => setTimeout(r, 250));
      advanceStep("network");

      // Step 6: AI Reasoning
      setInProgress("ai");

      const response = await investigationService.triggerInvestigation({
        namespace,
        context: targetContext,
        scenario: targetScenario,
      });

      advanceStep("ai");
      advanceStep("complete");

      if (response && response.diagnosis) {
        setCurrentDiagnosis(response.diagnosis);

        // Save investigation record in InsForge
        await insforgeService.saveInvestigation({
          root_cause: response.diagnosis.root_cause,
          explanation: response.diagnosis.explanation,
          suggested_fix: response.diagnosis.fix,
          kubectl_command: response.diagnosis.kubectl_command,
          namespace: namespace,
          confidence: response.diagnosis.confidence,
          status: "Completed",
          user_id: user?.id,
        });

        loadHistory();
      } else {
        throw new Error("No diagnosis returned from backend");
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setUser(null);
        setAuthModalOpen(true);
      }
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to connect to Kubernetes cluster. Please verify your kubeconfig path, cluster access, and kubectl permissions.";
      setErrorMsg(message);
    } finally {
      setIsInvestigating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
        isHealthy={isHealthy}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Unauthenticated Lock Screen */}
        {!user && !authLoading ? (
          <div className="max-w-md mx-auto my-12 bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 mx-auto flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Protected SRE Dashboard
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Sign in with your InsForge account to investigate local Kubernetes clusters,
              diagnose failures with AI, and review incident records.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Sign In to Continue
            </button>
          </div>
        ) : (
          <>
            {/* Top Action Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                    Troubleshoot Kubernetes with AI
                  </h2>
                  <p className="text-sm text-slate-400">
                    On-demand evidence gathering and Senior SRE reasoning for your local clusters.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400 font-medium">Namespace:</span>
                    <input
                      type="text"
                      value={namespace}
                      onChange={(e) => setNamespace(e.target.value)}
                      placeholder="default"
                      className="bg-transparent text-white font-mono focus:outline-none w-28"
                    />
                  </div>

                  <button
                    onClick={() => triggerInvestigation()}
                    disabled={isInvestigating}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition transform active:scale-95"
                  >
                    {isInvestigating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Investigating...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        Investigate Cluster
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Clusters Selector from Kubeconfig */}
            <ClusterSelector
              clusters={clusters}
              selectedContext={selectedContext}
              onSelectCluster={(cluster) => {
                setSelectedContext(cluster.context);
                triggerInvestigation({ context: cluster.context });
              }}
              onRunScenario={(scenario) => {
                triggerInvestigation({ scenario });
              }}
              isLoading={isInvestigating}
            />

            {/* Beginner-friendly Error Notification */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-200">Unable to Connect to Kubernetes Cluster</p>
                    <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                      {errorMsg}
                    </p>
                    <div className="mt-3 p-3 rounded-lg bg-black/40 border border-rose-500/20 text-xs font-mono text-slate-300 space-y-1">
                      <p className="text-slate-400 font-semibold mb-1">Troubleshooting Checklist:</p>
                      <p>✓ Verify cluster daemon: Make sure Docker Desktop, Minikube, or Kind is running</p>
                      <p>✓ Check kubeconfig path: Confirm ~/.kube/config exists and points to active server</p>
                      <p>✓ Check kubectl permissions: Run &apos;kubectl cluster-info&apos; in terminal</p>
                    </div>
                  </div>
                  <button
                    onClick={() => triggerInvestigation()}
                    className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-xs text-rose-200 transition flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              </div>
            )}

            {/* Loading Banner when active */}
            {isInvestigating && (
              <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5 text-blue-300 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="font-medium">{investigationTitle}</span>
              </div>
            )}

            {/* Live Realtime Investigation Progress */}
            <InvestigationProgress steps={steps} isActive={isInvestigating} />

            {/* Root Cause Card / Healthy Cluster Display */}
            {currentDiagnosis && (
              <>
                {currentDiagnosis.root_cause.toLowerCase().includes("healthy") ? (
                  <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 mb-6 text-center shadow-lg">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      No Critical Kubernetes Issues Detected
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                      All inspected pods are running normally, deployments have desired replicas, and services have healthy backend endpoints.
                    </p>
                    <div className="inline-block px-3 py-1 bg-slate-800 rounded-full font-mono text-[11px] text-emerald-400">
                      Cluster Health: 100% Operational
                    </div>
                  </div>
                ) : (
                  <RootCauseCard diagnosis={currentDiagnosis} namespace={namespace} />
                )}
              </>
            )}

            {/* Recent Investigations History */}
            <InvestigationHistory
              items={historyItems}
              onSelect={(item) => {
                setCurrentDiagnosis({
                  root_cause: item.root_cause,
                  explanation: item.explanation || "",
                  fix: item.suggested_fix || "",
                  kubectl_command: item.kubectl_command || "",
                  confidence: item.confidence,
                });
                window.scrollTo({ top: 150, behavior: "smooth" });
              }}
            />
          </>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          loadHistory();
        }}
      />
    </div>
  );
}
