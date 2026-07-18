"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Calendar, Award, BookOpen, Star, Sparkles } from "lucide-react";
import { fetchRoadmap, type Roadmap } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-500 border-emerald-400/30 text-emerald-600",
  Intermediate: "bg-amber-500 border-amber-400/30 text-amber-600",
  Advanced: "bg-rose-500 border-rose-400/30 text-rose-600",
};

const levelBadgeColors: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  Advanced: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
};

export default function RoadmapPage() {
  const params = useParams();
  const slug = params.technology as string;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll tracking states
  const timelineRef = useRef<HTMLDivElement>(null);
  const [scrollFillHeight, setScrollFillHeight] = useState(0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchRoadmap(slug);
        setRoadmap(data);
      } catch (err: any) {
        setError(err.message || "Roadmap profile not found");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  // Track window scrolls to fill timeline neon line
  useEffect(() => {
    if (isLoading || error || !roadmap) return;

    const handleScroll = () => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const startOffset = windowHeight * 0.7; // Start drawing when container hits 70% height
      const endOffset = windowHeight * 0.3; // Full progress when container bottom reaches 30% height
      
      const totalHeight = rect.height;
      const topOffset = rect.top;
      
      const progressAmount = startOffset - topOffset;
      const maxScrollDist = totalHeight - (startOffset - endOffset);
      const percentage = Math.min(Math.max(progressAmount / maxScrollDist, 0), 1);
      
      setScrollFillHeight(percentage * 100);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    
    // Initial call
    setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isLoading, error, roadmap]);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-mono text-[var(--c-ink-2)]/70">Retrieving sequence map...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error || !roadmap) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4 max-w-sm glass-panel p-8 rounded-xl border border-indigo-500/10">
            <span className="text-3xl">⚠️</span>
            <p className="font-mono text-xs">{error || "Roadmap not found"}</p>
            <Link href="/roadmaps" className="inline-block text-xs font-mono bg-[var(--c-surface-2)] hover:bg-[var(--c-surface-2)]/80 text-[var(--c-ink-2)] hover:text-[var(--c-ink)] px-4 py-2 border border-indigo-500/10 rounded transition-all">
              RETURN_TO_ROADMAPS
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const steps = roadmap.steps || [];

  return (
    <DashboardShell>
      
      {/* Page Glow backdrop */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 pb-16">

        {/* Back navigation */}
        <Link href="/roadmaps" className="inline-flex items-center text-xs font-mono text-[var(--c-ink-2)] hover:text-[var(--c-ink)] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> RETURN_TO_ROADMAPS
        </Link>

        {/* Cinematic Header Block */}
        <header className="p-6 md:p-8 rounded-2xl border border-indigo-500/10 bg-[var(--c-surface)]/80 backdrop-blur-md text-center space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 bg-[var(--c-surface-2)] border border-indigo-500/10 rounded-2xl mx-auto flex items-center justify-center text-4xl rotate-3 shadow-md shadow-indigo-500/5 select-none">
            {roadmap.icon}
          </div>
          
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">
              SEQUENTIAL EDUCATION TRACK
            </span>
            <h1 className="text-3xl md:text-5xl font-black font-display text-[var(--c-ink)] tracking-tight">
              Master {roadmap.title}
            </h1>
            <p className="text-sm text-[var(--c-ink-2)] leading-relaxed max-w-xl mx-auto font-light">
              {roadmap.description || "Guided step-by-step tracks structured directly from monitored technology specifications."}
            </p>
            <Link
              href={`/explore?domain=${slug}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-indigo-600 hover:text-[var(--c-ink)] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              This track is the concepts to master — see which {roadmap.title} tools have live momentum
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex justify-center gap-6 pt-2 font-mono text-[10px] text-[var(--c-ink-2)] uppercase">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-600" /> ~{roadmap.estimated_weeks} weeks duration</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-indigo-600" /> {steps.length} learning modules</span>
          </div>
        </header>

        {/* Timeline track container */}
        <div ref={timelineRef} className="relative pl-12 md:pl-20 pr-2 space-y-6">
          
          {/* Static Background track Line */}
          <div className="absolute left-[2.35rem] md:left-[4.35rem] top-10 bottom-10 w-0.5 bg-indigo-500/10 z-0" />
          
          {/* Active scroll-linked neon line */}
          <div
            className="absolute left-[2.35rem] md:left-[4.35rem] top-10 w-0.5 bg-gradient-to-b from-indigo-500 via-indigo-500 to-indigo-400 shadow-[0_0_10px_rgba(124,45,74,0.4)] z-0 transition-all duration-300 ease-out"
            style={{ height: `${scrollFillHeight}%` }}
          />

          {steps.map((step, idx) => {
            const levelStyle = levelBadgeColors[step.level] || "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20";
            const levelDotClass = levelColors[step.level] || "bg-indigo-500";
            
            return (
              <div
                key={idx}
                className="glass-panel p-6 rounded-2xl border border-indigo-500/10 bg-[var(--c-surface-2)]/40 hover:bg-[var(--c-surface-2)]/70 hover:border-indigo-400/30 transition-all duration-300 relative group flex gap-5 items-start slide-up z-10"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Floating Module Indicator Label */}
                <div className="absolute -left-12 md:-left-20 top-7 font-mono text-[9px] text-[var(--c-ink-2)]/50 uppercase tracking-widest text-right w-8 md:w-14 select-none">
                  MOD_[{step.step < 10 ? `0${step.step}` : step.step}]
                </div>

                {/* Concentric Step node */}
                <div className="shrink-0 z-20 mt-1 select-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs ring-4 ring-[#09090B] border text-[var(--c-ink)] ${levelDotClass}`}>
                    {step.step}
                  </div>
                </div>

                {/* Content body */}
                <div className="flex-1 space-y-3">
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-extrabold text-[var(--c-ink)] font-display group-hover:text-indigo-600 transition-colors">
                      {step.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${levelStyle}`}>
                      {step.level}
                    </span>
                  </div>

                  <p className="text-xs md:text-sm text-[var(--c-ink-2)] leading-relaxed font-light font-mono">
                    {step.description}
                  </p>

                  {/* Connected Resources */}
                  {step.resources && step.resources.length > 0 && (
                    <div className="pt-3 border-t border-indigo-500/5 flex flex-wrap gap-4 items-center">
                      <span className="flex items-center gap-1 text-[9px] font-mono text-[var(--c-ink-2)]/60 uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Syllabus Materials:
                      </span>
                      {step.resources.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono font-bold text-indigo-600 hover:text-[var(--c-ink)] flex items-center gap-0.5 hover:underline"
                        >
                          {res.label}
                          <ArrowRight className="w-3 h-3 translate-y-[0.5px] group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Live-tracked tools you'll use at this stage */}
                  {step.tools && step.tools.length > 0 && (
                    <div className="pt-3 border-t border-indigo-500/5 space-y-2">
                      <span className="flex items-center gap-1 text-[9px] font-mono text-[var(--c-ink-2)]/60 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Tools you&apos;ll use · live momentum
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {step.tools.map((tool) => (
                          <Link
                            key={tool.slug}
                            href={`/tools/${tool.slug}`}
                            className="group/tool flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-indigo-500/15 bg-[var(--c-surface)]/70 hover:border-indigo-400/40 hover:bg-[var(--c-surface-2)] transition-all"
                          >
                            <span className="text-base leading-none select-none">{tool.icon}</span>
                            <span className="text-[11px] font-bold text-[var(--c-ink)] group-hover/tool:text-indigo-600 transition-colors">{tool.name}</span>
                            <span
                              className="text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded"
                              style={{
                                color: tool.score >= 70 ? "#12B76A" : tool.score >= 45 ? "#B54708" : "#7C2D4A",
                                background: `${tool.score >= 70 ? "#12B76A" : tool.score >= 45 ? "#B54708" : "#7C2D4A"}14`,
                              }}
                            >
                              {Math.round(tool.score)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })}

        </div>

      </div>
    </DashboardShell>
  );
}
