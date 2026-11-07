"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar, WorkspaceTab } from "@/components/Sidebar";
import { HeroSection } from "@/components/HeroSection";
import { InvestigationCommandCenter } from "@/components/InvestigationCommandCenter";
import { InvestigationHistory } from "@/components/InvestigationHistory";
import { MemoryBrowser } from "@/components/MemoryBrowser";
import { RunbookCatalog } from "@/components/RunbookCatalog";
import { PostMortemWorkflow } from "@/components/PostMortemWorkflow";
import { InsightsDashboard } from "@/components/InsightsDashboard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AuthModal } from "@/components/AuthModal";
import { CinematicReveal } from "@/components/CinematicReveal";
import { CinematicIntroAuth } from "@/components/CinematicIntroAuth";
import { SwirlingVortex } from "@/components/SwirlingVortex";
import { InfrastructureMap3D } from "@/components/InfrastructureMap3D";
import { investigationService, InvestigationParams } from "@/services/investigationService";
import { insforgeService } from "@/services/insforge";
import {
  ClusterItem,
  DiagnosisResult,
  InvestigationHistoryItem,
  ProgressStep,
  ProgressStepId,
  HindsightMetadata,
} from "@/types";

const INITIAL_STEPS: ProgressStep[] = [
  { id: "pods", label: "Checking Pods & Probes", status: "pending" },
  { id: "logs", label: "Extracting Container Logs", status: "pending" },
  { id: "events", label: "Analyzing Warning Events", status: "pending" },
  { id: "deployments", label: "Inspecting Deployments", status: "pending" },
  { id: "network", label: "Verifying Services & Routing", status: "pending" },
  { id: "ai", label: "Correlating SRE Intelligence", status: "pending" },
  { id: "complete", label: "Diagnosis Synthesized", status: "pending" },
];

const MANIFEST_STEPS: ProgressStep[] = [
  { id: "pods", label: "Parsing Manifests & Schemas", status: "pending" },
  { id: "logs", label: "Validating API Versions & Syntax", status: "pending" },
  { id: "events", label: "Auditing Liveness & Readiness Probes", status: "pending" },
  { id: "deployments", label: "Checking Selectors & Port Alignment", status: "pending" },
  { id: "network", label: "Auditing Resource Limits & Units", status: "pending" },
  { id: "ai", label: "Synthesizing SRE Findings", status: "pending" },
  { id: "complete", label: "Audit Complete", status: "pending" },
];

export default function DashboardPage() {
  // Navigation & Workspace state
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showIntroAuth, setShowIntroAuth] = useState(true);

  // Cinematic Reveal state
  const [revealOpen, setRevealOpen] = useState(false);

  // Clusters state
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  // Investigation state
  const [namespace, setNamespace] = useState("default");
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<DiagnosisResult | null>(null);
  const [currentHindsightMeta, setCurrentHindsightMeta] = useState<HindsightMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePostMortemIncident, setActivePostMortemIncident] = useState<DiagnosisResult | null>(null);

  // History & Health state
  const [historyItems, setHistoryItems] = useState<InvestigationHistoryItem[]>([]);
  const [isHealthy, setIsHealthy] = useState(true);
  const [hindsightHealthy, setHindsightHealthy] = useState(true);

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

    try {
      const hStatus = await investigationService.getHindsightStatus();
      setHindsightHealthy(hStatus.status === "connected");
    } catch {
      setHindsightHealthy(false);
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
    setShowIntroAuth(true);
  };

  // Step progression
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
  const triggerInvestigation = async (params?: InvestigationParams) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const targetContext = params?.context || selectedContext || undefined;
    const targetScenario = params?.scenario || undefined;
    const sourceType = params?.source_type || "cluster";

    setIsInvestigating(true);
    setErrorMsg(null);
    setCurrentDiagnosis(null);
    setActiveTab("investigations");

    const isStatic = sourceType === "github" || sourceType === "yaml" || sourceType === "zip";
    const currentSteps = isStatic ? MANIFEST_STEPS : INITIAL_STEPS;
    setSteps(currentSteps.map((s) => ({ ...s, status: "pending" })));

    try {
      // Step 1: Pods & Probes
      setInProgress("pods");
      await new Promise((r) => setTimeout(r, 260));
      advanceStep("pods");

      // Step 2: Logs
      setInProgress("logs");
      await new Promise((r) => setTimeout(r, 240));
      advanceStep("logs");

      // Step 3: Events
      setInProgress("events");
      await new Promise((r) => setTimeout(r, 240));
      advanceStep("events");

      // Step 4: Deployments
      setInProgress("deployments");
      await new Promise((r) => setTimeout(r, 220));
      advanceStep("deployments");

      // Step 5: Network
      setInProgress("network");
      await new Promise((r) => setTimeout(r, 220));
      advanceStep("network");

      // Step 6: AI Reasoning & Correlation
      setInProgress("ai");

      const response = await investigationService.triggerInvestigation({
        namespace,
        context: targetContext,
        scenario: targetScenario,
        source_type: sourceType,
        github_url: params?.github_url,
        manifest_content: params?.manifest_content,
        manifest_filename: params?.manifest_filename,
        zip_data_base64: params?.zip_data_base64,
      });

      advanceStep("ai");
      advanceStep("complete");

      if (response && response.diagnosis) {
        setCurrentDiagnosis(response.diagnosis);
        if (response.hindsight) {
          setCurrentHindsightMeta(response.hindsight);
        }

        // Save investigation record in InsForge Database
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
        "Unable to complete investigation. Please verify cluster reachability, kubeconfig context, or manifest syntax.";
      setErrorMsg(message);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleOpenPostMortem = (incident: DiagnosisResult) => {
    setActivePostMortemIncident(incident);
    setActiveTab("postmortems");
  };

  const selectedCluster = clusters.find((c) => c.context === selectedContext) || clusters[0] || null;

  return (
    <div className="relative min-h-screen bg-[#070A11] text-slate-200 selection:bg-cyan-500/25 selection:text-cyan-200 flex flex-col md:flex-row overflow-x-hidden">
      {/* Global Fluid Atmospheric Swirling Gradient Vortex */}
      <SwirlingVortex
        className="opacity-40"
        intensity="gentle"
        blurAmount={70}
        activeSurge={isInvestigating}
      />

      {/* Responsive Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        hindsightConnected={hindsightHealthy}
        userEmail={user?.email}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          user={user}
          onOpenAuth={() => setShowIntroAuth(true)}
          onSignOut={handleSignOut}
          isHealthy={isHealthy}
          hindsightConnected={hindsightHealthy}
          onOpenReveal={() => setRevealOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeContext={selectedContext}
        />

        {/* Dynamic Content Body */}
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              <HeroSection
                onEnterInvestigation={() => setActiveTab("investigations")}
                onExploreMemory={() => setActiveTab("memory")}
                onViewRunbooks={() => setActiveTab("runbooks")}
              />

              {/* Dimensional 3D Infrastructure Canvas Visualizer */}
              <div className="rounded-3xl bg-[#0F172A]/85 backdrop-blur-xl border border-slate-800/80 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">
                      Live Infrastructure Visualizer & Spatial Topology
                    </h3>
                    <p className="text-xs text-slate-400">
                      Interactive 3D view of pods, nodes, and network routes in context [{selectedContext || "default"}]
                    </p>
                  </div>
                </div>
                <InfrastructureMap3D
                  cluster={selectedCluster}
                  namespace={namespace}
                  isInvestigating={isInvestigating}
                  currentStep="complete"
                />
              </div>
            </div>
          )}

          {activeTab === "investigations" && (
            <InvestigationCommandCenter
              clusters={clusters}
              selectedContext={selectedContext}
              onSelectContext={(ctx) => setSelectedContext(ctx)}
              onTriggerInvestigation={triggerInvestigation}
              isInvestigating={isInvestigating}
              steps={steps}
              currentDiagnosis={currentDiagnosis}
              currentHindsightMeta={currentHindsightMeta}
              errorMsg={errorMsg}
              onOpenPostMortemForIncident={handleOpenPostMortem}
            />
          )}

          {activeTab === "history" && (
            <InvestigationHistory
              items={historyItems}
              onSelectHistoryItem={(item) => {
                setCurrentDiagnosis({
                  root_cause: item.root_cause,
                  explanation: item.explanation || "",
                  fix: item.suggested_fix || "",
                  kubectl_command: item.kubectl_command || "kubectl get pods -A",
                  confidence: item.confidence,
                });
                setActiveTab("investigations");
              }}
            />
          )}

          {activeTab === "memory" && (
            <MemoryBrowser
              userBankId={user ? `user_${user.email?.split("@")[0]}` : "bank_default_cluster_sre"}
              onSelectMemorySnippet={(text) => {
                setActiveTab("investigations");
              }}
            />
          )}

          {activeTab === "runbooks" && <RunbookCatalog />}

          {activeTab === "postmortems" && (
            <PostMortemWorkflow
              initialIncident={activePostMortemIncident}
              onPostMortemRetained={() => {
                loadHistory();
              }}
            />
          )}

          {activeTab === "insights" && <InsightsDashboard />}

          {activeTab === "settings" && (
            <SettingsPanel
              user={user}
              userEmail={user?.email}
              hindsightConnected={hindsightHealthy}
              selectedContext={selectedContext}
              clusters={clusters}
              historyItems={historyItems}
              onSignOut={handleSignOut}
              onClearHistory={() => {
                setHistoryItems([]);
                if (typeof window !== "undefined") {
                  localStorage.removeItem("k8s_investigations_history");
                }
              }}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}
        </main>
      </div>

      {/* Cinematic Reveal Story Modal */}
      <CinematicReveal
        isOpen={revealOpen}
        onClose={() => setRevealOpen(false)}
        onExplore={() => setRevealOpen(false)}
      />

      {/* Full-Screen Cinematic Intro & Animated Sign-In Experience */}
      {showIntroAuth && (
        <CinematicIntroAuth
          initialUser={user}
          onAuthenticated={(u) => {
            setUser(u);
            setShowIntroAuth(false);
            loadHistory();
          }}
          onGuestAccess={() => {
            setShowIntroAuth(false);
          }}
        />
      )}

      {/* Auth Modal with Gmail, GitHub, LinkedIn & OTP */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setAuthModalOpen(false);
          loadHistory();
        }}
      />
    </div>
  );
}
