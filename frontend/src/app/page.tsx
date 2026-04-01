"use client";

import { useState, useEffect } from "react";
import { Zap, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { type Tool, categories, fetchTools } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import TrendCard from "@/components/TrendCard";
import FilterBar from "@/components/FilterBar";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTools() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchTools(activeCategory);
        setTools(data);
      } catch (err: any) {
        console.error("API Error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    loadTools();
  }, [activeCategory]);

  return (
    <DashboardShell>
      <div className="space-y-6 fade-in">

        {/* Compact Hero */}
        <div className="text-center space-y-3 py-6 md:py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 shadow-sm shadow-primary/10">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            Tool-Based Intelligence Engine
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Real-Time Tech{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-cyan-300">
              Intelligence
            </span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Tracking {tools.length || 25}+ technologies across GitHub, HackerNews, Dev.to & Reddit — scored and recommended for your learning path.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="border-b border-border/40 pb-4">
          <FilterBar
            activeDomain={activeCategory}
            onDomainChange={setActiveCategory}
            domains={categories as unknown as readonly string[]}
            className="flex items-center gap-2 overflow-x-auto pb-2 w-full"
          />
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Tool Intelligence</h2>
            <span className="text-xs text-muted-foreground ml-auto uppercase tracking-wider font-semibold">
              Live Feed
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1, 2, 3, 4, 5, 6].map(idx => (
                 <div key={idx} className="h-44 bg-card rounded-2xl border border-border/60 animate-pulse flex flex-col items-center justify-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-muted/60 animate-pulse" />
                   <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
                   <div className="h-2.5 w-32 bg-muted/40 rounded animate-pulse" />
                 </div>
               ))}
            </div>
          ) : error ? (
            <div className="p-6 bg-card border border-border/60 rounded-xl shadow-sm text-center space-y-3">
               <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                 <RefreshCw className="w-6 h-6 text-primary animate-spin" />
               </div>
               <p className="font-bold text-foreground">🔄 First scan in progress...</p>
               <p className="text-sm text-muted-foreground max-w-md mx-auto">
                 Fetching real-time data from GitHub, HackerNews, Dev.to & Reddit. This takes about 30 seconds on first run.
               </p>
               <button
                 onClick={() => window.location.reload()}
                 className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
               >
                 Retry
               </button>
            </div>
          ) : tools.length === 0 ? (
            <div className="p-6 bg-card border border-border/60 rounded-xl shadow-sm text-center space-y-3">
               <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                 <RefreshCw className="w-6 h-6 text-primary animate-spin" />
               </div>
               <p className="font-bold text-foreground">🔄 First scan in progress...</p>
               <p className="text-sm text-muted-foreground max-w-md mx-auto">
                 Fetching real-time data from GitHub, HackerNews, Dev.to & Reddit. Data will appear shortly.
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool, idx) => (
                <TrendCard key={tool.slug} tool={tool} index={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
