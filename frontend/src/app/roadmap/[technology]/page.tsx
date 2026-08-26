"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Calendar, Award, BookOpen, Star, Sparkles, Check, Flame, Play, ListVideo, Youtube } from "lucide-react";
import { useUser, useAuth, SignInButton } from "@clerk/nextjs";
import { fetchRoadmap, fetchProgress, toggleProgressStep, type Roadmap } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";
import { Accordion, AccordionItem } from "@/components/ui/accordion";

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-500 border-emerald-400/30 text-emerald-600",
  Intermediate: "bg-amber-500 border-amber-400/30 text-amber-600",
  Advanced: "bg-rose-500 border-rose-400/30 text-rose-600",
};

const levelBadgeColors: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  Advanced: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
};

export default function RoadmapPage() {
  const params = useParams();
  const slug = params.technology as string;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Learning progress ──
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id || "";
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [percent, setPercent] = useState(0);
  const [savingStep, setSavingStep] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !slug) return;
    getToken()
      .then((token) => fetchProgress(slug, userId, token))
      .then((p) => { setCompletedSteps(p.completed_steps); setPercent(p.percent); })
      .catch(() => { /* progress is additive — never block the roadmap itself */ });
  }, [userId, slug, getToken]);

  const handleToggle = useCallback(async (step: number) => {
    if (!userId) return;
    setSavingStep(step);
    // Optimistic: the checkbox must feel instant or the habit never forms.
    const prev = completedSteps;
    const optimistic = prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step];
    setCompletedSteps(optimistic);
    try {
      const token = await getToken();
      const res = await toggleProgressStep(slug, userId, step, token);
      setCompletedSteps(res.completed_steps);
      setPercent(res.percent);
      window.dispatchEvent(new CustomEvent("progress:changed"));
    } catch {
      setCompletedSteps(prev); // roll back on failure
    } finally {
      setSavingStep(null);
    }
  }, [userId, slug, completedSteps, getToken]);

  // Scroll tracking states
  const timelineRef = useRef<HTMLDivElement>(null);
  const [scrollFillHeight, setScrollFillHeight] = useState(0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchRoadmap(slug);
        setRoadmap(data);
      } catch (err: any) {
        setError(err.message || "Roadmap profile not found");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  // Track window scrolls to fill timeline neon line
  useEffect(() => {
    if (isLoading || error || !roadmap) return;

    const handleScroll = () => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const startOffset = windowHeight * 0.7; // Start drawing when container hits 70% height
      const endOffset = windowHeight * 0.3; // Full progress when container bottom reaches 30% height
      
      const totalHeight = rect.height;
      const topOffset = rect.top;
      
      const progressAmount = startOffset - topOffset;
      const maxScrollDist = totalHeight - (startOffset - endOffset);
      const percentage = Math.min(Math.max(progressAmount / maxScrollDist, 0), 1);
      
      setScrollFillHeight(percentage * 100);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    
    // Initial call
    setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isLoading, error, roadmap]);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-mono text-[var(--c-ink-2)]/70">Retrieving sequence map...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error || !roadmap) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="text-center space-y-4 max-w-sm glass-panel p-8 rounded-xl border border-indigo-500/10">
            <span className="text-3xl">⚠️</span>
            <p className="font-mono text-xs">{error || "Roadmap not found"}</p>
            <Link href="/roadmaps" className="inline-block text-xs font-mono bg-[var(--c-surface-2)] hover:bg-[var(--c-surface-2)]/80 text-[var(--c-ink-2)] hover:text-[var(--c-ink)] px-4 py-2 border border-indigo-500/10 rounded transition-all">
              RETURN_TO_ROADMAPS
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const steps = roadmap.steps || [];
  // The first unfinished module — drives both the "Next up" badge below and
  // which accordion panel is open on arrival.
  const nextUpStep = steps.filter((st) => !completedSteps.includes(st.step))[0]?.step;

  return (
    <DashboardShell>
      
      {/* Page Glow backdrop */}

      <div className="max-w-5xl mx-auto space-y-8 relative z-10 pb-16">

        {/* Back navigation */}
        <Link href="/roadmaps" className="inline-flex items-center text-xs font-mono text-[var(--c-ink-2)] hover:text-[var(--c-ink)] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> RETURN_TO_ROADMAPS
        </Link>

        {/* ─── Premium track hero ───
            This is the app's centrepiece page, so the header carries real weight:
            a large glowing domain icon, an oversized gradient title, stat pills,
            and Neon-Noir depth (HUD grid + accent glows) behind it. */}
        <header className="relative overflow-hidden rounded-3xl border border-indigo-500/15 bg-[var(--c-surface)]/70 backdrop-blur-md p-8 md:p-14 text-center">
          <div className="hud-grid absolute inset-0 opacity-[0.12] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />

          <div className="relative max-w-3xl mx-auto">
            {/* Domain icon. Was an Iris→Saffron gradient tile with a blurred glow
                behind it — the one colour pairing the spec rules out ("Saffron is
                a highlight role, NOT a gradient partner"), plus a shadow and a
                colour wash. The glyph carries it alone on the void. */}
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-7 flex items-center justify-center text-5xl md:text-6xl select-none">
              {roadmap.icon}
            </div>

            <span className="inline-flex items-center gap-2.5 text-[10px] md:text-[11px] font-mono font-semibold text-indigo-600 uppercase tracking-[0.22em] mb-4">
              <span className="w-7 h-px bg-[var(--c-border)]" />
              Learning Track
              <span className="w-7 h-px bg-[var(--c-border)]" />
            </span>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-normal font-display tracking-[-0.04em] leading-[0.95] mb-5">
              <span className="text-[var(--c-ink)]">Master </span>
              <span className="gradient-text">{roadmap.title}</span>
            </h1>

            <p className="text-base md:text-lg text-[var(--c-ink-2)] leading-relaxed max-w-2xl mx-auto font-extralight mb-7">
              {roadmap.description || "Guided, sequenced steps built from live technology momentum — the right things to learn, in the right order."}
            </p>

            {/* Stat pills */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/15 bg-[var(--c-surface-2)]/70 text-xs font-mono font-semibold text-[var(--c-ink-2)]">
                <Calendar className="w-4 h-4 text-indigo-600" /> ~{roadmap.estimated_weeks} weeks
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/15 bg-[var(--c-surface-2)]/70 text-xs font-mono font-semibold text-[var(--c-ink-2)]">
                <Award className="w-4 h-4 text-indigo-600" /> {steps.length} modules
              </span>
              <Link
                href={`/explore?domain=${slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/20 text-xs font-mono font-normal text-indigo-600 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Live tool momentum <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* ── Your progress ── */}
            <div className="max-w-lg mx-auto">
              {isSignedIn ? (
                <div className="rounded-2xl border border-indigo-500/15 bg-[var(--c-surface-2)]/40 p-5 text-left">
                  {/* Label + count, with a big gradient percentage */}
                  <div className="flex items-end justify-between mb-3.5">
                    <div>
                      <div className="text-[10px] font-mono font-semibold text-[var(--c-ink-2)] uppercase tracking-wider">Your progress</div>
                      <div className="text-[11px] font-mono text-[var(--c-ink-2)]/70 mt-1">
                        <span className="font-semibold text-[var(--c-ink)] tabular-nums">{completedSteps.length}</span> of {steps.length} modules complete
                      </div>
                    </div>
                    <div className="text-3xl md:text-4xl font-normal font-mono gradient-text tabular-nums leading-none">{percent}%</div>
                  </div>

                  {/* Segmented module tracker — one segment per module, so a glance
                      shows exactly which are done (and which aren't), not just a
                      single fill level. Completed segments glow with the accent. */}
                  <div className="flex gap-1.5">
                    {steps.map((s) => {
                      const done = completedSteps.includes(s.step);
                      return (
                        <div
                          key={s.step}
                          title={`Module ${s.step}${done ? " — done" : ""}`}
                          className={`h-2.5 flex-1 rounded-full transition-all duration-500 ${
                            done
                              ? "bg-[var(--accent-1)]"
                              : "bg-[color-mix(in_srgb,var(--c-ink)_10%,transparent)]"
                          }`}
                        />
                      );
                    })}
                  </div>

                  {percent === 100 ? (
                    <p className="mt-3.5 text-[11px] font-mono font-normal text-[#12B76A] flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" /> Track complete — every module done.
                    </p>
                  ) : percent === 0 ? (
                    /* First-run coaching — hides itself after the first completed module. */
                    <div className="mt-3.5 rounded-xl border border-indigo-500/20 bg-indigo-600/[0.06] px-4 py-3">
                      <p className="text-[10px] font-mono font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
                        New here? How this works
                      </p>
                      <ol className="space-y-1 text-[11px] text-[var(--c-ink-2)] font-extralight list-decimal list-inside marker:text-indigo-600 marker:font-semibold">
                        <li>Begin with the highlighted <span className="font-semibold text-[var(--c-ink)]">Next up</span> module below.</li>
                        <li>Pick a way to learn it — <span className="font-semibold text-[var(--c-ink)]">Watch a video</span> or <span className="font-semibold text-[var(--c-ink)]">Read the guide</span>.</li>
                        <li>Come back and <span className="font-semibold text-[var(--c-ink)]">Mark as done</span> — a segment lights up and your streak grows.</li>
                      </ol>
                    </div>
                  ) : (
                    <p className="mt-3.5 text-[10px] font-mono text-[var(--c-ink-2)]/70">
                      Finished a module? Hit <span className="text-indigo-600 font-semibold">Mark as done</span> to light up its segment.
                    </p>
                  )}
                </div>
              ) : (
                <SignInButton mode="modal">
                  <button className="w-full px-4 py-3 rounded-xl border border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/20 text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-600 transition-colors cursor-pointer">
                    Sign in to track your progress
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </header>

        {/* Timeline track container */}
        <div ref={timelineRef} className="relative pl-12 md:pl-20 pr-2 space-y-6">
          
          {/* Static Background track Line */}
          <div className="absolute left-[2.35rem] md:left-[4.35rem] top-10 bottom-10 w-0.5 bg-indigo-500/10 z-0" />
          
          {/* Spine fill.
              Signed in, this tracks REAL completion — it used to be driven by
              scroll position, which looked exactly like a progress bar while
              measuring nothing about your progress. Signed out there is no
              progress to show, so it falls back to the scroll flourish. */}
          <div
            className={`absolute left-[2.35rem] md:left-[4.35rem] top-10 w-0.5 z-0 transition-all duration-500 ease-out ${
              isSignedIn
                ? "bg-[#12B76A]"
                : "bg-indigo-500"
            }`}
            style={{ height: `${isSignedIn ? percent : scrollFillHeight}%` }}
          />

          {/* Steps as accordion panels. `key` includes the next-up step so that
              finishing a module remounts with the FOLLOWING one already open —
              the page always shows exactly one next thing to do. */}
          <Accordion
            key={`acc-${nextUpStep ?? "none"}`}
            className="space-y-6"
            defaultOpen={nextUpStep != null ? `step-${nextUpStep}` : null}
          >
          {steps.map((step, idx) => {
            const levelStyle = levelBadgeColors[step.level] || "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20";
            const levelDotClass = levelColors[step.level] || "bg-indigo-500";
            const isDone = completedSteps.includes(step.step);
            const isNextUp = !isDone && nextUpStep === step.step;

            return (
              <div
                key={idx}
                className={`glass-panel p-4 md:p-6 rounded-2xl border transition-all duration-300 relative group flex gap-4 md:gap-5 items-start slide-up z-10 ${
                  isDone
                    // Done modules recede: clearly marked, but visually quieter so
                    // attention lands on what's still ahead.
                    ? "border-[#12B76A]/40 bg-[#12B76A]/[0.10] opacity-75 hover:opacity-100"
                    : isNextUp
                      // The one thing to do next gets the strongest treatment on the page.
                      ? "border-indigo-500/50 bg-[var(--c-surface-2)]/80 ring-2 ring-[var(--accent-1)]/40 shadow-[0_4px_20px_-4px_var(--accent-1)]"
                      : "border-indigo-500/10 bg-[var(--c-surface-2)]/40 hover:bg-[var(--c-surface-2)]/70 hover:border-indigo-400/30"
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Floating Module Indicator Label — carries completion state too,
                    so the left rail reads as a progress ledger at a glance rather
                    than looking identical whether a module is done or not. */}
                <div
                  className={`absolute -left-12 md:-left-20 top-7 font-mono text-[9px] uppercase tracking-widest text-right w-8 md:w-14 select-none transition-colors ${
                    isDone
                      ? "text-[#12B76A] font-semibold"
                      : isNextUp
                        ? "text-indigo-600 font-semibold"
                        : "text-[var(--c-ink-2)]/50"
                  }`}
                >
                  {isDone ? "DONE" : `MOD_[${step.step < 10 ? `0${step.step}` : step.step}]`}
                </div>

                {/* Step node — doubles as the completion checkbox when signed in */}
                <div className="shrink-0 z-20 mt-1 select-none">
                  {isSignedIn ? (
                    <button
                      /* The circle can only ADD completion, never remove it.
                         It used to toggle, so a stray click on a finished module
                         silently destroyed that progress with no confirmation —
                         which wiped real progress twice. Un-completing now has to
                         go through the explicitly labelled "Completed — undo"
                         button below, where the consequence is spelled out. */
                      onClick={() => { if (!isDone) handleToggle(step.step); }}
                      disabled={savingStep === step.step || isDone}
                      aria-label={isDone ? `"${step.title}" completed` : `Mark "${step.title}" as done`}
                      aria-pressed={isDone}
                      title={isDone ? "Completed — use the button below to undo" : "Click to mark this module complete"}
                      /* The circle now encodes COMPLETION ONLY. It used to be tinted by
                         difficulty level, which collided with green-means-done and made
                         a "Beginner" module look finished. Level is still shown by the
                         BEGINNER/INTERMEDIATE badge next to the title. Unchecked renders
                         as a dashed outline so it reads as an empty checkbox, not a
                         decorative step number. */
                      className={`group/check w-8 h-8 rounded-full flex items-center justify-center font-mono font-normal text-xs transition-all ${
                        isDone
                          // Locked, but must still read as "achieved", not "greyed out".
                          ? "bg-[#12B76A] border-2 border-[#12B76A] text-white cursor-default"
                          : "bg-transparent border-2 border-dashed border-[var(--c-ink-2)]/50 text-[var(--c-ink-2)] hover:border-[#12B76A] hover:border-solid hover:text-[#12B76A] cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-60"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4" strokeWidth={3} />
                      ) : (
                        <>
                          <span className="group-hover/check:hidden">{step.step}</span>
                          <Check className="w-4 h-4 hidden group-hover/check:block" strokeWidth={3} />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-normal text-xs border text-[var(--c-ink)] ${levelDotClass}`}>
                      {step.step}
                    </div>
                  )}
                </div>

                {/* Content body — folded into an accordion panel so a 10-step
                    path stays scannable. The header keeps title + status badges
                    visible while collapsed; the number circle stays OUTSIDE the
                    trigger so it still marks the step complete. */}
                <AccordionItem
                  id={`step-${step.step}`}
                  className="flex-1 min-w-0"
                  icon="chevron"
                  header={
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={`text-base font-normal font-display transition-colors ${
                      isDone ? "text-[var(--c-ink-2)] line-through decoration-[#12B76A]/50" : "text-[var(--c-ink)] group-hover:text-indigo-600"
                    }`}>
                      {step.title}
                    </h3>
                    {isNextUp && (
                      <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[8px] font-mono font-semibold uppercase tracking-wider">
                        Next up
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-semibold uppercase tracking-wider ${levelStyle}`}>
                      {step.level}
                    </span>
                  </div>
                  }
                >
                  <div className="space-y-3 pt-3">

                  <p className="text-xs md:text-sm text-[var(--c-ink-2)] leading-relaxed font-extralight font-mono">
                    {step.description}
                  </p>

                  {/* ─── Ways to learn this step ───
                      One clear, labelled group of tappable options instead of a
                      scatter of a button + tiny text links. "Watch" (a video) vs
                      "Read" (each syllabus doc) — each a big touch target that
                      stacks full-width on mobile. This is what a learner scans to
                      decide "how do I actually do this step?". */}
                  <div className="pt-1 space-y-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-[var(--c-ink-2)]/70 uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Ways to learn this
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Watch — always available (foundational steps have no tool) */}
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(step.title + " full tutorial")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--accent-1)]/20 bg-[var(--accent-1)]/[0.06] hover:bg-[var(--accent-1)]/[0.12] hover:border-[var(--accent-1)]/40 active:scale-[0.98] transition-all"
                      >
                        <span className="w-9 h-9 shrink-0 rounded-lg bg-[var(--accent-1)]/15 flex items-center justify-center">
                          <Youtube className="w-4 h-4 text-[var(--accent-1)]" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--c-ink)] leading-tight">Watch a video</span>
                          <span className="block text-[10px] text-[var(--c-ink-2)]/70 font-mono">Full tutorial on YouTube</span>
                        </span>
                        <ArrowRight className="w-4 h-4 text-[var(--accent-1)] shrink-0" />
                      </a>

                      {/* Read — one button per syllabus doc */}
                      {step.resources?.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-indigo-500/20 bg-[var(--c-surface)]/70 hover:bg-[var(--c-surface-2)] hover:border-indigo-400/40 active:scale-[0.98] transition-all"
                        >
                          <span className="w-9 h-9 shrink-0 rounded-lg bg-indigo-600/12 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold text-[var(--c-ink)] leading-tight truncate">{res.label}</span>
                            <span className="block text-[10px] text-[var(--c-ink-2)]/70 font-mono">Read &amp; follow along</span>
                          </span>
                          <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Live-tracked tools you'll use at this stage */}
                  {step.tools && step.tools.length > 0 && (
                    <div className="pt-3 border-t border-indigo-500/5 space-y-2">
                      <span className="flex items-center gap-1 text-[9px] font-mono text-[var(--c-ink-2)]/60 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Tools you&apos;ll use · live momentum
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {step.tools.map((tool) => (
                          <div
                            key={tool.slug}
                            className="flex items-stretch rounded-lg border border-indigo-500/15 bg-[var(--c-surface)]/70 overflow-hidden"
                          >
                            <Link
                              href={`/tools/${tool.slug}`}
                              className="group/tool flex items-center gap-2 pl-2 pr-2.5 py-1.5 hover:bg-[var(--c-surface-2)] transition-all"
                            >
                              <span className="text-base leading-none select-none">{tool.icon}</span>
                              <span className="text-[11px] font-semibold text-[var(--c-ink)] group-hover/tool:text-indigo-600 transition-colors">{tool.name}</span>
                              <span
                                className="text-[10px] font-mono font-normal tabular-nums px-1.5 py-0.5 rounded"
                                style={{
                                  color: tool.score >= 70 ? "#12B76A" : tool.score >= 45 ? "#B54708" : "#F04438",
                                  background: `${tool.score >= 70 ? "#12B76A" : tool.score >= 45 ? "#B54708" : "#F04438"}14`,
                                }}
                              >
                                {Math.round(tool.score)}
                              </span>
                            </Link>
                            {/* Watch: jumps straight to the top curated video for
                                this tool. title is present once the resource cache
                                has warmed; before that it's still a valid link. */}
                            {tool.video && (
                              <a
                                href={tool.video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={
                                  tool.video.title
                                    ? `Our top pick: ${tool.video.title}${tool.video.channel ? ` — ${tool.video.channel}` : ""}`
                                    : `Our top ${tool.name} ${tool.video.kind === "playlist" ? "series" : "course"}`
                                }
                                className="flex items-center gap-1 px-2.5 border-l border-indigo-500/15 bg-[var(--accent-1)]/10 text-[10px] font-mono font-normal text-[var(--accent-1)] hover:bg-[var(--accent-1)] hover:text-white transition-colors whitespace-nowrap"
                              >
                                {tool.video.kind === "playlist"
                                  ? <ListVideo className="w-3.5 h-3.5" />
                                  : <Play className="w-3.5 h-3.5" />}
                                {tool.video.kind === "playlist" ? "Best series" : "Best course"}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress action — one clear control, visually separate from
                      the "learn" options above (this tracks progress, it isn't a
                      way to learn). Full-width on mobile so it's an easy tap. */}
                  {isSignedIn && (
                    <div className="pt-3">
                      <button
                        onClick={() => handleToggle(step.step)}
                        disabled={savingStep === step.step}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[11px] font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 ${
                          isDone
                            ? "border-[#12B76A]/40 bg-[#12B76A]/10 text-[#12B76A] hover:bg-[#12B76A]/20"
                            : "border-indigo-500/30 bg-indigo-600/[0.06] text-indigo-600 hover:bg-indigo-600/15"
                        }`}
                      >
                        {savingStep === step.step ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        )}
                        {isDone ? "Completed — tap to undo" : "Mark as done"}
                      </button>
                    </div>
                  )}

                  </div>
                </AccordionItem>

              </div>
            );
          })}
          </Accordion>

        </div>

      </div>
    </DashboardShell>
  );
}
