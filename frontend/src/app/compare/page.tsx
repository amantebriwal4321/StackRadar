"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  GitCompare, Loader2, Star, GitFork, TrendingUp, TrendingDown,
  Minus, X, Search, ArrowRight, Share2, Award, Check, MessageSquare, Terminal, Eye
} from "lucide-react";
import {
  type Tool, type CompareTool,
  fetchTools, fetchCompareTools,
} from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import ChartContainer, { chartColors, chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const COMPARE_COLORS = ["#A78BFA", "#8B5CF6", "#C4B5FD", "#10B981", "#EC4899"];

export default function ComparePage() {
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareTool[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // 1. Load all tools for selector
  useEffect(() => {
    fetchTools()
      .then((data) => {
        setAllTools(data);
        setToolsLoading(false);
      })
      .catch(() => setToolsLoading(false));
  }, []);

  // 2. Read slugs from URL query param on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSlugs = params.get("slugs");
      if (urlSlugs) {
        setSelectedSlugs(urlSlugs.split(",").slice(0, 5));
      }
    }
  }, []);

  // 3. Write slugs to URL query params on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      if (selectedSlugs.length > 0) {
        params.set("slugs", selectedSlugs.join(","));
        window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
      } else {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [selectedSlugs]);

  // 4. Fetch compare telemetry
  useEffect(() => {
    if (selectedSlugs.length < 2) {
      setCompareData(null);
      return;
    }
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchCompareTools(selectedSlugs);
        setCompareData(data.tools);
      } catch (err) {
        console.error("Compare error:", err);
        setCompareData(null);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [selectedSlugs]);

  const toggleTool = (slug: string) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 5) return prev; // max 5
      return [...prev, slug];
    });
  };

  const clearSelection = () => {
    setSelectedSlugs([]);
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter selector list
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return allTools;
    const q = searchQuery.toLowerCase();
    return allTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [searchQuery, allTools]);

  // Max value markers for metrics to evaluate winner and relative bars
  const maxMetrics = useMemo(() => {
    if (!compareData || compareData.length === 0) return {};
    const keys = [
      "score",
      "stars",
      "forks",
      "growth_pct",
      "hn_count",
      "reddit_count",
      "devto_count",
      "news_count",
      "sentiment_positive"
    ];
    const vals: Record<string, number> = {};
    keys.forEach(k => {
      vals[k] = Math.max(...compareData.map(t => Number((t as any)[k] ?? 0)));
    });
    return vals;
  }, [compareData]);

  // Unified chart historical scores
  const chartData = useMemo(() => {
    if (!compareData || compareData.length < 2) return [];
    const dateSet = new Set<string>();
    compareData.forEach((t) => t.history.forEach((h) => dateSet.add(h.date)));
    const dates = Array.from(dateSet).sort();

    return dates.map((d) => {
      const point: Record<string, any> = { date: d.slice(5) }; // "MM-DD"
      compareData.forEach((t) => {
        const snap = t.history.find((h) => h.date === d);
        point[t.name] = snap ? snap.score : null;
      });
      return point;
    });
  }, [compareData]);

  return (
    <DashboardShell>
      
      {/* Background glow overlay */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[300px] rounded-full bg-violet-500/5 blur-[90px] pointer-events-none z-0" />

      <div className="space-y-8 relative z-10 pb-16">
        
        {/* Opacity Blurred Header */}
        <header className="p-6 md:p-8 rounded-2xl border border-violet-500/10 bg-[#111113]/85 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
          
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest block">
              DIFFERENTIAL TELEMETRY VIEW
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-violet-400" />
              <span className="gradient-text">Compare Matrix</span>
            </h1>
            <p className="text-[#A1A1AA] text-sm font-light">
              Select 2 to 5 technologies from the scanner index. Shares links directly containing parameters.
            </p>
          </div>

          <div className="flex gap-3 relative z-10">
            {selectedSlugs.length >= 2 && (
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-bold transition-all active:scale-95 shadow-md shadow-violet-500/10"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "COPIED!" : "SHARE_LINK"}
              </button>
            )}
            {selectedSlugs.length > 0 && (
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-500/15 bg-[#18181B] hover:bg-[#18181B]/80 text-xs font-mono text-[#A1A1AA] transition-all hover:text-white"
              >
                CLEAR_ALL
              </button>
            )}
          </div>
        </header>

        {/* Selector Panel */}
        <div className="glass-panel border border-violet-500/10 rounded-2xl p-6 space-y-4">
          
          {/* Selected items list */}
          <div className="flex items-center gap-2.5 flex-wrap min-h-[38px] pb-2 border-b border-violet-500/5">
            <span className="text-[10px] font-mono font-bold text-[#A1A1AA]/50 uppercase tracking-widest mr-2">TRACKED:</span>
            {selectedSlugs.length === 0 && (
              <span className="text-xs text-[#A1A1AA]/40 italic">Add technologies using the list index below...</span>
            )}
            {selectedSlugs.map((slug, idx) => {
              const tool = allTools.find((t) => t.slug === slug);
              const accentColor = COMPARE_COLORS[idx % COMPARE_COLORS.length];
              return (
                <button
                  key={slug}
                  onClick={() => toggleTool(slug)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold border transition-all hover:scale-105"
                  style={{
                    borderColor: `${accentColor}40`,
                    color: accentColor,
                    backgroundColor: `${accentColor}10`,
                  }}
                >
                  {tool?.icon} {tool?.name || slug}
                  <X className="w-3.5 h-3.5 ml-1 text-slate-500 hover:text-white" />
                </button>
              );
            })}
          </div>

          {/* Search bar inside selector */}
          <div className="relative group max-w-md">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl opacity-10 group-focus-within:opacity-40 transition-opacity duration-300 blur-sm" />
            <div className="relative bg-[#18181B] rounded-xl flex items-center border border-violet-500/10 px-3">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search tools to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none py-2.5 px-2 text-xs text-white focus:outline-none placeholder-[#A1A1AA]/50"
              />
            </div>
          </div>

          {/* Selector grid scroll area */}
          {toolsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-none">
              {filteredTools.map((tool) => {
                const isSelected = selectedSlugs.includes(tool.slug);
                const colorIdx = selectedSlugs.indexOf(tool.slug);
                return (
                  <button
                    key={tool.slug}
                    onClick={() => toggleTool(tool.slug)}
                    disabled={!isSelected && selectedSlugs.length >= 5}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all border cursor-pointer select-none text-left truncate ${
                      isSelected
                        ? "bg-[#A78BFA]/15 border-violet-500 text-white font-bold"
                        : "bg-[#111113]/50 border-violet-500/5 text-[#A1A1AA] hover:text-white hover:border-violet-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                    }`}
                  >
                    <span className="text-base select-none">{tool.icon}</span>
                    <span className="truncate flex-1">{tool.name}</span>
                    {isSelected && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COMPARE_COLORS[colorIdx % COMPARE_COLORS.length] }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* ── Comparison Results View ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <span className="text-xs font-mono text-[#A1A1AA]/70">Gathering metric structures...</span>
          </div>
        ) : compareData && compareData.length >= 2 ? (
          <div className="space-y-8">
            
            {/* COLUMN COMPARISON MATRIX GRID */}
            <div className="glass-panel border border-violet-500/10 rounded-2xl overflow-hidden shadow-lg overflow-x-auto">
              
              <div className="min-w-[800px] divide-y divide-violet-500/5">
                
                {/* 1. Header names row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-5 bg-[#111113]/80 border-b border-violet-500/10 items-center">
                  <div className="col-span-3 font-mono text-[10px] text-[#A1A1AA] tracking-widest uppercase">
                    METRIC CATEGORY
                  </div>
                  {compareData.map((t, idx) => {
                    const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
                    return (
                      <div key={t.slug} className="col-span-2 text-center" style={{ minWidth: "120px" }}>
                        <div className="flex flex-col items-center gap-1.5 p-2 bg-[#18181B]/50 rounded-xl border border-violet-500/5 relative">
                          <div className="absolute top-1 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-3xl select-none">{t.icon}</span>
                          <span className="font-bold text-sm text-white">{t.name}</span>
                          <span className="text-[8px] font-mono text-[#A1A1AA]/60 uppercase">{t.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Momentum Score row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-3 font-mono text-xs font-bold text-white">
                    MOMENTUM SCORE
                  </div>
                  {compareData.map((t) => {
                    const isWinner = t.score === maxMetrics.score;
                    return (
                      <div key={t.slug} className="col-span-2 text-center flex flex-col items-center gap-1.5">
                        <span className="text-2xl font-black font-mono text-white">{t.score}</span>
                        {isWinner && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-0.5 shadow-sm">
                            <Award className="w-2.5 h-2.5" /> HIGHEST
                          </span>
                        )}
                        {/* Relative Bar */}
                        <div className="h-1 w-16 bg-[#18181B] rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500" style={{ width: `${(t.score / maxMetrics.score) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Adoption stage row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-3 font-mono text-xs text-[#A1A1AA]">
                    ADOPTION STAGE
                  </div>
                  {compareData.map((t) => (
                    <div key={t.slug} className="col-span-2 text-center">
                      <span className="px-2.5 py-0.5 rounded bg-[#111113] border border-violet-500/10 text-xs font-mono text-violet-300 uppercase tracking-wider">
                        {t.stage}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 4. Growth percentage delta */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-3 font-mono text-xs text-[#A1A1AA]">
                    CYCLE GROWTH DELTA
                  </div>
                  {compareData.map((t) => {
                    const isWinner = t.growth_pct === maxMetrics.growth_pct;
                    const Icon = t.growth_pct > 0 ? TrendingUp : t.growth_pct < 0 ? TrendingDown : Minus;
                    const color = t.growth_pct > 0 ? "text-emerald-400" : t.growth_pct < 0 ? "text-rose-400" : "text-[#A1A1AA]";
                    return (
                      <div key={t.slug} className="col-span-2 text-center flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1 font-bold font-mono text-xs ${color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {t.growth_pct >= 0 ? "+" : ""}{t.growth_pct.toFixed(1)}%
                        </span>
                        {isWinner && t.growth_pct > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[7px] font-mono font-bold text-emerald-400">
                            FASTEST
                          </span>
                        )}
                        <div className="h-1 w-16 bg-[#18181B] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, (t.growth_pct / maxMetrics.growth_pct) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 5. Github Stars */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-3 font-mono text-xs text-[#A1A1AA]">
                    GITHUB STARS
                  </div>
                  {compareData.map((t) => {
                    const isWinner = t.stars === maxMetrics.stars;
                    return (
                      <div key={t.slug} className="col-span-2 text-center flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-white">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          {t.stars >= 1000 ? `${(t.stars / 1000).toFixed(1)}k` : t.stars}
                        </span>
                        {isWinner && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[7px] font-mono font-bold text-amber-400">
                            MOST STARS
                          </span>
                        )}
                        <div className="h-1 w-16 bg-[#18181B] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${(t.stars / maxMetrics.stars) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 6. Forks */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-3 font-mono text-xs text-[#A1A1AA]">
                    REPOS FORKS
                  </div>
                  {compareData.map((t) => (
                    <div key={t.slug} className="col-span-2 text-center flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-[#A1A1AA]">
                        <GitFork className="w-3.5 h-3.5 text-violet-400" />
                        {t.forks >= 1000 ? `${(t.forks / 1000).toFixed(1)}k` : t.forks}
                      </span>
                      <div className="h-1 w-16 bg-[#18181B] rounded-full overflow-hidden">
                        <div className="h-full bg-violet-400" style={{ width: `${(t.forks / maxMetrics.forks) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 7. Total discussion Mentions */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-3 font-mono text-xs text-[#A1A1AA]">
                    COMMUNITY MENTIONS
                  </div>
                  {compareData.map((t) => {
                    const totalMentions = t.hn_count + t.reddit_count + t.devto_count;
                    const maxTotalMentions = maxMetrics.hn_count + maxMetrics.reddit_count + maxMetrics.devto_count;
                    const isWinner = totalMentions === maxTotalMentions;
                    return (
                      <div key={t.slug} className="col-span-2 text-center flex flex-col items-center gap-1">
                        <span className="font-mono text-xs text-white">{totalMentions} scans</span>
                        {isWinner && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[7px] font-mono font-bold text-cyan-400">
                            MOST DISCUSSIONS
                          </span>
                        )}
                        <div className="h-1 w-16 bg-[#18181B] rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500" style={{ width: `${(totalMentions / maxTotalMentions) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 8. Sentiment values */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-3 font-mono text-xs text-[#A1A1AA]">
                    SENTIMENT ANALYSIS
                  </div>
                  {compareData.map((t) => {
                    const isWinner = t.sentiment_positive === maxMetrics.sentiment_positive;
                    return (
                      <div key={t.slug} className="col-span-2 text-center flex flex-col items-center gap-1">
                        <span className="text-xs font-mono font-bold text-white">
                          {t.sentiment_label?.toUpperCase()} ({(t.sentiment_positive * 100).toFixed(0)}% pos)
                        </span>
                        {isWinner && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[7px] font-mono font-bold text-emerald-400">
                            MOST FAVORABLE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

            {/* LINE CHART SCORE OVERTIME COMPARISONS */}
            {chartData.length > 1 && (
              <div className="glass-panel p-6 rounded-2xl border border-violet-500/10 bg-[#18181B]/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-bold font-display">Comparative Score History</h2>
                </div>
                
                <ChartContainer height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(37, 99, 235, 0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartItemStyle} labelStyle={chartLabelStyle} />
                    <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", paddingTop: 12 }} />
                    {compareData.map((t, idx) => (
                      <Line
                        key={t.slug}
                        type="monotone"
                        dataKey={t.name}
                        stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                        connectNulls
                        animationDuration={1000}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            )}

            {/* RECOMMENDATIONS SIDE-BY-SIDE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {compareData.map((t, idx) => {
                const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
                return (
                  <div
                    key={t.slug}
                    className="glass-panel p-6 rounded-2xl border border-violet-500/10 bg-[#18181B]/30 relative overflow-hidden"
                    style={{ borderTopWidth: "3px", borderTopColor: color }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl select-none">{t.icon}</span>
                      <div>
                        <h3 className="font-bold text-sm text-white font-display">{t.name} Recommendation</h3>
                        <span className="text-[9px] font-mono text-[#A1A1AA] uppercase">{t.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed font-light font-mono">
                      {t.recommendation || "No specialized profile recommendations. This technology represents stable developer vectors."}
                    </p>
                  </div>
                );
              })}
            </div>

          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-violet-500/10 rounded-2xl bg-[#18181B]/20 glass-panel">
            <GitCompare className="w-14 h-14 text-violet-400/40 mx-auto mb-4 animate-pulse" />
            <h3 className="text-base font-bold font-display mb-2">Select Technologies To Compare</h3>
            <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto leading-relaxed font-light">
              Add at least 2 technologies from the scanner selection above to compile details side-by-side.
            </p>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
