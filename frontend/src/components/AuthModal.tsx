"use client";

import React, { useState } from "react";
import { insforgeService } from "@/services/insforge";
import {
  Lock,
  Mail,
  AlertCircle,
  X,
  Loader2,
  Key,
  ShieldCheck,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Shield,
  Zap,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [view, setView] = useState<"signin" | "signup" | "otp">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuth = async (provider: "google" | "github" | "linkedin") => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let res;
      if (provider === "google") res = await insforgeService.signInWithGoogle();
      else if (provider === "github") res = await insforgeService.signInWithGitHub();
      else res = await insforgeService.signInWithLinkedIn();

      if (res && (res as any).error) {
        setErrorMsg((res as any).error.message || `Failed to initiate ${provider} sign-in.`);
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to initiate ${provider} sign-in`);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (view === "signup") {
        const { data, error } = await insforgeService.signUp(email, password);
        if (error) {
          setErrorMsg(error.message || "Registration failed. Please check your details.");
        } else if (data?.requireEmailVerification || !data?.accessToken) {
          setView("otp");
          setInfoMsg(`A 6-digit verification code has been dispatched to ${email}.`);
        } else {
          onSuccess(data?.user || { email });
          onClose();
        }
      } else if (view === "signin") {
        const { data, error } = await insforgeService.signIn(email, password);
        if (error) {
          if (error.statusCode === 403 || error.message?.toLowerCase().includes("verify")) {
            setView("otp");
            setInfoMsg("Your email requires OTP verification. Please enter the code sent to your inbox.");
          } else {
            setErrorMsg(error.message || "Invalid credentials. Please verify your email and password.");
          }
        } else {
          onSuccess(data?.user || { email });
          onClose();
        }
      } else if (view === "otp") {
        const res = await insforgeService.verifyEmail(email, otp.trim());
        if (res.error) {
          setErrorMsg((res.error as any)?.message || "Invalid or expired OTP code. Please try again.");
        } else {
          onSuccess(res.data?.user || { email });
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected authentication error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;
    setResending(true);
    setErrorMsg(null);
    try {
      const res = await insforgeService.resendVerificationEmail(email);
      if (res.error) {
        setErrorMsg((res.error as any)?.message || "Failed to resend code");
      } else {
        setInfoMsg("A fresh 6-digit code has been dispatched to your email.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#0B0F19]/95 backdrop-blur-3xl border border-cyan-500/30 rounded-3xl p-7 sm:p-9 shadow-[0_0_60px_-15px_rgba(6,182,212,0.35)] overflow-hidden">
        {/* Luminous Ambient Background Glows */}
        <div className="absolute -top-16 -left-16 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Advanced Security Pill */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold tracking-wider uppercase shadow-[0_0_12px_-2px_rgba(6,182,212,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>InsForge Enterprise Auth</span>
          </div>
        </div>

        {/* Modal Header */}
        <div className="text-center mb-6 relative">
          <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40">
            {view === "otp" ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
            {view === "otp"
              ? "Verify Security OTP"
              : view === "signup"
              ? "Register Operator Account"
              : "ClusterSage Console Access"}
          </h2>

          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {view === "otp"
              ? `Enter the 6-digit confirmation code dispatched to ${email}`
              : view === "signup"
              ? "Create authenticated identity to audit live clusters and manifests"
              : "Sign in with Google, GitHub, LinkedIn or verified credentials"}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs shadow-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-start gap-2.5 text-cyan-300 text-xs shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
            <span className="font-medium leading-relaxed">{infoMsg}</span>
          </div>
        )}

        {/* Body */}
        {view === "otp" ? (
          /* OTP Entry Step */
          <form onSubmit={handleSubmit} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 text-center">
                6-Digit Security Token
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full bg-[#080C14] border border-cyan-500/40 rounded-2xl px-4 py-3.5 text-center text-3xl font-mono font-black tracking-[0.35em] text-cyan-300 placeholder-slate-700 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition shadow-inner"
              />
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Check your primary inbox and spam folder
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Token...</span>
                </>
              ) : (
                <span>Verify & Enter Workspace</span>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setView("signin");
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="text-slate-400 hover:text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <button
                type="button"
                disabled={resending}
                onClick={handleResendOtp}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {resending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Resend Code</span>
              </button>
            </div>
          </form>
        ) : (
          /* Sign In / Sign Up Flow */
          <div className="space-y-4 relative">
            {/* Social OAuth Suite */}
            <div className="space-y-2.5">
              {/* Google / Gmail */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleOAuth("google")}
                className="w-full py-2.5 px-4 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-3 active:scale-98 cursor-pointer shadow-sm group"
              >
                <span className="flex items-center justify-center w-4 h-4 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </span>
                <span>Continue with Google / Gmail</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                {/* GitHub */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleOAuth("github")}
                  className="py-2.5 px-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer shadow-sm"
                >
                  <span className="flex items-center justify-center w-4 h-4 shrink-0 text-white">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </span>
                  <span>GitHub</span>
                </button>

                {/* LinkedIn */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleOAuth("linkedin")}
                  className="py-2.5 px-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer shadow-sm"
                >
                  <span className="flex items-center justify-center w-4 h-4 shrink-0 text-[#0077b5]">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                    </svg>
                  </span>
                  <span>LinkedIn</span>
                </button>
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                or email credentials
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  Operator Email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-cyan-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@company.com"
                    className="w-full bg-[#080C14] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  Secure Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-cyan-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#080C14] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : view === "signup" ? (
                  "Create Operator Account"
                ) : (
                  "Authenticate with Credentials"
                )}
              </button>
            </form>

            <div className="mt-4 text-center pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setView(view === "signup" ? "signin" : "signup");
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
              >
                {view === "signup"
                  ? "Already registered? Sign In"
                  : "Need an operator account? Register here"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
