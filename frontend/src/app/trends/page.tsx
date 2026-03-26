"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, BarChart3, Filter, Loader2 } from "lucide-react";
import { type Technology, domains } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import FilterBar from "@/components/FilterBar";
import TrendCard from "@/components/TrendCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ChartContainer, { chartColors, chartTooltipStyle, chartItemStyle, chartLabelStyle } from "@/components/ChartContainer";

function mapDomainToTechnology(d: any): Technology {
  const stageMap: Record<string, Technology["stage"]> = {
    "Emerging": "Emerging", "Growing": "Growing", "Mature": "Mature", "Declining": "Declining",
  };
  return {
    id: d.slug, name: d.name, domain: d.name,
    description: d.summary || "", score: d.score || 0,
    stage: stageMap[d.stage] || "Emerging", growth: [],
    github_repos: d.metrics?.github || 0, hn_mentions: d.metrics?.hackernews || 0,
    devto_articles: d.metrics?.devto || 0, reddit_mentions: d.metrics?.reddit || 0,
    news_mentions: d.metrics?.news || 0, icon: d.icon || "⚡", color: "primary", why_trending: [],
  };
}

export default function TrendsPage() {
  const [activeDomain, setActiveDomain] = useState<string>("All");
  const [allTechs, setAllTechs] = useState<Technology[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${baseUrl}/api/v1/trends`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setAllTechs(data.map(mapDomainToTechnology));
        }
      } catch (err) {
        console.error("Failed to fetch trends:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrends();
  }, []);

  const displayedTechs = activeDomain === "All" 
    ? allTechs 
    : allTechs.filter(t => t.domain === activeDomain);

  // Chart data: domain scores comparison
  const chartData = useMemo(() => {
    return displayedTechs.map(tech => ({
      name: tech.name.length > 12 ? tech.name.slice(0, 12) + "…" : tech.name,
      fullName: tech.name,
      score: tech.score,
      github: tech.github_repos,
      hn: tech.hn_mentions,
      devto: tech.devto_articles,
      reddit: tech.reddit_mentions,
      news: tech.news_mentions,
    }));
  }, [displayedTechs]);

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
              Compare domain intelligence scores across all tracked technology areas.
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          activeDomain={activeDomain}
          onDomainChange={setActiveDomain}
          domains={domains}
          allLabel="All Domains"
          showIcon={false}
          className="bg-card p-4 rounded-xl border border-border/60 flex items-center gap-3 overflow-x-auto shadow-sm"
          prefixNode={
            <>
              <Filter className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
              <span className="text-sm font-semibold text-muted-foreground mr-2 shrink-0">Domain:</span>
            </>
          }
        />

        {isLoading ? (
          <div className="h-64 bg-card rounded-2xl border border-border/60 animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <>
            {/* Main Chart Card — Domain Score Comparison */}
            <div className="bg-card p-5 lg:p-6 rounded-2xl border border-border/60 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Domain Trend Scores
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Comparing {displayedTechs.length} domains — higher score = stronger momentum
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
                    formatter={(value: number, name: string) => [value, name === "score" ? "Trend Score" : name]}
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

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedTechs.slice(0, 4).map((tech, idx) => (
                 <TrendCard key={tech.id} technology={tech} variant="compact" index={idx} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
