"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Menu,
  Shield,
  LogOut,
  LogIn,
  Sparkles,
  UserCheck,
  Zap,
} from "lucide-react";

interface HeaderProps {
  user: any;
  onOpenAuth: () => void;
  onSignOut: () => void;
  isHealthy?: boolean;
  hindsightConnected?: boolean;
  onOpenReveal?: () => void;
  onToggleSidebar?: () => void;
  activeContext?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  isHealthy = true,
  hindsightConnected = true,
  onOpenReveal,
  onToggleSidebar,
  activeContext,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0B0F19]/80 backdrop-blur-2xl border-b border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Mobile Toggle & Minimal Brand Mark */}
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </motion.button>
          )}

          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-mono font-bold text-sm text-white">ClusterSage</span>
          </div>
        </div>

        {/* Right: Actions & Account */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 ml-auto">
          {/* Re-playable Cinematic Product Story Button */}
          {onOpenReveal && (
            <motion.button
              whileHover={{ scale: 1.02, borderColor: "rgba(6, 182, 212, 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenReveal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Product Story</span>
            </motion.button>
          )}

          {/* User Account / Auth Actions */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[200px] font-mono">
                  {user.email || "Operator"}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-rose-400 bg-slate-900/80 hover:bg-rose-500/10 rounded-xl border border-slate-800 hover:border-rose-500/30 transition shadow-sm cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px -3px rgba(6, 182, 212, 0.4)" }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-cyan-600/20 border border-cyan-400/30 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};
