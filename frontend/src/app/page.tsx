"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { ClusterSelector } from "@/components/ClusterSelector";
import { InvestigationProgress } from "@/components/InvestigationProgress";
import { RootCauseCard } from "@/components/RootCauseCard";
import { InvestigationHistory } from "@/components/InvestigationHistory";
import { KineticTypography } from "@/components/KineticTypography";
import { SwirlingVortex } from "@/components/SwirlingVortex";
import { InfrastructureMap3D } from "@/components/InfrastructureMap3D";
import { CinematicReveal } from "@/components/CinematicReveal";
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
  Terminal,
  Activity,
  ArrowRight,
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

  // Cinematic Reveal state
  const [revealOpen, setRevealOpen] = useState(false);

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

  // Active step ID for 3D map telemetry focus
  const [activeStepId, setActiveStepId] = useState<string>("pods");

  // 1. Initial load
  useEffect(() => {
    checkCurrentUser();
    checkHealth();
    loadClusters();

    // Check if user has already seen cinematic reveal
    if (typeof window !== "undefined") {
      const hasSeen = localStorage.getItem("has_seen_reveal");
      if (!hasSeen) {
        setRevealOpen(true);
        localStorage.setItem("has_seen_reveal", "true");
      }
    }
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
    setActiveStepId(stepId);
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

  const selectedCluster = clusters.find((c) => c.context === selectedContext) || clusters[0] || null;

  return (
    <div className="relative min-h-screen bg-[#fbfbfa] text-slate-800 selection:bg-blue-600/20 selection:text-blue-900 pb-16">
      {/* Global Swirling Atmospheric Vortex in Background */}
      <SwirlingVortex
        className="opacity-60"
        intensity="gentle"
        blurAmount={65}
        activeSurge={isInvestigating}
      />

      {/* Header */}
      <Header
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
        isHealthy={isHealthy}
        onOpenReveal={() => setRevealOpen(true)}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Unauthenticated Lock Screen */}
        {!user && !authLoading ? (
          <div className="relative max-w-lg mx-auto my-14 bg-white/90 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-8 sm:p-10 text-center shadow-floating">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl border border-blue-200/80 mx-auto flex items-center justify-center mb-5 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>

            <div className="mb-4">
              <KineticTypography
                text="Your infrastructure. Understood."
                as="h2"
                delayMs={150}
                staggerMs={28}
                className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight justify-center flex flex-wrap"
                highlightWord="Understood."
              />
            </div>

            <p className="text-sm text-slate-600 mb-8 leading-relaxed max-w-sm mx-auto">
              Sign in with your InsForge account to investigate local clusters,
              evaluate liveness and readiness probe failures, and receive AI remediation.
            </p>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Authenticate to Enter</span>
            </button>
          </div>
        ) : (
          <>
            {/* Hero & Workspace Action Stage */}
            <div className="relative bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 mb-6 shadow-luminous overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Next-Gen Kubernetes Triage</span>
                  </div>

                  <KineticTypography
                    text="Your infrastructure. Understood."
                    as="h2"
                    delayMs={100}
                    staggerMs={22}
                    className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight flex flex-wrap"
                    highlightWord="Understood."
                  />

                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg leading-relaxed">
                    On-demand evidence gathering, probe inspection, and Senior SRE
                    reasoning powered by Google Gemini and InsForge.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Namespace Selector */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-bold">Namespace:</span>
                    <input
                      type="text"
                      value={namespace}
                      onChange={(e) => setNamespace(e.target.value)}
                      placeholder="default"
                      className="bg-transparent text-slate-900 font-mono font-semibold focus:outline-none w-24"
                    />
                  </div>

                  {/* Investigate Cluster Button */}
                  <button
                    onClick={() => triggerInvestigation()}
                    disabled={isInvestigating}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
                  >
                    {isInvestigating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Investigating...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Investigate Cluster</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Dimensional 3D Infrastructure Map */}
            <InfrastructureMap3D
              cluster={selectedCluster}
              namespace={namespace}
              isInvestigating={isInvestigating}
              currentStep={activeStepId}
              onSelectTarget={(target) => {
                console.log("Selected infrastructure component:", target);
              }}
              className="mb-6"
            />

            {/* Clusters Selector from Kubeconfig & Scenario Bench */}
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

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-6 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-950">
                      Unable to Complete Investigation
                    </p>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      {errorMsg}
                    </p>
                    <div className="mt-3 p-3.5 rounded-xl bg-white/80 border border-rose-200 text-xs font-mono text-slate-700 space-y-1">
                      <p className="text-slate-900 font-bold mb-1">
                        Troubleshooting Checklist:
                      </p>
                      <p>• Verify cluster daemon: Make sure Docker Desktop, Minikube, or Kind is running</p>
                      <p>• Check kubeconfig path: Confirm ~/.kube/config points to active API server</p>
                      <p>• Check credentials: Run &apos;kubectl cluster-info&apos; in terminal to verify connection</p>
                    </div>
                  </div>
                  <button
                    onClick={() => triggerInvestigation()}
                    className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 rounded-lg text-xs font-bold text-rose-800 transition flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </div>
            )}

            {/* Investigation Progress Pipeline */}
            <InvestigationProgress steps={steps} isActive={isInvestigating} />

            {/* Diagnosis Result Card */}
            {currentDiagnosis && (
              <>
                {currentDiagnosis.root_cause.toLowerCase().includes("healthy") ? (
                  <div className="bg-white/90 backdrop-blur-xl border border-emerald-200 rounded-2xl p-8 mb-6 text-center shadow-luminous">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      All Inspected Resources are Healthy
                    </h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto mb-3">
                      Pods are running normally, desired replicas match available counts,
                      and probe checks are passing with zero warnings.
                    </p>
                    <div className="inline-block px-3 py-1 bg-emerald-50 rounded-full font-mono text-[11px] font-bold text-emerald-800 border border-emerald-200">
                      Cluster Health: 100% Operational
                    </div>
                  </div>
                ) : (
                  <RootCauseCard
                    diagnosis={currentDiagnosis}
                    namespace={namespace}
                  />
                )}
              </>
            )}

            {/* Investigation History Table */}
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
                window.scrollTo({ top: 180, behavior: "smooth" });
              }}
            />
          </>
        )}
      </main>

      {/* Cinematic Product Reveal Modal */}
      <CinematicReveal
        isOpen={revealOpen}
        onClose={() => setRevealOpen(false)}
        onExplore={() => {
          if (!user) {
            setAuthModalOpen(true);
          }
        }}
      />

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
