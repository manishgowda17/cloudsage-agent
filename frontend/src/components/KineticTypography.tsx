"use client";

import React, { useState, useEffect } from "react";

interface KineticTypographyProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  delayMs?: number;
  staggerMs?: number;
  durationMs?: number;
  interactive?: boolean;
  highlightWord?: string;
  highlightClass?: string;
}

export const KineticTypography: React.FC<KineticTypographyProps> = ({
  text,
  as: Component = "h1",
  className = "",
  delayMs = 100,
  staggerMs = 24,
  durationMs = 650,
  interactive = true,
  highlightWord,
  highlightClass = "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600",
}) => {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
    }
  }, []);

  const words = text.split(" ");
  let totalCharIndex = 0;

  if (!mounted || reducedMotion) {
    return (
      <Component className={className}>
        {words.map((word, wIdx) => {
          const isHighlight =
            highlightWord &&
            word.toLowerCase().includes(highlightWord.toLowerCase());
          return (
            <span
              key={wIdx}
              className={`inline-block mr-[0.28em] ${
                isHighlight ? highlightClass : ""
              }`}
            >
              {word}
            </span>
          );
        })}
      </Component>
    );
  }

  return (
    <Component className={`select-none ${className}`}>
      {words.map((word, wordIndex) => {
        const isHighlight =
          highlightWord &&
          word.toLowerCase().includes(highlightWord.toLowerCase());

        return (
          <span
            key={wordIndex}
            className={`inline-block mr-[0.28em] whitespace-nowrap ${
              isHighlight ? highlightClass : ""
            }`}
          >
            {word.split("").map((char, charIndex) => {
              const currentIdx = totalCharIndex++;
              const charDelay = delayMs + currentIdx * staggerMs;

              return (
                <span
                  key={charIndex}
                  className={`kinetic-letter inline-block ${
                    interactive ? "cursor-default" : ""
                  }`}
                  style={{
                    animationName: "letter-inflate",
                    animationDuration: `${durationMs}ms`,
                    animationDelay: `${charDelay}ms`,
                    animationTimingFunction:
                      "cubic-bezier(0.34, 1.56, 0.64, 1)",
                    opacity: 0,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </Component>
  );
};
