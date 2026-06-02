"use client";

import { useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Hide the sidebar and use full-width layout */
  fullWidth?: boolean;
}

export default function DashboardShell({ children, fullWidth = false }: DashboardShellProps) {
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

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
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
        <div className={`relative z-10 mx-auto ${fullWidth ? 'max-w-[1400px]' : 'max-w-6xl'} px-4 md:px-6 lg:px-8 py-6 md:py-8`}>
          {children}
        </div>
      </main>
    </div>
  );
}
