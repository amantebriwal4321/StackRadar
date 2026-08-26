"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Sparkles, ArrowRight, Brain, Compass, Star,
  Shield, Globe, Database, MessageSquare, Terminal, Eye,
  ChevronRight, Activity, Rocket, Flame
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

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
import SplitReveal from "@/components/ui/SplitReveal";
import ScrollExpand from "@/components/ui/ScrollExpand";
import DashboardShell from "@/components/DashboardShell";
import ContinueLearning from "@/components/ContinueLearning";
import FiveMinutePlan from "@/components/FiveMinutePlan";
import MobileHome from "@/components/MobileHome";
import WaitlistCapture from "@/components/WaitlistCapture";

/* ─── Animated Counter ───
   The count-up is decoration; the NUMBER is the content. So reduced motion skips
   straight to the final value, and the rAF chain is cancelled on unmount and on
   every `value` change — without that, a changing value stacked overlapping
   chains that fought each other over the same state. */
function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  // Progress rests at 1 — the FINAL value — and the animation walks it up from 0.
  // That ordering is the point: the resting state is the readable one, so reduced
  // motion, a backgrounded tab or a dead rAF all leave the real number on screen
  // rather than a zero. Rendering `value * progress` also means a changing `value`
  // is picked up without any state sync.
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      setProgress(1 - Math.pow(1 - t, 4));
      if (t < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{prefix}{Math.floor(value * progress).toLocaleString('en-US')}{suffix}</span>;
}

/* ─── Console questions ─── each one routes to the page that answers it ─── */
const decisionPrompts = [
  { icon: "🧭", label: "What should I learn next?", href: "/explore" },
  { icon: "🧠", label: "Is AI/ML worth it right now?", href: "/roadmaps" },
  { icon: "📈", label: "What's trending this week?", href: "/trends" },
  { icon: "⚖️", label: "Compare two technologies", href: "/compare" },
  { icon: "💼", label: "Which skills get me hired?", href: "/explore" },
  { icon: "🗺️", label: "Browse learning roadmaps", href: "/roadmaps" },
];

/* ─── Process Steps ───
   The numbering is real: this is a pipeline, and each step consumes the previous
   one's output — so 01–04 encodes order the reader needs, not decoration.
   The `gradient`/`color` fields are gone; three of the four were no-ops
   (`from-indigo-500 to-indigo-500` is a flat fill written as a gradient). */
const processSteps = [
  {
    num: "01",
    title: "We listen to the industry",
    desc: "GitHub, Reddit and Hacker News, tracked around the clock — what developers actually use, not what ads say.",
    icon: Database,
  },
  {
    num: "02",
    title: "We separate signal from hype",
    desc: "Real developer discussions get analyzed so genuine adoption stands out from marketing noise.",
    icon: Brain,
  },
  {
    num: "03",
    title: "Every tool gets a live score",
    desc: "A 0–100 score from real usage and growth — so “worth learning” is measured, not guessed.",
    icon: Activity,
  },
  {
    num: "04",
    title: "Your roadmap stays current",
    desc: "The learning path re-ranks itself from that data, so you always study what matters right now.",
    icon: Rocket,
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

  /* ─── Device split ───
     Render EITHER the mobile tree OR the desktop tree — never both. A CSS-only
     `hidden`/`md:block` split would still mount the desktop's R3F WebGL
     constellation offscreen on phones (janking low-end devices); this keeps the
     heavy desktop bits from ever mounting on mobile. Starts false so SSR/first
     paint matches, then corrects post-hydration. */
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Interactive Comparison Framework State — index into the real top-3 tools
  const [compareIdx, setCompareIdx] = useState(0);

  // Optimus-style cycling hero word (per-letter char-in animation)
  // Mouse parallax for hero
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 30 });

  useEffect(() => {
    // Reduced motion: never bind at all. The constellation stays centred, which
    // is its resting state anyway, so nothing is lost but the drift.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  /* ─── Fetch Home Page Data ─── */
  const loadHomePage = useCallback(async () => {
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
      setError(err.message || "Failed to load live data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadHomePage(); }, [loadHomePage]);

  /* Every live section on this page reads from that one fetch, so when it fails
     the page renders as a set of empty shells with no explanation. This says what
     happened and offers the one action that helps. Rendered in BOTH the mobile
     and desktop trees — the mobile branch returns early. */
  const errorBanner = error ? (
    <div className="max-w-7xl mx-auto px-6 pt-24 md:pt-32">
      <div className="tech-panel rounded-3xl border border-[var(--c-border)] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="eyebrow mb-1">No live data</p>
          <p className="text-sm text-[var(--c-ink-2)] font-extralight">
            The momentum index did not respond, so scores and roadmap rankings are
            missing from this page. Everything else still works.
          </p>
        </div>
        <button onClick={loadHomePage} className="btn-secondary shrink-0">
          Try again
        </button>
      </div>
    </div>
  ) : null;

  /* ─── GSAP Entrance Animations ───
     Split by device with matchMedia. The scroll-triggered reveals below start
     content at opacity:0 and only show it when ScrollTrigger fires — which is
     unreliable on mobile (address-bar resize, stale trigger positions), and was
     leaving whole sections invisible and dead on phones. So on mobile and for
     reduced-motion, we skip all of it and force everything visible/interactive.
     The cinematic reveals stay desktop-only polish. */
  const ALL_ANIM = ".hero-line, .hero-anim-item, .sphere-container, .section-reveal, .stagger-card, .process-step, .cta-section";
  useGSAP(() => {
    const mm = gsap.matchMedia();

    // ── Mobile / reduced-motion: everything visible immediately, no exceptions.
    mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
      gsap.set(ALL_ANIM, { opacity: 1, y: 0, x: 0, scale: 1, rotateX: 0, clearProps: "transform" });
    });

    // ── Desktop: the full cinematic entrance + scroll reveals.
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      if (isLoading) return;

      const tl = gsap.timeline();
      tl.fromTo(".hero-line",
        { y: 100, opacity: 0, rotateX: -15 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1.1, stagger: 0.12, ease: "power4.out" }, 0.3);
      tl.fromTo(".hero-anim-item",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=0.6");
      tl.fromTo(".sphere-container",
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.2, ease: "power3.out" }, "-=0.8");

      gsap.utils.toArray<HTMLElement>(".section-reveal").forEach((el) => {
        gsap.fromTo(el, { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" } });
      });

      gsap.utils.toArray<HTMLElement>(".stagger-grid-trigger").forEach((trigger) => {
        gsap.fromTo(trigger.querySelectorAll(".stagger-card"), { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: "power2.out",
            scrollTrigger: { trigger, start: "top 80%" } });
      });

      gsap.fromTo(".process-step", { y: 40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: "power3.out",
          scrollTrigger: { trigger: ".process-section", start: "top 75%" } });

      gsap.fromTo(".cta-section", { y: 60, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: ".cta-section", start: "top 85%" } });

      // Recompute trigger positions once layout + fonts have settled.
      ScrollTrigger.refresh();
    });

    return () => mm.revert();
  }, [isLoading]);

  /* ─── Dynamic Signal Tickers Content ─── */
  // Left ticker — highest momentum scores (real, no fabricated "+0.0%")
  const dynamicSignalsLeft = useMemo(() => {
    if (tools.length === 0) return [{ icon: "◈", name: "Syncing live developer signals…", meta: "" }];
    return [...tools]
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((t) => ({ icon: t.icon, name: t.name, meta: `${Math.round(t.score)}/100` }));
  }, [tools]);

  // Right ticker — most-starred tracked repos (real GitHub data)
  const dynamicSignalsRight = useMemo(() => {
    if (tools.length === 0) return [{ icon: "◈", name: "Indexing GitHub + community sources…", meta: "" }];
    return [...tools]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 12)
      .map((t) => {
        const s = t.stars >= 1000 ? `${Math.round(t.stars / 1000)}k` : `${t.stars}`;
        return { icon: t.icon, name: t.name, meta: `${s}★` };
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
    // These are neutral 0–100 indices, not momentum bands, so they take the flat
    // accent rather than the score green/amber/red — those carry meaning only.
    return [
      { label: "MOMENTUM SCORE", value: Math.round(t.score), suffix: "/100" },
      { label: "GLOBAL PERCENTILE", value: Math.round(t.percentile), suffix: "%" },
      { label: "GITHUB STAR INDEX", value: Math.round(starIndex), suffix: "/100" },
      { label: "CATEGORY STANDING", value: categoryStrength, suffix: "%" },
    ];
  }, [activeCompare]);

  // Stats for the hero area — all real, sourced from /overview
  const heroStats = useMemo(() => ({
    tools: overview?.tools_tracked || tools.length || 0,
    stars: overview?.total_stars || 0,
    sources: overview?.source_count || 5,
    domains: overview?.domains || domains.length || 0,
  }), [overview, tools, domains]);

  if (isMobile) {
    return (
      <DashboardShell fullWidth flushX>
        {errorBanner}
        <MobileHome
          tools={tools}
          domains={domains}
          movers={topGainers}
          overview={overview}
          isLoading={isLoading}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell fullWidth>
      <div ref={containerRef} className="relative pb-24">
      {errorBanner}

      {/* ══════════════════════════════════════════
          SECTION 1: HERO & 3D SPHERE CENTERPIECE
         ══════════════════════════════════════════ */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-[92px] md:pt-[144px] pb-12 min-h-[86vh] flex items-start">
        
        {/* No colour wash here. Two blurred Iris orbs used to sit on this spot —
            the same treatment `.ambient-orb` is switched off for, hand-rolled in
            Tailwind so the CSS kill never reached them. Iris is a button colour,
            "never a large surface", and the global `.ambient-particles` field is
            the ambient layer Dala actually specifies. */}

        {/* Editorial grid lines — hairline structure, not colour */}
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
              className="hero-anim-item eyebrow inline-flex items-center gap-2.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-2)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-2)]" />
              </span>
              LIVE-DATA LEARNING ROADMAPS
            </motion.div>

            {/* Split Header Titles — cycling word (char-in) + letter-spin "screw" */}
            {/* `.t-display` is the measured Dala step — clamp(2.75rem, 8vw, 7rem)
                at weight 400 and -0.04em. The four hand-rolled breakpoints it
                replaces resolved to the same sizes, one scale in two places. */}
            <h1 className="t-display font-display leading-[1.02] sm:leading-[0.92]" style={{ perspective: "1000px" }}>
              <span className="block pb-[0.12em]">
                <span className="hero-line block">Learn the right tech,</span>
              </span>
              {/* "right order" is the whole thesis — a roadmap's value over a pile
                  of videos is the sequence — so it carries the accent. */}
              <span className="block pb-[0.12em]">
                <span className="hero-line block">
                  in the{" "}
                  <span className="relative inline-block align-baseline">
                    <span className="inline-block pb-[0.28em] -mb-[0.28em] text-[var(--c-ink)]">right order</span>
                  </span>
                  <span className="text-[var(--c-ink)]">.</span>
                </span>
              </span>
            </h1>

            {/* Paragraph Subhead — roadmap-led; momentum is the engine, not the pitch */}
            <p className="hero-anim-item text-base md:text-lg text-[var(--c-ink-2)] max-w-xl leading-relaxed font-sans font-extralight">
              <span>StackRadar turns live momentum data into a step-by-step roadmap for every domain</span>{" "}
              — the right tools in the right order, each with the single best free video and a tracker to keep your streak.
            </p>

            {/* Primary CTA — the 5-minute plan is the product's front door, but it
                sits below the 90vh hero; this makes it one click from first paint. */}
            <div className="hero-anim-item flex flex-wrap gap-3">
              <a href="#five-minute-plan" className="btn-primary">
                <Compass className="w-4 h-4" /> Get my 5-minute plan <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/trends" prefetch className="btn-secondary">
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
                {/* The window dots were #F04438 / #12B76A — the score red and green.
                    Those encode momentum and nothing else, so as decoration here they
                    made a window control look like a reading. Neutral inks keep the
                    traffic-light FORM without borrowing the meaning. */}
                <div className="terminal-bar">
                  <span className="terminal-dot bg-white/30" />
                  <span className="terminal-dot bg-white/20" />
                  <span className="terminal-dot bg-white/10" />
                  <span className="terminal-path ml-2 hidden sm:inline">stackradar://console</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-white/55">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-1)] animate-pulse" /> live
                  </span>
                </div>

                {/* Console body — pick a question, we route you to the answer */}
                <div className="p-4 sm:p-5 bg-[var(--c-surface)]">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="text-indigo-500 font-mono text-sm font-semibold select-none">&gt;</span>
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
                        className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-[var(--c-border)] hover:border-indigo-500/50 transition-colors duration-300 active:scale-[0.98] cursor-pointer"
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
                  {/* Figures at 400: scale and tabular-nums carry a stat, not weight. */}
                  <div className="text-2xl font-normal font-mono text-[var(--c-ink)]">
                    {!isLoading && <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />}
                    {isLoading && <span className="text-[var(--c-ink-2)]/40">—</span>}
                  </div>
                  <div className="text-[10px] font-mono font-semibold text-[var(--c-ink-2)]/60 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Interactive 3D Sphere.
              Three nested layers on purpose:
              • outer  — the grid cell; self-stretch makes it as tall as the copy
                column so the sticky layer has the full hero height to travel
                (otherwise the constellation scrolled away and left the right side
                empty).
              • middle — carries `sticky`. It must NOT have a transform, because a
                CSS transform breaks position:sticky — which is exactly why the
                mouse-parallax was killing the stick.
              • inner  — the motion.div that owns the parallax transform + sizing. */}
          <div className="lg:col-span-5 lg:self-stretch relative">
          <div className="lg:sticky lg:top-28">
          <motion.div
            className="h-[350px] md:h-[520px] flex items-center justify-center relative sphere-container"
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
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 1.5: 5-MINUTE PLAN — the conversion front door
         ══════════════════════════════════════════ */}
      {/* scroll-mt clears the fixed navbar when arriving via the #five-minute-plan
          anchor (hero CTA + navbar both point here). */}
      {/* ══════════════════════════════════════════
          NARRATIVE — Dala's signature editorial passage.
          One thought per line at 36px/400 on the void, naming the problem the
          product exists for. SplitReveal carries the wipe-up so it inherits the
          fail-safe (the words render readable if the animation never runs).
         ══════════════════════════════════════════ */}
      <ScrollExpand
        useWindowScroll
        fit="content"
        mediaZoom={1.14}
        className="relative z-10 max-w-4xl mx-auto px-6 section-rhythm"
      >
        <div className="space-y-5 md:space-y-7">
          {[
            "There has never been more to learn, and never less clarity about what is worth learning.",
            "You lose months on a framework that was already fading before you opened the first tutorial.",
            "The advice is loud, confident, and two years out of date.",
            "StackRadar reads what developers are actually building with — right now — and turns it into an order you can follow.",
          ].map((line, i) => (
            <SplitReveal
              key={i}
              as="p"
              text={line}
              delay={i * 90}
              stagger={18}
              className={`t-narrative block ${i === 3 ? "text-[var(--c-ink)]" : "text-[var(--c-ink-2)]"}`}
            />
          ))}
        </div>
      </ScrollExpand>

      {/* The zoom sits INSIDE the section so the #five-minute-plan anchor (the
          navbar's "my plan" link) keeps its scroll target. */}
      <section id="five-minute-plan" className="max-w-5xl mx-auto px-6 -mt-6 md:-mt-4 mb-8 relative z-20 section-reveal scroll-mt-24">
        <ScrollExpand useWindowScroll fit="content" mediaZoom={1.1}>
          <FiveMinutePlan />
        </ScrollExpand>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2: INFINITE SCROLLING TICKERS
         ══════════════════════════════════════════ */}
      <section className="w-full py-5 border-y border-indigo-500/8 bg-[var(--c-surface)]/30 overflow-hidden space-y-3">
        
        {/* Track 1: Scrolls Left — highest momentum */}
        <div className="ticker-rail w-full flex whitespace-nowrap">
          <div className="ticker-scroll-left flex items-center gap-10 shrink-0">
            {dynamicSignalsLeft.concat(dynamicSignalsLeft).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-2.5 shrink-0">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-2)] text-sm leading-none">
                  {signal.icon}
                </span>
                <span className="font-mono text-xs tracking-wider uppercase text-[var(--c-ink-2)]/85">
                  {signal.name}
                </span>
                {signal.meta && (
                  <span className="font-mono text-[10px] tracking-wider text-indigo-600/70">{signal.meta}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Track 2: Scrolls Right — most starred */}
        <div className="ticker-rail w-full flex whitespace-nowrap">
          <div className="ticker-scroll-right flex items-center gap-10 shrink-0">
            {dynamicSignalsRight.concat(dynamicSignalsRight).map((signal, idx) => (
              <span key={idx} className="inline-flex items-center gap-2.5 shrink-0">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-2)] text-sm leading-none">
                  {signal.icon}
                </span>
                <span className="font-mono text-xs tracking-wider uppercase text-[var(--c-ink-2)]/85">
                  {signal.name}
                </span>
                {signal.meta && (
                  <span className="font-mono text-[10px] tracking-wider text-indigo-600/70">{signal.meta}</span>
                )}
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* ══════════════════════════════════════════
          SECTION 3: DOMAIN CATEGORIES GRID
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 section-rhythm-lg stagger-grid-trigger section-reveal">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div className="space-y-3">
            <div className="eyebrow inline-flex items-center gap-2">
              <Compass className="w-4 h-4" /> Choose your path
            </div>
            <h2 className="t-statement font-display">
              Pick a domain, get a roadmap
            </h2>
          </div>
          <p className="text-sm text-[var(--c-ink-2)] max-w-md font-sans font-extralight leading-relaxed">
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
                  className="stagger-card group block p-6 rounded-3xl relative overflow-hidden tech-panel tech-panel-interactive"
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {/* No hover wash: `.tech-panel-interactive:hover` already gives the
                      Dala response (Iris hairline + lift). The gradient overlay that
                      sat here was a second, competing hover system. */}

                  {/* Header */}
                  <div className="flex items-start justify-between relative mb-5">
                    <div className="p-3 bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl group-hover:border-indigo-400/40 group-hover:scale-105 transition-all duration-300">
                      <span className="text-2xl">{domain.icon || "📂"}</span>
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${scoreBg} ${scoreColor}`}>
                      {domain.score}
                    </div>
                  </div>

                  {/* Body */}
                  <h3 className="text-lg font-normal font-display group-hover:text-indigo-600 transition-colors duration-300 mb-2">
                    {domain.name}
                  </h3>
                  <p className="text-xs text-[var(--c-ink-2)] line-clamp-2 leading-relaxed mb-6 font-extralight">
                    {domain.summary}
                  </p>

                  {/* Score progress bar */}
                  <div className="mb-4">
                    <div className="h-1 w-full rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--c-ink)_10%,transparent)]">
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
      <section className="max-w-7xl mx-auto px-6 section-rhythm-lg relative section-reveal">
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--c-ground)] to-transparent pointer-events-none z-10 hidden md:block" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--c-ground)] to-transparent pointer-events-none z-10 hidden md:block" />
        
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-10">
          {/* This header used to say the same thing three times — an eyebrow
              ("Rising this week"), a heading ("Rising — worth learning now") and
              an aside ("Fastest-rising tools this cycle"). The heading carries it. */}
          <div className="space-y-3">
            <div className="eyebrow inline-flex items-center gap-2">
              <Flame className="w-4 h-4" /> Rising this week
            </div>
            <h2 className="t-statement font-display">
              Worth learning now
            </h2>
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
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") router.push(`/tools/${tool.slug}`); }}
                aria-label={`${tool.name} — momentum score ${tool.score}`}
                className="tool-score-card snap-start shrink-0 w-full sm:w-[340px] p-6 rounded-3xl relative group cursor-pointer tech-panel tech-panel-interactive"
                /* Transform-only entrance. This previously animated opacity 0→1 on
                   whileInView, which strands every card invisible if the tab is
                   backgrounded when they scroll in — the failure CLAUDE.md records
                   hitting four times. A frozen transform is merely un-drifted. */
                initial={{ y: 30 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <div className="flex items-center gap-4 mb-5 relative">
                  <span className="text-3xl p-2.5 bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl group-hover:border-indigo-500/40 group-hover:scale-105 transition-all duration-300">
                    {tool.icon}
                  </span>
                  <div>
                    <h3 className="font-normal text-sm text-[var(--c-ink)] group-hover:text-indigo-600 transition-colors duration-300">
                      {tool.name}
                    </h3>
                    <p className="text-[10px] text-[var(--c-ink-2)]/60 font-mono">{tool.category}</p>
                  </div>

                  <div className="ml-auto text-right">
                    <span className="text-2xl font-normal font-mono text-[var(--c-ink)]">{tool.score}</span>
                    <p className="text-[8px] font-mono text-[var(--c-ink-2)]/50 uppercase tracking-wider">score</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-4 font-mono text-xs relative">
                  {/* Green stays: this IS momentum, the one thing it may encode. */}
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{tool.growth_pct.toFixed(1)}%
                  </div>

                  <div className="flex items-center gap-1 text-[var(--c-ink-2)]/60 text-[10px]">
                    {/* Saffron, the highlight role — amber-500 is the score-mid
                        data colour and a star glyph carries no momentum meaning. */}
                    <Star className="w-3 h-3 text-[var(--accent-2)] fill-[var(--accent-2)]" />
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
      <section className="max-w-7xl mx-auto px-6 section-rhythm-lg section-reveal">
        <div className="glass-panel rounded-3xl p-8 md:p-10 relative overflow-hidden">

          {/* Two radial washes sat here and rendered NOTHING: their Tailwind
              arbitrary values contained raw spaces (`rgba(100, 120, 238,0.04)`),
              which the compiler cannot parse. The colour was #5266EB, a retired
              palette. Removed rather than repaired — Dala has no colour washes. */}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            
            {/* Description column */}
            <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
              <div>
                <div className="eyebrow mb-3">Live comparison</div>
                <h3 className="t-statement font-display mb-4">
                  Momentum<br/>
                  <span className="text-shimmer">head to head</span>
                </h3>
                <p className="text-sm text-[var(--c-ink-2)] leading-relaxed font-sans font-extralight">
                  The three highest-momentum technologies on StackRadar right now, scored live on GitHub presence, global percentile, and category standing — straight from the index.
                </p>
              </div>

              {/* Selection Tabs — real top-3 tools */}
              <div className="space-y-2.5">
                {compareTools.map((tech, idx) => (
                  <button
                    key={tech.slug}
                    onClick={() => setCompareIdx(idx)}
                    aria-pressed={compareIdx === idx}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border font-mono text-xs uppercase tracking-wider text-left transition-colors duration-300 cursor-pointer ${
                      compareIdx === idx
                        ? "border-indigo-500/40 text-[var(--c-ink)] font-semibold"
                        : "border-[var(--c-border)] text-[var(--c-ink-2)] hover:text-[var(--c-ink)] hover:border-indigo-500/15"
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
                
                <div className="flex items-center justify-between pb-4 border-b border-[var(--c-border)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--c-ink-2)]/50">ACTIVE TRACKING</span>
                    {/* Iris, not emerald — green is reserved for momentum meaning. */}
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-1)] animate-pulse" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={activeCompare?.slug}
                      initial={{ y: -10 }}
                      animate={{ y: 0 }}
                      exit={{ y: 10 }}
                      className="text-xl font-normal font-mono text-indigo-600 flex items-center gap-2"
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
                        <span className="font-semibold text-[var(--c-ink)]">
                          {metric.value}{metric.suffix}
                        </span>
                      </div>
                      {/* Track was --c-surface-2, which equals the canvas — an
                          invisible track. A faint ink tint makes the bar readable
                          on both themes. Fill is flat Iris: these are neutral
                          indices, so no data colour applies. */}
                      <div className="h-2 w-full rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--c-ink)_10%,transparent)]">
                        <motion.div
                          className="h-full rounded-full bg-[var(--accent-1)]"
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
                  <p className="text-xs text-[var(--c-ink-2)] leading-relaxed font-extralight font-mono">
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
        <div className="ticker-rail w-full flex whitespace-nowrap">
          <div className="ticker-scroll-left flex items-center gap-16 shrink-0">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="inline-flex items-center gap-4 font-mono text-[10px] text-[var(--c-ink-2)]/30 tracking-widest uppercase">
                <span>{heroStats.tools} TECHNOLOGIES TRACKED</span>
                <span>•</span>
                <span>{heroStats.stars.toLocaleString('en-US')} GITHUB STARS INDEXED</span>
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
      {/* `min-h-screen` was here fighting the section padding — it forced a full
          viewport regardless of content, so the rhythm never applied. */}
      <section className="max-w-7xl mx-auto px-6 section-rhythm-lg process-section">
        
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4 section-reveal">
          <div className="eyebrow inline-flex items-center gap-2 justify-center">
            <Shield className="w-4 h-4" /> Why our roadmaps stay current
          </div>
          <h2 className="t-statement font-display">
            A roadmap that updates<br/>
            <span className="text-shimmer">itself from live data</span>
          </h2>
          <p className="text-sm text-[var(--c-ink-2)] leading-relaxed font-sans font-extralight max-w-lg mx-auto">
            Static roadmaps go stale. Ours re-rank every cycle from what developers are actually building — so the order you learn in tracks the industry, not a snapshot from years ago.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          {/* Connector hairline — flat, at the ends only where it would otherwise
              butt into the cards. A gradient is not needed to fade a 1px rule. */}
          <div className="absolute top-14 left-[10%] right-[10%] h-[1px] bg-[var(--c-border)] z-0 hidden lg:block" />

          {processSteps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                className="process-step relative z-10 p-6 rounded-3xl group tech-panel tech-panel-interactive"
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {/* The icon floats — no badge. A 56px filled square was a card
                    surface, which Dala's defining rule forbids, and Iris is
                    specified for filled ACTIONS; a step marker is not an action.
                    The icon alone, in Iris, carries the same job on the void. */}
                <Icon className="w-7 h-7 text-indigo-500 mb-5" strokeWidth={1.5} />

                {/* Step number — the sequence is real: each step consumes the last */}
                <div className="text-[10px] font-mono font-semibold text-indigo-600/40 mb-2 tracking-widest">STEP {step.num}</div>

                <h3 className="text-lg font-normal font-display group-hover:text-indigo-600 transition-colors duration-300 mb-3">
                  {step.title}
                </h3>
                <p className="text-xs text-[var(--c-ink-2)] leading-relaxed font-extralight">
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
      <section className="max-w-5xl mx-auto px-6 section-rhythm-lg cta-section">
        <div className="glass-panel-glow rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          
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
          {/* Transform-only: an opacity fade here could strand the mark invisible. */}
          <motion.div
            initial={{ scale: 0.8 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="w-10 h-10 mx-auto text-indigo-600 mb-6" strokeWidth={1.5} />
          </motion.div>
          
          <h3 className="t-cta font-display max-w-2xl mx-auto mb-6">
            Pick a roadmap.<br/>
            <span className="text-shimmer">Learn one thing a day.</span>
          </h3>

          <p className="text-sm md:text-base text-[var(--c-ink-2)] max-w-lg mx-auto leading-relaxed mb-10 font-extralight">
            Sequenced steps, the best free video for each tool, and a streak to keep you going — on a syllabus that updates itself from live momentum data.
          </p>

          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <Link href="/roadmaps" className="btn-primary">
              <Compass className="w-4 h-4" /> Start a roadmap <ArrowRight className="w-4 h-4" />
            </Link>

            <Link href="/trends" className="btn-secondary">
              See the live data <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          WAITLIST — the vision / personalized version
         ══════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <WaitlistCapture source="landing" />
      </section>

      {/* ══════════════════════════════════════════
          LIVE INTEGRATION FEED FOOTER
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-[var(--c-border)]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-4">
            {/* Iris, not emerald — green means momentum, not "online". */}
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-1)] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-1)]" />
            </div>
            <div>
              {/* The label and the line below it used to say the same thing, and
                  "Live Parser Stream Active" named an internal component. Now the
                  label names the thing and the line says what it is watching. */}
              <p className="text-xs font-mono text-[var(--c-ink-2)]/50 uppercase tracking-wider">LIVE DATA FEED</p>
              <h3 className="text-sm font-normal text-[var(--c-ink)]">Rescanning every 30 minutes</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-mono text-[var(--c-ink-2)]/50">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-indigo-600/60" /> RSS NEWS</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-indigo-600/60" /> REDDIT</span>
            <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-indigo-600/60" /> GITHUB</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-indigo-600/60" /> HACKERNEWS</span>
          </div>

        </div>
      </section>

      </div>
    </DashboardShell>
  );
}

