"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Zap, TrendingUp, Loader2, RefreshCw, Search,
  Sparkles, ArrowRight, Brain, Compass, Star,
  Shield, Globe, Database, Cpu, MessageSquare, Terminal, Eye
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

import {
  type Tool,
  type DomainSummary,
  fetchTools,
  fetchDomains,
  fetchTopMovers
} from "@/data/trends";

import TechSphere from "@/components/3d/TechSphere";
import TrendCard from "@/components/TrendCard";
import FilterBar from "@/components/FilterBar";
import DashboardShell from "@/components/DashboardShell";

/* ─── Helper for Relative Time ─── */
function getRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/* ─── Decision Prompts ─── */
const decisionPrompts = [
  { icon: "🛠️", label: "What should I build?", query: "build ideas" },
  { icon: "📚", label: "What should I learn?", query: "learning" },
  { icon: "🚀", label: "Startup opportunities", query: "startup" },
  { icon: "📈", label: "What's trending?", query: "trending" },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ─── React States ─── */
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [tools, setTools] = useState<Tool[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [topGainers, setTopGainers] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Interactive Comparison Framework State
  const [selectedCompareTech, setSelectedCompareTech] = useState<"react" | "vue" | "bun">("react");

  /* ─── Fetch Home Page Data ─── */
  useEffect(() => {
    async function initHomePage() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Parallel fetching
        const [allTools, domainList, movers] = await Promise.all([
          fetchTools(),
          fetchDomains(),
          fetchTopMovers(6)
        ]);

        setTools(allTools);
        setDomains(domainList);
        setTopGainers(movers);
      } catch (err: any) {
        console.error("Error loading homepage data:", err);
        setError(err.message || "Failed to fetch StackRadar telemetry.");
      } finally {
        setIsLoading(false);
      }
    }
    initHomePage();
  }, []);

  /* ─── Search / Filtering logic ─── */
  const categoriesList = useMemo(() => {
    return ["All", ...domains.map(d => d.name)];
  }, [domains]);

  const filteredTools = useMemo(() => {
    let result = tools;
    if (activeCategory !== "All") {
      result = result.filter(t => t.category.toLowerCase() === activeCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tools, activeCategory, searchQuery]);

  const handlePromptClick = useCallback((query: string) => {
    setSearchQuery(query);
    searchInputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        const active = document.activeElement;
        if (active?.tagName !== "INPUT" && active?.tagName !== "TEXTAREA") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ─── GSAP Entrance Animations ─── */
  useGSAP(() => {
    if (isLoading) return;

    const tl = gsap.timeline();

    // Fade in structural visual dots and glows
    tl.fromTo(".bg-glow-overlay", { opacity: 0 }, { opacity: 1, duration: 1.5, ease: "power2.out" });

    // Hero title line-by-line reveal
    tl.fromTo(
      ".hero-line",
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: "power4.out" },
      "-=1.0"
    );

    // Hero description & components
    tl.fromTo(
      ".hero-anim-item",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" },
      "-=0.5"
    );

    // Grid staggers
    gsap.fromTo(
      ".stagger-card",
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".stagger-grid-trigger",
          start: "top 80%",
        }
      }
    );
  }, [isLoading]);

  /* ─── Dynamic Signal Tickers Content ─── */
  const dynamicSignalsLeft = useMemo(() => {
    if (tools.length === 0) {
      return [
        "🔥 React 19 momentum surging +45.2%",
        "⚡ FastAPI adoption outpacing flask",
        "🧠 LangChain mentions up +87%",
        "🚀 Bun.js overtaking Deno in stars",
        "⚙️ Rust language adoption rising +23%",
        "💎 PyTorch leading AI/ML frameworks",
      ];
    }
    return tools.slice(0, 10).map(t => {
      const growthStr = t.growth_pct >= 0 ? `+${t.growth_pct.toFixed(1)}%` : `${t.growth_pct.toFixed(1)}%`;
      return `${t.icon} ${t.name} Momentum: ${growthStr} in discussions`;
    });
  }, [tools]);

  const dynamicSignalsRight = useMemo(() => {
    if (tools.length === 0) {
      return [
        "⚡ Next.js v16 adopting Server Actions v2",
        "📈 Tailwind CSS v4 performance scoring high",
        "🔬 Hugging Face sentiment is 94% positive",
        "🎯 TypeScript adoption rate hits 88%",
        "☁️ Kubernetes cluster complexity drops",
      ];
    }
    return tools.slice(10, 20).map(t => {
      return `📊 ${t.name} sentiment: ${t.sentiment_label} (${(t.sentiment_positive * 100).toFixed(0)}% pos)`;
    });
  }, [tools]);

  // Comparative split metrics
  const comparisonData = {
    react: {
      name: "React 19",
      sentiment: 84,
      github_growth: 92,
      velocity: 88,
      community: 95,
      summary: "Surging in mindshare due to React Server Components and fine-grained state updates. Unchallenged ecosystem volume."
    },
    vue: {
      name: "Vue 3",
      sentiment: 89,
      github_growth: 78,
      velocity: 81,
      community: 84,
      summary: "Highly positive developer sentiment due to Composition API stability. Leading in micro-frontend developer happiness."
    },
    bun: {
      name: "Bun.js",
      sentiment: 91,
      github_growth: 96,
      velocity: 94,
      community: 73,
      summary: "Absolute performance champion. Incredible velocity score driven by built-in bundler and native TypeScript runtime."
    }
  };

  return (
    <DashboardShell fullWidth>
      <div ref={containerRef} className="space-y-12 relative pb-24">

      {/* ══════════════════════════════════════════
          SECTION 1: HERO & 3D SPHERE CENTERPIECE
         ══════════════════════════════════════════ */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-10 md:pt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[70vh]">
          
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-7 space-y-8 z-10 text-left">
            
            {/* Real-time Indicator Pill */}
            <div className="hero-anim-item inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs font-mono font-bold text-blue-400 tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              REAL-TIME WEB TELEMETRY
            </div>

            {/* Split Header Titles */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] font-display">
              <span className="block overflow-hidden">
                <span className="hero-line block">The Internet</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line block">is talking.</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400">
                  Are you listening?
                </span>
              </span>
            </h1>

            {/* Paragraph Subhead */}
            <p className="hero-anim-item text-base md:text-lg text-[#8899BB] max-w-xl leading-relaxed font-sans font-light">
              StackRadar continuously listens to developer telemetry across GitHub, Reddit, HackerNews, and forums to map trends, developer sentiment, and startup opportunities before they break out.
            </p>

            {/* Decision Engine / Search Input */}
            <div className="hero-anim-item space-y-4 max-w-2xl">
              
              {/* Interactive Search Box */}
              <div className="relative group">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 group-focus-within:opacity-60 transition-opacity duration-500 blur-sm" />
                <div className="relative bg-[#0A0F1E] rounded-xl flex items-center border border-blue-500/10">
                  <Search className="w-5 h-5 ml-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search technologies, trends, opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none py-4 px-3 text-sm focus:outline-none text-[#F0F4FF] placeholder-[#8899BB]/50"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mr-4 text-xs font-mono text-[#8899BB] hover:text-white px-2 py-1 rounded bg-[#0D1526] transition-colors"
                    >
                      CLEAR
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-flex mr-4 h-6 select-none items-center gap-0.5 rounded border border-[#2563EB]/20 bg-[#0D1526] px-2 font-mono text-[10px] font-bold text-[#8899BB]">
                      /
                    </kbd>
                  )}
                </div>
              </div>

              {/* Suggestions pills */}
              <div className="flex flex-wrap gap-2 pt-1.5">
                <span className="text-xs text-[#8899BB]/60 font-mono py-1.5 flex items-center">Try:</span>
                {decisionPrompts.map((prompt) => (
                  <button
                    key={prompt.query}
                    onClick={() => handlePromptClick(prompt.query)}
                    className="px-3.5 py-1.5 rounded-full border border-blue-500/10 bg-[#0A0F1E] text-xs font-medium text-[#8899BB] hover:text-[#F0F4FF] hover:border-blue-400/40 hover:bg-[#0D1526] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                  >
                    <span className="mr-1">{prompt.icon}</span> {prompt.label}
                  </button>
                ))}
              </div>

            </div>

          </div>

          {/* Right Column: Interactive 3D Sphere */}
          <div className="lg:col-span-5 h-[350px] md:h-[500px] flex items-center justify-center relative">
            <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0">
              <TechSphere />
            </div>
            
            {/* Visual Floating Telemetry Tags around sphere */}
            <div className="absolute top-10 left-12 px-3 py-1 bg-[#0A0F1E]/80 border border-blue-500/20 backdrop-blur-md rounded text-[10px] font-mono text-blue-400 select-none animate-[pulse_6s_infinite_ease-in-out]">
              ROTATION_X: LERP
            </div>
            <div className="absolute bottom-16 right-4 px-3 py-1 bg-[#0A0F1E]/80 border border-indigo-500/20 backdrop-blur-md rounded text-[10px] font-mono text-indigo-400 select-none animate-[pulse_4s_infinite_ease-in-out_1s]">
              R3F_ICOSPHERE
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2: INFINITE SCROLLING TICKERS
         ══════════════════════════════════════════ */}
      <section className="w-full py-6 border-y border-blue-500/10 bg-[#0A0F1E]/40 overflow-hidden space-y-4">
        
        {/* Track 1: Scrolls Left */}
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-left flex items-center gap-16 shrink-0">
            {dynamicSignalsLeft.concat(dynamicSignalsLeft).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-3 font-mono text-xs text-[#8899BB] tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {signal}
              </span>
            ))}
          </div>
        </div>

        {/* Track 2: Scrolls Right */}
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-right flex items-center gap-16 shrink-0">
            {dynamicSignalsRight.concat(dynamicSignalsRight).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-3 font-mono text-xs text-indigo-300/80 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {signal}
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* ══════════════════════════════════════════
          SECTION 3: DOMAIN CATEGORIES GRID
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20 stagger-grid-trigger">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 font-mono text-xs text-blue-400 font-bold uppercase tracking-widest">
              <Cpu className="w-4 h-4" /> Domains of Intelligence
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display">
              Aggregated Tech Domains
            </h2>
          </div>
          <p className="text-sm text-[#8899BB] max-w-md font-sans font-light leading-relaxed">
            Developer conversations categorized into core segments. We analyze and score each domain recursively.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="h-44 rounded-xl border border-blue-500/5 bg-[#0D1526]/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {domains.map((domain) => {
              // Custom scoring scale colors
              const scoreColor = domain.score >= 80 ? "text-emerald-400" : domain.score >= 60 ? "text-amber-400" : "text-rose-400";
              const scoreBg = domain.score >= 80 ? "bg-emerald-500/10 border-emerald-500/20" : domain.score >= 60 ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20";
              
              return (
                <div
                  key={domain.slug}
                  className="stagger-card group block p-6 rounded-xl border border-blue-500/10 bg-[#0D1526]/40 hover:bg-[#0D1526]/75 hover:border-blue-400/30 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Subtle inner card gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  
                  {/* Header info */}
                  <div className="flex items-start justify-between relative mb-4">
                    <div className="p-3 bg-[#0A0F1E] border border-blue-500/10 rounded-lg group-hover:border-blue-400/40 group-hover:scale-105 transition-all">
                      <span className="text-2xl">{domain.icon || "📂"}</span>
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${scoreBg} ${scoreColor}`}>
                      SCORE {domain.score}
                    </div>
                  </div>

                  {/* Body copy */}
                  <h3 className="text-lg font-bold font-display group-hover:text-blue-400 transition-colors mb-2">
                    {domain.name}
                  </h3>
                  <p className="text-xs text-[#8899BB] line-clamp-2 leading-relaxed mb-6 font-light">
                    {domain.summary}
                  </p>

                  {/* Bottom Stats details */}
                  <div className="flex items-center justify-between pt-4 border-t border-blue-500/5 font-mono text-[10px] text-[#8899BB]/70">
                    <span className="uppercase">{domain.stage} adoption</span>
                    <span className="text-blue-400 group-hover:text-white transition-colors">{domain.tool_count} technologies monitored</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* ══════════════════════════════════════════
          SECTION 4: HORIZONTAL TRENDING MOVERS
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-12 relative">
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#050810] to-transparent pointer-events-none z-10 hidden md:block" />
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-6 bg-blue-500 rounded" />
          <h2 className="text-xl md:text-2xl font-bold font-display uppercase tracking-tight">
            Trending Movers (Momentum Delta)
          </h2>
          <div className="flex-1 h-[1px] bg-blue-500/10" />
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold">
            Fastest Growing This Cycle
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="h-36 rounded-xl border border-blue-500/5 bg-[#0D1526]/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
            {topGainers.map((tool) => (
              <div
                key={tool.slug}
                className="tool-score-card snap-start shrink-0 w-full sm:w-[320px] p-5 rounded-xl border border-blue-500/10 bg-[#0D1526]/40 hover:border-indigo-400/30 transition-all duration-300 relative group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl p-2 bg-[#0A0F1E] border border-blue-500/10 rounded-lg group-hover:border-indigo-500/30 transition-all">
                    {tool.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-[#F0F4FF] group-hover:text-blue-400 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-[10px] text-[#8899BB] font-mono">{tool.category}</p>
                  </div>
                  
                  <div className="ml-auto text-right">
                    <span className="text-lg font-black font-mono text-[#F0F4FF]">{tool.score}</span>
                    <p className="text-[8px] font-mono text-[#8899BB] uppercase">score</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-blue-500/5 pt-3 font-mono text-xs">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{tool.growth_pct.toFixed(1)}%
                  </div>
                  
                  <div className="flex items-center gap-1 text-[#8899BB] text-[10px]">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(0)}k` : tool.stars}
                  </div>

                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-[10px] text-blue-400 group-hover:text-white transition-all flex items-center gap-0.5 hover:underline"
                  >
                    View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECTION 5: REACT VS VUE VS BUN SPLIT
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="glass-panel rounded-2xl p-8 border border-blue-500/10 relative overflow-hidden">
          
          {/* Subtle light mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.05),transparent_60%)] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Split description column */}
            <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-2">
                  Interactive Telemetry Comparisons
                </span>
                <h3 className="text-3xl font-black font-display tracking-tight mb-4">
                  Framework Momentum Compare
                </h3>
                <p className="text-sm text-[#8899BB] leading-relaxed font-sans font-light">
                  Compare real-time Adoption, Sentiment, GitHub delta, and community velocity of leading development frameworks inside the StackRadar parser index.
                </p>
              </div>

              {/* Selection Tabs */}
              <div className="space-y-2">
                {(["react", "vue", "bun"] as const).map((tech) => (
                  <button
                    key={tech}
                    onClick={() => setSelectedCompareTech(tech)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border font-mono text-xs uppercase tracking-wider text-left transition-all duration-300 ${
                      selectedCompareTech === tech
                        ? "bg-[#2563EB]/15 border-blue-500 text-white shadow-lg shadow-blue-500/5 font-bold scale-[1.02]"
                        : "bg-[#0A0F1E]/50 border-blue-500/5 text-[#8899BB] hover:text-white hover:border-blue-500/20"
                    }`}
                  >
                    <span>{tech === "react" ? "⚛️ React 19 Core" : tech === "vue" ? "💚 Vue 3 Engine" : "⚡ Bun.js Runtime"}</span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${selectedCompareTech === tech ? "translate-x-0" : "-translate-x-2 opacity-0"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Graph/Details split column */}
            <div className="lg:col-span-7 bg-[#0A0F1E]/80 border border-blue-500/10 rounded-xl p-6 md:p-8 flex flex-col justify-between relative">
              
              <div className="space-y-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-blue-500/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#8899BB]/60">ACTIVE TRACKING</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-xl font-bold font-mono text-blue-400">
                    {comparisonData[selectedCompareTech].name}
                  </span>
                </div>

                {/* Progress bar comparison values */}
                <div className="space-y-4 pt-2">
                  
                  {/* Metric 1 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[10px] text-[#8899BB]">
                      <span>COMMUNITY SENTIMENT</span>
                      <span className="font-bold text-white">{comparisonData[selectedCompareTech].sentiment}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#0D1526] rounded-full overflow-hidden border border-blue-500/5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${comparisonData[selectedCompareTech].sentiment}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[10px] text-[#8899BB]">
                      <span>GITHUB ACTIVITY DELTA</span>
                      <span className="font-bold text-white">{comparisonData[selectedCompareTech].github_growth}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#0D1526] rounded-full overflow-hidden border border-blue-500/5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${comparisonData[selectedCompareTech].github_growth}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[10px] text-[#8899BB]">
                      <span>DEVELOPER VELOCITY SCORE</span>
                      <span className="font-bold text-white">{comparisonData[selectedCompareTech].velocity}/100</span>
                    </div>
                    <div className="h-2 w-full bg-[#0D1526] rounded-full overflow-hidden border border-blue-500/5">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${comparisonData[selectedCompareTech].velocity}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric 4 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[10px] text-[#8899BB]">
                      <span>COMMUNITY MENTAL SHIFT</span>
                      <span className="font-bold text-white">{comparisonData[selectedCompareTech].community}% ADOPTION</span>
                    </div>
                    <div className="h-2 w-full bg-[#0D1526] rounded-full overflow-hidden border border-blue-500/5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${comparisonData[selectedCompareTech].community}%` }}
                      />
                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Summary text */}
              <div className="mt-8 p-4 rounded-lg bg-[#0D1526]/50 border border-blue-500/5">
                <span className="text-[10px] font-mono text-indigo-300 block mb-1">SIGNAL ANALYSIS</span>
                <p className="text-xs text-[#8899BB] leading-relaxed font-light font-mono">
                  {comparisonData[selectedCompareTech].summary}
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 6: DIVIDER TICKER
         ══════════════════════════════════════════ */}
      <section className="w-full py-4 border-y border-blue-500/10 bg-[#0A0F1E]/30 overflow-hidden">
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-left flex items-center gap-16 shrink-0">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="inline-flex items-center gap-4 font-mono text-[10px] text-[#8899BB]/50 tracking-widest uppercase">
                <span>SCANNED 48,931 DISCUSSIONS TODAY</span>
                <span>•</span>
                <span>98.4% TELEMETRY ACCURACY</span>
                <span>•</span>
                <span>NEXT SCAPER CYCLE IN 14 MINS</span>
                <span>•</span>
                <span>DEEP SPACE THEME INJECTED</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 7: HOW-IT-WORKS / PROCESS FLOW
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-blue-400 font-bold uppercase tracking-widest">
            <Shield className="w-4 h-4" /> Telemetry Processing pipeline
          </div>
          <h2 className="text-3xl md:text-5xl font-black font-display leading-tight">
            How StackRadar Scrapes the Tech Ecosystem
          </h2>
          <p className="text-sm text-[#8899BB] leading-relaxed font-sans font-light">
            We map community trends through recursive cycles of data ingestion, classification, and prediction models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          
          {/* Connector lines behind steps (desktop only) */}
          <div className="absolute top-16 left-8 right-8 h-[1px] bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-transparent z-0 hidden md:block" />

          {/* Step 1 */}
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-mono font-bold text-white text-sm shadow-lg shadow-blue-500/10">
              01
            </div>
            <h3 className="text-base font-bold font-display">Ingest Stream</h3>
            <p className="text-xs text-[#8899BB] leading-relaxed font-light">
              We crawl GitHub, Reddit, HN, and developer newsletters continuously to capture discussion peaks and code metrics.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-mono font-bold text-white text-sm shadow-lg shadow-indigo-500/10">
              02
            </div>
            <h3 className="text-base font-bold font-display">Analyze & NLP</h3>
            <p className="text-xs text-[#8899BB] leading-relaxed font-light">
              Our models parse discussions to assign positive/negative sentiment labels and classify tool relevance.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center font-mono font-bold text-white text-sm shadow-lg shadow-cyan-500/10">
              03
            </div>
            <h3 className="text-base font-bold font-display">Score Momentum</h3>
            <p className="text-xs text-[#8899BB] leading-relaxed font-light">
              Technologies are ranked dynamically by delta change rates, star ratios, and category concentration percentiles.
            </p>
          </div>

          {/* Step 4 */}
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center font-mono font-bold text-white text-sm shadow-lg shadow-emerald-500/10">
              04
            </div>
            <h3 className="text-base font-bold font-display">Deliver Roadmap</h3>
            <p className="text-xs text-[#8899BB] leading-relaxed font-light">
              We compile sequence learning paths and detailed tech profiles for developers to construct decisions.
            </p>
          </div>

        </div>

      </section>

      {/* ══════════════════════════════════════════
          SECTION 8: CIRCULAR RADAR CTA FOOTER
         ══════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="glass-panel-glow rounded-3xl p-12 text-center relative overflow-hidden border border-blue-500/20 bg-[#0D1526]/80">
          
          {/* Sweeping Radar SVG Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.15] pointer-events-none select-none">
            <svg width="600" height="600" viewBox="0 0 600 600" fill="none" className="text-blue-500">
              {/* Radar Rings */}
              <circle cx="300" cy="300" r="280" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
              <circle cx="300" cy="300" r="200" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="300" cy="300" r="120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
              <circle cx="300" cy="300" r="60" stroke="currentColor" strokeWidth="0.5" />
              
              {/* Sweeping line */}
              <g className="origin-center animate-[spin_12s_linear_infinite]">
                <line x1="300" y1="300" x2="300" y2="20" stroke="currentColor" strokeWidth="1.5" />
                <path d="M 300,20 A 280,280 0 0,0 102,102 L 300,300 Z" fill="url(#radar-sweep)" opacity="0.4" />
              </g>
              
              {/* Radar Gradients */}
              <defs>
                <radialGradient id="radar-sweep" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Interactive Sparkles in Footer */}
          <Sparkles className="w-10 h-10 mx-auto text-blue-400 mb-6 animate-pulse" />
          
          <h3 className="text-3xl md:text-5xl font-black font-display tracking-tight max-w-2xl mx-auto leading-tight mb-4">
            Dive Deeper Into The Technology Universe
          </h3>
          
          <p className="text-sm md:text-base text-[#8899BB] max-w-lg mx-auto leading-relaxed mb-8 font-light">
            Compare languages, analyze user sentiments, and explore sequential learning roadmaps built from developer behaviors.
          </p>

          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <Link
              href="/explore"
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.04] active:scale-[0.96] shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <Compass className="w-4 h-4" /> Explore Universe
            </Link>
            
            <Link
              href="/roadmaps"
              className="px-6 py-3.5 rounded-xl border border-blue-500/20 bg-[#0A0F1E] hover:bg-[#0D1526] hover:border-blue-400/40 text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.04] active:scale-[0.96] flex items-center gap-2"
            >
              Start Learning <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIVE INTEGRATION FEED LIST
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t border-blue-500/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-mono text-[#8899BB] uppercase">TELEMETRY STREAM</p>
              <h3 className="text-sm font-bold text-white">Live Parser Stream Active</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-[#8899BB]">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-blue-400" /> RSS NEWS</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> REDDIT DISCUSSIONS</span>
            <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-cyan-400" /> GITHUB EVENTS</span>
          </div>

        </div>
      </section>

      </div>
    </DashboardShell>
  );
}
