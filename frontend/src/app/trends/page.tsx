"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, BarChart3, Filter, Loader2, Star, Share2, Compass, GitFork, MessageSquare } from "lucide-react";
import { type Tool, fetchTools, fetchCategories } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import FilterBar from "@/components/FilterBar";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import ChartContainer, { chartColors, chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";

/* ─── Circular Progress Gauge Arc ─── */
function CircularProgressArc({ value, size = 64, strokeWidth = 5.5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // Determine colors based on scores
  const color = value >= 80 ? "#10B981" : value >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(37, 99, 235, 0.06)"
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
        <span className="text-sm font-mono font-black text-[#FAFAFA]">{value}</span>
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

  if (!data || data.length < 2) {
    return <div className="text-[10px] font-mono text-[#A1A1AA]/40">no stats</div>;
  }

  // Determine line color from trend direction
  const first = data[0];
  const last = data[data.length - 1];
  const color = last >= first ? "#10B981" : "#EF4444";

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
      <span className="text-[9px] font-mono text-[#A1A1AA]/40 uppercase tracking-widest">7d history</span>
    </div>
  );
}

export default function TrendsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
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
    if (activeCategory === "All") return allTools;
    return allTools.filter(t => t.category.toLowerCase() === activeCategory.toLowerCase());
  }, [allTools, activeCategory]);

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

  return (
    <DashboardShell>
      
      {/* Decorative page glow */}
      <div className="absolute top-0 right-10 w-[400px] h-[300px] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none z-0" />

      <div className="space-y-8 relative z-10 pb-12">
        
        {/* Opacity blurred header section */}
        <header className="p-6 md:p-8 rounded-2xl border border-violet-500/10 bg-[#111113]/80 backdrop-blur-md space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest block">
                CYBERNETIC TELEMETRY DATA
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-violet-400" />
                <span className="gradient-text">Trends Intelligence</span>
              </h1>
            </div>
            
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Trends URL copied to clipboard!");
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-500/15 bg-[#18181B] hover:bg-[#18181B]/80 text-xs font-mono hover:text-white transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" /> SHARE_URL
            </button>
          </div>
          <p className="text-sm text-[#A1A1AA] max-w-xl font-light">
            Monitored developer conversation data visualised dynamically. Refined algorithm scores determine the momentum growth vectors.
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
              <div className="flex items-center gap-1.5 pl-3 pr-1 text-[#A1A1AA] shrink-0 select-none">
                <Filter className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">DOMAIN:</span>
              </div>
            }
          />
          
          <div className="text-xs font-mono text-[#A1A1AA]/60">
            SHOWING <span className="text-white font-bold">{displayedTools.length}</span> TECHNOLOGIES
          </div>
        </div>

        {isLoading ? (
          <div className="h-96 rounded-2xl border border-violet-500/5 bg-[#18181B]/50 flex flex-col items-center justify-center gap-3 animate-pulse">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <span className="text-xs font-mono text-[#A1A1AA]/70">Retrieving index details...</span>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Recharts Chart View */}
            <div className="glass-panel p-6 rounded-2xl border border-violet-500/10 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-bold font-display">Comparative Performance Ratings</h2>
              </div>

              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div style={{ minWidth: `${Math.max(displayedTools.length * 60, 450)}px` }}>
                  <ChartContainer height={300}>
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(37, 99, 235, 0.06)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#A1A1AA"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={6}
                        height={40}
                      />
                      <YAxis
                        stroke="#A1A1AA"
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
                        formatter={(value: any, name: any) => [value, name === "score" ? "Momentum Score" : name]}
                        labelFormatter={(label) => {
                          const item = chartData.find(d => d.name === label);
                          return item?.fullName || label;
                        }}
                      />
                      <Bar
                        dataKey="score"
                        fill="#C4B5FD"
                        radius={[6, 6, 0, 0]}
                        animationDuration={1000}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </div>

            {/* List Table Grid Overhaul */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-violet-500/10 shadow-lg">
              
              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#111113]/80 border-b border-violet-500/10 font-mono text-[10px] text-[#A1A1AA] tracking-widest uppercase">
                <div className="col-span-4">TECHNOLOGY DETAILS</div>
                <div className="col-span-2 text-center">TREND SCORE</div>
                <div className="col-span-2">GROWTH STAGE</div>
                <div className="col-span-2 text-center">7D HISTORICAL</div>
                <div className="col-span-2 text-right">TELEMETRY SCORE</div>
              </div>

              {/* Data Rows */}
              {displayedTools.length === 0 ? (
                <div className="p-12 text-center text-[#A1A1AA] font-mono text-sm">
                  No technologies monitored under this filter.
                </div>
              ) : (
                <div className="divide-y divide-violet-500/5">
                  {displayedTools.map((tool) => {
                    const growthStr = tool.growth_pct >= 0 ? `+${tool.growth_pct.toFixed(1)}%` : `${tool.growth_pct.toFixed(1)}%`;
                    const growthColor = tool.growth_pct >= 0 ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" : "text-rose-400 bg-rose-500/5 border-rose-500/10";
                    
                    return (
                      <div
                        key={tool.slug}
                        className="trend-list-row grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-5 bg-[#18181B]/10 hover:bg-[#18181B]/50 transition-all duration-200"
                      >
                        {/* 1. Name & Info */}
                        <div className="col-span-4 flex items-center gap-3">
                          <span className="text-3xl p-2 bg-[#111113] border border-violet-500/10 rounded-lg select-none">
                            {tool.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-white hover:text-violet-400 transition-colors">
                                <Link href={`/tools/${tool.slug}`}>{tool.name}</Link>
                              </h3>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${growthColor}`}>
                                {growthStr}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#A1A1AA]">{tool.category}</span>
                          </div>
                        </div>

                        {/* 2. Circular progress gauge */}
                        <div className="col-span-2 flex items-center justify-start md:justify-center">
                          <span className="md:hidden text-xs font-mono text-[#A1A1AA]/60 mr-4">TREND SCORE:</span>
                          <CircularProgressArc value={tool.score} />
                        </div>

                        {/* 3. Growth stage */}
                        <div className="col-span-2">
                          <span className="md:hidden text-xs font-mono text-[#A1A1AA]/60 mr-2">STAGE:</span>
                          <span className="px-2.5 py-1 rounded bg-[#111113] border border-violet-500/10 text-xs font-mono uppercase tracking-wider text-violet-300">
                            {tool.stage}
                          </span>
                        </div>

                        {/* 4. Mini Sparkline */}
                        <div className="col-span-2 flex justify-start md:justify-center">
                          <span className="md:hidden text-xs font-mono text-[#A1A1AA]/60 mr-4">HISTORICAL:</span>
                          {/* We fall back to standard data point mock if empty */}
                          <MiniSparkline data={tool.last_7_scores || [50, 52, 55, 58, 62, 60, 68]} />
                        </div>

                        {/* 5. Telemetry details */}
                        <div className="col-span-2 text-left md:text-right space-y-1">
                          <div className="flex items-center md:justify-end gap-1 text-[11px] font-mono text-[#A1A1AA]">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1)}k` : tool.stars} stars</span>
                          </div>
                          
                          <div className="flex items-center md:justify-end gap-1 text-[10px] font-mono text-[#A1A1AA]/50">
                            <MessageSquare className="w-3 h-3" />
                            <span>{tool.hn_count + tool.reddit_count + tool.devto_count} mentions</span>
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
