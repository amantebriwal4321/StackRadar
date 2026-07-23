"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Calendar, Award, BookOpen, Star, Sparkles, Check, Flame, Play, ListVideo, Youtube } from "lucide-react";
import { useUser, useAuth, SignInButton } from "@clerk/nextjs";
import { fetchRoadmap, fetchProgress, toggleProgressStep, type Roadmap } from "@/data/trends";
import DashboardShell from "@/components/DashboardShell";

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

  return (
    <DashboardShell>
      
      {/* Page Glow backdrop */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 pb-16">

        {/* Back navigation */}
        <Link href="/roadmaps" className="inline-flex items-center text-xs font-mono text-[var(--c-ink-2)] hover:text-[var(--c-ink)] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> RETURN_TO_ROADMAPS
        </Link>

        {/* Cinematic Header Block */}
        <header className="p-6 md:p-8 rounded-2xl border border-indigo-500/10 bg-[var(--c-surface)]/80 backdrop-blur-md text-center space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 bg-[var(--c-surface-2)] border border-indigo-500/10 rounded-2xl mx-auto flex items-center justify-center text-4xl rotate-3 shadow-md shadow-indigo-500/5 select-none">
            {roadmap.icon}
          </div>
          
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">
              SEQUENTIAL EDUCATION TRACK
            </span>
            <h1 className="text-3xl md:text-5xl font-black font-display text-[var(--c-ink)] tracking-tight">
              Master {roadmap.title}
            </h1>
            <p className="text-sm text-[var(--c-ink-2)] leading-relaxed max-w-xl mx-auto font-light">
              {roadmap.description || "Guided step-by-step tracks structured directly from monitored technology specifications."}
            </p>
            <Link
              href={`/explore?domain=${slug}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-indigo-600 hover:text-[var(--c-ink)] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              This track is the concepts to master — see which {roadmap.title} tools have live momentum
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex justify-center gap-6 pt-2 font-mono text-[10px] text-[var(--c-ink-2)] uppercase">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-600" /> ~{roadmap.estimated_weeks} weeks duration</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-indigo-600" /> {steps.length} learning modules</span>
          </div>

          {/* ── Your progress ── */}
          <div className="pt-4 max-w-md mx-auto">
            {isSignedIn ? (
              <>
                <div className="flex items-center justify-between mb-2 font-mono text-[10px] uppercase tracking-wider">
                  <span className="text-[var(--c-ink-2)]">Your progress</span>
                  <span className="font-bold text-indigo-600 tabular-nums">
                    {completedSteps.length}/{steps.length} · {percent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--c-surface-2)] border border-[var(--c-border)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] transition-[width] duration-500 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {percent === 100 ? (
                  <p className="mt-2 text-[11px] font-mono font-bold text-[#12B76A] flex items-center justify-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Track complete — every module done.
                  </p>
                ) : percent === 0 ? (
                  /* First-run coaching. Someone landing here cold has no idea the
                     page tracks anything, so spell the loop out once — it hides
                     itself the moment they complete their first module. */
                  <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-600/[0.06] px-4 py-3 text-left">
                    <p className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
                      New here? How this works
                    </p>
                    <ol className="space-y-1 text-[11px] text-[var(--c-ink-2)] font-light list-decimal list-inside marker:text-indigo-600 marker:font-bold">
                      <li>Begin with the highlighted <span className="font-bold text-[var(--c-ink)]">Next up</span> module below.</li>
                      <li>Hit <span className="font-bold text-[var(--c-ink)]">Start learning</span> to open its material.</li>
                      <li>Come back and <span className="font-bold text-[var(--c-ink)]">Mark as done</span> — the bar fills and your streak grows.</li>
                    </ol>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] font-mono text-[var(--c-ink-2)]/70 text-center">
                    Finished a module? Hit <span className="text-indigo-600 font-bold">Mark as done</span> to move the bar.
                  </p>
                )}
              </>
            ) : (
              <SignInButton mode="modal">
                <button className="w-full px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/20 text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 transition-colors cursor-pointer">
                  Sign in to track your progress
                </button>
              </SignInButton>
            )}
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
                ? "bg-gradient-to-b from-[#12B76A] to-[#12B76A]/70 shadow-[0_0_10px_rgba(18,183,106,0.45)]"
                : "bg-gradient-to-b from-indigo-500 via-indigo-500 to-indigo-400 shadow-[0_0_10px_rgba(124,45,74,0.4)]"
            }`}
            style={{ height: `${isSignedIn ? percent : scrollFillHeight}%` }}
          />

          {steps.map((step, idx) => {
            const levelStyle = levelBadgeColors[step.level] || "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20";
            const levelDotClass = levelColors[step.level] || "bg-indigo-500";
            const isDone = completedSteps.includes(step.step);
            // The first unfinished module — the one thing to do next.
            const isNextUp = !isDone && steps.filter((s) => !completedSteps.includes(s.step))[0]?.step === step.step;

            return (
              <div
                key={idx}
                className={`glass-panel p-6 rounded-2xl border transition-all duration-300 relative group flex gap-5 items-start slide-up z-10 ${
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
                      ? "text-[#12B76A] font-bold"
                      : isNextUp
                        ? "text-indigo-600 font-bold"
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
                      className={`group/check w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all ${
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border text-[var(--c-ink)] ${levelDotClass}`}>
                      {step.step}
                    </div>
                  )}
                </div>

                {/* Content body */}
                <div className="flex-1 space-y-3">

                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={`text-base font-extrabold font-display transition-colors ${
                      isDone ? "text-[var(--c-ink-2)] line-through decoration-[#12B76A]/50" : "text-[var(--c-ink)] group-hover:text-indigo-600"
                    }`}>
                      {step.title}
                    </h3>
                    {isNextUp && (
                      <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[8px] font-mono font-bold uppercase tracking-wider">
                        Next up
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${levelStyle}`}>
                      {step.level}
                    </span>
                  </div>

                  <p className="text-xs md:text-sm text-[var(--c-ink-2)] leading-relaxed font-light font-mono">
                    {step.description}
                  </p>

                  {/* Every step gets a YouTube suggestion — including the
                      foundational steps that have no tracked tool — so a learner
                      always has a "watch this" path. Search deep-link: always
                      valid, and honest that it's a search, not one hand-picked
                      video (the per-tool "Best course" buttons below are the
                      curated picks). */}
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(step.title + " full tutorial")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-[var(--accent-1)]/10 text-[11px] font-mono font-bold text-[var(--accent-1)] hover:bg-[var(--accent-1)] hover:text-white transition-colors"
                  >
                    <Youtube className="w-3.5 h-3.5" /> Watch this on YouTube
                  </a>

                  {/* Connected Resources */}
                  {step.resources && step.resources.length > 0 && (
                    <div className="pt-3 border-t border-indigo-500/5 flex flex-wrap gap-4 items-center">
                      <span className="flex items-center gap-1 text-[9px] font-mono text-[var(--c-ink-2)]/60 uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Syllabus Materials:
                      </span>
                      {step.resources.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono font-bold text-indigo-600 hover:text-[var(--c-ink)] flex items-center gap-0.5 hover:underline"
                        >
                          {res.label}
                          <ArrowRight className="w-3 h-3 translate-y-[0.5px] group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      ))}
                    </div>
                  )}

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
                              <span className="text-[11px] font-bold text-[var(--c-ink)] group-hover/tool:text-indigo-600 transition-colors">{tool.name}</span>
                              <span
                                className="text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded"
                                style={{
                                  color: tool.score >= 70 ? "#12B76A" : tool.score >= 45 ? "#B54708" : "#7C2D4A",
                                  background: `${tool.score >= 70 ? "#12B76A" : tool.score >= 45 ? "#B54708" : "#7C2D4A"}14`,
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
                                className="flex items-center gap-1 px-2.5 border-l border-indigo-500/15 bg-[var(--accent-1)]/10 text-[10px] font-mono font-bold text-[var(--accent-1)] hover:bg-[var(--accent-1)] hover:text-white transition-colors whitespace-nowrap"
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

                  {/* Actions.
                      Six identical buttons gave a newcomer no focal point, and
                      "Mark as done" is the wrong FIRST action anyway — you can't
                      finish something you haven't opened. So the next module gets
                      a primary "Start learning" (which opens its first resource)
                      and every other module's tick-off stays deliberately quiet. */}
                  {isSignedIn && (
                    <div className="pt-3 flex flex-wrap items-center gap-2">
                      {isNextUp && step.resources?.[0] && (
                        <a
                          href={step.resources[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary text-[10px] py-2 px-4 rounded-lg"
                        >
                          Start learning <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleToggle(step.step)}
                        disabled={savingStep === step.step}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-60 ${
                          isDone
                            ? "border-[#12B76A]/40 bg-[#12B76A]/10 text-[#12B76A] hover:bg-[#12B76A]/20"
                            : isNextUp
                              ? "border-indigo-500/40 bg-transparent text-indigo-600 hover:bg-indigo-600/10"
                              : "border-[var(--c-border)] bg-transparent text-[var(--c-ink-2)]/70 hover:text-indigo-600 hover:border-indigo-500/30"
                        }`}
                      >
                        {savingStep === step.step ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        )}
                        {isDone ? "Completed — undo" : "Mark as done"}
                      </button>
                    </div>
                  )}

                </div>

              </div>
            );
          })}

        </div>

      </div>
    </DashboardShell>
  );
}
