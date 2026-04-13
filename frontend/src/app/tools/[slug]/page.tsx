"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Github, MessageSquare, FileText, GraduationCap,
  TrendingUp, TrendingDown, Minus, Loader2, ExternalLink, Star, GitFork,
  Sparkles, ArrowRight, Rocket, MapPin,
} from "lucide-react";
import { fetchToolDetail, fetchToolHistory, type ToolDetail, type ToolHistoryPoint } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import ChartContainer, { chartColors, chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const priorityColors: Record<string, string> = {
  "HIGH": "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  "MEDIUM": "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  "LOW": "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  "AVOID": "bg-rose-500/10 text-rose-500 border border-rose-500/20",
};

const stageBadge: Record<string, string> = {
  "Emerging": "bg-cyan-500/10 text-cyan-500",
  "Growing": "bg-primary/10 text-primary",
  "Mature": "bg-emerald-500/10 text-emerald-500",
  "Declining": "bg-rose-500/10 text-rose-500",
};

const levelBadge: Record<string, string> = {
  "beginner": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "intermediate": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "advanced": "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function ToolDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [history, setHistory] = useState<ToolHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [toolData, historyData] = await Promise.all([
          fetchToolDetail(slug),
          fetchToolHistory(slug, 30),
        ]);
        setTool(toolData);
        setHistory(historyData.data);
      } catch (err: any) {
        setError(err.message || "Failed to load");
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

  if (error || !tool) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4">
            <p className="text-xl font-semibold">{error || "Tool not found"}</p>
            <Link href="/" className="text-primary hover:underline text-sm">← Back to Dashboard</Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const GrowthIcon = tool.growth_pct > 5 ? TrendingUp : tool.growth_pct < -5 ? TrendingDown : Minus;
  const growthColor = tool.growth_pct > 5 ? "text-emerald-500" : tool.growth_pct < -5 ? "text-rose-500" : "text-muted-foreground";

  return (
    <DashboardShell>
      <div className="space-y-5 fade-in">

        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        {/* ── Title + Score (improved hierarchy) ── */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-3">
            {/* Title row */}
            <div className="flex items-center gap-3">
              <span className="text-4xl">{tool.icon}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{tool.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{tool.description}</p>
              </div>
            </div>

            {/* Tags row */}
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${stageBadge[tool.stage] || "bg-primary/10 text-primary"}`}>
                {tool.stage}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${priorityColors[tool.learning_priority] || priorityColors["MEDIUM"]}`}>
                Priority: {tool.learning_priority}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${levelBadge[tool.level] || levelBadge["intermediate"]}`}>
                {tool.level?.charAt(0).toUpperCase() + tool.level?.slice(1)}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground">
                {tool.category}
              </span>
            </div>
          </div>

          {/* Score card */}
          <div className="bg-card p-4 rounded-xl border border-border/60 text-center min-w-[130px] shrink-0">
            <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Score</span>
            <span className="text-3xl font-black text-primary">{tool.score}</span>
            <span className="text-sm text-muted-foreground"> / 100</span>
            <div className={`flex items-center justify-center gap-1 mt-1 font-bold text-sm ${growthColor}`}>
              <GrowthIcon className="w-4 h-4" />
              {tool.growth_pct >= 0 ? "+" : ""}{tool.growth_pct.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* ── Entry Point / Prerequisite Banners ── */}
        {tool.is_entry_point && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <Rocket className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-500">🚀 Recommended starting point for {tool.category}</p>
              <p className="text-xs text-muted-foreground mt-0.5">This is the best tool to begin your learning journey in this domain.</p>
            </div>
          </div>
        )}

        {tool.parent_slug && tool.parent_name && (
          <div className="flex items-center gap-3 p-4 bg-card border border-border/60 rounded-xl">
            <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                📍 Prerequisite:{" "}
                <Link href={`/tools/${tool.parent_slug}`} className="text-primary hover:underline font-bold">
                  {tool.parent_name}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">We recommend learning {tool.parent_name} before diving into {tool.name}.</p>
            </div>
          </div>
        )}

        {/* ── Decision Intelligence (highlighted card) ── */}
        {tool.recommendation && (
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-card to-cyan-500/5 p-5 rounded-xl border border-indigo-500/20 shadow-sm">
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
              📊 Decision Intelligence
            </h3>
            <p className="text-foreground/90 leading-relaxed text-sm pr-10">{tool.recommendation}</p>
          </div>
        )}

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <StatCard number={tool.stars.toLocaleString()} label="Stars"
            icon={<Star className="w-full h-full" />} iconColorClass="text-amber-500" hoverColorClass="hover:border-amber-500/30" />
          <StatCard number={tool.forks.toLocaleString()} label="Forks"
            icon={<GitFork className="w-full h-full" />} iconColorClass="text-muted-foreground" hoverColorClass="hover:border-primary/30" />
          <StatCard number={tool.hn_count.toLocaleString()} label="HN"
            icon={<MessageSquare className="w-full h-full" />} iconColorClass="text-orange-500" hoverColorClass="hover:border-orange-500/30" />
          <StatCard number={tool.devto_count.toLocaleString()} label="Dev.to"
            icon={<FileText className="w-full h-full" />} iconColorClass="text-primary" hoverColorClass="hover:border-primary/30" />
          <StatCard number={tool.reddit_count.toLocaleString()} label="Reddit"
            icon={<MessageSquare className="w-full h-full" />} iconColorClass="text-orange-600" hoverColorClass="hover:border-orange-600/30" />
          <StatCard number={tool.news_count.toLocaleString()} label="News"
            icon={<FileText className="w-full h-full" />} iconColorClass="text-sky-500" hoverColorClass="hover:border-sky-500/30" />
        </div>

        {/* ── GitHub ── */}
        {tool.github_repo && (
          <a
            href={`https://github.com/${tool.github_repo}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3.5 bg-card border border-border/60 rounded-xl hover:border-primary/40 transition-colors group"
          >
            <Github className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-semibold text-sm group-hover:text-primary transition-colors">{tool.github_repo}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
          </a>
        )}

        {/* ── History Chart ── */}
        {history.length > 1 ? (
          <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Score History (Last 30 Days)
            </h2>
            <ChartContainer height={280}>
              <LineChart data={history} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  itemStyle={chartItemStyle}
                  labelStyle={chartLabelStyle}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={chartColors[0]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm text-center space-y-3">
            <h2 className="text-base font-bold flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Score History
            </h2>
            <p className="text-muted-foreground text-sm">
              📊 Collecting data points... Chart will appear after 2+ days of tracking.
            </p>
            <div className="max-w-xs mx-auto h-2 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full animate-pulse transition-all"
                style={{ width: `${Math.min(history.length * 50, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {history.length}/2 data points collected
            </p>
          </div>
        )}

        {/* ── Roadmap CTA ── */}
        {tool.has_roadmap && tool.roadmap_slug && (
          <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-indigo-500/10">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Ready to learn {tool.name}?
              </h3>
              <p className="text-indigo-100 text-sm mt-1">
                View the learning roadmap for {tool.category}
              </p>
            </div>
            <Link
              href={`/roadmap/${tool.roadmap_slug}`}
              className="bg-white text-indigo-600 px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:shadow-lg transition-all shrink-0"
            >
              View Roadmap →
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
