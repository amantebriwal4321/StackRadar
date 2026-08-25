"use client";

import { useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Hide the sidebar and use full-width layout */
  fullWidth?: boolean;
  /** Drop horizontal padding so the child controls all x-spacing (edge-to-edge
      mobile layouts / full-bleed carousels). Top padding (navbar clearance) stays. */
  flushX?: boolean;
  /** Per-page accent theme: "teal" | "graphite" | "clay" | "wine" (comparison mode) */
  theme?: "teal" | "graphite" | "clay" | "wine";
}

export default function DashboardShell({ children, fullWidth = false, flushX = false, theme }: DashboardShellProps) {
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Cursor spotlight tracking (inspired by XR reference)
  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    let raf: number;
    const onMove = (e: MouseEvent) => {
      raf = requestAnimationFrame(() => {
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        el.style.opacity = "1";
      });
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // overflow-x-clip (not hidden): clips ambient orbs/decorations that spill past
  // the right edge WITHOUT creating a scroll container — `overflow:hidden` here
  // would break position:sticky on descendants (the hero constellation, which
  // would otherwise scroll away and leave the column empty).
  return (
    <div className={`flex flex-col min-h-screen bg-background relative overflow-x-clip${theme ? ` theme-${theme}` : ""}`}>
      {/* ─── Noise Texture (like XR reference grain) ─── */}
      <div className="noise-overlay" aria-hidden="true" />
      
      {/* ─── Cursor-following Spotlight ─── */}
      <div ref={spotlightRef} className="cursor-spotlight" style={{ opacity: 0 }} aria-hidden="true" />
      
      {/* ─── Ambient Orbs ─── */}
      <div className="ambient-orb ambient-orb-1" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-2" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-3" aria-hidden="true" />

      {/* ─── Navigation ─── */}
      <Navbar />

      {/* ─── Main Content ─── */}
      <main className="flex-1 relative">
        <div className="bg-dot-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
        {/* pt clears the fixed 65px navbar. Without it every page's first element
            renders UNDERNEATH the header — most pages hid this behind large hero
            padding, but any page whose first element sits high (e.g. the roadmap
            back-link) collided with the nav links. */}
        <div className={`relative z-10 mx-auto ${fullWidth ? 'max-w-[1280px]' : 'max-w-6xl'} ${flushX ? 'px-0' : 'px-4 md:px-6 lg:px-8'} pt-[5.5rem] md:pt-24 pb-6 md:pb-8`}>
          {children}
        </div>
      </main>
    </div>
  );
}
