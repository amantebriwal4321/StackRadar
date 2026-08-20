"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, ArrowRight, Compass, Star, Flame, Database,
  Brain, Activity, Rocket, Sparkles, ChevronRight, Zap,
} from "lucide-react";
import { type Tool, type DomainSummary, type Overview } from "@/data/trends";
import FiveMinutePlan from "@/components/FiveMinutePlan";
import WaitlistCapture from "@/components/WaitlistCapture";
import ContinueLearning from "@/components/ContinueLearning";

/**
 * Purpose-built landing page for phones.
 *
 * The desktop home is a wide, two-column, GSAP-ScrollTrigger + R3F-3D affair —
 * none of which behaves on a real phone (ScrollTrigger mis-fires on address-bar
 * resize and left whole sections invisible; a WebGL constellation janks on
 * low-end devices). This is a separate, single-column, touch-first tree that
 * page.tsx mounts INSTEAD of the desktop one below 768px — so the heavy desktop
 * bits never mount on a phone at all.
 *
 * Everything a visitor needs is here, as big tappable cards, and every reveal
 * uses Framer Motion `whileInView` (IntersectionObserver) which is reliable on
 * mobile. Data comes in as props — the same single fetch the page already runs.
 */

const REVEAL_TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

/* Quick questions → the page that answers each one. */
const quickQuestions = [
  { icon: "🧭", label: "What should I learn next?", href: "/explore" },
  { icon: "📈", label: "What's trending this week?", href: "/trends" },
  { icon: "⚖️", label: "Compare two technologies", href: "/compare" },
  { icon: "🗺️", label: "Browse learning roadmaps", href: "/roadmaps" },
];

const steps = [
  { icon: Database, title: "We listen to the industry", desc: "GitHub, Reddit and Hacker News, tracked around the clock." },
  { icon: Brain, title: "We separate signal from hype", desc: "Real developer talk, not marketing noise." },
  { icon: Activity, title: "Every tool gets a live score", desc: "A 0–100 momentum score from real usage." },
  { icon: Rocket, title: "Your roadmap stays current", desc: "The path re-ranks itself from that data." },
];

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-emerald-600", bar: "bg-emerald-500", ring: "#12B76A" };
  if (score >= 60) return { text: "text-amber-600", bar: "bg-amber-500", ring: "#B54708" };
  return { text: "text-rose-600", bar: "bg-rose-500", ring: "#F04438" };
}

interface Props {
  tools: Tool[];
  domains: DomainSummary[];
  movers: Tool[];
  overview: Overview | null;
  isLoading: boolean;
}

export default function MobileHome({ tools, domains, movers, overview, isLoading }: Props) {
  const router = useRouter();

  /* ─── Fail-safe animation gate ───
     Content must NEVER be hidden waiting on an animation that might not fire —
     that was the whole mobile-breakage class of bug. So entrance reveals only
     engage once we've confirmed the tab is actually visible (rAF ticking, which
     Framer/rAF need). Until then — and if the tab is hidden, reduced-motion is
     on, or JS stalls — everything renders at its natural, VISIBLE resting state.
     `initial={false}` tells Framer to skip the hidden start and paint the final
     state directly. */
  const [canAnimate, setCanAnimate] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // keep everything visible, no motion
    if (document.visibilityState === "visible") { setCanAnimate(true); return; }
    const onVis = () => { if (document.visibilityState === "visible") setCanAnimate(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Scroll-reveal props: hidden→visible only when animation is safe; otherwise
  // no initial (element paints visible immediately).
  const reveal = canAnimate
    ? {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-8% 0px" },
        transition: REVEAL_TRANSITION,
      }
    : { initial: false as const, transition: REVEAL_TRANSITION };

  const stats = {
    tools: overview?.tools_tracked || tools.length || 0,
    stars: overview?.total_stars || 0,
    sources: overview?.source_count || 5,
  };

  // Light, GPU-cheap hero visual: top tools by score as floating momentum chips.
  const chips = [...tools].sort((a, b) => b.score - a.score).slice(0, 6);

  /* Sticky action bar: once the 5-minute-plan section has scrolled ABOVE the
     viewport, surface a persistent "get my plan" button so a deep-scrolling
     visitor is always one tap from the conversion — the standard high-intent
     mobile pattern. Hidden while the plan itself is on screen (no redundancy). */
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = document.getElementById("plan-m");
    if (!el) return;
    // Scroll listener (not IntersectionObserver) so it fires reliably on every
    // engine: show the bar once the plan's bottom edge is above the viewport.
    const onScroll = () => setShowBar(el.getBoundingClientRect().bottom < 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLoading]);

  return (
    <div className="pb-28">
      {/* ══════════ HERO ══════════ */}
      <section className="relative px-5 pt-4 pb-8 overflow-hidden">
        {/* soft accent wash + faint HUD grid for depth (Neon Noir identity) */}
        <div className="hud-grid absolute inset-0 opacity-[0.14] pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="absolute -top-10 -right-16 w-64 h-64 rounded-full bg-[var(--accent-2)]/[0.10] blur-3xl pointer-events-none" />
        <div className="absolute top-24 -left-20 w-56 h-56 rounded-full bg-[var(--accent-1)]/[0.08] blur-3xl pointer-events-none" />

        <div className="relative">
          <motion.div
            initial={canAnimate ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] text-[10px] font-mono font-bold text-indigo-600 tracking-wider mb-5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
            </span>
            LIVE-DATA LEARNING ROADMAPS
          </motion.div>

          <motion.h1
            initial={canAnimate ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
            className="text-[2.6rem] leading-[1.05] font-black tracking-tight font-display mb-4"
          >
            Learn the right tech,{" "}
            <span className="gradient-text">in the right order</span>
            <span className="text-[var(--c-ink)]">.</span>
          </motion.h1>

          <motion.p
            initial={canAnimate ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
            className="text-[15px] text-[var(--c-ink-2)] leading-relaxed font-light mb-6"
          >
            <span className="font-semibold text-[var(--c-ink)]">Live momentum data, turned into a step-by-step roadmap</span> — the right tools in the right order, each with the single best free video.
          </motion.p>

          {/* Primary CTA — big, full-width, thumb-reachable */}
          <motion.div
            initial={canAnimate ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
            className="flex flex-col gap-3 mb-7"
          >
            <a href="#plan-m" className="btn-primary text-[15px] py-4 rounded-2xl justify-center font-bold">
              <Compass className="w-5 h-5" /> Get my 5-minute plan <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/trends" prefetch
              className="py-3.5 rounded-2xl border border-indigo-500/20 bg-[var(--c-surface)]/60 text-sm font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <TrendingUp className="w-4 h-4" /> See the live data
            </Link>
          </motion.div>

          {/* Live momentum rail — tappable tool chips in a tidy edge-to-edge
              scroll strip (was a wrapping cloud). Still animated, still cheap. */}
          {chips.length > 0 && (
            <div className="-mx-5 mb-6">
              <div className="px-5 flex items-center gap-2 mb-2.5">
                <span className="w-6 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent" />
                <span className="text-[9px] font-mono font-bold text-indigo-600/70 uppercase tracking-[0.18em]">Live momentum · tap to open</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x px-5 pb-1">
                {chips.map((t, i) => (
                  <motion.button
                    key={t.slug}
                    initial={canAnimate ? { opacity: 0, scale: 0.92 } : false}
                    animate={canAnimate ? { opacity: 1, scale: 1, y: [0, -3, 0] } : { opacity: 1, scale: 1 }}
                    transition={{
                      opacity: { delay: 0.25 + i * 0.06, duration: 0.4 },
                      scale: { delay: 0.25 + i * 0.06, duration: 0.4 },
                      y: { repeat: Infinity, duration: 3 + i * 0.4, ease: "easeInOut", delay: i * 0.2 },
                    }}
                    onClick={() => router.push(`/tools/${t.slug}`)}
                    className="snap-start shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-2 rounded-full border border-indigo-500/15 bg-[var(--c-surface)]/80 text-[12px] font-mono font-bold text-[var(--c-ink)] shadow-sm active:scale-95 transition-transform"
                  >
                    <span className="text-sm leading-none">{t.icon}</span>
                    {t.name}
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-600/12 text-indigo-600 text-[10px] leading-none">{Math.round(t.score)}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Live stats — one cohesive terminal-style bar (was 3 loose boxes) */}
          <div className="flex items-stretch rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)]/60 overflow-hidden divide-x divide-[var(--c-border)]">
            {[
              { label: "Technologies", value: stats.tools },
              { label: "GitHub stars", value: stats.stars >= 1000 ? `${(stats.stars / 1000).toFixed(0)}k` : stats.stars },
              { label: "Live sources", value: stats.sources },
            ].map((s) => (
              <div key={s.label} className="flex-1 px-3 py-3.5 text-center">
                <div className="text-xl font-black font-mono text-[var(--c-ink)] leading-none mb-1">
                  {isLoading ? <span className="text-[var(--c-ink-2)]/40">—</span> : s.value}
                </div>
                <div className="text-[9px] font-mono text-[var(--c-ink-2)]/60 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CONTINUE LEARNING (return hook) ══════════ */}
      <section className="px-5 mb-8">
        <ContinueLearning />
      </section>

      {/* ══════════ 5-MINUTE PLAN — the conversion front door ══════════ */}
      <section id="plan-m" className="px-5 mb-10 scroll-mt-20">
        <FiveMinutePlan />
      </section>

      {/* ══════════ PICK A DOMAIN → ROADMAP ══════════ */}
      <section className="px-5 mb-10">
        <motion.div {...reveal} className="mb-5">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-widest mb-2">
            <Compass className="w-4 h-4" /> Choose your path
          </div>
          <h2 className="text-2xl font-black font-display tracking-tight leading-tight">
            Pick a domain, get a roadmap
          </h2>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-indigo-500/5 bg-[var(--c-surface-2)]/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((d, i) => {
              const c = scoreColor(d.score);
              return (
                <motion.button
                  key={d.slug}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: Math.min(i * 0.05, 0.3) }}
                  onClick={() => router.push(`/explore?domain=${d.slug}`)}
                  className="w-full text-left tech-panel rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
                >
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-[var(--c-surface-2)] border border-[var(--c-border)] flex items-center justify-center text-2xl">
                    {d.icon || "📂"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold font-display truncate">{d.name}</h3>
                      <span className={`ml-auto shrink-0 text-sm font-mono font-black ${c.text}`}>{d.score}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--c-ground)] rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${d.score}%` }} />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--c-ink-2)]/60">
                      <span className="uppercase">{d.stage} adoption</span>
                      <span className="text-indigo-600/80 flex items-center gap-0.5">{d.tool_count} tools <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      <div className="glow-line mx-5 mb-10" />

      {/* ══════════ RISING THIS WEEK — horizontal snap carousel ══════════ */}
      <section className="mb-10">
        <motion.div {...reveal} className="px-5 mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-widest mb-2">
              <Flame className="w-4 h-4" /> Rising this week
            </div>
            <h2 className="text-2xl font-black font-display tracking-tight">Worth learning now</h2>
          </div>
          <Link href="/trends" prefetch className="shrink-0 text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-0.5 pb-1 active:opacity-70">
            see all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="px-5 flex gap-4 overflow-hidden">
            {[1, 2].map((i) => <div key={i} className="h-36 w-64 shrink-0 rounded-2xl bg-[var(--c-surface-2)]/30 animate-pulse" />)}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory px-5 pb-2">
            {movers.map((t) => (
              <button
                key={t.slug}
                onClick={() => router.push(`/tools/${t.slug}`)}
                className="snap-start shrink-0 w-[78vw] max-w-[300px] text-left tech-panel rounded-2xl p-5 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl p-2 bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl">{t.icon}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{t.name}</h3>
                    <p className="text-[10px] text-[var(--c-ink-2)]/60 font-mono truncate">{t.category}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-black font-mono">{t.score}</div>
                    <div className="text-[8px] font-mono text-[var(--c-ink-2)]/50 uppercase">score</div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-indigo-500/5 pt-3 font-mono text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" /> +{t.growth_pct.toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1 text-[var(--c-ink-2)]/60 text-[10px]">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {t.stars >= 1000 ? `${(t.stars / 1000).toFixed(0)}k` : t.stars}
                  </span>
                  <span className="text-[10px] text-indigo-600/80 flex items-center gap-0.5">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ══════════ QUICK QUESTIONS console ══════════ */}
      <section className="px-5 mb-10">
        <motion.div {...reveal} className="tech-panel rounded-2xl overflow-hidden">
          <div className="terminal-bar">
            <span className="terminal-dot bg-[#F04438]/85" />
            <span className="terminal-dot bg-[#E0A82E]/85" />
            <span className="terminal-dot bg-[#12B76A]/85" />
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
            </span>
          </div>
          <div className="p-4 bg-[var(--c-surface)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-indigo-500 font-mono text-sm font-bold">&gt;</span>
              <span className="font-mono text-[10px] text-[var(--c-ink-2)] uppercase tracking-[0.12em]">what do you want to figure out?</span>
            </div>
            <div className="space-y-2">
              {quickQuestions.map((q) => (
                <Link
                  key={q.href + q.label}
                  href={q.href} prefetch
                  className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-2)] active:scale-[0.98] transition-transform"
                >
                  <span className="text-lg leading-none">{q.icon}</span>
                  <span className="text-sm font-medium text-[var(--c-ink)] flex-1 leading-tight">{q.label}</span>
                  <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════ HOW IT WORKS — vertical timeline ══════════ */}
      <section className="px-5 mb-10">
        <motion.div {...reveal} className="text-center mb-6">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-widest mb-2">
            <Zap className="w-4 h-4" /> Why it stays current
          </div>
          <h2 className="text-2xl font-black font-display leading-tight">
            A roadmap that updates <span className="text-shimmer">itself from live data</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: Math.min(i * 0.06, 0.3) }}
                className="tech-panel rounded-2xl p-4 flex items-start gap-4"
              >
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center shadow-lg shadow-[var(--accent-1)]/25">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-indigo-600/50 tracking-widest mb-1">STEP 0{i + 1}</div>
                  <h3 className="text-[15px] font-bold font-display leading-tight mb-1">{s.title}</h3>
                  <p className="text-xs text-[var(--c-ink-2)] leading-relaxed font-light">{s.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div className="glow-line mx-5 mb-10" />

      {/* ══════════ CTA ══════════ */}
      <section className="px-5">
        <motion.div {...reveal} className="glass-panel-glow rounded-3xl p-7 text-center border border-indigo-500/15 bg-[var(--c-surface-2)]/70 relative overflow-hidden">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-[var(--accent-2)]/[0.10] blur-3xl pointer-events-none" />
          <Sparkles className="w-8 h-8 mx-auto text-indigo-600 mb-4 relative" />
          <h3 className="text-2xl font-black font-display tracking-tight leading-tight mb-3 relative">
            Pick a roadmap.<br /><span className="text-shimmer">Learn one thing a day.</span>
          </h3>
          <p className="text-sm text-[var(--c-ink-2)] leading-relaxed mb-6 font-light relative">
            Sequenced steps, the best free video for each tool, and a streak to keep you going.
          </p>
          <div className="flex flex-col gap-3 relative">
            <Link href="/roadmaps" className="btn-primary text-[15px] py-4 rounded-2xl justify-center font-bold">
              <Compass className="w-5 h-5" /> Start a roadmap <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#plan-m" className="py-3.5 rounded-2xl border border-indigo-500/20 bg-[var(--c-surface)]/60 text-sm font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              Get my 5-minute plan
            </a>
          </div>
        </motion.div>
      </section>

      {/* ══════════ WAITLIST — the vision ══════════ */}
      <section className="px-5 pt-10 pb-28">
        <WaitlistCapture source="mobile" />
      </section>

      {/* ══════════ STICKY ACTION BAR — persistent conversion CTA ══════════ */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={canAnimate ? { y: 90, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed bottom-0 inset-x-0 z-40 px-4 pt-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--c-ground)] via-[var(--c-ground)]/95 to-transparent pointer-events-none"
          >
            <a
              href="#plan-m"
              className="btn-primary w-full py-4 rounded-2xl justify-center font-bold text-[15px] shadow-xl shadow-[var(--accent-1)]/30 pointer-events-auto"
            >
              <Compass className="w-5 h-5" /> Get my 5-minute plan <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
