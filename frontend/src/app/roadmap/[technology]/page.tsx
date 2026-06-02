"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Calendar, Award, BookOpen, Star, Sparkles } from "lucide-react";
import { fetchRoadmap, type Roadmap } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-500 border-emerald-400/30 text-emerald-400",
  Intermediate: "bg-amber-500 border-amber-400/30 text-amber-400",
  Advanced: "bg-rose-500 border-rose-400/30 text-rose-400",
};

const levelBadgeColors: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Advanced: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
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
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-xs font-mono text-[#8899BB]/70">Retrieving sequence map...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error || !roadmap) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4 max-w-sm glass-panel p-8 rounded-xl border border-blue-500/10">
            <span className="text-3xl">⚠️</span>
            <p className="font-mono text-xs">{error || "Roadmap not found"}</p>
            <Link href="/roadmaps" className="inline-block text-xs font-mono bg-[#0D1526] hover:bg-[#0D1526]/80 text-[#8899BB] hover:text-white px-4 py-2 border border-blue-500/10 rounded transition-all">
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
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 pb-16">

        {/* Back navigation */}
        <Link href="/roadmaps" className="inline-flex items-center text-xs font-mono text-[#8899BB] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> RETURN_TO_ROADMAPS
        </Link>

        {/* Cinematic Header Block */}
        <header className="p-6 md:p-8 rounded-2xl border border-blue-500/10 bg-[#0A0F1E]/80 backdrop-blur-md text-center space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 bg-[#0D1526] border border-blue-500/10 rounded-2xl mx-auto flex items-center justify-center text-4xl rotate-3 shadow-md shadow-blue-500/5 select-none">
            {roadmap.icon}
          </div>
          
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
              SEQUENTIAL EDUCATION TRACK
            </span>
            <h1 className="text-3xl md:text-5xl font-black font-display text-white tracking-tight">
              Master {roadmap.title}
            </h1>
            <p className="text-sm text-[#8899BB] leading-relaxed max-w-xl mx-auto font-light">
              {roadmap.description || "Guided step-by-step tracks structured directly from monitored technology specifications."}
            </p>
          </div>

          <div className="flex justify-center gap-6 pt-2 font-mono text-[10px] text-[#8899BB] uppercase">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-400" /> ~{roadmap.estimated_weeks} weeks duration</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-indigo-400" /> {steps.length} learning modules</span>
          </div>
        </header>

        {/* Timeline track container */}
        <div ref={timelineRef} className="relative pl-12 md:pl-20 pr-2 space-y-6">
          
          {/* Static Background track Line */}
          <div className="absolute left-[2.35rem] md:left-[4.35rem] top-10 bottom-10 w-0.5 bg-blue-500/10 z-0" />
          
          {/* Active scroll-linked neon line */}
          <div
            className="absolute left-[2.35rem] md:left-[4.35rem] top-10 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(37,99,235,0.4)] z-0 transition-all duration-300 ease-out"
            style={{ height: `${scrollFillHeight}%` }}
          />

          {steps.map((step, idx) => {
            const levelStyle = levelBadgeColors[step.level] || "bg-blue-500/10 text-blue-400 border border-blue-500/20";
            const levelDotClass = levelColors[step.level] || "bg-blue-500";
            
            return (
              <div
                key={idx}
                className="glass-panel p-6 rounded-2xl border border-blue-500/10 bg-[#0D1526]/40 hover:bg-[#0D1526]/70 hover:border-blue-400/30 transition-all duration-300 relative group flex gap-5 items-start slide-up z-10"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Floating Module Indicator Label */}
                <div className="absolute -left-12 md:-left-20 top-7 font-mono text-[9px] text-[#8899BB]/50 uppercase tracking-widest text-right w-8 md:w-14 select-none">
                  MOD_[{step.step < 10 ? `0${step.step}` : step.step}]
                </div>

                {/* Concentric Step node */}
                <div className="shrink-0 z-20 mt-1 select-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs ring-4 ring-[#050810] border text-white ${levelDotClass}`}>
                    {step.step}
                  </div>
                </div>

                {/* Content body */}
                <div className="flex-1 space-y-3">
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-extrabold text-white font-display group-hover:text-blue-400 transition-colors">
                      {step.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${levelStyle}`}>
                      {step.level}
                    </span>
                  </div>

                  <p className="text-xs md:text-sm text-[#8899BB] leading-relaxed font-light font-mono">
                    {step.description}
                  </p>

                  {/* Connected Resources */}
                  {step.resources && step.resources.length > 0 && (
                    <div className="pt-3 border-t border-blue-500/5 flex flex-wrap gap-4 items-center">
                      <span className="flex items-center gap-1 text-[9px] font-mono text-[#8899BB]/60 uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Syllabus Materials:
                      </span>
                      {step.resources.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono font-bold text-blue-400 hover:text-white flex items-center gap-0.5 hover:underline"
                        >
                          {res.label}
                          <ArrowRight className="w-3 h-3 translate-y-[0.5px] group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      ))}
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
