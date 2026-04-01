"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, BarChart3, Filter, Loader2, Star } from "lucide-react";
import { type Tool, categories, fetchTools } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import FilterBar from "@/components/FilterBar";
import TrendCard from "@/components/TrendCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import ChartContainer, { chartColors, chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";

export default function TrendsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const displayedTools = activeCategory === "All"
    ? allTools
    : allTools.filter(t => t.category === activeCategory);

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

  return (
    <DashboardShell>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Trends Overview
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare tool intelligence scores across all tracked technologies.
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          activeDomain={activeCategory}
          onDomainChange={setActiveCategory}
          domains={categories as unknown as readonly string[]}
          allLabel="All Categories"
          showIcon={false}
          className="bg-card p-4 rounded-xl border border-border/60 flex items-center gap-3 overflow-x-auto shadow-sm"
          prefixNode={
            <>
              <Filter className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
              <span className="text-sm font-semibold text-muted-foreground mr-2 shrink-0">Category:</span>
            </>
          }
        />

        {isLoading ? (
          <div className="h-64 bg-card rounded-2xl border border-border/60 animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <>
            {/* Main Chart Card — Tool Score Comparison */}
            <div className="bg-card p-5 lg:p-6 rounded-2xl border border-border/60 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Tool Trend Scores
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Comparing {displayedTools.length} tools — higher score = stronger momentum
                  </p>
                </div>
              </div>

              <ChartContainer height={400}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    itemStyle={chartItemStyle}
                    labelStyle={chartLabelStyle}
                    formatter={(value: any, name: any) => [value, name === "score" ? "Trend Score" : name]}
                    labelFormatter={(label) => {
                      const item = chartData.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Bar
                    dataKey="score"
                    fill={chartColors[0]}
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                  />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Top 4 Compact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedTools.slice(0, 4).map((tool, idx) => (
                 <TrendCard key={tool.slug} tool={tool} variant="compact" index={idx} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
