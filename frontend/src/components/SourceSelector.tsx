"use client";

import React, { useState, useRef } from "react";
import { ClusterItem } from "@/types";
import {
  Server,
  Github,
  FileCode,
  Archive,
  UploadCloud,
  CheckCircle,
  Play,
  Loader2,
  AlertCircle,
  Code,
  Zap,
  Layers,
  Sparkles,
} from "lucide-react";

export interface SourceSelectorProps {
  // Live cluster props
  clusters: ClusterItem[];
  selectedContext: string;
  onSelectCluster: (cluster: ClusterItem) => void;
  onRunScenario: (scenario: string) => void;
  // Trigger actions
  onInvestigateCluster: (context?: string) => void;
  onInvestigateGitHub: (url: string) => void;
  onInvestigateYaml: (yamlContent: string, filename: string) => void;
  onInvestigateZip: (zipBase64: string, filename: string) => void;
  isLoading: boolean;
  namespace: string;
  onNamespaceChange: (ns: string) => void;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  clusters,
  selectedContext,
  onSelectCluster,
  onRunScenario,
  onInvestigateCluster,
  onInvestigateGitHub,
  onInvestigateYaml,
  onInvestigateZip,
  isLoading,
  namespace,
  onNamespaceChange,
}) => {
  const [activeTab, setActiveTab] = useState<"cluster" | "github" | "yaml" | "zip">("cluster");

  // GitHub State
  const [githubUrl, setGithubUrl] = useState("https://github.com/kubernetes/examples");

  // YAML State
  const [yamlContent, setYamlContent] = useState(
`apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-gateway
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      containers:
      - name: gateway
        image: payment-gateway:1.4.2
        ports:
        - containerPort: 8080
        # Probe & Resource Specifications
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5`
  );
  const [yamlFilename, setYamlFilename] = useState("deployment.yaml");

  // ZIP State
  const [zipFilename, setZipFilename] = useState<string | null>(null);
  const [zipBase64, setZipBase64] = useState<string | null>(null);
  const [zipSize, setZipSize] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleYamlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setYamlFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setYamlContent(content);
    };
    reader.readAsText(file);
  };

  const handleZipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipFilename(file.name);
    setZipSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && dataUrl.includes(",")) {
        const base64Data = dataUrl.split(",")[1];
        setZipBase64(base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative bg-white/80 backdrop-blur-2xl border border-sky-100/90 rounded-3xl p-6 sm:p-8 mb-7 shadow-[0_20px_50px_-15px_rgba(30,58,138,0.08)] overflow-hidden transition-all duration-300">
      {/* Decorative Fluid Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-sky-200/30 to-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-rose-100/30 to-sky-100/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Intake Selector Tabs */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-blue-700 text-xs font-bold mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Diagnostic Mesh Intake</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Select Investigation Source
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Probe live clusters, audit remote GitOps repos, or inspect raw manifest archives
          </p>
        </div>

        {/* 4 Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 shadow-inner">
          <button
            onClick={() => setActiveTab("cluster")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "cluster"
                ? "bg-white text-blue-700 shadow-sm shadow-blue-500/10 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Live Cluster</span>
          </button>

          <button
            onClick={() => setActiveTab("github")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "github"
                ? "bg-white text-blue-700 shadow-sm shadow-blue-500/10 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repo</span>
          </button>

          <button
            onClick={() => setActiveTab("yaml")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "yaml"
                ? "bg-white text-blue-700 shadow-sm shadow-blue-500/10 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Plain YAML</span>
          </button>

          <button
            onClick={() => setActiveTab("zip")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "zip"
                ? "bg-white text-blue-700 shadow-sm shadow-blue-500/10 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>ZIP Archive</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="relative z-10 pt-6">
        {/* TAB 1: LIVE CLUSTER CONTEXT & SCENARIO BENCH */}
        {activeTab === "cluster" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cluster Context Picker */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Discovered Kubeconfig Contexts
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clusters.map((cluster) => {
                    const isSelected = cluster.context === selectedContext;
                    const isConn = cluster.status === "connected";
                    return (
                      <button
                        key={cluster.context}
                        onClick={() => onSelectCluster(cluster)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                          isSelected
                            ? "bg-gradient-to-br from-blue-50/90 to-sky-50/70 border-blue-400/80 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/15"
                            : "bg-white/90 border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isConn ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                              }`}
                            />
                            <h4 className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                              {cluster.name}
                            </h4>
                          </div>
                          {cluster.is_current && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                          {cluster.server}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Namespace & Trigger */}
              <div className="flex flex-col justify-between p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Namespace
                  </label>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs mb-3 shadow-inner">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={namespace}
                      onChange={(e) => onNamespaceChange(e.target.value)}
                      placeholder="default"
                      className="bg-transparent text-slate-900 font-mono font-bold focus:outline-none w-full"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onInvestigateCluster(selectedContext)}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Investigating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Investigate Live Cluster</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Failure Scenario Quick-Fire Simulator */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700">
                  Simulate Failure Scenarios (Senior SRE Benchmark)
                </span>
                <span className="text-[11px] text-slate-400">Deterministic verification</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { id: "crashloop", label: "CrashLoop", desc: "Missing ENV" },
                  { id: "imagepull", label: "ImagePull", desc: "Invalid Tag" },
                  { id: "oom", label: "OOMKilled", desc: "Memory Limit" },
                  { id: "selector", label: "Selector", desc: "Pod Mismatch" },
                  { id: "liveness", label: "Liveness", desc: "HTTP 500 Loop" },
                  { id: "readiness", label: "Readiness", desc: "Endpoint 503" },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => onRunScenario(sc.id)}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-white/90 hover:bg-sky-50/80 border border-slate-200/90 hover:border-sky-300 text-left transition shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                      <Zap className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      <span>{sc.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                      {sc.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GITHUB REPO URL UPLOAD / AUDIT */}
        {activeTab === "github" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-start gap-3">
              <Github className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-900 mb-0.5">
                  Remote GitOps Kubernetes Audit
                </p>
                Provide any public GitHub repository URL containing Kubernetes manifests, Helm templates, or deployment specs. The agent scans manifests for probe defects, selector mismatches, and memory limits.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/org/repo (e.g. https://github.com/kubernetes/examples)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition shadow-inner"
                />
              </div>

              <button
                onClick={() => onInvestigateGitHub(githubUrl)}
                disabled={isLoading || !githubUrl.trim()}
                className="py-3 px-6 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scanning Repo...</span>
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    <span>Audit GitHub Manifests</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 items-center">
              <span className="font-bold text-slate-700">Quick Samples:</span>
              <button
                type="button"
                onClick={() => setGithubUrl("https://github.com/kubernetes/examples")}
                className="underline hover:text-blue-700"
              >
                kubernetes/examples
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setGithubUrl("https://github.com/GoogleCloudPlatform/microservices-demo")}
                className="underline hover:text-blue-700"
              >
                microservices-demo (Online Boutique)
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: PLAIN KUBERNETES YAML MANIFEST */}
        {activeTab === "yaml" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Kubernetes Manifest Code & Probe Inspector
                </span>
                <p className="text-[11px] text-slate-500">
                  Paste YAML manifests below or upload a .yaml / .yml file from your machine
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".yaml,.yml"
                  onChange={handleYamlFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload YAML File</span>
                </button>
                <span className="text-xs font-mono text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {yamlFilename}
                </span>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                rows={9}
                placeholder="Paste Kubernetes YAML manifest here..."
                className="w-full font-mono text-xs text-slate-800 bg-slate-900/5 p-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition leading-relaxed"
                spellCheck={false}
              />
            </div>

            <button
              onClick={() => onInvestigateYaml(yamlContent, yamlFilename)}
              disabled={isLoading || !yamlContent.trim()}
              className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing Manifest...</span>
                </>
              ) : (
                <>
                  <FileCode className="w-4 h-4" />
                  <span>Audit YAML Manifest</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 4: COMPRESSED ZIP ARCHIVE */}
        {activeTab === "zip" && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/30 hover:bg-sky-50/60 transition text-center flex flex-col items-center justify-center">
              <Archive className="w-10 h-10 text-blue-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">
                Upload Compressed K8s Archive (.zip)
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Upload Helm charts, multi-service k8s directories, or Kustomize manifests bundled in a .zip archive.
              </p>

              <input
                type="file"
                ref={zipInputRef}
                accept=".zip"
                onChange={handleZipFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => zipInputRef.current?.click()}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-xs transition active:scale-95 flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <span>{zipFilename ? "Replace ZIP File" : "Choose .zip Archive"}</span>
              </button>

              {zipFilename && (
                <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-100/80 border border-blue-200 text-blue-900 text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
                  <span>{zipFilename} ({zipSize})</span>
                </div>
              )}
            </div>

            <button
              onClick={() => zipBase64 && onInvestigateZip(zipBase64, zipFilename || "archive.zip")}
              disabled={isLoading || !zipBase64}
              className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Decompressing & Auditing...</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Decompress & Audit Archive</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
