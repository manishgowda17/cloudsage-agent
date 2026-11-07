"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { insforgeService } from "@/services/insforge";
import {
  Lock,
  Mail,
  Key,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Eye,
  EyeOff,
  FastForward,
  ChevronRight,
  Activity,
  Brain,
  Shield,
  Search,
  Cpu,
  Layers,
  Terminal,
} from "lucide-react";

// ============================================================================
// MOTION VARIANTS & EASING CURVES (GPU ACCELERATED)
// ============================================================================

/**
 * Signature Linear/Apple-grade Deceleration Curve
 * [0.16, 1, 0.3, 1] provides an ultra-smooth, confident deceleration with zero bounce.
 */
const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: CINEMATIC_EASE },
  },
};

export const itemFadeVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: CINEMATIC_EASE },
  },
};

export const cardEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    filter: "blur(8px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.72,
      ease: CINEMATIC_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: "blur(6px)",
    transition: {
      duration: 0.35,
      ease: CINEMATIC_EASE,
    },
  },
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface CinematicIntroAuthProps {
  onAuthenticated: (user: any) => void;
  onGuestAccess?: () => void;
  initialUser?: any;
}

type IntroStage = "oversized" | "zooming" | "settled" | "auth" | "completing";
type AuthView = "signin" | "signup" | "otp" | "forgot_password";

export const CinematicIntroAuth: React.FC<CinematicIntroAuthProps> = ({
  onAuthenticated,
  onGuestAccess,
  initialUser,
}) => {
  // Brand reveal sequence stage
  const [stage, setStage] = useState<IntroStage>("oversized");
  const [showSweep, setShowSweep] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Authentication states
  const [authView, setAuthView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [authStageText, setAuthStageText] = useState("Authenticating...");

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        setPrefersReducedMotion(true);
        setStage("auth");
        return;
      }
    }

    // Sequence Choreography:
    // 0.0s - 0.5s: Phase A — Oversized opening (~4.2x scale, extending beyond viewport)
    // 0.5s - 2.8s: Phase B — Cinematic zoom-out with [0.16, 1, 0.3, 1] easing
    // 2.8s - 3.5s: Phase C — Wordmark settles, subtle silver luminous sweep washes across
    // 3.5s - 4.4s: Hold final brand composition
    // 4.4s+: Smooth spatial expansion into two-column enterprise sign-in layout

    const tZoom = setTimeout(() => {
      setStage("zooming");
    }, 500);

    const tSettle = setTimeout(() => {
      setStage("settled");
      setShowSweep(true);
    }, 2800);

    const tAuth = setTimeout(() => {
      setStage("auth");
    }, 4400);

    return () => {
      clearTimeout(tZoom);
      clearTimeout(tSettle);
      clearTimeout(tAuth);
    };
  }, []);

  // Keyboard shortcut: Press Escape anytime to immediately skip into authentication
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "auth" && stage !== "completing") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage]);

  const handleSkip = () => {
    setStage("auth");
  };

  // OAuth Providers (Google, GitHub, LinkedIn)
  const handleOAuth = async (provider: "google" | "github" | "linkedin") => {
    setLoading(true);
    setErrorMsg(null);
    setAuthStageText(`Connecting ${provider.toUpperCase()} Identity Provider...`);

    try {
      let res;
      if (provider === "google") res = await insforgeService.signInWithGoogle();
      else if (provider === "github") res = await insforgeService.signInWithGitHub();
      else res = await insforgeService.signInWithLinkedIn();

      if (res && (res as any).error) {
        setErrorMsg((res as any).error.message || `Failed to initiate ${provider} authentication.`);
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to connect with ${provider}`);
      setLoading(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    setAuthStageText("Verifying Operator Credentials...");
    const t1 = setTimeout(() => setAuthStageText("Synchronizing Cluster Identity..."), 600);
    const t2 = setTimeout(() => setAuthStageText("Granting Console Access..."), 1200);

    try {
      if (authView === "signup") {
        const { data, error } = await insforgeService.signUp(email, password);
        if (error) {
          setErrorMsg(error.message || "Registration failed. Verify credentials format.");
        } else if (data?.requireEmailVerification || !data?.accessToken) {
          setAuthView("otp");
          setInfoMsg(`Security verification token dispatched to ${email}.`);
        } else {
          completeAuth(data?.user || { email });
        }
      } else if (authView === "signin") {
        const { data, error } = await insforgeService.signIn(email, password);
        if (error) {
          if (error.statusCode === 403 || error.message?.toLowerCase().includes("verify")) {
            setAuthView("otp");
            setInfoMsg("Operator account requires security OTP confirmation.");
          } else {
            setErrorMsg(error.message || "Invalid operator credentials. Access denied.");
          }
        } else {
          completeAuth(data?.user || { email });
        }
      } else if (authView === "otp") {
        const res = await insforgeService.verifyEmail(email, otp.trim());
        if (res.error) {
          setErrorMsg((res.error as any)?.message || "Invalid or expired security code.");
        } else {
          completeAuth(res.data?.user || { email });
        }
      } else if (authView === "forgot_password") {
        const res = await insforgeService.sendResetPasswordEmail(email);
        if (res.error) {
          setErrorMsg((res.error as any)?.message || "Unable to dispatch recovery link.");
        } else {
          setInfoMsg(`Password recovery instructions dispatched to ${email}.`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication pipeline failure. Check network connectivity.");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
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
        setErrorMsg((res.error as any)?.message || "Failed to resend code.");
      } else {
        setInfoMsg("A fresh security code has been transmitted.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  // Support pasting full 6 digits in OTP
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      setOtp(pastedData);
    }
  };

  const completeAuth = (user: any) => {
    setStage("completing");
    setTimeout(() => {
      onAuthenticated(user);
    }, 550);
  };

  const handleGuest = () => {
    setStage("completing");
    setTimeout(() => {
      if (onGuestAccess) onGuestAccess();
      else onAuthenticated({ email: "guest.operator@clustersage.internal", isGuest: true });
    }, 450);
  };

  const isAuthActive = stage === "auth" || stage === "completing";

  return (
    <div className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto w-screen min-h-screen bg-[#060A14] text-white flex items-center justify-center select-none font-sans">
      {/* ==================================================================== */}
      {/* 1. SOPHISTICATED MIDNIGHT-NAVY ATMOSPHERIC BACKGROUND                */}
      {/* ==================================================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Deep midnight blue radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_rgba(15,26,48,0.75)_0%,_rgba(6,10,20,0.95)_65%,_#040711_100%)]" />

        {/* Very restrained soft radial illumination behind the stage */}
        <motion.div
          animate={{
            opacity: isAuthActive ? 0.35 : [0.4, 0.55, 0.4],
            scale: isAuthActive ? 1.05 : [0.95, 1.05, 0.95],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(38,72,128,0.22)_0%,_rgba(14,28,54,0.1)_45%,_transparent_70%)] blur-[100px]"
        />

        {/* Soft edge vignette framing the screen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(2,4,10,0.8)_100%)] pointer-events-none" />
      </div>

      {/* ==================================================================== */}
      {/* 2. MINIMALIST SKIP CONTROL (DURING INTRO)                            */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {!isAuthActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="fixed top-6 right-6 z-50"
          >
            <button
              onClick={handleSkip}
              className="group relative px-3.5 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-500/60 text-[11px] font-mono text-slate-300 hover:text-white transition overflow-hidden cursor-pointer backdrop-blur-md active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <span className="relative z-10 tracking-widest">[ESC] SKIP</span>
              <FastForward className="w-3 h-3 text-slate-400 group-hover:text-cyan-300 relative z-10 group-hover:translate-x-0.5 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* 3. SIGNATURE ZOOM-OUT TYPOGRAPHY REVEAL ("CLUSTERSAGE")               */}
      {/* ==================================================================== */}
      {!isAuthActive && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
          <div className="relative overflow-visible flex items-center justify-center select-none py-4 px-2">
            <motion.h1
              initial={{
                scale: 4.2, // Phase A: 3.5–4.5x final size, extends beyond viewport edges
                opacity: 0.85,
                letterSpacing: "0.22em",
              }}
              animate={{
                scale: stage === "oversized" ? 4.2 : 1,
                opacity: 1,
                letterSpacing: stage === "oversized" ? "0.22em" : "0.15em",
              }}
              transition={{
                duration: stage === "oversized" ? 0 : 2.3, // Phase B: 0.5s to 2.8s zoom-out
                ease: CINEMATIC_EASE,
              }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-sans tracking-[0.15em] sm:tracking-[0.18em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-[#F1F5F9] to-[#94A3B8] drop-shadow-[0_2px_14px_rgba(255,255,255,0.12)] will-change-transform transform-gpu whitespace-nowrap"
            >
              CLUSTERSAGE
            </motion.h1>

            {/* Phase C: Subtle Luminous Light Sweep Across Settled Text */}
            {showSweep && (
              <motion.div
                initial={{ x: "-120%", opacity: 0 }}
                animate={{
                  x: ["-120%", "240%"],
                  opacity: [0, 0.45, 0],
                }}
                transition={{
                  duration: 1.6,
                  ease: "easeInOut",
                  delay: 0.1,
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-[-18deg] pointer-events-none"
              />
            )}
          </div>

          {/* Minimalist Monospace Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: stage === "settled" ? 0.7 : 0,
              y: stage === "settled" ? 0 : 10,
            }}
            transition={{ duration: 0.6, ease: CINEMATIC_EASE }}
            className="text-[10px] sm:text-[11px] font-mono tracking-[0.32em] text-slate-300 uppercase mt-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
          >
            INTELLIGENCE FOR THE UNSTOPPABLE CLUSTER
          </motion.p>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. BALANCED TWO-COLUMN ENTERPRISE AUTHENTICATION LAYOUT               */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isAuthActive && (
          <motion.div
            key="auth-two-column-stage"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-30 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center min-h-screen"
          >
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
              {/* ============================================================== */}
              {/* LEFT PANEL — BRAND EXPERIENCE & PLATFORM INTELLIGENCE          */}
              {/* ============================================================== */}
              <div className="lg:col-span-6 space-y-6 lg:space-y-8 text-left">
                {/* Brand Header */}
                <motion.div variants={itemFadeVariants} className="space-y-3">
                  <div>
                    <span className="text-2xl sm:text-3xl font-black font-sans tracking-[0.16em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 drop-shadow-[0_2px_12px_rgba(255,255,255,0.1)]">
                      CLUSTERSAGE
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
                    Intelligence for modern infrastructure.
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-lg font-normal">
                    Investigate incidents, uncover root causes, and build operational intelligence that evolves with every investigation.
                  </p>
                </motion.div>

                {/* 3 Concise Feature Highlights */}
                <motion.div variants={itemFadeVariants} className="space-y-4 pt-2">
                  {/* Feature 1 */}
                  <div className="flex items-start gap-3.5 group">
                    <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/70 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm group-hover:border-cyan-500/50 transition">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono tracking-tight">
                        Intelligent Incident Investigation
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                        Deep manifest inspection, live cluster event telemetry, and multi-stage SRE root cause diagnosis.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-start gap-3.5 group">
                    <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/70 text-indigo-400 flex items-center justify-center shrink-0 shadow-sm group-hover:border-indigo-500/50 transition">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono tracking-tight">
                        Persistent Operational Memory
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                        Powered by Hindsight. Automatically recalls verified root causes, effective patches, and post-mortems so past failures are never debugged from scratch.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-start gap-3.5 group">
                    <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/70 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm group-hover:border-emerald-500/50 transition">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono tracking-tight">
                        Evidence-Based Remediation
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                        Schema-validated patch diffs, safe kubectl remediation commands, and standardized post-mortem records.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Subtle Abstract Infrastructure Architecture Indicator */}
                <motion.div
                  variants={itemFadeVariants}
                  className="pt-2 flex items-center gap-4 text-xs font-mono text-slate-500"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-500/70" /> Multi-Cluster
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500/70" /> SRE Engine
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-500/70" /> Real-time
                  </span>
                </motion.div>
              </div>

              {/* ============================================================== */}
              {/* RIGHT PANEL — AUTHENTICATION CARD                              */}
              {/* ============================================================== */}
              <div className="lg:col-span-6 w-full max-w-md mx-auto lg:ml-auto">
                <motion.div
                  variants={cardEntranceVariants}
                  className="relative rounded-[28px] bg-[#080D1A]/90 backdrop-blur-2xl border border-slate-700/70 shadow-[0_25px_65px_-15px_rgba(0,0,0,0.85),0_0_40px_-10px_rgba(56,189,248,0.15)] p-6 sm:p-8"
                >
                  {/* Subtle top perimeter light line */}
                  <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-b from-slate-600/40 via-cyan-500/20 to-transparent pointer-events-none -z-10" />

                  {/* Brand Mark */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-black font-mono shadow-sm">
                        C
                      </div>
                      <span className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                        Console Auth
                      </span>
                    </div>
                  </div>

                  {/* Heading & Subtitle */}
                  <div className="mb-5">
                    <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                      {authView === "otp"
                        ? "Verify Security Token"
                        : authView === "forgot_password"
                        ? "Reset Access Token"
                        : authView === "signup"
                        ? "Create an Account"
                        : "Welcome back"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {authView === "otp"
                        ? `Enter the 6-digit cryptographic verification code sent to ${email}`
                        : authView === "forgot_password"
                        ? "Enter your operator email address to receive password reset instructions."
                        : authView === "signup"
                        ? "Register your operator profile to begin intelligent cluster investigations."
                        : "Sign in to continue to your workspace."}
                    </p>
                  </div>

                  {/* Error Banner */}
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                      <span className="font-medium leading-relaxed">{errorMsg}</span>
                    </motion.div>
                  )}

                  {/* Info Banner */}
                  {infoMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-start gap-2.5 text-cyan-300 text-xs shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
                      <span className="font-medium leading-relaxed">{infoMsg}</span>
                    </motion.div>
                  )}

                  {/* VIEW 1: OTP Verification */}
                  {authView === "otp" && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono font-bold text-slate-300 mb-2 text-center uppercase tracking-wider">
                          6-Digit Security Token
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          autoFocus
                          value={otp}
                          onPaste={handleOtpPaste}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
                          className="w-full bg-[#040711] border border-cyan-500/40 rounded-2xl px-4 py-3.5 text-center text-3xl font-mono font-black tracking-[0.35em] text-cyan-300 placeholder-slate-700 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition shadow-inner"
                        />
                        <p className="text-[11px] text-slate-500 mt-2 text-center font-mono">
                          Check your security email inbox or spam filter (supports paste)
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otp.length < 6}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Token...</span>
                          </>
                        ) : (
                          <span>Verify & Enter Console</span>
                        )}
                      </button>

                      <div className="flex items-center justify-between pt-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthView("signin");
                            setErrorMsg(null);
                            setInfoMsg(null);
                          }}
                          className="text-slate-400 hover:text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
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
                  )}

                  {/* VIEW 2: Forgot Password */}
                  {authView === "forgot_password" && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                          Operator Email
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-slate-400">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="operator@company.com"
                            className="w-full bg-[#040711] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Dispatching Reset Link...</span>
                          </>
                        ) : (
                          <span>Send Password Reset Link</span>
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthView("signin");
                            setErrorMsg(null);
                            setInfoMsg(null);
                          }}
                          className="text-xs text-slate-400 hover:text-white font-semibold transition cursor-pointer"
                        >
                          ← Return to Sign In
                        </button>
                      </div>
                    </form>
                  )}

                  {/* VIEW 3: Primary Sign-In & Create Account */}
                  {(authView === "signin" || authView === "signup") && (
                    <div className="space-y-4">
                      {/* Active Identity Fast Resume (if existing operator session exists) */}
                      {initialUser && (
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 ring-1 ring-cyan-400/30">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="truncate text-left">
                              <p className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider">
                                Active Identity
                              </p>
                              <p className="text-white font-mono font-bold truncate">
                                {initialUser.email}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => completeAuth(initialUser)}
                            className="group px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs shadow-md shrink-0 transition flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                          >
                            <span>Resume</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      )}

                      {/* Social OAuth Suite */}
                      <div className="space-y-2">
                        {/* Google / Gmail */}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleOAuth("google")}
                          className="w-full py-2.5 px-4 bg-[#0B1020] hover:bg-slate-900 border border-white/5 hover:border-cyan-500/40 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer shadow-sm group"
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

                        <div className="grid grid-cols-2 gap-2">
                          {/* GitHub */}
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleOAuth("github")}
                            className="py-2 px-3 bg-[#0B1020] hover:bg-slate-900 border border-white/5 hover:border-cyan-500/40 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shadow-sm"
                          >
                            <span className="flex items-center justify-center w-4 h-4 shrink-0 text-white">
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                />
                              </svg>
                            </span>
                            <span>GitHub</span>
                          </button>

                          {/* LinkedIn */}
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleOAuth("linkedin")}
                            className="py-2 px-3 bg-[#0B1020] hover:bg-slate-900 border border-white/5 hover:border-cyan-500/40 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shadow-sm"
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
                        <div className="flex-grow border-t border-slate-800" />
                        <span className="flex-shrink mx-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                          or credentials
                        </span>
                        <div className="flex-grow border-t border-slate-800" />
                      </div>

                      {/* Email & Password Form */}
                      <form onSubmit={handleSubmit} className="space-y-3.5">
                        {/* Email Input */}
                        <div>
                          <label className="block text-xs font-mono font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Operator Email
                          </label>
                          <div className="relative flex items-center">
                            <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-slate-400">
                              <Mail className="w-4 h-4" />
                            </div>
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="operator@company.com"
                              className="w-full bg-[#040711] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition font-mono"
                            />
                          </div>
                        </div>

                        {/* Password Input */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                              Access Password
                            </label>
                            {authView === "signin" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthView("forgot_password");
                                  setErrorMsg(null);
                                  setInfoMsg(null);
                                }}
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-mono"
                              >
                                Forgot password?
                              </button>
                            )}
                          </div>

                          <div className="relative flex items-center">
                            <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-slate-400">
                              <Key className="w-4 h-4" />
                            </div>
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full bg-[#040711] border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 p-1 rounded text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Primary Button */}
                        <button
                          type="submit"
                          disabled={loading}
                          className="group relative w-full py-3.5 px-4 overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />

                          {loading ? (
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>{authStageText}</span>
                            </div>
                          ) : authView === "signup" ? (
                            <span className="relative z-10 flex items-center gap-2 font-mono">
                              <span>Create Account</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          ) : (
                            <span className="relative z-10 flex items-center gap-2 font-mono">
                              <span>Sign in</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          )}
                        </button>
                      </form>

                      {/* Secondary Switcher: Sign in vs Create account */}
                      <div className="mt-3 text-center pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthView(authView === "signup" ? "signin" : "signup");
                            setErrorMsg(null);
                            setInfoMsg(null);
                          }}
                          className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-mono"
                        >
                          {authView === "signup"
                            ? "Already have an account? Sign in"
                            : "Don't have an account? Create account"}
                        </button>
                      </div>

                      {/* Guest Exploration Option */}
                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={handleGuest}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono transition cursor-pointer group"
                        >
                          <span>Explore as Guest Operator</span>
                          <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
