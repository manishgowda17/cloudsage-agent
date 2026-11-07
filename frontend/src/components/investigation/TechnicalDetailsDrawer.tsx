"use client";

import React, { useState } from "react";
import {
  Code2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Terminal,
  FileJson,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface TechnicalDetailsDrawerProps {
  rawDetails?: Record<string, any>;
  investigationId?: string;
  sourceName?: string;
}

export const TechnicalDetailsDrawer: React.FC<TechnicalDetailsDrawerProps> = ({
  rawDetails,
  investigationId = "investigation",
  sourceName = "report",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  if (!rawDetails || Object.keys(rawDetails).length === 0) {
    return null;
  }

  const rawKeys = Object.keys(rawDetails);
  const jsonString = JSON.stringify(rawDetails, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clustersage-telemetry-${investigationId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Determine what to display based on active tab
  const displayData =
    activeTab === "all" ? rawDetails : { [activeTab]: rawDetails[activeTab] };

  const displayedJsonString = JSON.stringify(displayData, null, 2);

  // Filter lines if search query is provided
  const lines = displayedJsonString.split("\n");
  const filteredLines = searchQuery.trim()
    ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines;

  return (
    <div className="rounded-3xl bg-[#0B0F19]/90 border border-slate-800/90 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Drawer Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-900/40 transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-cyan-400 shadow-sm">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black font-mono text-white tracking-tight uppercase">
                Technical Telemetry & Raw Diagnostics Drawer
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {rawKeys.length} Data Sources
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Preserved low-level diagnostics, full AST dumps, memory graph payloads, and raw API responses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyan-400 hidden sm:inline">
            {isOpen ? "Collapse Telemetry" : "Expand Raw Telemetry"}
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-slate-800/90 p-5 sm:p-6 space-y-4 bg-[#080B12]">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            {/* Tabs for Top-level Keys */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  activeTab === "all"
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-800/70 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Full Telemetry
              </button>
              {rawKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                    activeTab === key
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-800/70 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Actions: Copy & Download */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search telemetry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition cursor-pointer border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono transition cursor-pointer border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* JSON Telemetry Viewer */}
          <div className="rounded-2xl bg-[#04060A] border border-slate-800/80 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[460px] overflow-y-auto shadow-inner">
            {searchQuery.trim() ? (
              <pre className="whitespace-pre text-cyan-400/90 leading-relaxed">
                {filteredLines.length > 0
                  ? filteredLines.join("\n")
                  : `// No matches found for "${searchQuery}"`}
              </pre>
            ) : (
              <pre className="whitespace-pre text-slate-300 leading-relaxed font-mono">
                {displayedJsonString}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
