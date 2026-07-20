"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Flame, ArrowRight, Target, Map, CheckCircle2 } from "lucide-react";
import { fetchProgressSummary, type ProgressSummary } from "@/data/trends";

/**
 * The daily hook.
 *
 * Momentum data changes too slowly to be a reason to open the app every day —
 * a user's own progress doesn't. This block leads the console with one concrete
 * next action, a streak, and a resume link, so the question becomes "what do I
 * study today?" rather than "what's trending?".
 */
export default function ContinueLearning() {
  const { user, isSignedIn, isLoaded } = useUser();
  const userId = user?.id || "";
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!userId) return;
    fetchProgressSummary(userId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) { setLoading(false); return; }
    load();
    window.addEventListener("progress:changed", load);
    return () => window.removeEventListener("progress:changed", load);
  }, [isLoaded, userId, load]);

  if (!isLoaded || loading) return null;

  // ── Signed out: sell the loop, don't hide it ──
  if (!isSignedIn) {
    return (
      <div className="tech-panel rounded-2xl p-6 md:p-7 relative overflow-hidden">
        <div className="hud-grid absolute inset-0 opacity-[0.35] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Your learning track
            </span>
            <h3 className="text-xl md:text-2xl font-black font-display text-[var(--c-ink)]">
              Pick a roadmap. Learn one thing a day.
            </h3>
            <p className="text-sm text-[var(--c-ink-2)] font-light max-w-lg">
              Track every module you finish, keep a streak, and get told exactly what to study
              next — on a syllabus that updates itself from live momentum data.
            </p>
          </div>
          <SignInButton mode="modal">
            <button className="btn-primary text-xs py-3 px-6 rounded-xl shrink-0 cursor-pointer">
              Start tracking <ArrowRight className="w-4 h-4" />
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const hasProgress = summary && summary.active.length > 0;

  // ── Signed in, nothing started yet ──
  if (!hasProgress) {
    return (
      <div className="tech-panel rounded-2xl p-6 md:p-7 relative overflow-hidden">
        <div className="hud-grid absolute inset-0 opacity-[0.35] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Your learning track
            </span>
            <h3 className="text-xl md:text-2xl font-black font-display text-[var(--c-ink)]">
              You haven&apos;t started a roadmap yet.
            </h3>
            <p className="text-sm text-[var(--c-ink-2)] font-light max-w-lg">
              Choose a track and check off your first module — takes about an hour.
            </p>
          </div>
          <Link href="/roadmaps" prefetch className="btn-primary text-xs py-3 px-6 rounded-xl shrink-0">
            <Map className="w-4 h-4" /> Browse roadmaps
          </Link>
        </div>
      </div>
    );
  }

  const primary = summary!.active[0];
  const focus = summary!.todays_focus;

  return (
    <div className="tech-panel rounded-2xl p-6 md:p-7 relative overflow-hidden">
      <div className="hud-grid absolute inset-0 opacity-[0.35] pointer-events-none" />

      <div className="relative space-y-5">
        {/* Header: streak + today's tally */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Continue learning
          </span>
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider">
            {summary!.streak_days > 0 && (
              <span className="flex items-center gap-1.5 font-bold text-[#B54708]">
                <Flame className="w-3.5 h-3.5" />
                {summary!.streak_days} day{summary!.streak_days === 1 ? "" : "s"} streak
              </span>
            )}
            {summary!.completed_today > 0 && (
              <span className="flex items-center gap-1.5 font-bold text-[#12B76A]">
                <CheckCircle2 className="w-3.5 h-3.5" /> {summary!.completed_today} done today
              </span>
            )}
          </div>
        </div>

        {/* Today's focus — the single next action */}
        {focus ? (
          <div>
            <p className="text-[11px] font-mono text-[var(--c-ink-2)]/70 uppercase tracking-wider mb-1">
              {primary.icon} {primary.title} · today&apos;s focus
            </p>
            <h3 className="text-xl md:text-2xl font-black font-display text-[var(--c-ink)] leading-tight">
              {focus.title}
            </h3>
            <p className="text-sm text-[var(--c-ink-2)] font-light mt-1.5 line-clamp-2 max-w-2xl">
              {focus.description}
            </p>
          </div>
        ) : (
          <h3 className="text-xl md:text-2xl font-black font-display text-[#12B76A]">
            {primary.title} complete — every module done. 🎉
          </h3>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2 font-mono text-[10px] uppercase tracking-wider">
            <span className="text-[var(--c-ink-2)]">{primary.title}</span>
            <span className="font-bold text-indigo-600 tabular-nums">
              {primary.completed}/{primary.total} · {primary.percent}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--c-surface-2)] border border-[var(--c-border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] transition-[width] duration-500 ease-out"
              style={{ width: `${primary.percent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/roadmap/${primary.roadmap_slug}`} prefetch className="btn-primary text-xs py-2.5 px-5 rounded-xl">
            {focus ? "Resume track" : "Review track"} <ArrowRight className="w-4 h-4" />
          </Link>
          {summary!.active.length > 1 && (
            <Link
              href="/roadmaps"
              prefetch
              className="px-5 py-2.5 rounded-xl border border-indigo-500/20 bg-[var(--c-surface)]/60 hover:bg-[var(--c-surface-2)] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <Map className="w-3.5 h-3.5" /> {summary!.active.length} active tracks
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
