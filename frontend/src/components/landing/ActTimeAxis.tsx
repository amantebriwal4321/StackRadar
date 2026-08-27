"use client";

import { useCallback, useMemo, useRef } from "react";
import type { BulkHistory } from "@/data/trends";
import { useActProgress } from "@/lib/scrollcraft/useActProgress";

/* ACT 2 — Tension. Feeling: exposure. THE SIGNATURE MOVE.
 *
 * Scroll is the time axis. The wheel does not move you down a document here,
 * it moves you forward through the real snapshot series, and the ranking
 * reorders as true readings pass under it.
 *
 * The honesty rule that shapes the whole implementation: every number shown is
 * a real reading, snapped to a real date. Only POSITION tweens between dates.
 * Interpolating a score to smooth the motion would put a figure on screen that
 * was never measured, which is the "invented statistics" ship-blocker.
 *
 * Rows are moved by writing transforms directly on each frame; the text is
 * rewritten only when the date index actually changes. No per-frame setState. */

const ROW_H = 46;

export default function ActTimeAxis({ history }: { history: BulkHistory }) {
  const actRef = useRef<HTMLElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const dateRef = useRef<HTMLParagraphElement>(null);
  const lastIdx = useRef(-1);

  const { dates, tools } = history;

  /* Rank at each date. A tool with no reading that day carries its previous
   * score forward rather than dropping to the bottom: a gap in the readings is
   * missing information, not a collapse in momentum. The carried score is used
   * only to hold a POSITION; it is never displayed as that day's figure. */
  const ranksByDate = useMemo(() => {
    const out: Map<string, number>[] = [];
    const carried = new Map<string, number>();
    dates.forEach((_, i) => {
      const scored = tools
        .map((t) => {
          const score = t.series[i]?.score ?? carried.get(t.slug) ?? null;
          if (score !== null) carried.set(t.slug, score);
          return { slug: t.slug, score };
        })
        .filter((r): r is { slug: string; score: number } => r.score !== null)
        .sort((a, b) => b.score - a.score);

      const m = new Map<string, number>();
      scored.forEach((r, rank) => m.set(r.slug, rank));
      out.push(m);
    });
    return out;
  }, [dates, tools]);

  const apply = useCallback(
    (p: number) => {
      if (!dates.length) return;
      const maxIdx = dates.length - 1;
      // Continuous position along the axis, so rows glide; the READOUT snaps.
      const pos = Math.min(Math.max(p, 0), 1) * maxIdx;
      const idx = Math.round(pos);

      const ranks = ranksByDate[idx];
      if (ranks) {
        for (const [slug, el] of rowRefs.current) {
          const rank = ranks.get(slug);
          if (rank === undefined) {
            el.style.opacity = "0.15";
            continue;
          }
          el.style.opacity = "1";
          el.style.transform = `translateY(${rank * ROW_H}px)`;
        }
      }

      if (idx !== lastIdx.current) {
        lastIdx.current = idx;
        // Only ever a real reading, on a real date.
        const reading = dates[idx];
        if (dateRef.current) {
          dateRef.current.textContent = new Date(reading).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric", year: "numeric" }
          );
        }
        for (const t of tools) {
          const el = rowRefs.current.get(t.slug);
          const score = t.series[idx]?.score;
          const out = el?.querySelector<HTMLElement>("[data-score]");
          // "·" not an em dash: taste.md bans them anywhere visible.
          if (out) out.textContent = score === undefined || score === null ? "·" : score.toFixed(1);
        }
      }
    },
    [dates, tools, ranksByDate]
  );

  useActProgress(actRef, apply);

  if (!dates.length) return null;

  return (
    <section
      ref={actRef}
      data-sc-act="pan"
      data-sc-span="2.4"
      aria-labelledby="act-time-h"
    >
      <div data-sc-stage className="flex min-h-screen w-full items-center overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-6 md:px-8">
          <h2
            id="act-time-h"
            className="max-w-[20ch] font-display text-[clamp(1.8rem,3.4vw,2.8rem)] font-normal leading-[1.1] tracking-[-0.04em] text-[var(--c-ink)]"
          >
            The ranking is not a snapshot. It moves.
          </h2>
          <p className="measure mt-4 text-[16px] font-extralight text-[var(--c-ink-2)]">
            Every row below is a reading that actually happened. Keep scrolling
            and you are travelling forward through {dates.length} of them.
          </p>

          <p
            ref={dateRef}
            className="mt-10 font-mono text-[13px] uppercase tracking-[0.24em] tabular-nums text-[var(--accent-2)]"
          >
            {new Date(dates[0]).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {/* Absolutely positioned rows so a rank change is a transform, never
              a reflow. The resting state is the FIRST reading fully laid out
              and readable: if the rAF never runs, this is still a legible
              ranking rather than a stack of overlapping rows. */}
          <ol
            className="relative mt-4"
            style={{ height: `${Math.min(tools.length, 10) * ROW_H}px` }}
          >
            {/* Slot numbers belong to the POSITION, not to the tool, so they
                stay put while rows travel past them. Attaching them to a row
                would make them ride along and stop meaning rank. */}
            {tools.map((_, slot) => (
              <li
                key={`slot-${slot}`}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 flex items-center font-mono text-[11px] tabular-nums text-[var(--c-ink-3)]"
                style={{ top: `${slot * ROW_H}px`, height: `${ROW_H}px` }}
              >
                {String(slot + 1).padStart(2, "0")}
              </li>
            ))}
            {tools.map((t, i) => {
              const startRank = ranksByDate[0]?.get(t.slug) ?? i;
              return (
                <li
                  key={t.slug}
                  ref={(el) => {
                    if (el) rowRefs.current.set(t.slug, el);
                    else rowRefs.current.delete(t.slug);
                  }}
                  className="absolute inset-x-0 top-0 flex items-center gap-4 will-change-transform"
                  style={{
                    height: `${ROW_H}px`,
                    transform: `translateY(${startRank * ROW_H}px)`,
                    transition: "transform 420ms var(--ease-hover), opacity 300ms linear",
                  }}
                >
                  {/* Left gutter reserved for the static slot numbers above. */}
                  <span aria-hidden="true" className="w-6 shrink-0" />
                  <span aria-hidden="true" className="w-6 shrink-0 text-center text-[15px]">
                    {t.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-light text-[var(--c-ink)]">
                    {t.name}
                  </span>
                  <span
                    data-score
                    className="w-14 shrink-0 text-right font-mono text-[15px] tabular-nums text-[var(--c-ink)]"
                  >
                    {t.series[0]?.score?.toFixed(1) ?? "·"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
