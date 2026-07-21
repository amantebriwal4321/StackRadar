"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap, TrendingUp, Loader2, RefreshCw,
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
import DashboardShell from "@/components/DashboardShell";
import ContinueLearning from "@/components/ContinueLearning";

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

/* ─── Console questions ─── each one routes to the page that answers it ─── */
const decisionPrompts = [
  { icon: "🧭", label: "What should I learn next?", href: "/explore" },
  { icon: "🧠", label: "Is AI/ML worth it right now?", href: "/roadmaps" },
  { icon: "📈", label: "What's trending this week?", href: "/trends" },
  { icon: "⚖️", label: "Compare two technologies", href: "/compare" },
  { icon: "🚀", label: "Where are the startup gaps?", href: "/trends" },
  { icon: "🗺️", label: "Browse learning roadmaps", href: "/roadmaps" },
];

/* ─── Process Steps ─── */
const processSteps = [
  {
    num: "01",
    title: "Ingest Stream",
    desc: "We crawl GitHub, Reddit, HN, and developer newsletters continuously to capture discussion peaks and code metrics.",
    icon: Database,
    gradient: "from-indigo-500 to-indigo-500",
    color: "text-indigo-600",
  },
  {
    num: "02",
    title: "Analyze & NLP",
    desc: "Our models parse discussions to assign positive/negative sentiment labels and classify tool relevance.",
    icon: Brain,
    gradient: "from-indigo-500 to-indigo-500",
    color: "text-indigo-600",
  },
  {
    num: "03",
    title: "Score Momentum",
    desc: "Technologies are ranked dynamically by delta change rates, star ratios, and category concentration percentiles.",
    icon: Activity,
    gradient: "from-indigo-500 to-indigo-500",
    color: "text-indigo-600",
  },
  {
    num: "04",
    title: "Deliver Roadmap",
    desc: "We compile sequence learning paths and detailed tech profiles for developers to construct decisions.",
    icon: Rocket,
    gradient: "from-indigo-500 to-emerald-500",
    color: "text-indigo-600",
  },
];

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  /* ─── React States ─── */
  const [tools, setTools] = useState<Tool[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [topGainers, setTopGainers] = useState<Tool[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive Comparison Framework State — index into the real top-3 tools
  const [compareIdx, setCompareIdx] = useState(0);

  // Optimus-style cycling hero word (per-letter char-in animation)
  // Cycling verb in "Stop guessing what to ___ next." — every option must read
  // naturally in that slot and cover both learners and adopters.
  const heroWords = useMemo(() => ["learn", "build", "master", "adopt", "ship"], []);
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setWordIndex((p) => (p + 1) % heroWords.length), 2600);
    return () => clearInterval(id);
  }, [heroWords.length]);

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
  // Left ticker — highest momentum scores (real, no fabricated "+0.0%")
  const dynamicSignalsLeft = useMemo(() => {
    if (tools.length === 0) return ["◈ Syncing live developer signals…"];
    return [...tools]
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((t) => `${t.icon} ${t.name} · momentum ${Math.round(t.score)}/100`);
  }, [tools]);

  // Right ticker — most-starred tracked repos (real GitHub data)
  const dynamicSignalsRight = useMemo(() => {
    if (tools.length === 0) return ["◈ Indexing GitHub + community sources…"];
    return [...tools]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 12)
      .map((t) => {
        const s = t.stars >= 1000 ? `${Math.round(t.stars / 1000)}k` : `${t.stars}`;
        return `${t.icon} ${t.name} · ${s}★ on GitHub`;
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
      { label: "MOMENTUM SCORE", value: Math.round(t.score), suffix: "/100", gradient: "from-indigo-500 to-indigo-500" },
      { label: "GLOBAL PERCENTILE", value: Math.round(t.percentile), suffix: "%", gradient: "from-indigo-500 to-indigo-500" },
      { label: "GITHUB STAR INDEX", value: Math.round(starIndex), suffix: "/100", gradient: "from-indigo-500 to-emerald-500" },
      { label: "CATEGORY STANDING", value: categoryStrength, suffix: "%", gradient: "from-emerald-500 to-indigo-500" },
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
        
        {/* Hero background — vibrant aurora mesh (multi-color wash) */}
        <div className="absolute inset-0 pointer-events-none aurora-mesh [mask-image:radial-gradient(ellipse_at_center,black,transparent_85%)]" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/[0.08] rounded-full blur-[100px]" />
        </div>

        {/* Editorial grid lines (Optimus reference) */}
        <div
          className="absolute inset-0 pointer-events-none editorial-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-7 space-y-8 z-10 text-left">
            
            {/* Real-time Indicator Pill */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="hero-anim-item inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] text-xs font-mono font-bold text-indigo-600 tracking-wider"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              LIVE-DATA LEARNING ROADMAPS
              <span className="w-px h-3 bg-indigo-500/30" />
              <span className="text-indigo-600/60">v2.0</span>
            </motion.div>

            {/* Split Header Titles — cycling word (char-in) + letter-spin "screw" */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight leading-[0.92] font-display" style={{ perspective: "1000px" }}>
              {/* The pain, stated plainly and muted, so the bright resolution
                  below is where the eye lands. */}
              <span className="block pb-[0.12em]">
                <span className="hero-line block text-[var(--c-ink-2)]">No more guessing</span>
              </span>
              <span className="block pb-[0.12em]">
                <span className="hero-line block">
                  what to{" "}
                  <span className="relative inline-block align-baseline">
                    <span key={wordIndex} className="inline-block gradient-text animate-word-swap pb-[0.28em] -mb-[0.28em]">
                      {heroWords[wordIndex]}
                    </span>
                  </span>
                </span>
              </span>
              <span className="block pb-[0.12em]">
                <span className="hero-line block">
                  next<span className="text-[var(--c-ink)]">.</span>
                  {/* Blinking caret — the app's live-console identity; after the
                      period so it never crosses a descender. */}
                  <span
                    className="inline-block w-[0.09em] h-[0.72em] ml-[0.22em] align-baseline rounded-[1px] bg-[var(--accent-2)] animate-caret-blink"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </h1>

            {/* Paragraph Subhead — roadmap-led; momentum is the engine, not the pitch */}
            <p className="hero-anim-item text-base md:text-lg text-[var(--c-ink-2)] max-w-xl leading-relaxed font-sans font-light">
              <span className="font-semibold text-[var(--c-ink)]">StackRadar turns live momentum data into a step-by-step roadmap for every domain</span>{" "}
              — the right tools in the right order, each with the single best free video and a tracker to keep your streak.
            </p>

            {/* Primary CTA — roadmap is the main attraction; data is the proof */}
            <div className="hero-anim-item flex flex-wrap gap-3">
              <Link href="/roadmaps" prefetch className="btn-primary text-sm py-3 px-6 rounded-xl">
                <Compass className="w-4 h-4" /> Start a roadmap <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/trends"
                prefetch
                className="px-6 py-3 rounded-xl border border-indigo-500/20 bg-[var(--c-surface)]/60 hover:bg-[var(--c-surface-2)] text-sm font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <TrendingUp className="w-4 h-4" /> See the live data
              </Link>
            </div>

            {/* Continue learning — the daily return hook, given top billing */}
            <div className="hero-anim-item max-w-2xl">
              <ContinueLearning />
            </div>

            {/* Decision Engine — framed as a live console window */}
            <div className="hero-anim-item max-w-2xl">
              <div className="terminal-window rounded-2xl">

                {/* Dark chrome title bar (the "techy" dark accent, on-palette ink) */}
                <div className="terminal-bar">
                  <span className="terminal-dot bg-[#F04438]/85" />
                  <span className="terminal-dot bg-[#E0A82E]/85" />
                  <span className="terminal-dot bg-[#12B76A]/85" />
                  <span className="terminal-path ml-2 hidden sm:inline">stackradar://console</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
                  </span>
                </div>

                {/* Console body — pick a question, we route you to the answer */}
                <div className="p-4 sm:p-5 bg-[var(--c-surface)]">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="text-indigo-500 font-mono text-sm font-bold select-none">&gt;</span>
                    <span className="font-mono text-[11px] text-[var(--c-ink-2)] uppercase tracking-[0.14em] select-none">
                      what do you want to figure out?
                    </span>
                    <span className="ml-0.5 inline-block w-[7px] h-4 bg-indigo-500/70 animate-pulse rounded-[1px]" aria-hidden="true" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    {decisionPrompts.map((prompt) => (
                      <Link
                        key={prompt.href + prompt.label}
                        href={prompt.href}
                        prefetch
                        className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-2)] hover:bg-[var(--c-surface)] hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-300 active:scale-[0.98] cursor-pointer"
                      >
                        <span className="text-base leading-none">{prompt.icon}</span>
                        <span className="text-sm font-medium text-[var(--c-ink)] flex-1 leading-tight">{prompt.label}</span>
                        <ArrowRight className="w-4 h-4 text-indigo-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
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
                  <div className="text-2xl font-black font-mono text-[var(--c-ink)]">
                    {!isLoading && <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />}
                    {isLoading && <span className="text-[var(--c-ink-2)]/40">—</span>}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--c-ink-2)]/60 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Interactive 3D Sphere */}
          {/* self-start + sticky: the copy column is ~1100px tall, so the grid's
              `items-center` was parking the constellation at y≈543 — below the
              fold and visually detached from the headline it belongs beside. */}
          <motion.div
            className="lg:col-span-5 h-[350px] md:h-[520px] flex items-center justify-center relative sphere-container lg:self-start lg:sticky lg:top-28"
            style={{ x: springX, y: springY }}
          >
            <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0">
              <LiveConstellation tools={tools} />
            </div>
            
            {/* Visual Floating Telemetry Tags around sphere */}
            <motion.div
              className="absolute top-8 left-8 px-3 py-1.5 bg-[var(--c-surface)]/80 border border-indigo-500/15 backdrop-blur-md rounded-lg text-[10px] font-mono text-indigo-600 select-none"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                {heroStats.tools} NODES LIVE
              </span>
            </motion.div>
            <motion.div
              className="absolute bottom-14 right-4 px-3 py-1.5 bg-[var(--c-surface)]/80 border border-indigo-500/15 backdrop-blur-md rounded-lg text-[10px] font-mono text-indigo-600 select-none"
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                {topGainers[0] ? `${topGainers[0].name.toUpperCase()} RISING` : "MOMENTUM MAP"}
              </span>
            </motion.div>
            <motion.div
              className="absolute top-1/2 right-0 px-3 py-1.5 bg-[var(--c-surface)]/80 border border-indigo-500/15 backdrop-blur-md rounded-lg text-[10px] font-mono text-indigo-600 select-none"
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
      <section className="w-full py-5 border-y border-indigo-500/8 bg-[var(--c-surface)]/30 overflow-hidden space-y-3">
        
        {/* Track 1: Scrolls Left */}
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-left flex items-center gap-16 shrink-0">
            {dynamicSignalsLeft.concat(dynamicSignalsLeft).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-3 font-mono text-xs text-[var(--c-ink-2)]/80 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                {signal}
              </span>
            ))}
          </div>
        </div>

        {/* Track 2: Scrolls Right */}
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-right flex items-center gap-16 shrink-0">
            {dynamicSignalsRight.concat(dynamicSignalsRight).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-3 font-mono text-xs text-indigo-600/60 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
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
            <div className="inline-flex items-center gap-2 font-mono text-xs text-indigo-600 font-bold uppercase tracking-widest">
              <div className="w-8 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent" />
              <Compass className="w-4 h-4" /> Choose your path
            </div>
            <h2 className="text-3xl md:text-5xl font-black font-display tracking-tight">
              Pick a domain, get a roadmap
            </h2>
          </div>
          <p className="text-sm text-[var(--c-ink-2)] max-w-md font-sans font-light leading-relaxed">
            Each domain is a full learning roadmap — sequenced steps, the best free video per tool, and a live momentum score so you learn what actually matters.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="h-52 rounded-2xl border border-indigo-500/5 bg-[var(--c-surface-2)]/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains.map((domain, i) => {
              const scoreColor = domain.score >= 80 ? "text-emerald-600" : domain.score >= 60 ? "text-amber-600" : "text-rose-600";
              const scoreBg = domain.score >= 80 ? "bg-emerald-500/10 border-emerald-500/15" : domain.score >= 60 ? "bg-amber-500/10 border-amber-500/15" : "bg-rose-500/10 border-rose-500/15";
              const scoreBarColor = domain.score >= 80 ? "bg-emerald-500" : domain.score >= 60 ? "bg-amber-500" : "bg-rose-500";
              
              return (
                <motion.div
                  key={domain.slug}
                  onClick={() => router.push(`/explore?domain=${domain.slug}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/explore?domain=${domain.slug}`); }}
                  className="stagger-card group block p-6 rounded-2xl relative overflow-hidden tech-panel tech-panel-interactive"
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {/* Inner gradient reveal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-start justify-between relative mb-5">
                    <div className="p-3 bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl group-hover:border-indigo-400/40 group-hover:scale-105 transition-all duration-300">
                      <span className="text-2xl">{domain.icon || "📂"}</span>
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${scoreBg} ${scoreColor}`}>
                      {domain.score}
                    </div>
                  </div>

                  {/* Body */}
                  <h3 className="text-lg font-bold font-display group-hover:text-indigo-600 transition-colors duration-300 mb-2">
                    {domain.name}
                  </h3>
                  <p className="text-xs text-[var(--c-ink-2)] line-clamp-2 leading-relaxed mb-6 font-light">
                    {domain.summary}
                  </p>

                  {/* Score progress bar */}
                  <div className="mb-4">
                    <div className="h-1 w-full bg-[var(--c-ground)] rounded-full overflow-hidden">
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
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--c-ink-2)]/60">
                    <span className="uppercase">{domain.stage} adoption</span>
                    <span className="text-indigo-600/70 group-hover:text-indigo-600 transition-colors">{domain.tool_count} technologies</span>
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
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--c-ground)] to-transparent pointer-events-none z-10 hidden md:block" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--c-ground)] to-transparent pointer-events-none z-10 hidden md:block" />
        
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 font-mono text-xs text-indigo-600 font-bold uppercase tracking-widest">
              <div className="w-8 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent" />
              <Flame className="w-4 h-4" /> Momentum Delta
            </div>
            <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight">
              Rising — worth learning now
            </h2>
          </div>
          <div className="md:ml-auto">
            <span className="text-[10px] font-mono text-indigo-600/60 uppercase tracking-wider font-semibold">
              Fastest-rising tools this cycle
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="h-40 rounded-2xl border border-indigo-500/5 bg-[var(--c-surface-2)]/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory relative z-20">
            {topGainers.map((tool, i) => (
              <motion.div
                key={tool.slug}
                onClick={() => router.push(`/tools/${tool.slug}`)}
                className="tool-score-card snap-start shrink-0 w-full sm:w-[340px] p-6 rounded-2xl relative group tech-panel tech-panel-interactive"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                {/* Gradient inner */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

                <div className="flex items-center gap-4 mb-5 relative">
                  <span className="text-3xl p-2.5 bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl group-hover:border-indigo-500/40 group-hover:scale-105 transition-all duration-300">
                    {tool.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--c-ink)] group-hover:text-indigo-600 transition-colors duration-300">
                      {tool.name}
                    </h3>
                    <p className="text-[10px] text-[var(--c-ink-2)]/60 font-mono">{tool.category}</p>
                  </div>
                  
                  <div className="ml-auto text-right">
                    <span className="text-2xl font-black font-mono text-[var(--c-ink)]">{tool.score}</span>
                    <p className="text-[8px] font-mono text-[var(--c-ink-2)]/50 uppercase tracking-wider">score</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-indigo-500/5 pt-4 font-mono text-xs relative">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{tool.growth_pct.toFixed(1)}%
                  </div>
                  
                  <div className="flex items-center gap-1 text-[var(--c-ink-2)]/60 text-[10px]">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(0)}k` : tool.stars}
                  </div>

                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-[10px] text-indigo-600/70 group-hover:text-indigo-600 transition-all flex items-center gap-0.5 hover:underline"
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
        <div className="glass-panel rounded-3xl p-8 md:p-10 border border-indigo-500/8 relative overflow-hidden">
          
          {/* Ambient background mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.04),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,rgba(37,99,235,0.04),transparent_60%)] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            
            {/* Description column */}
            <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-xs text-indigo-600 font-bold uppercase tracking-widest mb-3">
                  <div className="w-8 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent" />
                  Interactive Telemetry
                </div>
                <h3 className="text-3xl md:text-4xl font-black font-display tracking-tight mb-4">
                  Momentum<br/>
                  <span className="text-shimmer">Head-to-Head</span>
                </h3>
                <p className="text-sm text-[var(--c-ink-2)] leading-relaxed font-sans font-light">
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
                        ? "bg-indigo-600/12 border-indigo-500/40 text-[var(--c-ink)] shadow-lg shadow-indigo-500/5 font-bold"
                        : "bg-[var(--c-surface)]/40 border-indigo-500/5 text-[var(--c-ink-2)] hover:text-[var(--c-ink)] hover:border-indigo-500/15"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{tech.icon}</span> {tech.name}
                      <span className="text-[9px] text-[var(--c-ink-2)]/50">#{tech.rank}</span>
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-all duration-300 ${compareIdx === idx ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics column */}
            <div className="lg:col-span-7 tech-panel rounded-2xl p-6 md:p-8 flex flex-col justify-between relative">
              
              <div className="space-y-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-indigo-500/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--c-ink-2)]/50">ACTIVE TRACKING</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={activeCompare?.slug}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-xl font-bold font-mono text-indigo-600 flex items-center gap-2"
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
                      <div className="flex justify-between font-mono text-[10px] text-[var(--c-ink-2)]/70">
                        <span>{metric.label}</span>
                        <motion.span
                          className="font-bold text-[var(--c-ink)]"
                          key={`${activeCompare?.slug}-${metric.label}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {metric.value}{metric.suffix}
                        </motion.span>
                      </div>
                      <div className="h-2 w-full bg-[var(--c-surface-2)] rounded-full overflow-hidden border border-indigo-500/5">
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
                  className="mt-8 p-4 rounded-xl bg-[var(--c-surface-2)]/40 border border-indigo-500/5"
                >
                  <span className="text-[10px] font-mono text-indigo-600/70 block mb-1.5">SIGNAL ANALYSIS</span>
                  <p className="text-xs text-[var(--c-ink-2)] leading-relaxed font-light font-mono">
                    {activeCompare?.recommendation || `${activeCompare?.name} is tracked live across ${heroStats.sources} developer signal sources.`}
                  </p>
                </motion.div>
              </AnimatePresence>

            </div>

          </div>

        </div>
      </section>

      {/* ─── Divider Ticker ─── */}
      <section className="w-full py-4 border-y border-indigo-500/5 bg-[var(--c-surface)]/20 overflow-hidden">
        <div className="w-full flex whitespace-nowrap overflow-hidden">
          <div className="ticker-scroll-left flex items-center gap-16 shrink-0">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="inline-flex items-center gap-4 font-mono text-[10px] text-[var(--c-ink-2)]/30 tracking-widest uppercase">
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
          <div className="inline-flex items-center gap-2 font-mono text-xs text-indigo-600 font-bold uppercase tracking-widest">
            <Shield className="w-4 h-4" /> Why our roadmaps stay current
          </div>
          <h2 className="text-3xl md:text-5xl font-black font-display leading-tight">
            A roadmap that updates<br/>
            <span className="text-shimmer">itself from live data</span>
          </h2>
          <p className="text-sm text-[var(--c-ink-2)] leading-relaxed font-sans font-light max-w-lg mx-auto">
            Static roadmaps go stale. Ours re-rank every cycle from what developers are actually building — so the order you learn in tracks the industry, not a snapshot from years ago.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          {/* Desktop connector line */}
          <div className="absolute top-20 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent z-0 hidden lg:block" />

          {processSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                className="process-step relative z-10 p-6 rounded-2xl group tech-panel tech-panel-interactive"
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {/* Step number badge */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Step number */}
                <div className="text-[10px] font-mono text-indigo-600/40 mb-2 tracking-widest">STEP {step.num}</div>
                
                <h3 className="text-lg font-bold font-display group-hover:text-indigo-600 transition-colors duration-300 mb-3">
                  {step.title}
                </h3>
                <p className="text-xs text-[var(--c-ink-2)] leading-relaxed font-light">
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
        <div className="glass-panel-glow rounded-3xl p-10 md:p-14 text-center relative overflow-hidden border border-indigo-500/15 bg-[var(--c-surface-2)]/70">
          
          {/* Radar SVG Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.1] pointer-events-none select-none">
            <svg width="600" height="600" viewBox="0 0 600 600" fill="none" className="text-indigo-500">
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
            <Sparkles className="w-10 h-10 mx-auto text-indigo-600 mb-6" />
          </motion.div>
          
          <h3 className="text-3xl md:text-5xl font-black font-display tracking-tight max-w-2xl mx-auto leading-tight mb-4">
            Pick a roadmap.<br/>
            <span className="text-shimmer">Learn one thing a day.</span>
          </h3>

          <p className="text-sm md:text-base text-[var(--c-ink-2)] max-w-lg mx-auto leading-relaxed mb-10 font-light">
            Sequenced steps, the best free video for each tool, and a streak to keep you going — on a syllabus that updates itself from live momentum data.
          </p>

          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <Link
              href="/roadmaps"
              className="btn-primary text-sm py-3 px-7 rounded-2xl flex items-center gap-2"
            >
              <Compass className="w-4 h-4" /> Start a roadmap <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/trends"
              className="px-7 py-3 rounded-2xl border border-indigo-500/15 bg-[var(--c-surface)]/60 backdrop-blur-sm hover:bg-[var(--c-surface-2)] hover:border-indigo-400/30 text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2 font-bold font-mono"
            >
              See the live data <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIVE INTEGRATION FEED FOOTER
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-indigo-500/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-mono text-[var(--c-ink-2)]/50 uppercase tracking-wider">TELEMETRY STREAM</p>
              <h3 className="text-sm font-bold text-[var(--c-ink)]">Live Parser Stream Active</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-mono text-[var(--c-ink-2)]/50">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-indigo-600/60" /> RSS NEWS</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-indigo-600/60" /> REDDIT</span>
            <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-indigo-600/60" /> GITHUB</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-600/60" /> HACKERNEWS</span>
          </div>

        </div>
      </section>

      </div>
    </DashboardShell>
  );
}

