"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  GitCompare, Loader2, Star, GitFork, TrendingUp, TrendingDown,
  Minus, X, Search, ArrowRight,
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

const COMPARE_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

export default function ComparePage() {
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareTool[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load all tools for the selector
  useEffect(() => {
    fetchTools()
      .then((data) => { setAllTools(data); setToolsLoading(false); })
      .catch(() => setToolsLoading(false));
  }, []);

  // Fetch comparison when slugs change (minimum 2)
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

  // Filter tools by search
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return allTools;
    return allTools.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allTools]);

  // Build unified chart data from compare results
  const chartData = useMemo(() => {
    if (!compareData || compareData.length < 2) return [];
    // Collect all unique dates
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
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
            <GitCompare className="w-7 h-7 text-primary" />
            Compare Tools
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Select 2–5 tools to compare their scores, community signals, and trend history side by side.
          </p>
        </div>

        {/* Tool Selector */}
        <div className="bg-card border border-border/60 rounded-xl p-4 space-y-3">
          {/* Selected Pills */}
          <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">Selected:</span>
            {selectedSlugs.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Pick tools from below…</span>
            )}
            {selectedSlugs.map((slug, idx) => {
              const tool = allTools.find((t) => t.slug === slug);
              return (
                <button
                  key={slug}
                  onClick={() => toggleTool(slug)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors"
                  style={{
                    borderColor: COMPARE_COLORS[idx % COMPARE_COLORS.length],
                    color: COMPARE_COLORS[idx % COMPARE_COLORS.length],
                    backgroundColor: `${COMPARE_COLORS[idx % COMPARE_COLORS.length]}15`,
                  }}
                >
                  {tool?.icon} {tool?.name || slug}
                  <X className="w-3 h-3" />
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tools to add…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/60 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
            />
          </div>

          {/* Tool Grid */}
          {toolsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
              {filteredTools.map((tool) => {
                const isSelected = selectedSlugs.includes(tool.slug);
                const colorIdx = selectedSlugs.indexOf(tool.slug);
                return (
                  <button
                    key={tool.slug}
                    onClick={() => toggleTool(tool.slug)}
                    disabled={!isSelected && selectedSlugs.length >= 5}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-background border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    <span className="text-base">{tool.icon}</span>
                    <span className="truncate">{tool.name}</span>
                    {isSelected && (
                      <div
                        className="w-2 h-2 rounded-full ml-auto shrink-0"
                        style={{ backgroundColor: COMPARE_COLORS[colorIdx % COMPARE_COLORS.length] }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Comparison Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : compareData && compareData.length >= 2 ? (
          <div className="space-y-6">
            {/* Metrics Table */}
            <div className="bg-card border border-border/60 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Metric</th>
                    {compareData.map((t, idx) => (
                      <th key={t.slug} className="text-center px-4 py-3 min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xl">{t.icon}</span>
                          <span className="font-bold text-xs" style={{ color: COMPARE_COLORS[idx] }}>
                            {t.name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    { label: "Score", key: "score", format: (v: any) => <span className="text-lg font-black">{v}</span> },
                    { label: "Stage", key: "stage", format: (v: any) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">{v}</span> },
                    { label: "Growth", key: "growth_pct", format: (v: any) => {
                      const Icon = v > 5 ? TrendingUp : v < -5 ? TrendingDown : Minus;
                      const color = v > 5 ? "text-emerald-500" : v < -5 ? "text-rose-500" : "text-muted-foreground";
                      return <span className={`inline-flex items-center gap-0.5 font-bold ${color}`}><Icon className="w-3.5 h-3.5" />{v >= 0 ? "+" : ""}{Number(v).toFixed(1)}%</span>;
                    }},
                    { label: "Stars", key: "stars", format: (v: any) => <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" />{v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}</span> },
                    { label: "Forks", key: "forks", format: (v: any) => <span className="inline-flex items-center gap-1"><GitFork className="w-3 h-3" />{v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}</span> },
                    { label: "HN Mentions", key: "hn_count", format: undefined },
                    { label: "Dev.to", key: "devto_count", format: undefined },
                    { label: "Reddit", key: "reddit_count", format: undefined },
                    { label: "News", key: "news_count", format: undefined },
                    { label: "Sentiment", key: "sentiment_label", format: (v: any) => {
                      const emoji = v === "positive" ? "🟢" : v === "negative" ? "🔴" : v === "mixed" ? "🟡" : "⚪";
                      return <span className="text-xs font-semibold">{emoji} {v}</span>;
                    }},
                    { label: "Priority", key: "learning_priority", format: (v: any) => {
                      const colors: Record<string, string> = { HIGH: "text-emerald-500", MEDIUM: "text-amber-500", LOW: "text-slate-400", AVOID: "text-rose-500" };
                      return <span className={`font-bold text-xs ${colors[v] || ""}`}>{v}</span>;
                    }},
                  ] as { label: string; key: string; format: ((v: any) => React.ReactNode) | undefined }[]).map((row) => (
                    <tr key={row.label} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">{row.label}</td>
                      {compareData.map((t) => {
                        const val = (t as any)[row.key];
                        return (
                          <td key={t.slug} className="px-4 py-2.5 text-center">
                            {row.format ? row.format(val) : <span className="font-semibold">{val}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* History Chart */}
            {chartData.length > 1 && (
              <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Score History — Last 30 Days
                </h2>
                <ChartContainer height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartItemStyle} labelStyle={chartLabelStyle} />
                    <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                    {compareData.map((t, idx) => (
                      <Line
                        key={t.slug}
                        type="monotone"
                        dataKey={t.name}
                        stroke={COMPARE_COLORS[idx]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                        connectNulls
                        animationDuration={1500}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            )}

            {/* Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compareData.map((t, idx) => (
                <div
                  key={t.slug}
                  className="bg-card p-4 rounded-xl border border-border/60 space-y-2"
                  style={{ borderLeftWidth: "3px", borderLeftColor: COMPARE_COLORS[idx] }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.icon}</span>
                    <h3 className="font-bold text-sm">{t.name}</h3>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{t.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        ) : selectedSlugs.length >= 2 ? null : (
          <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-muted/10">
            <GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-bold mb-1">Select Tools to Compare</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Pick at least 2 tools from the list above to see a detailed side-by-side comparison with metrics, sentiment, and historical trends.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
