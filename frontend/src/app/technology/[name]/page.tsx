"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Github, MessageSquare, FileText, GraduationCap, TrendingUp, Loader2, ExternalLink } from "lucide-react";
import { getRoadmap } from "@/data/roadmaps";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";

interface DomainDetail {
  name: string;
  slug: string;
  score: number;
  stage: string;
  summary: string;
  icon: string;
  metrics: {
    github: number;
    hackernews: number;
    devto: number;
    reddit: number;
    news: number;
  };
  top_technologies: { name: string; score: number; description: string; category: string }[];
  repositories: { name: string; stars: number; forks: number; url: string }[];
  hackernews: { title: string; url: string }[];
  devto: { title: string; url: string }[];
}

export default function TechnologyPage() {
  const params = useParams();
  const slug = params.name as string;
  const roadmap = getRoadmap(slug);

  const [detail, setDetail] = useState<DomainDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${baseUrl}/api/v1/trends/${slug}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Domain not found");
        const data = await res.json();
        setDetail(data);
      } catch (err: any) {
        setError(err.message || "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetail();
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

  if (error || !detail) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4">
            <p className="text-xl font-semibold">{error || "Domain not found"}</p>
            <Link href="/" className="text-primary hover:underline text-sm">← Back to Dashboard</Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const stageBadge: Record<string, string> = {
    "Emerging": "bg-cyan-500/10 text-cyan-500",
    "Growing": "bg-primary/10 text-primary",
    "Mature": "bg-emerald-500/10 text-emerald-500",
    "Declining": "bg-rose-500/10 text-rose-500",
  };

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
              <span className="text-4xl">{detail.icon}</span>
              <h1 className="text-3xl font-bold">{detail.name}</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">{detail.summary}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stageBadge[detail.stage] || "bg-primary/10 text-primary"}`}>
                {detail.stage}
              </span>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border/60 text-center min-w-[120px]">
            <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">
              Momentum
            </span>
            <span className="text-3xl font-black text-primary">{detail.score}</span>
            <span className="text-sm text-muted-foreground"> / 100</span>
          </div>
        </div>

        {/* Signal Stats — 5 sources */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard number={detail.metrics.github.toLocaleString()} label="GitHub Repos"
            icon={<Github className="w-full h-full" />} iconColorClass="text-muted-foreground" hoverColorClass="hover:border-primary/30" />
          <StatCard number={detail.metrics.hackernews.toLocaleString()} label="HN Discussions"
            icon={<MessageSquare className="w-full h-full" />} iconColorClass="text-orange-500" hoverColorClass="hover:border-orange-500/30" />
          <StatCard number={detail.metrics.devto.toLocaleString()} label="Dev.to Articles"
            icon={<FileText className="w-full h-full" />} iconColorClass="text-primary" hoverColorClass="hover:border-primary/30" />
          <StatCard number={detail.metrics.reddit.toLocaleString()} label="Reddit Posts"
            icon={<MessageSquare className="w-full h-full" />} iconColorClass="text-orange-600" hoverColorClass="hover:border-orange-600/30" />
          <StatCard number={detail.metrics.news.toLocaleString()} label="News Mentions"
            icon={<FileText className="w-full h-full" />} iconColorClass="text-sky-500" hoverColorClass="hover:border-sky-500/30" />
        </div>

        {/* View Roadmap CTA */}
        {roadmap && (
          <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-indigo-500/10">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Ready to learn {detail.name}?
              </h3>
              <p className="text-indigo-100 text-sm mt-1">
                {roadmap.steps.length} steps · ~{roadmap.estimatedWeeks} weeks
              </p>
            </div>
            <Link
              href={`/roadmap/${slug}`}
              className="bg-white text-indigo-600 px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:shadow-lg transition-all shrink-0"
            >
              View Roadmap →
            </Link>
          </div>
        )}

        {/* Top Repositories */}
        {detail.repositories.length > 0 && (
          <div className="bg-card p-5 rounded-xl border border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <Github className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">Top Repositories</h2>
            </div>
            <div className="space-y-3">
              {detail.repositories.map((repo, idx) => (
                <a key={idx} href={repo.url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{repo.name}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <span className="text-xs font-bold text-amber-500">⭐ {repo.stars.toLocaleString()}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* HackerNews Discussions */}
        {detail.hackernews.length > 0 && (
          <div className="bg-card p-5 rounded-xl border border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold">HackerNews Discussions</h2>
            </div>
            <div className="space-y-2">
              {detail.hackernews.map((item, idx) => (
                <a key={idx} href={item.url} target="_blank" rel="noreferrer"
                  className="block p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium hover:text-primary truncate">
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Dev.to Articles */}
        {detail.devto.length > 0 && (
          <div className="bg-card p-5 rounded-xl border border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Dev.to Articles</h2>
            </div>
            <div className="space-y-2">
              {detail.devto.map((item, idx) => (
                <a key={idx} href={item.url} target="_blank" rel="noreferrer"
                  className="block p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium hover:text-primary truncate">
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Top Technologies (individual tools) */}
        {detail.top_technologies.length > 0 && (
          <div className="bg-card p-5 rounded-xl border border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Top Technologies in {detail.name}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {detail.top_technologies.map((tech, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-sm">{tech.name}</h3>
                    <span className="text-xs font-bold text-primary">{tech.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
