"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Loader2, Check, ArrowRight } from "lucide-react";
import { joinWaitlist } from "@/data/trends";

/**
 * Waitlist email capture — the top-of-funnel for the "personalized version"
 * vision. Posts to the public /waitlist endpoint (idempotent), then swaps to a
 * success state in place. On-brand Neon-Noir card; drop it anywhere.
 *
 * `source` is stored with the signup for attribution (e.g. "landing", "mobile").
 */
/** 16 pieces on an even fan, alternating accent tints. Fixed values (not
 *  random) so SSR and client render identical markup. */
const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const spread = 120 + (i % 4) * 26;
  return {
    dx: Math.round(Math.cos(angle) * spread),
    dy: Math.round(Math.sin(angle) * spread * 0.7) - 30, // bias upward
    rot: 180 + (i % 5) * 72,
    delay: (i % 6) * 45,
    color:
      i % 3 === 0
        ? "var(--accent-1)"
        : i % 3 === 1
          ? "var(--accent-2)"
          : "var(--color-score-high, #12B76A)",
  };
});

export default function WaitlistCapture({
  source = "landing",
  className = "",
}: {
  source?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [already, setAlready] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [burst, setBurst] = useState(false);

  // Clear the confetti nodes once they've played out.
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(false), 1600);
    return () => clearTimeout(t);
  }, [burst]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setErrorMsg("");
    try {
      const res = await joinWaitlist(email.trim(), source);
      setAlready(res.already);
      setState("done");
      // Celebrate a real new signup — not a repeat submit of a known address.
      if (!res.already) setBurst(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-[var(--c-border)] bg-[var(--c-surface)] p-7 sm:p-9 ${className}`}
    >
      {/* wine wash + faint grid, purely decorative */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, var(--accent-2) 12%, transparent), transparent 55%)",
        }}
        aria-hidden="true"
      />
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-[0.15]" aria-hidden="true" />

      {/* Confetti burst — 16 accent-tinted pieces thrown from the card centre.
          Deterministic angles (no Math.random at render time) so server and
          client markup agree. */}
      {burst && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={
                {
                  background: c.color,
                  "--dx": `${c.dx}px`,
                  "--dy": `${c.dy}px`,
                  "--rot": `${c.rot}deg`,
                  "--cd": `${c.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-surface-2)] px-3 py-1">
          <Rocket className="h-3.5 w-3.5 text-[var(--accent-1)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-1)]">
            the vision · coming soon
          </span>
        </div>

        <h3 className="max-w-xl font-display text-2xl font-normal tracking-[-0.04em] text-[var(--c-ink)] sm:text-3xl">
          Get the personalized version first
        </h3>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--c-ink-2)] sm:text-base">
          Your own tracked roadmap, streaks, and a syllabus that adapts to what
          you&apos;ve learned. Drop your email and you&apos;ll be first in line —
          no spam, just the launch.
        </p>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {state === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-score-high,#12B76A)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-score-high,#12B76A)_10%,transparent)] px-5 py-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-score-high,#12B76A)] text-white">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <p className="text-sm font-semibold text-[var(--c-ink)]">
                  {already
                    ? "You're already on the list — we'll be in touch. 🛰️"
                    : "You're in! You'll be first to get the personalized version. 🎉"}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={onSubmit}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  placeholder="you@email.com"
                  aria-label="Email address"
                  className="flex-1 rounded-full border border-[var(--c-border)] bg-[var(--c-surface-2)] px-5 py-3.5 text-sm text-[var(--c-ink)] outline-none transition-colors placeholder:text-[var(--c-ink-2)]/60 focus:border-[color-mix(in_srgb,var(--accent-1)_50%,transparent)]"
                />
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="group flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--accent-1)] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent-1)]/25 transition-all duration-300 hover:shadow-[var(--accent-2)]/40 disabled:opacity-70"
                >
                  {state === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining…
                    </>
                  ) : (
                    <>
                      Join the waitlist
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {state === "error" && (
            <p className="mt-2 pl-1 text-xs font-medium text-[var(--color-score-low,#F04438)]">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
