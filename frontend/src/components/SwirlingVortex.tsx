"use client";

import React, { useEffect, useState, useRef } from "react";

interface SwirlingVortexProps {
  className?: string;
  intensity?: "gentle" | "medium" | "dramatic";
  blurAmount?: number;
  interactiveParallax?: boolean;
  activeSurge?: boolean;
}

export const SwirlingVortex: React.FC<SwirlingVortexProps> = ({
  className = "",
  intensity = "medium",
  blurAmount = 45,
  interactiveParallax = true,
  activeSurge = false,
}) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
    }
  }, []);

  useEffect(() => {
    if (!interactiveParallax || reducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // Controlled, subtle parallax offset (-15px to 15px)
      const deltaX = ((e.clientX - centerX) / window.innerWidth) * 20;
      const deltaY = ((e.clientY - centerY) / window.innerHeight) * 20;
      setCoords({ x: deltaX, y: deltaY });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [interactiveParallax, reducedMotion]);

  if (reducedMotion) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/30 via-indigo-50/20 to-rose-100/30 opacity-40" />
      </div>
    );
  }

  const speedMultiplier = activeSurge ? 0.4 : 1;
  const surgeScale = activeSurge ? 1.15 : 1;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none transition-all duration-700 ${className}`}
      style={{
        transform: `translate3d(${coords.x * 0.4}px, ${coords.y * 0.4}px, 0)`,
      }}
    >
      {/* Outer Vortex Ring: Electric Ultramarine & Opalescent Violet */}
      <div
        className="vortex-layer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-multiply opacity-50 will-change-transform"
        style={{
          width: "580px",
          height: "580px",
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(37, 99, 235, 0.45) 0deg, rgba(139, 92, 246, 0.35) 90deg, rgba(244, 63, 94, 0.25) 180deg, rgba(56, 189, 248, 0.4) 270deg, rgba(37, 99, 235, 0.45) 360deg)",
          filter: `blur(${blurAmount}px)`,
          animation: `vortex-slow-rotate ${24 * speedMultiplier}s linear infinite`,
          transform: `translate3d(-50%, -50%, 0) scale(${surgeScale})`,
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Counter-rotating Core: Electric Coral & Azure Refraction */}
      <div
        className="vortex-layer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen opacity-45 will-change-transform"
        style={{
          width: "420px",
          height: "420px",
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(244, 63, 94, 0.4) 0deg, rgba(59, 130, 246, 0.45) 120deg, rgba(168, 85, 247, 0.35) 240deg, rgba(244, 63, 94, 0.4) 360deg)",
          filter: `blur(${blurAmount * 0.85}px)`,
          animation: `vortex-reverse-rotate ${16 * speedMultiplier}s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite`,
          transform: `translate3d(-50%, -50%, 0) translate3d(${coords.x * 0.8}px, ${coords.y * 0.8}px, 0) scale(${surgeScale})`,
          transition: "transform 0.5s ease-out",
        }}
      />

      {/* Central Luminous Gravitational Anchor */}
      <div
        className="vortex-layer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full will-change-transform"
        style={{
          width: "240px",
          height: "240px",
          background:
            "radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(199, 210, 254, 0.5) 45%, rgba(244, 63, 94, 0.15) 75%, transparent 100%)",
          filter: `blur(${blurAmount * 0.5}px)`,
          animation: `vortex-pulse ${6 * speedMultiplier}s ease-in-out infinite`,
          transform: "translate3d(-50%, -50%, 0)",
        }}
      />
    </div>
  );
};
