"use client";

import React from "react";
import { Terminal, Shield, LogOut, LogIn, Sparkles, Activity, Play } from "lucide-react";

interface HeaderProps {
  user: any;
  onOpenAuth: () => void;
  onSignOut: () => void;
  isHealthy: boolean;
  onOpenReveal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  isHealthy,
  onOpenReveal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              AI Kubernetes Agent
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                SRE Edition
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Living cluster diagnostics with Google Gemini & InsForge
            </p>
          </div>
        </div>

        {/* Right Actions & Health */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Re-playable Cinematic Reveal Button */}
          {onOpenReveal && (
            <button
              onClick={onOpenReveal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/90 rounded-lg transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Product Story</span>
            </button>
          )}

          {/* System Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-slate-600 text-[11px] font-medium hidden sm:inline">
              Engine:{" "}
              <strong className={isHealthy ? "text-emerald-700" : "text-amber-700"}>
                {isHealthy ? "Online" : "Connecting"}
              </strong>
            </span>
          </div>

          {/* User Auth Session */}
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-semibold text-slate-900 truncate max-w-[150px]">
                  {user.email || "SRE Engineer"}
                </p>
                <p className="text-[10px] text-emerald-600 flex items-center justify-end gap-1 font-medium">
                  <Shield className="w-3 h-3" /> Authenticated
                </p>
              </div>
              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 bg-slate-100/80 hover:bg-rose-50 rounded-lg border border-slate-200 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition hover:shadow-md"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
