"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search, Compass, ChevronDown, ChevronUp, Star, Loader2,
  ArrowRight, Sparkles, GraduationCap, Eye, GitFork, Award
} from "lucide-react";
import {
  type Tool, type DomainSummary, type LearningPath,
  fetchTools, fetchDomains, fetchLearningPath,
} from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import Link from "next/link";

export default function ExplorePage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  // Load all tools and domains on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [toolData, domainData] = await Promise.all([
          fetchTools(),
          fetchDomains(),
        ]);
        setTools(toolData);
        setDomains(domainData);
        // Auto-select first domain
        if (domainData.length > 0) {
          setActiveDomain(domainData[0].slug);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Fetch learning path when domain changes
  useEffect(() => {
    if (!activeDomain) return;
    async function loadPath() {
      setPathLoading(true);
      try {
        const data = await fetchLearningPath(activeDomain!);
        setLearningPath(data);
      } catch (err) {
        console.error("Failed to fetch learning path:", err);
        setLearningPath(null);
      } finally {
        setPathLoading(false);
      }
    }
    loadPath();
  }, [activeDomain]);

  // Filter tools across ALL domains if searching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [searchQuery, tools]);

  const currentDomainName = domains.find(d => d.slug === activeDomain)?.name || "";

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-xs font-mono text-[#8899BB]/70">Scanning space paths...</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      
      {/* Visual background glows */}
      <div className="absolute top-10 left-10 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[90px] pointer-events-none z-0" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />

      <div className="space-y-8 relative z-10 pb-16">

        {/* Cinematic Blurred Page Header */}
        <header className="p-6 md:p-8 rounded-2xl border border-blue-500/10 bg-[#0A0F1E]/80 backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest block">
                SEQUENTIAL LEARNING NETWORKS
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display flex items-center gap-3">
                <Compass className="w-8 h-8 text-blue-400" />
                <span className="gradient-text">Explore Universe</span>
              </h1>
              <p className="text-[#8899BB] text-sm max-w-xl font-light">
                Discover developer learning sequences structured dynamically. Hover over a technology to reveal detail matrices and prerequisites.
              </p>
            </div>
            
            {/* Search Input Filter */}
            <div className="relative group w-full md:w-80">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 group-focus-within:opacity-50 transition-opacity duration-300 blur-sm" />
              <div className="relative bg-[#0D1526] rounded-xl flex items-center border border-blue-500/10 px-3">
                <Search className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400" />
                <input
                  type="text"
                  placeholder="Search technologies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none py-3 px-2 text-xs text-white focus:outline-none placeholder-[#8899BB]/50"
                />
              </div>
            </div>
          </div>
        </header>

        {/* ── Grid with Floating Left Sidebar Filter ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 1. Left Sidebar menu (lg:col-span-3) */}
          <aside className="lg:col-span-3 bg-[#0A0F1E]/80 border border-blue-500/10 rounded-xl p-4 space-y-2 lg:sticky lg:top-24 z-10 backdrop-blur-md">
            <span className="text-[10px] font-mono font-bold text-[#8899BB]/50 uppercase tracking-widest block px-2 pb-2 border-b border-blue-500/5">
              Select Category
            </span>
            
            <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
              {domains.map((d) => {
                const isActive = activeDomain === d.slug && !searchQuery.trim();
                return (
                  <button
                    key={d.slug}
                    onClick={() => {
                      setSearchQuery(""); // Clear search to view learning path
                      setActiveDomain(d.slug);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-lg border text-xs font-mono tracking-wider transition-all duration-300 shrink-0 text-left cursor-pointer ${
                      isActive
                        ? "bg-[#2563EB]/15 border-blue-500 text-white font-bold"
                        : "bg-transparent border-transparent text-[#8899BB] hover:text-white hover:bg-[#0D1526]/50"
                    }`}
                  >
                    <span className="text-base select-none">{d.icon}</span>
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0D1526] border border-blue-500/5 text-blue-300 font-bold">
                      {d.tool_count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* 2. Main content area (lg:col-span-9) */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* If searching, show search results */}
            {searchResults ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono text-[#8899BB]">
                    SEARCH RESULTS FOR &quot;{searchQuery}&quot;
                  </h3>
                  <span className="text-xs font-mono text-blue-400 font-bold">{searchResults.length} FOUND</span>
                </div>
                
                {searchResults.length === 0 ? (
                  <div className="p-12 glass-panel rounded-2xl text-center font-mono text-xs text-[#8899BB]">
                    No monitored technologies match this lookup.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map((tool) => (
                      <ThreeDFlipCard key={tool.slug} tool={tool} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Else show learning path tiers
              <div className="space-y-8">
                
                {/* Entry solver / confusion resolver */}
                {learningPath && learningPath.entry && (
                  <div className="glass-panel p-5 rounded-xl border border-blue-500/10 flex items-start gap-4 bg-[#0D1526]/30">
                    <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400 shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Recommended Entry Node</h4>
                      <p className="text-xs text-[#8899BB] leading-relaxed">
                        To master {currentDomainName}, StackRadar recommends starting with{" "}
                        <Link href={`/tools/${learningPath.entry}`} className="text-blue-400 font-bold hover:underline">
                          {learningPath.path[0]?.tools.find(t => t.slug === learningPath.entry)?.name || learningPath.entry}
                        </Link>
                        . Follow the sequential paths from Beginner to Advanced levels.
                      </p>
                    </div>
                  </div>
                )}

                {pathLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <span className="text-xs font-mono text-[#8899BB]/60">Recalculating vectors...</span>
                  </div>
                ) : learningPath ? (
                  <div className="space-y-12">
                    {learningPath.path.map((tier) => {
                      // Color theme depending on level
                      const isBeg = tier.level === "beginner";
                      const isInt = tier.level === "intermediate";
                      const bulletColor = isBeg ? "bg-emerald-500 shadow-emerald-500/40" : isInt ? "bg-amber-500 shadow-amber-500/40" : "bg-rose-500 shadow-rose-500/40";
                      
                      return (
                        <div key={tier.level} className="space-y-6">
                          
                          {/* Tier title */}
                          <div className="flex items-center gap-3 border-b border-blue-500/5 pb-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${bulletColor} shadow-md`} />
                            <h3 className="text-base font-bold font-display uppercase tracking-wider">{tier.label}</h3>
                            <span className="text-[10px] font-mono bg-[#0D1526] border border-blue-500/5 text-[#8899BB] px-2 py-0.5 rounded">
                              {tier.tools.length} technology nodes
                            </span>
                          </div>

                          {/* 3D Flip Card Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tier.tools.map((tierTool) => {
                              const fullTool = tools.find(t => t.slug === tierTool.slug);
                              if (!fullTool) return null;
                              
                              return (
                                <ThreeDFlipCard
                                  key={tierTool.slug}
                                  tool={fullTool}
                                  isEntry={tierTool.is_entry_point}
                                  parentSlug={tierTool.parent_slug}
                                />
                              );
                            })}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-[#8899BB]/50 text-xs font-mono border border-dashed border-blue-500/10 rounded-xl">
                    Select a domain to resolve learning sequence pathways.
                  </div>
                )}

              </div>
            )}

          </main>
        </div>

      </div>
    </DashboardShell>
  );
}

/* ─── Elevated 3D Flip Card Component ─── */
function ThreeDFlipCard({
  tool,
  isEntry = false,
  parentSlug = null
}: {
  tool: Tool;
  isEntry?: boolean;
  parentSlug?: string | null;
}) {
  const growthStr = tool.growth_pct >= 0 ? `+${tool.growth_pct.toFixed(1)}%` : `${tool.growth_pct.toFixed(1)}%`;
  const growthColor = tool.growth_pct >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="group [perspective:1000px] h-[190px] w-full cursor-pointer relative tool-score-card">
      <div className="relative h-full w-full rounded-2xl transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        
        {/* FRONT SIDE */}
        <div className="absolute inset-0 h-full w-full rounded-2xl border border-blue-500/10 bg-[#0D1526]/50 p-5 [backface-visibility:hidden] flex flex-col justify-between overflow-hidden shadow-lg">
          {/* Subtle inner grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 bg-[#0A0F1E] border border-blue-500/10 rounded-xl select-none group-hover:scale-105 transition-transform">
                {tool.icon}
              </span>
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors truncate max-w-[120px]">
                  {tool.name}
                </h4>
                <span className="text-[9px] font-mono text-[#8899BB] uppercase">{tool.category}</span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-lg font-black font-mono text-white">{tool.score}</span>
              <p className="text-[8px] font-mono text-[#8899BB]/50 uppercase tracking-widest leading-none">score</p>
            </div>
          </div>

          {/* Indicators details */}
          <div className="flex items-end justify-between border-t border-blue-500/5 pt-3 relative z-10">
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#8899BB]">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1)}k` : tool.stars}</span>
            </div>
            
            {isEntry && (
              <span className="px-2 py-0.5 bg-blue-600 rounded text-[8px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <GraduationCap className="w-3 h-3" /> ENTRY NODE
              </span>
            )}

            <span className="text-[9px] font-mono text-blue-400 group-hover:text-white flex items-center gap-0.5">
              Hover to Flip <ArrowRight className="w-2.5 h-2.5 animate-pulse" />
            </span>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 h-full w-full rounded-2xl border border-blue-400/20 bg-[#0A0F1E] p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-blue-500/5 to-transparent pointer-events-none" />
          
          <div className="space-y-2">
            <h5 className="font-bold text-xs text-white uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-blue-500/5 pb-1">
              <Award className="w-3.5 h-3.5 text-blue-400" /> TELEMETRY METRIC
            </h5>
            <p className="text-[10px] text-[#8899BB] leading-relaxed line-clamp-3 font-sans font-light">
              {tool.description || "No signal summary provided. Tracking metrics show positive Adoption."}
            </p>
          </div>

          <div className="space-y-2">
            {/* Prerequisite and Growth */}
            <div className="flex justify-between font-mono text-[9px] text-[#8899BB]/70">
              <span>GROWTH SPEED: <b className={growthColor}>{growthStr}</b></span>
              {parentSlug ? (
                <span>REQ: <b className="text-indigo-400 capitalize">{parentSlug}</b></span>
              ) : (
                <span>NO PRE-REQ</span>
              )}
            </div>

            {/* Link details CTA */}
            <Link
              href={`/tools/${tool.slug}`}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 transition-colors font-mono text-[10px] font-bold text-white uppercase text-center"
            >
              <Eye className="w-3 h-3" /> ANALYZE MATRIX
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
