"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SplitReveal from "@/components/ui/SplitReveal";

/**
 * Cinematic first-visit loader.
 *
 * The visibility decision is made BEFORE first paint by an inline <head> script
 * (see layout.tsx) that adds `sr-preloading` to <html> for first-time visitors.
 * CSS then shows this overlay from the very first frame — so the home page can
 * never flash into view before the loader (the old bug: `shouldShow` started
 * false, so content painted first and the loader dropped on top afterwards).
 *
 * Returning visitors in the same session never get the class, so the overlay
 * stays `display:none` from the start — no loader flash either.
 */
export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const firstVisit = html.classList.contains("sr-preloading");
    if (!firstVisit) {
      // Returning visitor — CSS already keeps this hidden; just unmount.
      setIsDone(true);
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 5) + 3;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        // Hold at 100% briefly, then play the split-reveal and release the page.
        setTimeout(() => {
          html.classList.remove("sr-preloading");
          document.body.style.overflow = "";
          try { sessionStorage.setItem("stackradar_visited", "true"); } catch { /* ignore */ }
          setIsDone(true);
        }, 900);
      }
      setProgress(current);
    }, 40);

    return () => {
      clearInterval(interval);
      html.classList.remove("sr-preloading");
      document.body.style.overflow = "";
    };
  }, []);

  if (isDone) return null;

  // Always rendered into the initial HTML; CSS (.sr-preloading #sr-preloader)
  // decides whether it's visible, so there's no paint-order race.
  return (
    <div
      id="sr-preloader"
      className="fixed inset-0 z-[99999] items-center justify-center overflow-hidden pointer-events-none"
    >
      {/* Top half */}
      <motion.div
        initial={{ y: 0 }}
        animate={progress === 100 ? { y: "-100%" } : { y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 w-full h-1/2 bg-[var(--c-scrim)] border-b border-[var(--accent-1)]/20 pointer-events-auto"
      />

      {/* Bottom half */}
      <motion.div
        initial={{ y: 0 }}
        animate={progress === 100 ? { y: "100%" } : { y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 left-0 w-full h-1/2 bg-[var(--c-scrim)] pointer-events-auto"
      />

      {/* The wait now SAYS something. A bare percentage taught a first-time
          visitor nothing; a split-text line tells them what StackRadar is while
          the page loads. Must exit WITH the split panels at 100%, otherwise it
          lingers over the revealed page (the "100% floating on the hero" bug). */}
      <motion.div
        animate={progress === 100 ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 text-center"
      >
        <div className="text-[11px] font-bold tracking-[0.4em] font-display text-white/50 uppercase">
          StackRadar
        </div>

        <SplitReveal
          as="h1"
          text="Know what to learn next."
          delay={140}
          stagger={85}
          className="max-w-3xl text-4xl md:text-6xl font-black font-display tracking-tight leading-[1.05] text-white"
        />

        <SplitReveal
          text="Live momentum from GitHub, Hacker News, Reddit and Dev.to — turned into a roadmap."
          delay={520}
          stagger={26}
          className="max-w-md text-[13px] md:text-sm font-light leading-relaxed text-white/55"
        />

        {/* Uiverse loader (bociKond), themed to the accent token */}
        <div className="sr-loader mt-2" aria-hidden="true" />
        <span className="sr-only">Loading StackRadar</span>
      </motion.div>
    </div>
  );
}
