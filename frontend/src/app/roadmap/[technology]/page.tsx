"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { fetchRoadmap, type Roadmap } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-500",
  Intermediate: "bg-amber-500",
  Advanced: "bg-rose-500",
};

const levelBadgeColors: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-500",
  Intermediate: "bg-amber-500/10 text-amber-500",
  Advanced: "bg-rose-500/10 text-rose-500",
};

export default function RoadmapPage() {
  const params = useParams();
  const slug = params.technology as string;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchRoadmap(slug);
        setRoadmap(data);
      } catch (err: any) {
        setError(err.message || "Roadmap not found");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !roadmap) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4">
            <p className="text-xl font-semibold">{error || "Roadmap not found"}</p>
            <Link href="/roadmaps" className="text-primary hover:underline text-sm">← Back to Roadmaps</Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const steps = roadmap.steps || [];

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto space-y-6 fade-in">

        <Link href="/roadmaps" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Roadmaps
        </Link>

        {/* Header */}
        <div className="text-center space-y-3 py-6">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center text-3xl rotate-3 shadow-sm">
            {roadmap.icon}
          </div>
          <h1 className="text-3xl font-extrabold">Master {roadmap.title}</h1>
          <p className="text-muted-foreground">{roadmap.description}</p>
          <p className="text-xs text-muted-foreground">
            {steps.length} steps · ~{roadmap.estimated_weeks} weeks
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-5 bg-card rounded-2xl border border-border/60 relative group glow-hover transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 slide-up z-10"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="absolute left-[2.1rem] top-[3.5rem] -bottom-6 w-0.5 bg-border/60 z-0 group-hover:bg-primary/30 transition-colors duration-300" />
              )}

              <div className="shrink-0 pt-0.5 z-10 bg-card">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ring-4 ring-card ${levelColors[step.level] || "bg-primary"}`}>
                  {step.step}
                </div>
              </div>

              <div className="flex-1 space-y-2 z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{step.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${levelBadgeColors[step.level] || ""}`}>
                    {step.level}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{step.description}</p>
                <div className="flex items-center gap-4 pt-2 flex-wrap">
                  {(step.resources || []).map((res, rIdx) => (
                    <a
                      key={rIdx}
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-primary/80 hover:text-primary transition-all flex items-center group/link"
                    >
                      {res.label}
                      <ArrowRight className="w-3 h-3 ml-1 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
