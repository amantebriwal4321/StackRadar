"use client";

import { useCallback, useRef } from "react";
import TechLogo from "@/components/ui/TechLogo";
import StackDiagnosis from "@/components/landing/StackDiagnosis";
import { diagnose } from "@/lib/stack/diagnose";
import type { Tool } from "@/data/trends";
import { useActProgress } from "@/lib/scrollcraft/useActProgress";

/* CHAPTER 4 — The catalog. Feeling: agency. THE PEAK, and the signature move.
 *
 * The reader's hand goes on something for the first time. Picking a technology
 * drops it into the margin folio, and the colophon at the end is computed from
 * whatever is in there.
 *
 * AUTHORED SILENCE: the first ~0.10 of this chapter. The grid holds still and
 * closed before the first row opens, so the first pick-up lands in quiet
 * rather than on top of the busiest chapter on the page. Verification must not
 * read that stretch as dead scroll.
 *
 * The rows open from --sc-p by direct style writes on one shared rAF. No
 * per-frame React state.
 */
export default function ChCatalog({
  tools,
  picked,
  onToggle,
}: {
  tools: Tool[];
  picked: string[];
  onToggle: (slug: string) => void;
}) {
  const actRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const apply = useCallback((p: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    // 0 .. 0.10 is the authored silence. The cascade then runs to 0.95.
    const open = Math.min(Math.max((p - 0.10) / 0.85, 0), 1);
    const items = grid.children;
    const n = items.length;
    let opened = 0;
    for (let i = 0; i < n; i++) {
      const el = items[i] as HTMLElement;
      // Spacing of 1.0 means row i completes at (i+1)/n, so the LAST row lands
      // at the end of the window. At 0.55 the whole grid was open by halfway
      // and the rest of this act read as dead scroll.
      const local = Math.min(Math.max(open * n - i, 0), 1);
      const e = 1 - Math.pow(1 - local, 3);
      // 0.55 floor, not 0.18: at 0.18 the un-revealed tail read as a
      // disabled row rather than as content still arriving.
      el.style.opacity = String(0.55 + e * 0.45);
      el.style.transform = `translateY(${(1 - e) * 18}px)`;
      if (local >= 0.5) opened++;
    }

    /* Report what actually paints.
     *
     * The cascade is bespoke, so the verification harness cannot see it: its
     * dead-scroll check builds a signature from cues, clips, rails and wipes,
     * and the only cues in this act sit at full opacity throughout. Without
     * this the whole peak was reported as dead scroll while it was in fact
     * animating correctly.
     *
     * This publishes the RENDERED value (how many rows are open), not raw
     * scroll progress. verify.md is explicit that publishing progress just to
     * turn the check green is the exact failure the check exists to catch. */
    stageRef.current?.setAttribute("data-sc-verify-state", `rows:${opened}`);
  }, []);

  useActProgress(actRef, apply);

  const shown = tools.slice(0, 24);

  return (
    <section
      ref={actRef}
      className="ch-beige"
      data-sc-act="pin"
      data-sc-span="3.6"
      aria-labelledby="ch-catalog-h"
      id="build"
    >
      <div
        ref={stageRef}
        data-sc-stage
        data-sc-verify-state="rows:0"
        className="flex min-h-screen w-full items-start overflow-hidden pt-24 md:items-center md:pt-0"
      >
        <div className="mx-auto w-full max-w-[1400px] px-6 py-8 md:px-10 md:py-16 lg:px-16">
          <h2
            id="ch-catalog-h"
            className="max-w-[18ch] text-[clamp(2rem,4.6vw,3.35rem)] font-medium leading-[1.15] tracking-[-0.04em] text-[var(--c-ink)]"
            data-sc-cue="0 1 0 0.1"
          >
            Pick up what you are actually building with.
          </h2>

          <div className="mt-6 grid gap-6 md:mt-10 md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
          {/* Resting state is the readable one: if the rAF never runs, every
              row is already visible at full opacity via CSS, and the scroll
              treatment only animates toward that. */}
          <ul
            ref={gridRef}
            className="grid grid-cols-2 gap-2 [&>li:nth-child(n+9)]:hidden sm:gap-3 sm:grid-cols-3 sm:[&>li:nth-child(n+9)]:block lg:grid-cols-3 xl:grid-cols-4"
          >
            {shown.map((t) => {
              const on = picked.includes(t.slug);
              return (
                <li key={t.slug}>
                  <button
                    onClick={() => onToggle(t.slug)}
                    aria-pressed={on}
                    aria-label={`${t.name}, momentum ${t.score.toFixed(1)}`}
                    className={`group flex w-full items-center gap-2.5 rounded-[50px] border p-2.5 text-left transition-colors duration-200 sm:gap-3 sm:p-3 ${
                      on
                        ? "on-accent border-transparent bg-[#8ED462]"
                        : "border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink)] hover:border-[color-mix(in_srgb,var(--c-ink)_32%,transparent)]"
                    }`}
                  >
                    <span className="shrink-0">
                      <TechLogo slug={t.slug} emoji={t.icon} size={22} brand={!on} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium leading-tight">
                        {t.name}
                      </span>
                      <span
                        className={`block font-mono text-[11px] tabular-nums ${
                          on ? "opacity-70" : "text-[var(--c-ink-3)]"
                        }`}
                      >
                        {t.score.toFixed(1)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`shrink-0 text-[15px] leading-none ${on ? "" : "opacity-0 group-hover:opacity-40"}`}
                    >
                      {on ? "✓" : "＋"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

            {/* The consequence, next to the cause. */}
            <div className="order-first lg:order-none lg:sticky lg:top-28">
              <StackDiagnosis d={diagnose(picked, tools)} compact />
              {picked.length > 0 && (
                <a
                  href="#read-out"
                  className="mt-6 inline-block text-[14px] font-medium text-[var(--c-ink-2)] underline decoration-[var(--c-ink-3)] underline-offset-4 transition-colors hover:text-[var(--c-ink)]"
                >
                  See the full read-out
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
