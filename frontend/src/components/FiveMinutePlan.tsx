"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, CheckCircle2, PlayCircle, Flame } from "lucide-react";
import { GOALS, type Goal } from "@/data/goals";
import ShareButton from "@/components/ShareButton";
import { fetchRoadmap, type Roadmap } from "@/data/trends";

/**
 * The five-minute front door.
 *
 * A student who lands here shouldn't have to understand "momentum percentiles"
 * to get value — they have one question: "what do I actually learn for the
 * career I want?" This asks exactly that in one tap and hands back a concrete
 * plan. The result screen shows the REAL first steps of the actual roadmap —
 * live data, not a brochure — because "here is your step 1" converts where
 * "trust us, there's a plan" doesn't.
 *
 * Deep link: /?plan=<roadmap-slug> lands with that goal pre-picked, so shared
 * links can open straight onto a plan.
 */

export default function FiveMinutePlan() {
  const [picked, setPicked] = useState<Goal | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const cache = useRef<Map<string, Roadmap>>(new Map());

  /* Fail-safe entrance: the goal buttons must be visible even if the entrance
     animation never fires (hidden tab, reduced-motion, stalled rAF). Gate the
     hidden `initial` on a confirmed-visible tab; otherwise paint them visible.
     This is the conversion centerpiece — it can never be blank. */
  const [canAnimate, setCanAnimate] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (document.visibilityState === "visible") { setCanAnimate(true); return; }
    const onVis = () => { if (document.visibilityState === "visible") setCanAnimate(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const pick = useCallback((g: Goal) => {
    setPicked(g);
    const hit = cache.current.get(g.slug);
    setRoadmap(hit ?? null);
    if (!hit) {
      fetchRoadmap(g.slug)
        .then((r) => { cache.current.set(g.slug, r); setRoadmap(r); })
        .catch(() => { /* preview simply falls back to the generic tiles */ });
    }
  }, []);

  // Deep link: ?plan=<slug> pre-picks a goal (used by shared links).
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("plan");
    const goal = slug && GOALS.find((g) => g.slug === slug);
    if (goal) pick(goal);
  }, [pick]);

  return (
    <div className="tech-panel rounded-3xl p-6 md:p-10 relative overflow-hidden">
      <div className="hud-grid absolute inset-0 opacity-[0.25] pointer-events-none" />
      {/* soft accent wash, kept subtle */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--accent-2)]/[0.07] blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Free · no sign-up to start
          </span>
        </div>

        <AnimatePresence mode="wait">
          {!picked ? (
            <motion.div
              key="chooser"
              initial={canAnimate ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <h2 className="text-2xl md:text-4xl font-normal font-display text-[var(--c-ink)] leading-tight mb-1.5">
                Get your 5-minute career plan
              </h2>
              <p className="text-sm md:text-base text-[var(--c-ink-2)] font-extralight max-w-xl mb-6">
                Pick where you want to go. We&apos;ll hand you the exact path — the right tools
                in the right order, each with the single best free video.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {GOALS.map((g, i) => (
                  <motion.button
                    key={g.slug}
                    onClick={() => pick(g)}
                    initial={canAnimate ? { opacity: 0, y: 12 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-indigo-500/15 bg-[var(--c-surface)]/70 hover:border-indigo-400/50 hover:bg-[var(--c-surface-2)] hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 text-left active:scale-[0.98] cursor-pointer"
                  >
                    <span className="text-2xl leading-none select-none group-hover:scale-110 transition-transform">{g.icon}</span>
                    <span className="text-sm font-bold text-[var(--c-ink)] flex-1 leading-tight group-hover:text-indigo-600 transition-colors">
                      {g.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-indigo-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={canAnimate ? { opacity: 0, scale: 0.97 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <button
                onClick={() => setPicked(null)}
                className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--c-ink-2)] hover:text-indigo-600 uppercase tracking-wider mb-4 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Pick a different goal
              </button>

              <div className="flex items-start gap-4 mb-6">
                <span className="text-4xl md:text-5xl leading-none select-none">{picked.icon}</span>
                <div>
                  <p className="text-[11px] font-mono text-indigo-600 uppercase tracking-widest mb-1">Your plan is ready</p>
                  <h2 className="text-2xl md:text-4xl font-normal font-display text-[var(--c-ink)] leading-tight">
                    {picked.label}
                  </h2>
                  <p className="text-sm text-[var(--c-ink-2)] font-extralight mt-1">{picked.outcome} · {picked.weeks}</p>
                </div>
              </div>

              {/* The real plan, previewed — live roadmap steps, not a brochure. */}
              {roadmap?.steps?.length ? (
                <div className="mb-6">
                  <p className="text-[11px] font-mono font-bold text-[var(--c-ink-2)] uppercase tracking-widest mb-3">
                    Your first steps
                  </p>
                  <div className="space-y-2">
                    {roadmap.steps.slice(0, 3).map((s, i) => (
                      <motion.div
                        key={s.step}
                        initial={canAnimate ? { opacity: 0, x: -12 } : false}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.12, duration: 0.35 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]/60"
                      >
                        <span className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {s.step}
                        </span>
                        <span className="text-sm font-bold text-[var(--c-ink)] flex-1 leading-tight">{s.title}</span>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--c-ink-2)]/60 shrink-0">{s.level}</span>
                      </motion.div>
                    ))}
                  </div>
                  {roadmap.steps.length > 3 && (
                    <p className="text-[11px] font-mono text-[var(--c-ink-2)]/70 mt-2 ml-1">
                      + {roadmap.steps.length - 3} more steps on the full roadmap
                    </p>
                  )}
                  {/* Trust row — what comes attached to every step */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-[11px] font-mono text-[var(--c-ink-2)]">
                    <span className="flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5 text-indigo-600" /> best free video each step</span>
                    <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-[#B54708]" /> streak tracking</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A]" /> check off as you go</span>
                  </div>
                </div>
              ) : (
                /* Roadmap still loading (or unreachable) — hold the space with the
                   generic promise so the layout doesn't jump. */
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: CheckCircle2, t: "Sequenced steps", d: "The right order, not a random pile" },
                    { icon: PlayCircle, t: "Best free video each", d: "Hand-picked, checked to be live" },
                    { icon: Flame, t: "Streak tracking", d: "One thing a day, keep momentum" },
                  ].map((f) => (
                    <div key={f.t} className="p-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]/60">
                      <f.icon className="w-5 h-5 text-indigo-600 mb-2" />
                      <p className="text-sm font-bold text-[var(--c-ink)]">{f.t}</p>
                      <p className="text-xs text-[var(--c-ink-2)] font-extralight mt-0.5">{f.d}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/roadmap/${picked.slug}`}
                  prefetch
                  className="btn-primary text-sm py-3.5 px-7 rounded-xl justify-center"
                >
                  Open my plan <ArrowRight className="w-4 h-4" />
                </Link>
                <ShareButton
                  path={`/plan/${picked.slug}`}
                  title={`My ${picked.label} plan on StackRadar`}
                  text={`${picked.outcome} — the right tools in the right order, each with the best free video. Free on StackRadar 👇`}
                  label="Share my plan"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
