"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Activity,
  History,
  Brain,
  BookOpen,
  FileText,
  TrendingUp,
  Settings,
  ShieldCheck,
  Zap,
  ChevronRight,
  ExternalLink,
  X,
  Radio,
} from "lucide-react";

export type WorkspaceTab =
  | "overview"
  | "investigations"
  | "history"
  | "memory"
  | "runbooks"
  | "postmortems"
  | "insights"
  | "settings";

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  hindsightConnected: boolean;
  userEmail?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  hindsightConnected,
  userEmail,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const navItems: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Compass className="w-4 h-4" /> },
    { id: "investigations", label: "Investigations", icon: <Activity className="w-4 h-4" /> },
    { id: "history", label: "Incident History", icon: <History className="w-4 h-4" /> },
    { id: "memory", label: "Memory Bank", icon: <Brain className="w-4 h-4" /> },
    { id: "runbooks", label: "SRE Runbooks", icon: <BookOpen className="w-4 h-4" /> },
    { id: "postmortems", label: "Post-Mortems", icon: <FileText className="w-4 h-4" /> },
    { id: "insights", label: "Reliability Insights", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop with Fade */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 h-screen w-64 bg-[#0B0F19]/95 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none text-slate-300 shadow-[4px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white text-white" />
              </motion.div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight text-white font-mono">
                    ClusterSage
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                    SRE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Autonomous Kubernetes Intelligence</p>
              </div>
            </div>

            {/* Mobile close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Items with Animated Active Pill */}
          <div className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Workspace Modules
            </div>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 group cursor-pointer ${
                    isActive
                      ? "text-cyan-200"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  }`}
                >
                  {/* Sliding Active Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-blue-600/15 to-transparent border border-cyan-500/40 rounded-xl shadow-[0_0_15px_-3px_rgba(6,182,212,0.25)] -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}

                  <div className="flex items-center gap-2.5 z-10">
                    <span
                      className={`transition-colors duration-150 ${
                        isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer: Operator Account & Identity */}
        <div className="p-3 border-t border-slate-800/80">
          {userEmail && (
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="truncate max-w-[170px]">
                <p className="text-[10px] text-slate-400 font-medium font-sans">Signed in as</p>
                <p className="text-slate-200 font-mono text-xs truncate font-semibold">{userEmail}</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
