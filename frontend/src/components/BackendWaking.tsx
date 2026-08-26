"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SplitReveal from "@/components/ui/SplitReveal";

/**
 * Cold-start curtain.
 *
 * Our backend sleeps on the free tier, so the first visitor after a quiet spell
 * waits ~30–50s while it wakes — otherwise seeing a page of blanks/zeros that
 * reads as "broken". This mounts once (in the root layout), silently probes the
 * live server, and ONLY if it's cold shows a friendly on-brand curtain that
 * explains the wait and clears itself the moment the server answers. A warm
 * server never sees it (the probe returns in well under a second).
 *
 * It doesn't touch data-fetching: the page's own fetches retry underneath
 * (see resilientFetch in data/trends.ts) and paint as soon as the server wakes.
 */

type Status = "probing" | "cold" | "warm";

const HEALTH_URL = "/api/v1/health";

async function pingOk(timeoutMs: number): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(HEALTH_URL, { cache: "no-store", signal: ctrl.signal });
      return res.ok;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return false;
  }
}

export default function BackendWaking() {
  const [status, setStatus] = useState<Status>("probing");
  const [seconds, setSeconds] = useState(0);

  // Initial probe: a warm server answers in <1s, so a short window is plenty to
  // avoid ever flashing the curtain on a healthy load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await pingOk(2000);
      if (cancelled) return;
      setStatus(ok ? "warm" : "cold");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // While cold: poll GENTLY until it wakes, then hard-reload so the page's data
  // fetches (which may have given up during a long wake) re-run against the now-
  // warm server. Polling is spaced out + jittered on purpose: the backend sits
  // behind Cloudflare, and tight polling during a slow wake can trip rate-
  // limiting (429), which would keep the curtain up even once the server is fine.
  useEffect(() => {
    if (status !== "cold") return;
    let cancelled = false;

    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);

    const poll = async () => {
      while (!cancelled) {
        // 3.5s base + up to ~1.5s jitter, so many tabs don't hammer in lockstep.
        await new Promise((r) => setTimeout(r, 3500 + Math.random() * 1500));
        if (cancelled) return;
        const ok = await pingOk(7000);
        if (cancelled) return;
        if (ok) {
          // We showed the curtain, so the page likely rendered empty / gave up.
          // A single reload into the warm server is the clean recovery.
          window.location.reload();
          return;
        }
      }
    };
    poll();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [status]);

  // A very long wait (server having a bad day) — offer a manual reload.
  const stalled = seconds >= 70;

  // Rolling status line — makes a long wake read as real work in progress, not a
  // frozen spinner. Tied to elapsed time; the later lines just hold if the wake
  // runs long. (StackRadar really does aggregate these sources + score momentum.)
  const PHASES = [
    { t: 0, label: "Waking the live server…" },
    { t: 6, label: "Tuning in to GitHub, Hacker News, Reddit & Dev.to…" },
    { t: 14, label: "Reading this week's developer signals…" },
    { t: 24, label: "Scoring 31 technologies by momentum…" },
    { t: 35, label: "Ranking what's rising fastest…" },
    { t: 47, label: "Assembling your radar…" },
  ];
  const phase = PHASES.reduce((acc, p) => (seconds >= p.t ? p : acc), PHASES[0]);

  // Estimated progress — a decelerating curve that eases toward ~96% and never
  // fakes completion; the actual 100% is the reload once the server answers.
  // Front-loaded: ~27% at 2s, ~53% at 5s, ~78% at 10s, easing to a 96% ceiling.
  // The old /15 constant sat at 27% after FIVE seconds, which reads as stalled —
  // perceived speed is set in the first couple of seconds. Still never reaches
  // 100: the real completion is the reload when the server answers.
  const progress = Math.min(96, Math.round(96 * (1 - Math.exp(-seconds / 6))));

  // Radar "contacts" that twinkle in around the dish, like signals being picked
  // up. Purely decorative; the text below always carries the real state.
  const BLIPS = [
    { x: "22%", y: "30%", d: 0.2 },
    { x: "72%", y: "24%", d: 1.2 },
    { x: "80%", y: "60%", d: 0.6 },
    { x: "34%", y: "72%", d: 1.7 },
    { x: "58%", y: "48%", d: 2.1 },
  ];

  return (
    <AnimatePresence>
      {status === "cold" && (
        <motion.div
          key="waking"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6 bg-[var(--c-ground)]"
          role="status"
          aria-live="polite"
        >
          {/* ambient wine glow behind the radar */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent-2) 20%, transparent) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative flex w-full max-w-md flex-col items-center text-center">
            {/* ─── Radar dish, echoing the logo ─── */}
            <div className="relative mb-8 h-32 w-32">
              {/* concentric rings */}
              <div className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--accent-1)_28%,transparent)]" />
              <div className="absolute inset-[18%] rounded-full border border-[color-mix(in_srgb,var(--accent-1)_36%,transparent)]" />
              <div className="absolute inset-[38%] rounded-full border border-[color-mix(in_srgb,var(--accent-1)_50%,transparent)]" />
              {/* crosshair */}
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[color-mix(in_srgb,var(--accent-1)_18%,transparent)]" />
              <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-[color-mix(in_srgb,var(--accent-1)_18%,transparent)]" />
              {/* expanding ping */}
              <div className="absolute inset-0 rounded-full border border-[var(--accent-2)]/50 motion-safe:animate-ping" />
              {/* sweep */}
              <div
                className="absolute inset-0 rounded-full motion-safe:animate-[spin_2.4s_linear_infinite]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 70%, color-mix(in srgb, var(--accent-2) 65%, transparent) 92%, transparent)",
                  WebkitMaskImage:
                    "radial-gradient(circle, transparent 8%, black 9%)",
                  maskImage: "radial-gradient(circle, transparent 8%, black 9%)",
                }}
                aria-hidden="true"
              />
              {/* contact blips */}
              {BLIPS.map((b, i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]"
                  style={{ left: b.x, top: b.y }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: b.d, ease: "easeInOut" }}
                  aria-hidden="true"
                />
              ))}
              {/* core dot */}
              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-1)]" />
            </div>

            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent-1)]">
              live intelligence
            </p>
            <SplitReveal
              as="h2"
              text="Warming up the live data"
              delay={80}
              stagger={80}
              className="mt-3 block font-display text-2xl font-normal tracking-[-0.04em] text-[var(--c-ink)] sm:text-3xl"
            />

            {/* rolling status line — keyed so it re-mounts per phase; the entrance
                is transform-only (opacity stays 1) so a backgrounded tab can never
                strand it invisible. */}
            {/* min-h, not a fixed clipped box: at h-6 with a y:8 entrance the
                13px line overflowed 24px and was cut off for the first 350ms of
                every phase change, colliding with the bar below it. */}
            <div className="mt-3 flex min-h-[30px] w-full items-center justify-center">
              <motion.p
                key={phase.label}
                initial={{ y: 5 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="font-mono text-[13px] text-[var(--c-ink-2)]"
              >
                {phase.label}
              </motion.p>
            </div>

            {/* determinate progress rail with a moving sheen. Width is driven by a
                CSS transition (not a JS animation), so it advances even if the tab
                is briefly backgrounded. */}
            <div className="mt-6 w-64 max-w-full">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--accent-1)_14%,transparent)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-1)] transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
                <motion.div
                  className="absolute inset-y-0 w-16 rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
                  animate={{ x: ["-64px", "256px"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-[var(--c-ink-2)]/70">
                <span>free-tier server · first visit only</span>
                <span className="tabular-nums text-[var(--accent-1)]">{progress}%</span>
              </div>
            </div>

            <p className="mt-4 font-mono text-[11px] text-[var(--c-ink-2)]/50">
              this only happens once · {seconds}s
            </p>

            {stalled && (
              <button
                onClick={() => window.location.reload()}
                className="mt-6 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-2 text-xs font-semibold text-[var(--c-ink)] transition-colors hover:border-[color-mix(in_srgb,var(--accent-1)_40%,transparent)]"
              >
                Taking a while — reload
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
