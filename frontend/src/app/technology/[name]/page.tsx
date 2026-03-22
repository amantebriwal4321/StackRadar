"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Github, MessageSquare, FileText, GraduationCap, TrendingUp } from "lucide-react";
import { getTechnologyById } from "@/data/trends";
import { getRoadmap } from "@/data/roadmaps";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";

export default function TechnologyPage() {
  const params = useParams();
  const id = params.name as string;
  const tech = getTechnologyById(id);
  const roadmap = getRoadmap(id);

  if (!tech) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4">
            <p className="text-xl font-semibold">Technology not found</p>
            <Link href="/" className="text-primary hover:underline text-sm">← Back to Dashboard</Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 fade-in">

        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{tech.icon}</span>
              <h1 className="text-3xl font-bold">{tech.name}</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">{tech.description}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  tech.stage === "Experimental"
                    ? "bg-amber-500/10 text-amber-500"
                    : tech.stage === "Mature"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : tech.stage === "Emerging"
                    ? "bg-cyan-500/10 text-cyan-500"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {tech.stage}
              </span>
              <span className="px-3 py-1 bg-muted/60 rounded-full text-xs font-medium text-muted-foreground">
                {tech.domain}
              </span>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border/60 text-center min-w-[120px]">
            <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">
              Momentum
            </span>
            <span className="text-3xl font-black text-primary">{tech.score}</span>
            <span className="text-sm text-muted-foreground"> / 100</span>
          </div>
        </div>

        {/* Signal Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            number={tech.github_repos.toLocaleString()}
            label="GitHub Repos"
            icon={<Github className="w-full h-full" />}
            iconColorClass="text-muted-foreground"
            hoverColorClass="hover:border-primary/30"
          />
          <StatCard
            number={tech.hn_mentions.toLocaleString()}
            label="HN Mentions"
            icon={<MessageSquare className="w-full h-full" />}
            iconColorClass="text-orange-500"
            hoverColorClass="hover:border-orange-500/30"
          />
          <StatCard
            number={tech.devto_articles.toLocaleString()}
            label="Dev.to Articles"
            icon={<FileText className="w-full h-full" />}
            iconColorClass="text-primary"
            hoverColorClass="hover:border-primary/30"
          />
        </div>

        {/* View Roadmap CTA */}
        {roadmap && (
          <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-indigo-500/10">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Ready to learn {tech.name}?
              </h3>
              <p className="text-indigo-100 text-sm mt-1">
                {roadmap.steps.length} steps · ~{roadmap.estimatedWeeks} weeks
              </p>
            </div>
            <Link
              href={`/roadmap/${tech.id}`}
              className="bg-white text-indigo-600 px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:shadow-lg transition-all shrink-0"
            >
              View Roadmap →
            </Link>
          </div>
        )}

        {/* Why Trending */}
        <div className="bg-card p-5 rounded-xl border border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Why It&apos;s Trending</h2>
          </div>
          <ul className="space-y-2.5">
            {tech.why_trending.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Data */}
        <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm relative overflow-hidden group/chart">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/chart:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h2 className="text-lg font-bold mb-6 relative z-10">Growth Over Time</h2>
          <div className="flex items-end gap-3 h-40 relative z-10 px-2 lg:px-6">
            {tech.growth.map((point, idx) => (
              <div key={point.year} className="flex-1 flex flex-col items-center gap-2 group relative">
                {/* Score Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 bg-foreground text-background text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none">
                  {point.score}
                </div>
                
                <div
                  className="w-full bg-gradient-to-t from-primary/80 to-cyan-400 rounded-t-md transition-all duration-500 hover:from-primary hover:to-cyan-300 hover:scale-x-110 origin-bottom cursor-crosshair opacity-80 hover:opacity-100"
                  style={{ height: `${point.score}%` }}
                />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">{point.year}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
