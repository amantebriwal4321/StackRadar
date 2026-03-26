"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, TrendingUp, Loader2 } from "lucide-react";
import { type Technology, domains } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import TrendCard from "@/components/TrendCard";
import FilterBar from "@/components/FilterBar";

// Map domain API response to frontend Technology type
function mapDomainToTechnology(d: any): Technology {
  const stageMap: Record<string, Technology["stage"]> = {
    "Emerging": "Emerging",
    "Growing": "Growing",
    "Mature": "Mature",
    "Declining": "Declining",
  };

  return {
    id: d.slug,
    name: d.name,
    domain: d.name,
    description: d.summary || "No data available yet.",
    score: d.score || 0,
    stage: stageMap[d.stage] || "Emerging",
    growth: [],
    github_repos: d.metrics?.github || 0,
    hn_mentions: d.metrics?.hackernews || 0,
    devto_articles: d.metrics?.devto || 0,
    reddit_mentions: d.metrics?.reddit || 0,
    news_mentions: d.metrics?.news || 0,
    icon: d.icon || "⚡",
    color: "primary",
    why_trending: [],
  };
}

export default function HomePage() {
  const [activeDomain, setActiveDomain] = useState<string>("All");
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrends() {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${baseUrl}/api/v1/trends`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch technology trends");
        
        const data = await res.json();
        let mapped = data.map(mapDomainToTechnology);
        
        // Filter by domain if not "All"
        if (activeDomain !== "All") {
          mapped = mapped.filter((t: Technology) => t.domain === activeDomain);
        }
        
        setTechnologies(mapped);
      } catch (err: any) {
        console.error("API Error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrends();
  }, [activeDomain]);

  return (
    <DashboardShell>
      <div className="space-y-10 fade-in">

        {/* Hero Section */}
        <div className="text-center space-y-6 py-10 md:py-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 shadow-sm shadow-primary/10">
            <Zap className="w-4 h-4 animate-pulse" />
            AI-Powered Intelligence Engine
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Real-Time Tech{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-cyan-300">
              Intelligence
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Tracking 8 technology domains across GitHub, HackerNews, Dev.to, Reddit, and Tech News — scored, classified, and summarized in real-time.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
          <FilterBar
            activeDomain={activeDomain}
            onDomainChange={setActiveDomain}
            domains={domains}
            className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto"
          />
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Domain Intelligence</h2>
            <span className="text-xs text-muted-foreground ml-auto uppercase tracking-wider font-semibold">
              Live Feed
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1, 2, 3, 4].map(idx => (
                 <div key={idx} className="h-48 bg-card rounded-2xl border border-border/60 animate-pulse flex items-center justify-center">
                   <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                 </div>
               ))}
            </div>
          ) :	error ? (
            <div className="p-8 text-center bg-destructive/10 border border-destructive/20 text-destructive rounded-xl shadow-sm">
               <p className="font-bold mb-2">Error Connecting to Intelligence Engine</p>
               <p className="text-sm opacity-90">{error}</p>
            </div>
          ) : technologies.length === 0 ? (
            <div className="p-	12 text-center text-muted-foreground border-2 border-dashed border-border/60 rounded-xl">
               Waiting for first intelligence scan... Data will appear shortly.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {technologies.map((tech, idx) => (
                <TrendCard key={tech.id} technology={tech} index={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
