"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
            <div className="relative mb-8 h-28 w-28">
              {/* concentric rings */}
              <div className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--accent-1)_28%,transparent)]" />
              <div className="absolute inset-[18%] rounded-full border border-[color-mix(in_srgb,var(--accent-1)_36%,transparent)]" />
              <div className="absolute inset-[38%] rounded-full border border-[color-mix(in_srgb,var(--accent-1)_50%,transparent)]" />
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
              {/* core dot */}
              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-1)] shadow-[0_0_16px_var(--accent-2)]" />
            </div>

            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent-1)]">
              live intelligence
            </p>
            <h2 className="mt-3 font-display text-2xl font-extrabold -tracking-[0.02em] text-[var(--c-ink)] sm:text-3xl">
              Warming up the live data
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--c-ink-2)]">
              StackRadar runs on a free-tier server that sleeps when it&apos;s
              quiet. The first visit wakes it — usually about{" "}
              <span className="font-semibold text-[var(--c-ink)]">30–50 seconds</span>,
              just this once. Real momentum data is loading now.
            </p>

            {/* shimmer progress rail */}
            <div className="mt-7 h-1 w-56 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--accent-1)_14%,transparent)]">
              <motion.div
                className="h-full w-1/3 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--accent-2), transparent)",
                }}
                animate={{ x: ["-120%", "360%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <p className="mt-4 font-mono text-xs text-[var(--c-ink-2)]/70">
              waking… {seconds}s
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
