"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Key,
  Bell,
  Brain,
  Database,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Check,
  Send,
  LogOut,
  RefreshCw,
  FileJson,
  Shield,
  Layers,
  Lock,
} from "lucide-react";
import { insforgeService } from "@/services/insforge";
import { investigationService } from "@/services/investigationService";
import { ClusterItem, InvestigationHistoryItem } from "@/types";

export type SettingsSectionId =
  | "profile"
  | "security"
  | "notifications"
  | "hindsight"
  | "data";

interface SettingsPanelProps {
  user?: any;
  userEmail?: string;
  hindsightConnected: boolean;
  selectedContext: string | null;
  clusters?: ClusterItem[];
  historyItems?: InvestigationHistoryItem[];
  onSignOut?: () => void;
  onClearHistory?: () => void;
  onNavigateTab?: (tab: any) => void;
}

interface NotificationPreferences {
  investigation_completed: boolean;
  important_findings: boolean;
  critical_findings: boolean;
  hindsight_memory_sync: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  investigation_completed: true,
  important_findings: true,
  critical_findings: true,
  hindsight_memory_sync: true,
};

export function SettingsPanel({
  user,
  userEmail,
  hindsightConnected,
  selectedContext,
  clusters = [],
  historyItems = [],
  onSignOut,
  onClearHistory,
  onNavigateTab,
}: SettingsPanelProps) {
  // Navigation & Filtering
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const [searchQuery, setSearchQuery] = useState("");

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Profile State
  const [operatorName, setOperatorName] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);

  // Hindsight Metrics State
  const [hindsightMetrics, setHindsightMetrics] = useState<{
    totalIncidents: number;
    recurringPatterns: number;
  }>({
    totalIncidents: 0,
    recurringPatterns: 0,
  });
  const [isFetchingHindsightMetrics, setIsFetchingHindsightMetrics] = useState(false);

  // Password Reset State
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Modal Dialogs
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showClearMemoryModal, setShowClearMemoryModal] = useState(false);

  // Toast Helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Initial Sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProfile = localStorage.getItem("clustersage_profile");
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.name) setOperatorName(parsed.name);
        } catch {}
      } else if (user?.user_metadata?.name || user?.email) {
        setOperatorName(user.user_metadata?.name || user.email.split("@")[0]);
      }

      const savedNotifs = localStorage.getItem("clustersage_notifications");
      if (savedNotifs) {
        try {
          setNotifications(JSON.parse(savedNotifs));
        } catch {}
      }
    }
  }, [user]);

  // Load Hindsight Stats
  useEffect(() => {
    loadHindsightStats();
  }, []);

  const loadHindsightStats = async () => {
    setIsFetchingHindsightMetrics(true);
    try {
      const insights = await investigationService.getHindsightInsights();
      if (insights) {
        setHindsightMetrics({
          totalIncidents: insights.total_incidents_recorded || 0,
          recurringPatterns: insights.recurring_patterns?.length || 0,
        });
      }
    } catch {
      // Fallback gracefully
    } finally {
      setIsFetchingHindsightMetrics(false);
    }
  };

  const handleSaveProfile = () => {
    const profile = { name: operatorName };
    localStorage.setItem("clustersage_profile", JSON.stringify(profile));
    setIsEditingProfile(false);
    showToast("Profile updated successfully");
  };

  const handleToggleNotification = (key: keyof NotificationPreferences) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem("clustersage_notifications", JSON.stringify(updated));
    showToast("Notification preference updated");
  };

  const handleSendPasswordReset = async () => {
    const emailToSend = userEmail || user?.email;
    if (!emailToSend) {
      showToast("No email address found to receive reset link.", "error");
      return;
    }
    setIsSendingResetEmail(true);
    try {
      const res = await insforgeService.sendResetPasswordEmail(emailToSend);
      if (res.error) {
        showToast((res.error as any)?.message || "Failed to dispatch password reset email.", "error");
      } else {
        showToast(`Password reset link sent to ${emailToSend}`);
      }
    } catch {
      showToast("Could not send password reset email.", "error");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleExportHistory = () => {
    try {
      const dataToExport = {
        exported_at: new Date().toISOString(),
        operator: userEmail || user?.email || "anonymous",
        total_records: historyItems.length,
        investigations: historyItems,
      };

      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateTag = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `clustersage-investigations-${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${historyItems.length} records`);
    } catch {
      showToast("Failed to generate export file.", "error");
    }
  };

  const handleConfirmClearHistory = () => {
    if (onClearHistory) {
      onClearHistory();
    }
    setShowClearHistoryModal(false);
    showToast("Investigation history cleared", "info");
  };

  const handleConfirmPurge = () => {
    if (purgeConfirmText.trim().toUpperCase() !== "DELETE") {
      showToast("Please type DELETE to confirm.", "error");
      return;
    }
    localStorage.clear();
    setShowPurgeModal(false);
    showToast("Workspace data purged. Signing out...", "info");
    setTimeout(() => {
      if (onSignOut) onSignOut();
    }, 600);
  };

  const handleConfirmClearMemory = () => {
    setShowClearMemoryModal(false);
    setHindsightMetrics({ totalIncidents: 0, recurringPatterns: 0 });
    showToast("Local memory cache reset", "info");
  };

  // Nav Items: Exactly the 5 requested sections
  const NAV_ITEMS: { id: SettingsSectionId; label: string; icon: React.ReactNode; keywords: string[] }[] = [
    {
      id: "profile",
      label: "Profile",
      icon: <User className="w-4 h-4" />,
      keywords: ["name", "email", "avatar", "account", "profile"],
    },
    {
      id: "security",
      label: "Account & Security",
      icon: <Key className="w-4 h-4" />,
      keywords: ["password", "reset", "signout", "delete", "security"],
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="w-4 h-4" />,
      keywords: ["alert", "notifications", "investigation", "findings", "memory"],
    },
    {
      id: "hindsight",
      label: "Hindsight Memory",
      icon: <Brain className="w-4 h-4" />,
      keywords: ["memory", "retain", "recall", "reflect", "cache", "hindsight"],
    },
    {
      id: "data",
      label: "Data & Privacy",
      icon: <Database className="w-4 h-4" />,
      keywords: ["export", "json", "download", "clear", "privacy", "retention"],
    },
  ];

  // Search filter
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return NAV_ITEMS;
    const q = searchQuery.toLowerCase().trim();
    return NAV_ITEMS.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchLabel || matchKeywords;
    });
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl flex items-center gap-3 text-xs font-medium ${
              toast.type === "error"
                ? "bg-rose-950/90 text-rose-200 border-rose-500/40"
                : toast.type === "info"
                ? "bg-slate-900/90 text-slate-200 border-slate-700"
                : "bg-slate-900/90 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {toast.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === "info" ? (
              <Brain className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white p-1 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Settings Header */}
      <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your account, notification preferences, and operational data.
          </p>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar (Col 4) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-4 space-y-4 shadow-lg">
            {/* Search Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 focus:outline-none text-white placeholder-slate-500 font-sans transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Navigation Tabs List */}
            <nav className="space-y-1">
              {filteredNavItems.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <p className="text-xs text-slate-400">No settings found</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                filteredNavItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition relative cursor-pointer ${
                        isActive
                          ? "text-white bg-slate-800/80 border border-slate-700/80 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 z-10">
                        <span className={isActive ? "text-cyan-400" : "text-slate-400"}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </nav>

            {/* Operator Card */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                  {(operatorName || userEmail || "O").slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {operatorName || userEmail?.split("@")[0] || "Operator"}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{userEmail || "Signed in"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Panel (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {/* 1. PROFILE */}
            {activeSection === "profile" && (
              <motion.div
                key="section-profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 space-y-1">
                  <h2 className="text-base font-bold text-white">Profile</h2>
                  <p className="text-xs text-slate-400">
                    Manage your personal account details and display preferences.
                  </p>
                </div>

                {/* Profile Information Card */}
                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-6 shadow-sm">
                  {/* Avatar & Display Name */}
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                      {(operatorName || userEmail || "O").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {operatorName || userEmail?.split("@")[0] || "Operator"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{userEmail || "Signed in"}</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Full Name</label>
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => {
                          setOperatorName(e.target.value);
                          setIsEditingProfile(true);
                        }}
                        placeholder="Your full name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">Email Address</label>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Managed via authentication
                        </span>
                      </div>
                      <input
                        type="email"
                        value={userEmail || user?.email || ""}
                        readOnly
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 cursor-not-allowed font-mono"
                      />
                    </div>
                  </div>

                  {/* Save Changes Button */}
                  {isEditingProfile && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. ACCOUNT & SECURITY */}
            {activeSection === "security" && (
              <motion.div
                key="section-security"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 space-y-1">
                  <h2 className="text-base font-bold text-white">Account & Security</h2>
                  <p className="text-xs text-slate-400">
                    Manage your credentials, password reset, and active workspace session.
                  </p>
                </div>

                {/* Password Management */}
                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Password & Sign-In</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Send a password reset link to your registered email address.
                      </p>
                    </div>

                    <button
                      onClick={handleSendPasswordReset}
                      disabled={isSendingResetEmail}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingResetEmail ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-cyan-400" /> Send Password Reset Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign Out Card */}
                {onSignOut && (
                  <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Sign Out</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        End your active session on this device.
                      </p>
                    </div>

                    <button
                      onClick={onSignOut}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}

                {/* Danger Zone: Workspace Data Purge */}
                <div className="rounded-3xl bg-rose-950/20 border border-rose-500/30 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-rose-300">Purge Workspace Data</h3>
                      <p className="text-xs text-rose-200/70 mt-0.5 leading-relaxed">
                        Permanently clear locally stored session tokens and workspace preferences on this browser.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setPurgeConfirmText("");
                        setShowPurgeModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      Purge Local Workspace
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. NOTIFICATIONS */}
            {activeSection === "notifications" && (
              <motion.div
                key="section-notifications"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 space-y-1">
                  <h2 className="text-base font-bold text-white">Notifications</h2>
                  <p className="text-xs text-slate-400">
                    Control which operational alerts and incident events notify you.
                  </p>
                </div>

                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-white border-b border-slate-800/80 pb-3">
                    Alert Preferences
                  </h3>

                  <div className="space-y-3">
                    {[
                      {
                        key: "investigation_completed",
                        title: "Investigation Completed",
                        desc: "Receive an alert when an automated cluster or manifest investigation finishes.",
                      },
                      {
                        key: "critical_findings",
                        title: "Critical Issue Notifications",
                        desc: "Immediate notification upon detecting high-severity defects such as CrashLoopBackOff or OOMKilled.",
                      },
                      {
                        key: "important_findings",
                        title: "Important Findings",
                        desc: "Alerts for configuration warnings, probe misconfigurations, and container limit gaps.",
                      },
                      {
                        key: "hindsight_memory_sync",
                        title: "Memory Synchronization",
                        desc: "Notification when recurring incident patterns or historical resolutions are recognized.",
                      },
                    ].map((item) => {
                      const enabled = (notifications as any)[item.key];
                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                        >
                          <div className="pr-4">
                            <p className="text-xs font-semibold text-white">{item.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                          </div>

                          <button
                            onClick={() => handleToggleNotification(item.key as any)}
                            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                              enabled ? "bg-cyan-500" : "bg-slate-800"
                            }`}
                          >
                            <motion.div
                              animate={{ x: enabled ? 20 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="w-4 h-4 rounded-full bg-white shadow absolute top-0.5"
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. HINDSIGHT MEMORY */}
            {activeSection === "hindsight" && (
              <motion.div
                key="section-hindsight"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 space-y-1">
                  <h2 className="text-base font-bold text-white">Hindsight Memory</h2>
                  <p className="text-xs text-slate-400">
                    Persistent operational memory for cross-incident recall and defect pattern learning.
                  </p>
                </div>

                {/* Service Availability Card */}
                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Memory Service</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Status of the long-term incident memory engine.
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        hindsightConnected
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                          : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                      }`}
                    >
                      {hindsightConnected ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Core Capabilities */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-xs font-bold text-white">Retain</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Preserve useful knowledge from completed investigations.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-xs font-bold text-white">Recall</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Retrieve relevant historical incidents during active triage.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-xs font-bold text-white">Reflect</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Identify patterns and learn from previous operational experiences.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics & Management Controls */}
                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-white border-b border-slate-800/80 pb-3">
                    Memory Statistics & Controls
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                      <p className="text-xl font-bold text-cyan-400 font-mono">
                        {hindsightMetrics.totalIncidents}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Recorded Post-Mortems</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                      <p className="text-xl font-bold text-emerald-400 font-mono">
                        {hindsightMetrics.recurringPatterns}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Identified Failure Patterns</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab("memory")}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Brain className="w-3.5 h-3.5 text-cyan-400" /> Browse Incident Memories
                      </button>
                    )}

                    <button
                      onClick={() => setShowClearMemoryModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-amber-400 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-400" /> Reset Memory Cache
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. DATA & PRIVACY */}
            {activeSection === "data" && (
              <motion.div
                key="section-data"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="rounded-3xl bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-800/80 p-6 space-y-1">
                  <h2 className="text-base font-bold text-white">Data & Privacy</h2>
                  <p className="text-xs text-slate-400">
                    Export your investigation history and review data retention policies.
                  </p>
                </div>

                {/* Export Investigation History */}
                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Export Investigation History</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Download a structured JSON archive of all investigations and root cause analyses.
                      </p>
                    </div>

                    <button
                      onClick={handleExportHistory}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Export as JSON ({historyItems.length})
                    </button>
                  </div>
                </div>

                {/* Clear Investigation History */}
                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Clear Investigation History</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Reset the active investigation history list stored in your browser workspace.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowClearHistoryModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-amber-400 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-400" /> Clear History
                    </button>
                  </div>
                </div>

                {/* Privacy & Retention Safeguards */}
                <div className="rounded-3xl bg-[#0F172A]/85 border border-slate-800/80 p-6 space-y-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-white border-b border-slate-800/80 pb-3">
                    Data Retention & Security Policy
                  </h3>

                  <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                    <p>
                      • <strong className="text-slate-200">Client-Side Isolation:</strong> Investigation records and workspace states remain strictly scoped to your authenticated account session.
                    </p>
                    <p>
                      • <strong className="text-slate-200">Zero Third-Party Telemetry:</strong> ClusterSage does not transmit cluster metrics or manifests to third-party ad networks or data brokers.
                    </p>
                    <p>
                      • <strong className="text-slate-200">Sensitive Token Redaction:</strong> Credentials, Bearer tokens, and database passwords are sanitized before analysis.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CONFIRMATION MODALS */}

      {/* 1. Purge Workspace Modal */}
      <AnimatePresence>
        {showPurgeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#0F172A] border border-rose-500/40 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Purge Workspace Data?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will clear local session tokens and cached preferences on this browser.
                To confirm, type <strong className="text-rose-400 font-mono">DELETE</strong> below:
              </p>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowPurgeModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPurge}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
                >
                  Confirm Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Clear History Modal */}
      <AnimatePresence>
        {showClearHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#0F172A] border border-slate-800 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2.5 text-amber-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Clear Investigation History?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to clear your local investigation history?
                You can export your history as a JSON file before clearing.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowClearHistoryModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearHistory}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
                >
                  Clear History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Reset Memory Cache Modal */}
      <AnimatePresence>
        {showClearMemoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#0F172A] border border-slate-800 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2.5 text-cyan-400">
                <Brain className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Reset Memory Cache?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will reset the local cache for memory metrics in your active browser session.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowClearMemoryModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearMemory}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                >
                  Reset Cache
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
