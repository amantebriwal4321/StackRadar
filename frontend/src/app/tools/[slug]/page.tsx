"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft, Github, MessageSquare, FileText, GraduationCap,
  TrendingUp, TrendingDown, Minus, Loader2, ExternalLink, Star, GitFork,
  Sparkles, Rocket, MapPin, Eye, Info, BarChart3, AlertCircle
} from "lucide-react";
import { fetchToolDetail, fetchToolHistory, type ToolDetail, type ToolHistoryPoint } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import ChartContainer, { chartColors, chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const priorityColors: Record<string, string> = {
  "HIGH": "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  "MEDIUM": "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  "LOW": "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  "AVOID": "bg-rose-500/10 text-rose-500 border border-rose-500/20",
};

const stageBadge: Record<string, string> = {
  "Emerging": "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
  "Growing": "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
  "Mature": "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  "Declining": "bg-rose-500/10 text-rose-600 border border-rose-500/20",
};

const levelBadge: Record<string, string> = {
  "beginner": "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  "intermediate": "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  "advanced": "bg-rose-500/10 text-rose-600 border border-rose-500/20",
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
        setError(err.message || "Failed to load detailed telemetry.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  const positivePct = useMemo(() => {
    if (!tool) return 0;
    return Math.round((tool.sentiment_positive ?? 0.8) * 100);
  }, [tool]);

  const negativePct = useMemo(() => {
    if (!tool) return 0;
    return Math.round((tool.sentiment_negative ?? 0.2) * 100);
  }, [tool]);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-mono text-[#5A6072]/70">Accessing tool core telemetry...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error || !tool) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4 max-w-sm glass-panel p-8 rounded-xl border border-indigo-500/10">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="font-mono text-sm">{error || "Signal index not found"}</p>
            <Link href="/" className="inline-block text-xs font-mono bg-indigo-600 hover:bg-indigo-500 text-[#141726] px-4 py-2 rounded">
              RETURN_TO_DASHBOARD
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const GrowthIcon = tool.growth_pct > 0 ? TrendingUp : tool.growth_pct < 0 ? TrendingDown : Minus;
  const growthColor = tool.growth_pct > 0 ? "text-emerald-600" : tool.growth_pct < 0 ? "text-rose-600" : "text-[#5A6072]/70";

  return (
    <DashboardShell>
      
      {/* Cinematic Hero Backdrop glows */}
      <div className="absolute top-0 left-[10%] w-[500px] h-[300px] rounded-full bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 blur-[120px] pointer-events-none z-0" />

      <div className="space-y-8 relative z-10 pb-16">

        {/* Back Link */}
        <Link href="/" className="inline-flex items-center text-xs font-mono text-[#5A6072] hover:text-[#141726] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> RETURN_TO_DASHBOARD
        </Link>

        {/* ── Title & Meta details ── */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-start gap-4">
              <span className="text-5xl bg-[#F1F3FA]/80 p-4 rounded-2xl border border-indigo-500/10 shrink-0 select-none">
                {tool.icon}
              </span>
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-indigo-600 tracking-widest uppercase">
                  CLASSIFIED NODE PROFILE
                </span>
                <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-[#141726] leading-tight">
                  {tool.name}
                </h1>
                <p className="text-sm text-[#5A6072] leading-relaxed max-w-2xl font-light">
                  {tool.description || "Continuous scans are ongoing for this technology index. Real-time mentions are captured below."}
                </p>
              </div>
            </div>

            {/* Badges block */}
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${stageBadge[tool.stage] || "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"}`}>
                {tool.stage} ADOPTION
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${priorityColors[tool.learning_priority] || "bg-amber-500/10 text-amber-600"}`}>
                LEARNING PRIORITY: {tool.learning_priority}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${levelBadge[tool.level] || "border-indigo-500/10 text-[#5A6072]"}`}>
                STAGE: {tool.level?.toUpperCase()}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F1F3FA] text-[#5A6072] border border-indigo-500/5">
                {tool.category}
              </span>
            </div>
          </div>

          {/* Large Core Score badge */}
          <div className="tech-panel p-6 rounded-2xl text-center min-w-[150px] shrink-0 relative overflow-hidden">
            <span className="block text-[9px] text-[#5A6072]/60 uppercase font-mono tracking-widest mb-1">MOMENTUM SCORE</span>
            <span className="text-5xl font-black text-[#141726] font-mono">{tool.score}</span>
            <span className="text-xs text-[#5A6072]/60 font-mono">/100</span>
            <div className={`flex items-center justify-center gap-1 mt-2.5 font-bold font-mono text-xs ${growthColor}`}>
              <GrowthIcon className="w-4 h-4" />
              {tool.growth_pct >= 0 ? "+" : ""}{tool.growth_pct.toFixed(1)}% GROWTH
            </div>
          </div>
        </div>

        {/* ── Recommendation Panel ── */}
        {tool.recommendation && (
          <div className="tech-panel p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-4 right-4 p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-600">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" /> Decision Matrix Analysis
            </h4>
            <p className="text-sm text-[#5A6072] leading-relaxed max-w-4xl font-light pr-10">
              {tool.recommendation}
            </p>
          </div>
        )}

        {/* ── Dual Layout: Main Chart (left) and Sentiment Dial (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* A. Recharts Area Chart (lg:col-span-8) */}
          <div className="lg:col-span-8 tech-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2 text-[#141726]">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Score Trend Analysis (30d History)
              </h2>
            </div>
            
            {history.length > 1 ? (
              <ChartContainer height={260}>
                <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(37, 99, 235, 0.05)" vertical={false} />
                  
                  <XAxis
                    dataKey="date"
                    stroke="#5A6072"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    stroke="#5A6072"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    itemStyle={chartItemStyle}
                    labelStyle={chartLabelStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#4338CA"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#areaGlow)"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <span className="text-3xl">📊</span>
                <p className="text-xs font-mono text-[#5A6072]">Collecting temporal data logs. Requires 48 hours scan period.</p>
              </div>
            )}
          </div>

          {/* B. Circular Sentiment Radar Dial (lg:col-span-4) */}
          <div className="lg:col-span-4 tech-panel p-6 rounded-2xl flex flex-col justify-between items-center text-center relative">
            <div className="w-full flex items-center justify-between border-b border-indigo-500/5 pb-2 mb-4">
              <span className="text-[10px] font-mono text-[#5A6072] uppercase">SENTIMENT PROFILE</span>
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase">{tool.sentiment_label ?? "POSITIVE"}</span>
            </div>

            {/* Radar Dial Svg representation */}
            <div className="relative w-44 h-44 flex items-center justify-center my-2">
              <svg width="170" height="170" viewBox="0 0 170 170" className="transform -rotate-90">
                {/* Dial background */}
                <circle cx="85" cy="85" r="75" stroke="rgba(20,23,38,0.08)" strokeWidth="6" fill="none" />
                {/* Negative outer line (red) */}
                <circle cx="85" cy="85" r="75" stroke="rgba(240,68,56,0.18)" strokeWidth="6" fill="none" />
                {/* Positive arc (green) */}
                <circle
                  cx="85"
                  cy="85"
                  r="75"
                  stroke="#12B76A"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 75}
                  strokeDashoffset={2 * Math.PI * 75 - (positivePct / 100) * (2 * Math.PI * 75)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Dial needle sweeping inside */}
              <div
                className="absolute inset-0 flex items-center justify-center origin-center transition-transform duration-1000"
                style={{ transform: `rotate(${(positivePct / 100) * 360 - 90}deg)` }}
              >
                <div className="w-[70px] h-[2px] bg-gradient-to-r from-transparent to-indigo-400 translate-x-[35px]" />
              </div>

              {/* Central Text */}
              <div className="absolute flex flex-col items-center justify-center bg-[#FFFFFF] w-24 h-24 rounded-full border border-indigo-500/10">
                <span className="text-3xl font-mono font-black text-[#141726]">{positivePct}%</span>
                <span className="text-[8px] font-mono text-[#5A6072] uppercase tracking-wider">POSITIVE</span>
              </div>
            </div>

            <div className="w-full flex justify-between font-mono text-[10px] text-[#5A6072] pt-4 border-t border-indigo-500/5">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> POSITIVE: {positivePct}%</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> NEGATIVE: {negativePct}%</span>
            </div>
          </div>

        </div>

        {/* ── Sequential Roadmap CTA & Prerequisites ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Prerequisite Node details */}
          {tool.parent_slug && tool.parent_name ? (
            <div className="tech-panel p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#141726] flex items-center gap-1.5">
                  Prerequisite: <Link href={`/tools/${tool.parent_slug}`} className="text-indigo-600 hover:underline">{tool.parent_name}</Link>
                </h4>
                <p className="text-xs text-[#5A6072] leading-relaxed font-light">
                  We highly recommend mapping out the concepts of {tool.parent_name} before indexing {tool.name}.
                </p>
              </div>
            </div>
          ) : (
            <div className="tech-panel p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/5 rounded-xl text-indigo-600 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#141726]">No Prerequisite Nodes</h4>
                <p className="text-xs text-[#5A6072] leading-relaxed font-light">
                  This technology is an entry-level root index. You can learn this directly without prior dependencies.
                </p>
              </div>
            </div>
          )}

          {/* Learning path CTA */}
          {tool.has_roadmap && tool.roadmap_slug ? (
            <div className="bg-gradient-to-r from-[#4338CA] to-[#4F46E5] rounded-2xl p-5 text-white flex justify-between items-center gap-4 shadow-lg shadow-indigo-500/25">
              <div className="space-y-1">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" /> Master {tool.name} Sequence
                </h4>
                <p className="text-indigo-100 text-xs leading-relaxed font-light">
                  Explore the curated learning sequence layout maps designed for {tool.category}.
                </p>
              </div>
              <Link
                href={`/roadmap/${tool.roadmap_slug}`}
                className="bg-white hover:bg-slate-100 text-indigo-600 px-4 py-2.5 rounded-xl font-mono text-xs font-bold shrink-0 shadow transition-all active:scale-95"
              >
                GO_TO_ROADMAP
              </Link>
            </div>
          ) : (
            <div className="tech-panel p-5 rounded-2xl flex justify-between items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#141726] flex items-center gap-1.5">
                  Custom Roadmap Scrapers
                </h4>
                <p className="text-xs text-[#5A6072] leading-relaxed font-light">
                  No dedicated roadmap created yet. Use explore sidebar to learn similar tools.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* ── Multi-channel Telemetry metric counters ── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          
          <div className="tech-panel p-4 rounded-xl">
            <span className="text-[10px] font-mono text-[#5A6072] uppercase block mb-1">GITHUB STARS</span>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-lg font-bold font-mono text-[#141726]">{tool.stars.toLocaleString()}</span>
            </div>
          </div>

          <div className="tech-panel p-4 rounded-xl">
            <span className="text-[10px] font-mono text-[#5A6072] uppercase block mb-1">FORKS</span>
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-indigo-600" />
              <span className="text-lg font-bold font-mono text-[#141726]">{tool.forks.toLocaleString()}</span>
            </div>
          </div>

          <div className="tech-panel p-4 rounded-xl">
            <span className="text-[10px] font-mono text-[#5A6072] uppercase block mb-1">HN DISCUSSIONS</span>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <span className="text-lg font-bold font-mono text-[#141726]">{tool.hn_count.toLocaleString()}</span>
            </div>
          </div>

          <div className="tech-panel p-4 rounded-xl">
            <span className="text-[10px] font-mono text-[#5A6072] uppercase block mb-1">DEV.TO ARTICLES</span>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-lg font-bold font-mono text-[#141726]">{tool.devto_count.toLocaleString()}</span>
            </div>
          </div>

          <div className="tech-panel p-4 rounded-xl">
            <span className="text-[10px] font-mono text-[#5A6072] uppercase block mb-1">REDDIT POSTS</span>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-rose-500" />
              <span className="text-lg font-bold font-mono text-[#141726]">{tool.reddit_count.toLocaleString()}</span>
            </div>
          </div>

          <div className="tech-panel p-4 rounded-xl">
            <span className="text-[10px] font-mono text-[#5A6072] uppercase block mb-1">TECH NEWS SCAN</span>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-indigo-600" />
              <span className="text-lg font-bold font-mono text-[#141726]">{tool.news_count.toLocaleString()}</span>
            </div>
          </div>

        </div>

        {/* ── Raw Github Repository connection ── */}
        {tool.github_repo && (
          <a
            href={`https://github.com/${tool.github_repo}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 p-4 tech-panel tech-panel-interactive rounded-xl group"
          >
            <div className="p-2.5 bg-[#F7F8FC] border border-[rgba(20,23,38,0.10)] rounded-lg group-hover:scale-105 transition-all">
              <Github className="w-5 h-5 text-[#141726] group-hover:text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#5A6072] block uppercase leading-none">CONNECTED REPO</span>
              <span className="font-bold text-sm text-[#141726] group-hover:text-indigo-600 transition-colors font-mono">{tool.github_repo}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-[#5A6072] ml-auto group-hover:text-indigo-600 transition-all" />
          </a>
        )}

      </div>
    </DashboardShell>
  );
}
