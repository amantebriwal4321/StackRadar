"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, BarChart3, Filter, Loader2, Star, Share2, MessageSquare, ArrowUpDown } from "lucide-react";
import { type Tool, fetchTools, fetchCategories } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import FilterBar from "@/components/FilterBar";
import WatchlistButton from "@/components/WatchlistButton";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import ChartContainer, { chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";

/* ─── Score palette — DATA colour only (green rising / amber watch / red cooling) ─── */
const SCORE_HIGH = "#12B76A"; // >= 75  strong
const SCORE_MID = "#B54708";  // 45–75  watch
const SCORE_LOW = "#F04438";  // < 45   weak
function scoreColor(score: number) {
  if (score >= 75) return SCORE_HIGH;
  if (score >= 45) return SCORE_MID;
  return SCORE_LOW;
}

/* ─── Sorting ─── */
type SortKey = "momentum" | "stars" | "mentions" | "movers";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "momentum", label: "Momentum" },
  { key: "stars", label: "Stars" },
  { key: "mentions", label: "Mentions" },
  { key: "movers", label: "Movers" },
];
const mentionsOf = (t: Tool) => t.hn_count + t.devto_count + t.reddit_count + t.news_count;

/* ─── Circular Progress Gauge Arc ─── */
function CircularProgressArc({ value, size = 64, strokeWidth = 5.5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const color = scoreColor(value);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          style={{ stroke: "var(--c-border)" }}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active colored arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-mono font-black text-[var(--c-ink)]">{value}</span>
      </div>
    </div>
  );
}

/* ─── Custom SVG Sparkline ─── */
function MiniSparkline({ data, width = 90, height = 30 }: { data: number[]; width?: number; height?: number }) {
  const points = useMemo(() => {
    if (!data || data.length < 2) return "";
    const cleanData = data.filter(d => typeof d === 'number');
    const max = Math.max(...cleanData);
    const min = Math.min(...cleanData);
    const range = max - min === 0 ? 1 : max - min;
    
    return cleanData
      .map((val, idx) => {
        const x = (idx / (cleanData.length - 1)) * width;
        // Invert Y axis because SVG coordinates start from top-left
        const y = height - 2 - ((val - min) / range) * (height - 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, width, height]);

  const clean = (data || []).filter((d) => typeof d === "number");
  const distinct = new Set(clean).size;

  // Honest state when there isn't enough real history to draw a trend yet —
  // no fabricated curve. Fills in as the scraper accumulates daily snapshots.
  if (clean.length < 2 || distinct < 2) {
    return (
      <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--c-ink-2)]/40">
        <span className="inline-block w-6 h-px bg-[var(--c-ink-2)]/30" />
        {clean.length === 0 ? "new" : "stable"}
      </div>
    );
  }

  // Determine line color from real trend direction (Deep Space palette)
  const first = clean[0];
  const last = clean[clean.length - 1];
  const color = last >= first ? SCORE_HIGH : SCORE_LOW;

  return (
    <div className="flex flex-col items-start gap-1">
      <svg width={width} height={height} className="overflow-visible">
        {/* Glow effect filter */}
        <defs>
          <filter id={`spark-glow-${first}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Sparkline curve */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#spark-glow-${first})`}
          opacity="0.85"
        />
      </svg>
      <span className="text-[9px] font-mono text-[var(--c-ink-2)]/40 uppercase tracking-widest">7d history</span>
    </div>
  );
}

export default function TrendsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortKey>("momentum");
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load categories dynamically from the API
  useEffect(() => {
    fetchCategories()
      .then(cats => setDynamicCategories(cats))
      .catch(() => setDynamicCategories([]));
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchTools();
        setAllTools(data);
      } catch (err) {
        console.error("Failed to fetch tools:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const displayedTools = useMemo(() => {
    const filtered =
      activeCategory === "All"
        ? allTools
        : allTools.filter(t => t.category.toLowerCase() === activeCategory.toLowerCase());
    const sorted = [...filtered];
    switch (sortBy) {
      case "stars": sorted.sort((a, b) => b.stars - a.stars); break;
      case "mentions": sorted.sort((a, b) => mentionsOf(b) - mentionsOf(a)); break;
      case "movers": sorted.sort((a, b) => b.growth_pct - a.growth_pct); break;
      case "momentum":
      default: sorted.sort((a, b) => b.score - a.score); break;
    }
    return sorted;
  }, [allTools, activeCategory, sortBy]);

  // Chart data: tool scores comparison
  const chartData = useMemo(() => {
    return displayedTools.map(tool => ({
      name: tool.name.length > 12 ? tool.name.slice(0, 12) + "…" : tool.name,
      fullName: tool.name,
      score: tool.score,
      stars: tool.stars,
      growth: tool.growth_pct,
    }));
  }, [displayedTools]);

  /* ─── GSAP List Stagger Entrance ─── */
  useGSAP(() => {
    if (isLoading) return;
    
    gsap.fromTo(
      ".trend-list-row",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
    );
  }, [isLoading, displayedTools]);

  // Aggregate stats for the header (fills the empty right side with real provenance)
  const totalStars = useMemo(() => allTools.reduce((s, t) => s + (t.stars || 0), 0), [allTools]);
  const starsLabel =
    totalStars >= 1_000_000 ? `${(totalStars / 1_000_000).toFixed(1)}M`
    : totalStars >= 1000 ? `${Math.round(totalStars / 1000)}k`
    : `${totalStars}`;

  return (
    <DashboardShell>

      {/* Decorative page glow */}
      <div className="absolute top-0 right-10 w-[400px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none z-0" />

      <div className="space-y-8 relative z-10 pb-12">
        
        {/* Opacity blurred header section */}
        <header className="p-6 md:p-8 rounded-2xl border border-indigo-500/10 bg-[var(--c-surface)]/80 backdrop-blur-md space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-2 text-[11px] font-mono font-bold text-accent-primary uppercase tracking-[0.28em]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live momentum index
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-indigo-600" />
                <span className="text-text-primary">Trends Intelligence</span>
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* live provenance stats — fills the header instead of dead space */}
              <div className="flex items-center gap-6 font-mono">
                {[
                  { v: allTools.length ? String(allTools.length) : "—", l: "tracked" },
                  { v: allTools.length ? starsLabel : "—", l: "GitHub ★" },
                  { v: "5", l: "sources" },
                ].map((s) => (
                  <div key={s.l} className="text-right">
                    <div className="text-xl md:text-2xl font-black text-[var(--c-ink)] tabular-nums leading-none">{s.v}</div>
                    <div className="text-[9px] uppercase tracking-widest text-[var(--c-ink-2)]/60 mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Trends URL copied to clipboard!");
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-500/15 bg-[var(--c-surface-2)] hover:bg-[var(--c-surface-2)]/80 text-xs font-mono hover:text-[var(--c-ink)] transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" /> SHARE_URL
              </button>
            </div>
          </div>
          <p className="text-sm text-[var(--c-ink-2)] max-w-xl font-light">
            Every tracked technology, scored 0–100 by live momentum from GitHub stars and developer conversation. Sort by what&apos;s rising, most-starred, or most-discussed.
          </p>
        </header>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <FilterBar
            activeDomain={activeCategory}
            onDomainChange={setActiveCategory}
            domains={dynamicCategories}
            allLabel="All Categories"
            showIcon={false}
            className="glass p-1 rounded-xl flex items-center gap-1.5 overflow-x-auto w-fit max-w-full shadow-md"
            prefixNode={
              <div className="flex items-center gap-1.5 pl-3 pr-1 text-[var(--c-ink-2)] shrink-0 select-none">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">DOMAIN:</span>
              </div>
            }
          />
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Sort control */}
            <div className="glass p-1 rounded-xl flex items-center gap-1 w-fit shadow-md">
              <div className="flex items-center gap-1.5 pl-3 pr-1 text-[var(--c-ink-2)] shrink-0 select-none">
                <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">SORT:</span>
              </div>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer select-none ${
                    sortBy === s.key
                      ? "bg-indigo-500/15 text-indigo-700 font-bold"
                      : "text-[var(--c-ink-2)] hover:text-[var(--c-ink)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-[var(--c-ink-2)]/60">
              SHOWING <span className="text-[var(--c-ink)] font-bold">{displayedTools.length}</span> TECHNOLOGIES
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-96 rounded-2xl border border-indigo-500/5 bg-[var(--c-surface-2)]/50 flex flex-col items-center justify-center gap-3 animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs font-mono text-[var(--c-ink-2)]/70">Retrieving index details...</span>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Recharts Chart View */}
            <div className="tech-panel p-6 rounded-2xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold font-display">Comparative Performance Ratings</h2>
              </div>

              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div style={{ minWidth: `${Math.max(displayedTools.length * 60, 450)}px` }}>
                  <ChartContainer height={300}>
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(37, 99, 235, 0.06)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#5A6072"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={6}
                        height={40}
                      />
                      <YAxis
                        stroke="#5A6072"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dx={-6}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        itemStyle={chartItemStyle}
                        labelStyle={chartLabelStyle}
                        formatter={(value: number | string, name: string) => [value, name === "score" ? "Momentum Score" : name]}
                        labelFormatter={(label) => {
                          const item = chartData.find(d => d.name === label);
                          return item?.fullName || label;
                        }}
                      />
                      <Bar
                        dataKey="score"
                        fill="#8A3357"
                        radius={[6, 6, 0, 0]}
                        animationDuration={1000}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </div>

            {/* List Table Grid Overhaul */}
            <div className="tech-panel rounded-2xl overflow-hidden">
              
              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[var(--c-surface-2)] border-b border-[var(--c-border)] font-mono text-[10px] text-[var(--c-ink-2)] tracking-widest uppercase">
                <div className="col-span-4">TECHNOLOGY DETAILS</div>
                <div className="col-span-2 text-center">TREND SCORE</div>
                <div className="col-span-2">GROWTH STAGE</div>
                <div className="col-span-2 text-center">7D HISTORICAL</div>
                <div className="col-span-2 text-right">TELEMETRY SCORE</div>
              </div>

              {/* Data Rows */}
              {displayedTools.length === 0 ? (
                <div className="p-12 text-center text-[var(--c-ink-2)] font-mono text-sm">
                  No technologies monitored under this filter.
                </div>
              ) : (
                <div className="divide-y divide-indigo-500/5">
                  {displayedTools.map((tool) => {
                    // Real trend direction — no green "+0.0%" when nothing moved.
                    const g = tool.growth_pct;
                    const trend =
                      g > 0
                        ? { Icon: TrendingUp, label: `+${g.toFixed(1)}%`, cls: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10" }
                        : g < 0
                        ? { Icon: TrendingDown, label: `${g.toFixed(1)}%`, cls: "text-rose-600 bg-rose-500/5 border-rose-500/10" }
                        : { Icon: Minus, label: "stable", cls: "text-[var(--c-ink-2)]/70 bg-[var(--c-ink-2)]/[0.08] border-[var(--c-ink-2)]/25" };

                    return (
                      <div
                        key={tool.slug}
                        className="trend-list-row grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-5 bg-[var(--c-surface-2)]/10 hover:bg-[var(--c-surface-2)]/50 transition-all duration-200"
                      >
                        {/* 1. Name & Info */}
                        <div className="col-span-4 flex items-center gap-3">
                          <span className="text-3xl p-2 bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-lg select-none">
                            {tool.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-[var(--c-ink)] hover:text-indigo-600 transition-colors">
                                <Link href={`/tools/${tool.slug}`}>{tool.name}</Link>
                              </h3>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${trend.cls}`}>
                                <trend.Icon className="w-2.5 h-2.5" />
                                {trend.label}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--c-ink-2)]">{tool.category}</span>
                          </div>
                          <WatchlistButton toolSlug={tool.slug} className="ml-auto shrink-0" />
                        </div>

                        {/* 2. Circular progress gauge */}
                        <div className="col-span-2 flex items-center justify-start md:justify-center">
                          <span className="md:hidden text-xs font-mono text-[var(--c-ink-2)]/60 mr-4">TREND SCORE:</span>
                          <CircularProgressArc value={tool.score} />
                        </div>

                        {/* 3. Growth stage */}
                        <div className="col-span-2">
                          <span className="md:hidden text-xs font-mono text-[var(--c-ink-2)]/60 mr-2">STAGE:</span>
                          <span className="px-2.5 py-1 rounded bg-[var(--c-surface-2)] border border-[var(--c-border)] text-xs font-mono uppercase tracking-wider text-indigo-600">
                            {tool.stage}
                          </span>
                        </div>

                        {/* 4. Mini Sparkline */}
                        <div className="col-span-2 flex justify-start md:justify-center">
                          <span className="md:hidden text-xs font-mono text-[var(--c-ink-2)]/60 mr-4">HISTORICAL:</span>
                          <MiniSparkline data={tool.last_7_scores} />
                        </div>

                        {/* 5. Telemetry details */}
                        <div className="col-span-2 text-left md:text-right space-y-1">
                          <div className="flex items-center md:justify-end gap-1 text-[11px] font-mono text-[var(--c-ink-2)]">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1)}k` : tool.stars} stars</span>
                          </div>
                          
                          <div className="flex items-center md:justify-end gap-1 text-[10px] font-mono text-[var(--c-ink-2)]/50">
                            <MessageSquare className="w-3 h-3" />
                            <span>{tool.hn_count + tool.reddit_count + tool.devto_count + tool.news_count} mentions</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </DashboardShell>
  );
}
