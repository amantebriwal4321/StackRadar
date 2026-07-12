"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Zap, TrendingUp, Loader2, RefreshCw, Search,
  Sparkles, ArrowRight, Brain, Compass, Star,
  Shield, Globe, Database, Cpu, MessageSquare, Terminal, Eye,
  Layers, Code2, ChevronRight, Activity, BarChart3, Rocket,
  Users, BookOpen, GitBranch, Flame
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

import {
  type Tool,
  type DomainSummary,
  type Overview,
  fetchTools,
  fetchDomains,
  fetchTopMovers,
  fetchOverview
} from "@/data/trends";

import LiveConstellation from "@/components/3d/LiveConstellation";
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

/* ─── Animated Counter ─── */
function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (end - start) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

/* ─── Decision Prompts ─── */
const decisionPrompts = [
  { icon: "🛠️", label: "What should I build?", query: "build ideas" },
  { icon: "📚", label: "What should I learn?", query: "learning" },
  { icon: "🚀", label: "Startup opportunities", query: "startup" },
  { icon: "📈", label: "What's trending?", query: "trending" },
];

/* ─── Process Steps ─── */
const processSteps = [
  {
    num: "01",
    title: "Ingest Stream",
    desc: "We crawl GitHub, Reddit, HN, and developer newsletters continuously to capture discussion peaks and code metrics.",
    icon: Database,
    gradient: "from-violet-500 to-cyan-500",
    color: "text-violet-400",
  },
  {
    num: "02",
    title: "Analyze & NLP",
    desc: "Our models parse discussions to assign positive/negative sentiment labels and classify tool relevance.",
    icon: Brain,
    gradient: "from-cyan-500 to-pink-500",
    color: "text-cyan-400",
  },
  {
    num: "03",
    title: "Score Momentum",
    desc: "Technologies are ranked dynamically by delta change rates, star ratios, and category concentration percentiles.",
    icon: Activity,
    gradient: "from-purple-500 to-cyan-500",
    color: "text-purple-400",
  },
  {
    num: "04",
    title: "Deliver Roadmap",
    desc: "We compile sequence learning paths and detailed tech profiles for developers to construct decisions.",
    icon: Rocket,
    gradient: "from-cyan-500 to-emerald-500",
    color: "text-cyan-400",
  },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ─── React States ─── */
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [tools, setTools] = useState<Tool[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [topGainers, setTopGainers] = useState<Tool[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Interactive Comparison Framework State — index into the real top-3 tools
  const [compareIdx, setCompareIdx] = useState(0);

  // Mouse parallax for hero
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  /* ─── Fetch Home Page Data ─── */
  useEffect(() => {
    async function initHomePage() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Parallel fetching
        const [allTools, domainList, movers, overviewData] = await Promise.all([
          fetchTools(),
          fetchDomains(),
          fetchTopMovers(6),
          fetchOverview()
        ]);

        setTools(allTools);
        setDomains(domainList);
        setTopGainers(movers);
        setOverview(overviewData);
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

    // Hero title line-by-line reveal
    tl.fromTo(
      ".hero-line",
      { y: 100, opacity: 0, rotateX: -15 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1.1, stagger: 0.12, ease: "power4.out" },
      0.3
    );

    // Hero description & components
    tl.fromTo(
      ".hero-anim-item",
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power3.out" },
      "-=0.6"
    );

    // 3D sphere area entrance
    tl.fromTo(
      ".sphere-container",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.2, ease: "power3.out" },
      "-=0.8"
    );

    // Scroll-triggered section reveals
    gsap.utils.toArray<HTMLElement>(".section-reveal").forEach((el) => {
      gsap.fromTo(el,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          }
        }
      );
    });

    // Stagger card reveals
    gsap.utils.toArray<HTMLElement>(".stagger-grid-trigger").forEach((trigger) => {
      gsap.fromTo(
        trigger.querySelectorAll(".stagger-card"),
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger,
            start: "top 80%",
          }
        }
      );
    });

    // Process steps timeline
    gsap.fromTo(
      ".process-step",
      { y: 40, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".process-section",
          start: "top 75%",
        }
      }
    );

    // CTA section
    gsap.fromTo(
      ".cta-section",
      { y: 60, opacity: 0, scale: 0.96 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top 85%",
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

  // Comparative split metrics — the real top-3 tools by momentum score
  const compareTools = useMemo(() => {
    return [...tools].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [tools]);

  const activeCompare = compareTools[compareIdx] ?? compareTools[0];

  // Derive four honest metrics from real fields (0–100 each)
  const compareMetrics = useMemo(() => {
    if (!activeCompare) return [];
    const t = activeCompare;
    const starIndex = t.stars > 0
      ? Math.min(100, (Math.log(t.stars + 1) / Math.log(300000)) * 100)
      : 0;
    const categoryStrength = t.category_size > 1
      ? Math.round((1 - (t.rank_in_category - 1) / (t.category_size - 1)) * 100)
      : 100;
    const growthMetric = Math.max(0, Math.min(100, 50 + t.growth_pct));
    return [
      { label: "MOMENTUM SCORE", value: Math.round(t.score), suffix: "/100", gradient: "from-violet-500 to-cyan-500" },
      { label: "GLOBAL PERCENTILE", value: Math.round(t.percentile), suffix: "%", gradient: "from-cyan-500 to-cyan-500" },
      { label: "GITHUB STAR INDEX", value: Math.round(starIndex), suffix: "/100", gradient: "from-cyan-500 to-emerald-500" },
      { label: "CATEGORY STANDING", value: categoryStrength, suffix: "%", gradient: "from-emerald-500 to-violet-500" },
    ];
  }, [activeCompare]);

  // Stats for the hero area — all real, sourced from /overview
  const heroStats = useMemo(() => ({
    tools: overview?.tools_tracked || tools.length || 0,
    stars: overview?.total_stars || 0,
    sources: overview?.source_count || 5,
    domains: overview?.domains || domains.length || 0,
  }), [overview, tools, domains]);

  return (
    <DashboardShell fullWidth>
      <div ref={containerRef} className="relative pb-24">

      {/* ══════════════════════════════════════════
          SECTION 1: HERO & 3D SPHERE CENTERPIECE
         ══════════════════════════════════════════ */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-16 min-h-[90vh] flex items-center">
        
        {/* Hero background gradient mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-7 space-y-8 z-10 text-left">
            
            {/* Real-time Indicator Pill */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="hero-anim-item inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-violet-500/20 bg-violet-500/[0.06] text-xs font-mono font-bold text-violet-400 tracking-wider"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </span>
              REAL-TIME WEB TELEMETRY
              <span className="w-px h-3 bg-violet-500/30" />
              <span className="text-violet-300/60">v2.0</span>
            </motion.div>

            {/* Split Header Titles */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight leading-[0.92] font-display" style={{ perspective: "1000px" }}>
              <span className="block overflow-hidden">
                <span className="hero-line block">The Internet</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line block">is talking.</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line block text-shimmer">
                  Are you listening?
                </span>
              </span>
            </h1>

            {/* Paragraph Subhead */}
            <p className="hero-anim-item text-base md:text-lg text-[#A1A1AA] max-w-xl leading-relaxed font-sans font-light">
              StackRadar continuously listens to developer telemetry across GitHub, Reddit, HackerNews, and forums to map trends, developer sentiment, and startup opportunities before they break out.
            </p>

            {/* Decision Engine / Search Input */}
            <div className="hero-anim-item space-y-4 max-w-2xl">
              
              {/* Interactive Search Box */}
              <div className="relative group">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 via-cyan-500 to-cyan-500 rounded-2xl opacity-0 group-focus-within:opacity-40 transition-opacity duration-700 blur-md" />
                <div className="relative bg-[#111113]/90 backdrop-blur-xl rounded-2xl flex items-center border border-violet-500/10 group-focus-within:border-violet-500/30 transition-colors duration-500">
                  <Search className="w-5 h-5 ml-5 text-slate-500 group-focus-within:text-violet-400 transition-colors duration-300" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search technologies, trends, opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none py-4.5 px-3 text-sm focus:outline-none text-[#FAFAFA] placeholder-[#A1A1AA]/50 font-sans"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mr-4 text-xs font-mono text-[#A1A1AA] hover:text-white px-2.5 py-1 rounded-lg bg-[#18181B] border border-violet-500/10 transition-colors cursor-pointer"
                    >
                      CLEAR
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-flex mr-4 h-7 select-none items-center gap-0.5 rounded-lg border border-[#A78BFA]/15 bg-[#18181B] px-2.5 font-mono text-[10px] font-bold text-[#A1A1AA]">
                      /
                    </kbd>
                  )}
                </div>
              </div>

              {/* Suggestion Prompt pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-[#A1A1AA]/50 font-mono py-1.5 flex items-center">Try:</span>
                {decisionPrompts.map((prompt) => (
                  <button
                    key={prompt.query}
                    onClick={() => handlePromptClick(prompt.query)}
                    className="px-3.5 py-1.5 rounded-full border border-violet-500/8 bg-[#111113]/60 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-violet-400/30 hover:bg-[#18181B] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer backdrop-blur-sm"
                  >
                    <span className="mr-1">{prompt.icon}</span> {prompt.label}
                  </button>
                ))}
              </div>

            </div>

            {/* Mini Stats Row */}
            <div className="hero-anim-item flex flex-wrap gap-6 pt-4">
              {[
                { label: "Technologies Tracked", value: heroStats.tools, suffix: "" },
                { label: "GitHub Stars Indexed", value: heroStats.stars, prefix: "" },
                { label: "Live Signal Sources", value: heroStats.sources, suffix: "" },
              ].map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="text-2xl font-black font-mono text-[#FAFAFA]">
                    {!isLoading && <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />}
                    {isLoading && <span className="text-[#A1A1AA]/40">—</span>}
                  </div>
                  <div className="text-[10px] font-mono text-[#A1A1AA]/60 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Interactive 3D Sphere */}
          <motion.div 
            className="lg:col-span-5 h-[350px] md:h-[520px] flex items-center justify-center relative sphere-container"
            style={{ x: springX, y: springY }}
          >
            <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0">
              <LiveConstellation tools={tools} />
            </div>
            
            {/* Visual Floating Telemetry Tags around sphere */}
            <motion.div
              className="absolute top-8 left-8 px-3 py-1.5 bg-[#111113]/80 border border-violet-500/15 backdrop-blur-md rounded-lg text-[10px] font-mono text-violet-400 select-none"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-violet-400" />
                {heroStats.tools} NODES LIVE
              </span>
            </motion.div>
            <motion.div
              className="absolute bottom-14 right-4 px-3 py-1.5 bg-[#111113]/80 border border-cyan-500/15 backdrop-blur-md rounded-lg text-[10px] font-mono text-cyan-400 select-none"
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                {topGainers[0] ? `${topGainers[0].name.toUpperCase()} RISING` : "MOMENTUM MAP"}
              </span>
            </motion.div>
            <motion.div
              className="absolute top-1/2 right-0 px-3 py-1.5 bg-[#111113]/80 border border-cyan-500/15 backdrop-blur-md rounded-lg text-[10px] font-mono text-cyan-400 select-none"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
            >
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                {heroStats.stars >= 1000 ? `${(heroStats.stars / 1_000_000).toFixed(2)}M ★ INDEXED` : "LIVE INDEX"}
              </span>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2: INFINITE SCROLLING TICKERS
         ══════════════════════════════════════════ */}
      <section className="w-full py-5 border-y border-violet-500/8 bg-[#111113]/30 overflow-hidden space-y-3">
        
        {/* Track 1: Scrolls Left */}
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-left flex items-center gap-16 shrink-0">
            {dynamicSignalsLeft.concat(dynamicSignalsLeft).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-3 font-mono text-xs text-[#A1A1AA]/80 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60" />
                {signal}
              </span>
            ))}
          </div>
        </div>

        {/* Track 2: Scrolls Right */}
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-right flex items-center gap-16 shrink-0">
            {dynamicSignalsRight.concat(dynamicSignalsRight).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-3 font-mono text-xs text-cyan-300/60 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
                {signal}
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* ══════════════════════════════════════════
          SECTION 3: DOMAIN CATEGORIES GRID
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-24 stagger-grid-trigger section-reveal">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 font-mono text-xs text-violet-400 font-bold uppercase tracking-widest">
              <div className="w-8 h-[2px] bg-gradient-to-r from-violet-500 to-transparent" />
              <Cpu className="w-4 h-4" /> Domains of Intelligence
            </div>
            <h2 className="text-3xl md:text-5xl font-black font-display tracking-tight">
              Aggregated Tech Domains
            </h2>
          </div>
          <p className="text-sm text-[#A1A1AA] max-w-md font-sans font-light leading-relaxed">
            Developer conversations categorized into core segments. We analyze and score each domain recursively.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="h-52 rounded-2xl border border-violet-500/5 bg-[#18181B]/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains.map((domain, i) => {
              const scoreColor = domain.score >= 80 ? "text-emerald-400" : domain.score >= 60 ? "text-amber-400" : "text-rose-400";
              const scoreBg = domain.score >= 80 ? "bg-emerald-500/10 border-emerald-500/15" : domain.score >= 60 ? "bg-amber-500/10 border-amber-500/15" : "bg-rose-500/10 border-rose-500/15";
              const scoreBarColor = domain.score >= 80 ? "bg-emerald-500" : domain.score >= 60 ? "bg-amber-500" : "bg-rose-500";
              
              return (
                <motion.div
                  key={domain.slug}
                  className="stagger-card group block p-6 rounded-2xl border border-violet-500/8 bg-[#18181B]/30 hover:bg-[#18181B]/60 hover:border-violet-400/20 transition-all duration-500 relative overflow-hidden card-hover-glow"
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {/* Inner gradient reveal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Header */}
                  <div className="flex items-start justify-between relative mb-5">
                    <div className="p-3 bg-[#111113]/80 border border-violet-500/8 rounded-xl group-hover:border-violet-400/25 group-hover:scale-105 transition-all duration-300">
                      <span className="text-2xl">{domain.icon || "📂"}</span>
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${scoreBg} ${scoreColor}`}>
                      {domain.score}
                    </div>
                  </div>

                  {/* Body */}
                  <h3 className="text-lg font-bold font-display group-hover:text-violet-400 transition-colors duration-300 mb-2">
                    {domain.name}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed mb-6 font-light">
                    {domain.summary}
                  </p>

                  {/* Score progress bar */}
                  <div className="mb-4">
                    <div className="h-1 w-full bg-[#111113] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${scoreBarColor} rounded-full`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${domain.score}%` }}
                        transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }}
                        viewport={{ once: true }}
                      />
                    </div>
                  </div>

                  {/* Footer stats */}
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#A1A1AA]/60">
                    <span className="uppercase">{domain.stage} adoption</span>
                    <span className="text-violet-400/70 group-hover:text-violet-400 transition-colors">{domain.tool_count} technologies</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </section>

      {/* ─── Glow Line Separator ─── */}
      <div className="glow-line max-w-4xl mx-auto" />

      {/* ══════════════════════════════════════════
          SECTION 4: HORIZONTAL TRENDING MOVERS
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative section-reveal">
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#09090B] to-transparent pointer-events-none z-10 hidden md:block" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#09090B] to-transparent pointer-events-none z-10 hidden md:block" />
        
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 font-mono text-xs text-violet-400 font-bold uppercase tracking-widest">
              <div className="w-8 h-[2px] bg-gradient-to-r from-violet-500 to-transparent" />
              <Flame className="w-4 h-4" /> Momentum Delta
            </div>
            <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight">
              Trending Movers
            </h2>
          </div>
          <div className="md:ml-auto">
            <span className="text-[10px] font-mono text-violet-400/60 uppercase tracking-wider font-semibold">
              Fastest Growing This Cycle
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="h-40 rounded-2xl border border-violet-500/5 bg-[#18181B]/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory relative z-20">
            {topGainers.map((tool, i) => (
              <motion.div
                key={tool.slug}
                className="tool-score-card snap-start shrink-0 w-full sm:w-[340px] p-6 rounded-2xl border border-violet-500/8 bg-[#18181B]/30 hover:border-cyan-400/25 transition-all duration-500 relative group card-hover-glow"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                {/* Gradient inner */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
                
                <div className="flex items-center gap-4 mb-5 relative">
                  <span className="text-3xl p-2.5 bg-[#111113]/80 border border-violet-500/8 rounded-xl group-hover:border-cyan-500/25 group-hover:scale-105 transition-all duration-300">
                    {tool.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-[#FAFAFA] group-hover:text-violet-400 transition-colors duration-300">
                      {tool.name}
                    </h3>
                    <p className="text-[10px] text-[#A1A1AA]/60 font-mono">{tool.category}</p>
                  </div>
                  
                  <div className="ml-auto text-right">
                    <span className="text-2xl font-black font-mono text-[#FAFAFA]">{tool.score}</span>
                    <p className="text-[8px] font-mono text-[#A1A1AA]/50 uppercase tracking-wider">score</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-violet-500/5 pt-4 font-mono text-xs relative">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{tool.growth_pct.toFixed(1)}%
                  </div>
                  
                  <div className="flex items-center gap-1 text-[#A1A1AA]/60 text-[10px]">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(0)}k` : tool.stars}
                  </div>

                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-[10px] text-violet-400/70 group-hover:text-violet-400 transition-all flex items-center gap-0.5 hover:underline"
                  >
                    Explore <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Glow Line Separator ─── */}
      <div className="glow-line max-w-4xl mx-auto" />

      {/* ══════════════════════════════════════════
          SECTION 5: REACT VS VUE VS BUN SPLIT
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-24 section-reveal">
        <div className="glass-panel rounded-3xl p-8 md:p-10 border border-violet-500/8 relative overflow-hidden">
          
          {/* Ambient background mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.04),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,rgba(37,99,235,0.04),transparent_60%)] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            
            {/* Description column */}
            <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-xs text-cyan-400 font-bold uppercase tracking-widest mb-3">
                  <div className="w-8 h-[2px] bg-gradient-to-r from-cyan-500 to-transparent" />
                  Interactive Telemetry
                </div>
                <h3 className="text-3xl md:text-4xl font-black font-display tracking-tight mb-4">
                  Momentum<br/>
                  <span className="text-shimmer">Head-to-Head</span>
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed font-sans font-light">
                  The three highest-momentum technologies on StackRadar right now, scored live on GitHub presence, global percentile, and category standing — straight from the index.
                </p>
              </div>

              {/* Selection Tabs — real top-3 tools */}
              <div className="space-y-2.5">
                {compareTools.map((tech, idx) => (
                  <button
                    key={tech.slug}
                    onClick={() => setCompareIdx(idx)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border font-mono text-xs uppercase tracking-wider text-left transition-all duration-400 cursor-pointer ${
                      compareIdx === idx
                        ? "bg-[#A78BFA]/12 border-violet-500/40 text-white shadow-lg shadow-violet-500/5 font-bold"
                        : "bg-[#111113]/40 border-violet-500/5 text-[#A1A1AA] hover:text-white hover:border-violet-500/15"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{tech.icon}</span> {tech.name}
                      <span className="text-[9px] text-[#A1A1AA]/50">#{tech.rank}</span>
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-all duration-300 ${compareIdx === idx ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics column */}
            <div className="lg:col-span-7 bg-[#111113]/60 border border-violet-500/8 rounded-2xl p-6 md:p-8 flex flex-col justify-between relative">
              
              <div className="space-y-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-violet-500/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#A1A1AA]/50">ACTIVE TRACKING</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={activeCompare?.slug}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-xl font-bold font-mono text-violet-400 flex items-center gap-2"
                    >
                      <span className="text-2xl">{activeCompare?.icon}</span>
                      {activeCompare?.name}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Progress bars — real derived metrics */}
                <div className="space-y-5 pt-2">
                  {compareMetrics.map((metric) => (
                    <div key={metric.label} className="space-y-2">
                      <div className="flex justify-between font-mono text-[10px] text-[#A1A1AA]/70">
                        <span>{metric.label}</span>
                        <motion.span
                          className="font-bold text-white"
                          key={`${activeCompare?.slug}-${metric.label}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {metric.value}{metric.suffix}
                        </motion.span>
                      </div>
                      <div className="h-2 w-full bg-[#18181B] rounded-full overflow-hidden border border-violet-500/5">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${metric.gradient} rounded-full`}
                          key={`bar-${activeCompare?.slug}-${metric.label}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.value}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Bottom Summary — real backend recommendation */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCompare?.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-8 p-4 rounded-xl bg-[#18181B]/40 border border-violet-500/5"
                >
                  <span className="text-[10px] font-mono text-cyan-400/70 block mb-1.5">SIGNAL ANALYSIS</span>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed font-light font-mono">
                    {activeCompare?.recommendation || `${activeCompare?.name} is tracked live across ${heroStats.sources} developer signal sources.`}
                  </p>
                </motion.div>
              </AnimatePresence>

            </div>

          </div>

        </div>
      </section>

      {/* ─── Divider Ticker ─── */}
      <section className="w-full py-4 border-y border-violet-500/5 bg-[#111113]/20 overflow-hidden">
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-left flex items-center gap-16 shrink-0">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="inline-flex items-center gap-4 font-mono text-[10px] text-[#A1A1AA]/30 tracking-widest uppercase">
                <span>{heroStats.tools} TECHNOLOGIES TRACKED</span>
                <span>•</span>
                <span>{heroStats.stars.toLocaleString()} GITHUB STARS INDEXED</span>
                <span>•</span>
                <span>{heroStats.domains} INTELLIGENCE DOMAINS</span>
                <span>•</span>
                <span>{heroStats.sources} LIVE SIGNAL SOURCES</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 6: HOW-IT-WORKS / PROCESS FLOW
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-24 process-section">
        
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4 section-reveal">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-violet-400 font-bold uppercase tracking-widest">
            <Shield className="w-4 h-4" /> Telemetry Processing Pipeline
          </div>
          <h2 className="text-3xl md:text-5xl font-black font-display leading-tight">
            How StackRadar Scrapes<br/>
            <span className="text-shimmer">the Tech Ecosystem</span>
          </h2>
          <p className="text-sm text-[#A1A1AA] leading-relaxed font-sans font-light max-w-lg mx-auto">
            We map community trends through recursive cycles of data ingestion, classification, and prediction models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          {/* Desktop connector line */}
          <div className="absolute top-20 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-violet-500/15 to-transparent z-0 hidden lg:block" />

          {processSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                className="process-step relative z-10 p-6 rounded-2xl border border-violet-500/8 bg-[#18181B]/25 hover:bg-[#18181B]/50 transition-all duration-500 group card-hover-glow"
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {/* Step number badge */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg shadow-violet-500/10 mb-5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Step number */}
                <div className="text-[10px] font-mono text-violet-400/40 mb-2 tracking-widest">STEP {step.num}</div>
                
                <h3 className="text-lg font-bold font-display group-hover:text-violet-400 transition-colors duration-300 mb-3">
                  {step.title}
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed font-light">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </section>

      {/* ─── Glow Line Separator ─── */}
      <div className="glow-line max-w-4xl mx-auto" />

      {/* ══════════════════════════════════════════
          SECTION 7: CTA FOOTER WITH RADAR
         ══════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-24 cta-section">
        <div className="glass-panel-glow rounded-3xl p-10 md:p-14 text-center relative overflow-hidden border border-violet-500/15 bg-[#18181B]/70">
          
          {/* Radar SVG Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.1] pointer-events-none select-none">
            <svg width="600" height="600" viewBox="0 0 600 600" fill="none" className="text-violet-500">
              <circle cx="300" cy="300" r="280" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
              <circle cx="300" cy="300" r="200" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="300" cy="300" r="120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
              <circle cx="300" cy="300" r="60" stroke="currentColor" strokeWidth="0.5" />
              
              <g className="origin-center animate-[spin_12s_linear_infinite]">
                <line x1="300" y1="300" x2="300" y2="20" stroke="currentColor" strokeWidth="1.5" />
                <path d="M 300,20 A 280,280 0 0,0 102,102 L 300,300 Z" fill="url(#radar-sweep)" opacity="0.4" />
              </g>
              
              <defs>
                <radialGradient id="radar-sweep" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="w-10 h-10 mx-auto text-violet-400 mb-6" />
          </motion.div>
          
          <h3 className="text-3xl md:text-5xl font-black font-display tracking-tight max-w-2xl mx-auto leading-tight mb-4">
            Dive Deeper Into The<br/>
            <span className="text-shimmer">Technology Universe</span>
          </h3>
          
          <p className="text-sm md:text-base text-[#A1A1AA] max-w-lg mx-auto leading-relaxed mb-10 font-light">
            Compare languages, analyze user sentiments, and explore sequential learning roadmaps built from developer behaviors.
          </p>

          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <Link
              href="/explore"
              className="btn-primary text-sm py-3 px-7 rounded-2xl flex items-center gap-2"
            >
              <Compass className="w-4 h-4" /> Explore Universe
            </Link>
            
            <Link
              href="/roadmaps"
              className="px-7 py-3 rounded-2xl border border-violet-500/15 bg-[#111113]/60 backdrop-blur-sm hover:bg-[#18181B] hover:border-violet-400/30 text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2 font-bold font-mono"
            >
              Start Learning <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIVE INTEGRATION FEED FOOTER
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-violet-500/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-mono text-[#A1A1AA]/50 uppercase tracking-wider">TELEMETRY STREAM</p>
              <h3 className="text-sm font-bold text-white">Live Parser Stream Active</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-mono text-[#A1A1AA]/50">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-violet-400/60" /> RSS NEWS</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-cyan-400/60" /> REDDIT</span>
            <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-cyan-400/60" /> GITHUB</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-400/60" /> HACKERNEWS</span>
          </div>

        </div>
      </section>

      </div>
    </DashboardShell>
  );
}

