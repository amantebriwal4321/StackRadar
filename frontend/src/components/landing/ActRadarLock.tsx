"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import LiveConstellation from "@/components/3d/LiveConstellation";
import type { Overview, Tool } from "@/data/trends";
import { useActProgress } from "@/lib/scrollcraft/useActProgress";

/* ACT 3 — Turn. Feeling: clarity. THE PEAK.
 *
 * Largest span on the page by a clear margin, because the lock needs dwell and
 * a pinned act is the only thing that gives it.
 *
 * The first ~0.12 of this act is AUTHORED SILENCE. Nothing moves. That is
 * deliberate: the lock has to land in quiet or it reads as one more busy
 * transition, and act 2 immediately before it is the busiest thing on the page.
 * Verification must not flag that stretch as dead scroll.
 *
 * The existing R3F constellation is not rewritten. It is composited under a
 * reticle whose convergence is driven from --sc-p, so the 3D work becomes the
 * payoff instead of decoration. */
export default function ActRadarLock({
  tools,
  overview,
  webgl,
}: {
  tools: Tool[];
  overview: Overview | null;
  /** false on phones: the R3F constellation must never mount there, so the
   *  field falls back to a CSS dot lattice driven by the same --sc-p. The act
   *  keeps its shape, its span and its peak; only the ground changes. */
  webgl: boolean;
}) {
  const actRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);

  // The lock target is whatever is actually rising fastest right now.
  const target =
    overview?.top_mover ??
    (tools.length
      ? [...tools].sort((a, b) => b.growth_pct - a.growth_pct)[0]
      : null);

  const apply = useCallback((p: number) => {
    // 0 .. 0.12  authored silence, nothing moves
    // 0.12 .. 0.68  the field resolves out of drift
    // 0.68 .. 1  locked and named
    const resolve = Math.min(Math.max((p - 0.12) / 0.56, 0), 1);
    // easeOutCubic: most of the resolve happens early, so the tail is a hold
    // rather than a slow crawl into place.
    const e = 1 - Math.pow(1 - resolve, 3);

    if (fieldRef.current) {
      fieldRef.current.style.filter = `blur(${(1 - e) * 14}px)`;
      fieldRef.current.style.opacity = String(0.35 + e * 0.65);
      fieldRef.current.style.transform = `scale(${1.16 - e * 0.16})`;
    }
    if (reticleRef.current) {
      // The reticle closes from far outside the frame onto the centre.
      reticleRef.current.style.transform = `scale(${2.4 - e * 1.4}) rotate(${(1 - e) * 45}deg)`;
      reticleRef.current.style.opacity = String(e);
    }
  }, []);

  useActProgress(actRef, apply);

  return (
    <section
      ref={actRef}
      data-sc-act="pin"
      data-sc-span="3.4"
      aria-labelledby="act-lock-h"
    >
      <div data-sc-stage className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
        {/* The field. Resting state is fully resolved and readable: if the rAF
            loop never runs, this is a clear constellation, not a blur. */}
        <div
          ref={fieldRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="h-full w-full max-w-[900px]">
            {webgl ? (
              <LiveConstellation tools={tools} />
            ) : (
              /* Phone ground: a dot lattice, no WebGL, no canvas, no decoder.
                 It takes the same blur/scale/opacity treatment from --sc-p, so
                 the lock reads identically without a GPU context. */
              <div
                className="h-full w-full"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, color-mix(in srgb, var(--accent-1) 55%, transparent) 1.2px, transparent 1.2px), radial-gradient(circle, color-mix(in srgb, var(--c-ink) 22%, transparent) 1px, transparent 1px)",
                  backgroundSize: "48px 48px, 31px 31px",
                  backgroundPosition: "0 0, 14px 20px",
                }}
              />
            )}
          </div>
        </div>

        {/* Reticle. Pure CSS, no asset. */}
        <div
          ref={reticleRef}
          className="pointer-events-none absolute h-[340px] w-[340px] md:h-[420px] md:w-[420px]"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--accent-1)_45%,transparent)]" />
          <div className="absolute inset-[18%] rounded-full border border-[color-mix(in_srgb,var(--accent-1)_30%,transparent)]" />
          <span className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-[var(--accent-1)]" />
          <span className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 bg-[var(--accent-1)]" />
          <span className="absolute left-0 top-1/2 h-px w-8 -translate-y-1/2 bg-[var(--accent-1)]" />
          <span className="absolute right-0 top-1/2 h-px w-8 -translate-y-1/2 bg-[var(--accent-1)]" />
        </div>

        {/* Column scrim. The copy holds the left side of a full-bleed field,
            so density goes under that column only and the rest of the frame
            keeps its contrast — not a full-frame overlay, which is a
            ship-blocker. It is a SIBLING of the copy, never a child: the
            verification pass hides the copy element and everything inside it
            to photograph what is underneath, so a ::before on the text block
            would never be measured. Tuned against the harness, not by eye. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-full md:w-[68%]"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.88) 38%, rgba(0,0,0,0.62) 68%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-[1400px] px-6 md:px-8">
          <div className="max-w-[34rem]">
            <h2
              id="act-lock-h"
              className="font-display text-[clamp(2rem,4vw,3.2rem)] font-normal leading-[1.06] tracking-[-0.04em] text-[var(--c-ink)]"
              data-sc-cue="0 0.62 0"
            >
              Out of all that noise, one thing is moving fastest.
            </h2>

            {target && (
              <div className="mt-8" data-sc-cue="0.6 1 0.12">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-2)]">
                  locked
                </p>
                <p className="mt-3 flex items-baseline gap-4">
                  <span aria-hidden="true" className="text-[28px]">
                    {target.icon}
                  </span>
                  <span className="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-normal tracking-[-0.04em] text-[var(--c-ink)]">
                    {target.name}
                  </span>
                </p>
                <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--c-ink-3)]">
                      momentum
                    </dt>
                    <dd className="font-mono text-[20px] tabular-nums text-[var(--c-ink)]">
                      {target.score.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--c-ink-3)]">
                      7-day change
                    </dt>
                    <dd
                      className="font-mono text-[20px] tabular-nums"
                      style={{
                        color:
                          target.growth_pct >= 0
                            ? "var(--color-score-high)"
                            : "var(--color-score-low)",
                      }}
                    >
                      {target.growth_pct >= 0 ? "+" : ""}
                      {target.growth_pct.toFixed(1)}%
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/tools/${target.slug}`}
                  className="mt-7 inline-block text-sm font-semibold text-[var(--c-ink)] underline decoration-[var(--accent-1)] decoration-2 underline-offset-[6px] transition-colors hover:text-[var(--accent-1)]"
                >
                  Why it is rising
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
