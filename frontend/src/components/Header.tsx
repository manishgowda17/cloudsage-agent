"use client";

import React from "react";
import { Terminal, Shield, LogOut, LogIn, CheckCircle2 } from "lucide-react";

interface HeaderProps {
  user: any;
  onOpenAuth: () => void;
  onSignOut: () => void;
  isHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  isHealthy,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              AI Kubernetes Agent
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                SRE Edition
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              On-demand cluster diagnostics powered by OpenRouter & InsForge
            </p>
          </div>
        </div>

        {/* Right Actions & Health */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-slate-300">
              System Status:{" "}
              <strong className={isHealthy ? "text-emerald-400" : "text-amber-400"}>
                {isHealthy ? "Ready" : "Degraded"}
              </strong>
            </span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs font-medium text-slate-200">
                  {user.email || "Active Engineer"}
                </p>
                <p className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                  <Shield className="w-3 h-3" /> Authenticated
                </p>
              </div>
              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
