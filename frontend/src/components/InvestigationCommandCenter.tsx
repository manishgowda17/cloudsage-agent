"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Loader2,
  FileCode2,
  Upload,
  FolderArchive,
  GitBranch,
  Server,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  BookOpen,
  Brain,
  ShieldCheck,
  RefreshCw,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Info,
  Clock,
  Layers,
} from "lucide-react";
import {
  ClusterItem,
  DiagnosisResult,
  HindsightMetadata,
  ProgressStep,
  RunbookItem,
} from "@/types";
import { InvestigationParams } from "@/services/investigationService";
import { UniversalReportView } from "./investigation/UniversalReportView";
import { getOrSynthesizeReport } from "@/utils/reportFallback";

interface InvestigationCommandCenterProps {
  clusters: ClusterItem[];
  selectedContext: string | null;
  onSelectContext: (ctx: string) => void;
  onTriggerInvestigation: (params: InvestigationParams) => Promise<void>;
  isInvestigating: boolean;
  steps: ProgressStep[];
  currentDiagnosis: DiagnosisResult | null;
  currentHindsightMeta: HindsightMetadata | null;
  errorMsg: string | null;
  onOpenPostMortemForIncident?: (incident: DiagnosisResult) => void;
}

const TEMPLATE_READINESS_DEFECT = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
      - name: web
        image: payments-api:v1.2.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /healthz  # DEFECT: Target application endpoint is /ready
            port: 8080
          initialDelaySeconds: 2
`;

const TEMPLATE_CRASHLOOP_DEFECT = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: api
        image: order-service:v2.0.0
        ports:
        - containerPort: 3000
        # DEFECT: Missing required DATABASE_URL environment variable
`;

const TEMPLATE_OOM_DEFECT = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-worker
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: analytics-worker
  template:
    metadata:
      labels:
        app: analytics-worker
    spec:
      containers:
      - name: worker
        image: analytics-worker:latest
        resources:
          limits:
            memory: "32Mi"  # DEFECT: High memory ingestion process killed by OOM (Exit 137)
            cpu: "100m"
`;

export function InvestigationCommandCenter({
  clusters,
  selectedContext,
  onSelectContext,
  onTriggerInvestigation,
  isInvestigating,
  steps,
  currentDiagnosis,
  currentHindsightMeta,
  errorMsg,
  onOpenPostMortemForIncident,
}: InvestigationCommandCenterProps) {
  // Source Selection
  const [activeSource, setActiveSource] = useState<"editor" | "file" | "zip" | "github" | "cluster">("editor");

  // Manifest editor state
  const [yamlContent, setYamlContent] = useState(TEMPLATE_READINESS_DEFECT);
  const [filename, setFilename] = useState("payments-deployment.yaml");

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedZip, setUploadedZip] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // GitHub repo state
  const [githubUrl, setGithubUrl] = useState("https://github.com/GoogleCloudPlatform/microservices-demo");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubPath, setGithubPath] = useState("release/kubernetes-manifests.yaml");

  // Cluster state
  const [namespace, setNamespace] = useState("default");



  const handleDrop = async (e: React.DragEvent, isZip: boolean) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (isZip) {
      if (!file.name.endsWith(".zip")) return;
      setUploadedZip(file);
    } else {
      if (!file.name.endsWith(".yaml") && !file.name.endsWith(".yml")) return;
      setUploadedFile(file);
      const text = await file.text();
      setYamlContent(text);
      setFilename(file.name);
      setActiveSource("editor");
    }
  };

  const handleLaunch = async () => {
    if (activeSource === "editor") {
      onTriggerInvestigation({
        source_type: "yaml",
        manifest_content: yamlContent,
        manifest_filename: filename,
      });
    } else if (activeSource === "file" && uploadedFile) {
      const content = await uploadedFile.text();
      onTriggerInvestigation({
        source_type: "yaml",
        manifest_content: content,
        manifest_filename: uploadedFile.name,
      });
    } else if (activeSource === "zip" && uploadedZip) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        onTriggerInvestigation({
          source_type: "zip",
          zip_data_base64: base64,
          manifest_filename: uploadedZip.name,
        });
      };
      reader.readAsDataURL(uploadedZip);
    } else if (activeSource === "github") {
      onTriggerInvestigation({
        source_type: "github",
        github_url: githubUrl,
      });
    } else if (activeSource === "cluster") {
      onTriggerInvestigation({
        source_type: "cluster",
        context: selectedContext || undefined,
        namespace,
      });
    }
  };

  // Generate line numbers for editor
  const lineCount = yamlContent.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Investigation Intake Card */}
      <div className="rounded-3xl bg-[#0F172A]/85 backdrop-blur-2xl border border-slate-800/80 p-6 sm:p-8 shadow-lg">
        {/* Source Navigation Tabs with Sliding Motion Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div className="relative flex items-center gap-1 p-1 rounded-2xl bg-[#080C14] border border-slate-800">
            {[
              { id: "editor", label: "YAML Editor", icon: <FileCode2 className="w-3.5 h-3.5" /> },
              { id: "file", label: "Upload YAML", icon: <Upload className="w-3.5 h-3.5" /> },
              { id: "zip", label: "ZIP Archive", icon: <FolderArchive className="w-3.5 h-3.5" /> },
              { id: "github", label: "GitHub Repo", icon: <GitBranch className="w-3.5 h-3.5" /> },
              { id: "cluster", label: "Cluster Telemetry", icon: <Server className="w-3.5 h-3.5" /> },
            ].map((tab) => {
              const isActive = activeSource === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSource(tab.id as any)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                    isActive ? "text-cyan-200" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sourceSelectorPill"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 rounded-xl shadow-[0_0_12px_-2px_rgba(6,182,212,0.3)] -z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.icon}</span>
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Preset Buttons for Editor */}
          {activeSource === "editor" && (
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[11px] font-semibold text-slate-500">Presets:</span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setYamlContent(TEMPLATE_READINESS_DEFECT);
                  setFilename("payments-deployment.yaml");
                }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition cursor-pointer"
              >
                Probe Defect
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setYamlContent(TEMPLATE_OOM_DEFECT);
                  setFilename("analytics-deployment.yaml");
                }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition cursor-pointer"
              >
                OOM Limit
              </motion.button>
            </div>
          )}
        </div>

        {/* Dynamic Source Input Section */}
        {activeSource === "editor" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Manifest Filename:</span>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#080C14] border border-slate-700/80 font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <span className="text-[11px] text-cyan-400/80 font-mono">Offline Static Validation Supported</span>
            </div>

            {/* Code Editor with Line Numbers Gutter */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-[#05080F] flex ide-workspace">
              {/* Line numbers gutter */}
              <div className="select-none py-4 px-3 bg-[#0B0F19] border-r border-slate-800 font-mono text-[11px] text-slate-600 text-right space-y-0 leading-[1.625rem]">
                {lineNumbers.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                rows={Math.max(14, lineCount)}
                className="flex-1 p-4 font-mono text-xs bg-[#05080F] text-emerald-300 focus:outline-none resize-y selection:bg-cyan-500/30 selection:text-white leading-[1.625rem]"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {activeSource === "file" && (
          <div className="space-y-4 py-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => handleDrop(e, false)}
              className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                isDraggingOver
                  ? "border-cyan-400 bg-cyan-950/30 scale-[1.01]"
                  : "border-slate-800 hover:border-cyan-500/50 bg-[#080C14]/90"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white font-mono">
                {uploadedFile ? uploadedFile.name : "Drag & drop Kubernetes YAML manifest"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports standard .yaml and .yml files</p>
              <label className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer border border-slate-700 transition">
                <span>Browse Files</span>
                <input
                  type="file"
                  accept=".yaml,.yml"
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setUploadedFile(f);
                      const text = await f.text();
                      setYamlContent(text);
                      setFilename(f.name);
                      setActiveSource("editor");
                    }
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {activeSource === "zip" && (
          <div className="space-y-4 py-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => handleDrop(e, true)}
              className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                isDraggingOver
                  ? "border-cyan-400 bg-cyan-950/30 scale-[1.01]"
                  : "border-slate-800 hover:border-cyan-500/50 bg-[#080C14]/90"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <FolderArchive className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white font-mono">
                {uploadedZip ? uploadedZip.name : "Drag & drop ZIP archive containing manifests"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Extracts and audits all manifests across folders</p>
              <label className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer border border-slate-700 transition">
                <span>Select ZIP Archive</span>
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedZip(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {activeSource === "github" && (
          <div className="space-y-4 py-2">
            <div className="p-5 rounded-2xl bg-[#080C14] border border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  GitHub Repository HTTPS URL
                </label>
                <div className="relative">
                  <GitBranch className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#05080F] border border-slate-700/80 font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Target Branch
                  </label>
                  <input
                    type="text"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#05080F] border border-slate-700/80 font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Manifest Path / Subdirectory
                  </label>
                  <input
                    type="text"
                    value={githubPath}
                    onChange={(e) => setGithubPath(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#05080F] border border-slate-700/80 font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSource === "cluster" && (
          <div className="space-y-4 py-2">
            <div className="p-5 rounded-2xl bg-[#080C14] border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Connected Kubeconfig Context
                  </label>
                  <select
                    value={selectedContext || ""}
                    onChange={(e) => onSelectContext(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#05080F] border border-slate-700/80 font-mono text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {clusters.map((c) => (
                      <option key={c.context} value={c.context}>
                        {c.context} ({c.server})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Target Namespace
                  </label>
                  <input
                    type="text"
                    value={namespace}
                    onChange={(e) => setNamespace(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#05080F] border border-slate-700/80 font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Trigger Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-800 mt-5">
          <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span>AI Reasoning & Hindsight Memory Augmented</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 25px -4px rgba(6, 182, 212, 0.4)" }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLaunch}
            disabled={isInvestigating}
            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center gap-2 cursor-pointer"
          >
            {isInvestigating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Investigating & Recalling...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start SRE Investigation</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-1 shadow-sm"
        >
          <p className="font-bold flex items-center gap-1.5 text-rose-400 font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Investigation Error
          </p>
          <p className="text-rose-200 leading-relaxed">{errorMsg}</p>
        </motion.div>
      )}

      {/* Truth-Based Investigation Progress with Motion */}
      {isInvestigating && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-3 shadow-md"
        >
          <div className="flex items-center justify-between text-xs font-bold text-white font-mono">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Multi-Stage Autonomous Investigation in Progress</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2">
            {steps.map((st) => (
              <div
                key={st.id}
                className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition-all font-mono ${
                  st.status === "completed"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold"
                    : st.status === "in_progress"
                    ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-200 font-bold animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {st.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : st.status === "in_progress" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className="truncate">{st.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Universal Standardized Investigation Report Presentation */}
      <AnimatePresence>
        {currentDiagnosis && (
          <div className="pt-2">
            <UniversalReportView
              report={getOrSynthesizeReport(
                currentDiagnosis,
                activeSource === "cluster"
                  ? (selectedContext || "Live Cluster")
                  : activeSource === "github"
                  ? githubUrl
                  : activeSource === "zip"
                  ? (uploadedZip?.name || "Uploaded Archive")
                  : activeSource === "file"
                  ? (uploadedFile?.name || "Uploaded Manifest")
                  : filename,
                activeSource === "cluster"
                  ? "LIVE_CLUSTER"
                  : activeSource === "github"
                  ? "GITHUB_REPO"
                  : activeSource === "zip"
                  ? "ZIP_ARCHIVE"
                  : "YAML_MANIFEST"
              )}
              diagnosis={currentDiagnosis}
              hindsightMeta={currentHindsightMeta}
              onOpenPostMortemForIncident={onOpenPostMortemForIncident}
              onReinvestigate={handleLaunch}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
