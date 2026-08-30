"use client";

import Link from "next/link";
import TechLogo from "@/components/ui/TechLogo";
import type { Diagnosis } from "@/lib/stack/diagnose";
import { shortForCategory } from "@/lib/stack/domainColour";

/* The payoff for picking.
 *
 * The mechanic used to deposit picks into a folio four viewports away, so
 * clicking a chip produced no response anywhere the eye was. This puts the
 * consequence next to the cause: a portrait of the stack that redraws on every
 * click, and names a real next step.
 *
 * Announced politely rather than assertively: a pick is the reader's own
 * action, so it should reach a screen reader without interrupting.
 */
export default function StackDiagnosis({
  d,
  compact = false,
  exampleOf = null,
}: {
  d: Diagnosis;
  /** Catalog variant: tighter, sits beside the grid. */
  compact?: boolean;
  /** Set when this is a worked example rather than the reader's own picks. */
  exampleOf?: string | null;
}) {
  const empty = d.count === 0;

  return (
    <div
      aria-live="polite"
      className={compact ? "" : "rounded-[50px] bg-[var(--c-surface)] p-8 md:p-10"}
    >
      {exampleOf && (
        <p className="mb-4 inline-block rounded-full bg-[#F5E211] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#2C2E2A]">
          {exampleOf}
        </p>
      )}

      {/* Headline figures. Reads as a sentence, not a stat block. */}
      <p
        className={`font-medium tracking-[-0.02em] text-[var(--c-ink)] ${
          compact ? "text-[19px]" : "text-[24px]"
        }`}
      >
        {empty ? (
          <>Nothing picked yet. Choose what you already use.</>
        ) : (
          <>
            {d.count} picked, averaging{" "}
            <span className="font-mono tabular-nums">{d.avg!.toFixed(1)}</span>{" "}
            momentum across{" "}
            <span className="font-mono tabular-nums">{d.domainsHeld}</span> of{" "}
            <span className="font-mono tabular-nums">{d.coverage.length}</span>{" "}
            domains.
          </>
        )}
      </p>

      {/* ── The coverage bar. The centrepiece: the shape of what you know,
             drawing itself as you pick. Each segment is one domain, filled by
             the real fraction of that domain you hold. ── */}
      <ul className="mt-6 flex items-end gap-1.5" aria-hidden="true">
        {d.coverage.map((c) => {
          const pct = c.total ? (c.held / c.total) * 100 : 0;
          // The domain the read-out is about to recommend. Ringing its track
          // makes the bar and the recommendation visibly the same object;
          // without it the reader has to take on trust that the gap sentence
          // refers to anything on the chart.
          const isGap = !!d.gap && c.category === d.gap.category;
          return (
            <li key={c.category} className="flex-1" title={`${c.category}: ${c.held} of ${c.total}`}>
              {/* A bar, not a dot: at 8 segments across one column each track is
                  about as wide as it is tall, so rounded-full turned the whole
                  bar into a circle and a 1-of-11 fill into a 4px sliver. */}
              <div
                className={`relative w-full overflow-hidden rounded-[8px] bg-[color-mix(in_srgb,var(--c-ink)_7%,transparent)] ${
                  isGap
                    ? "border-2 border-[var(--c-ink)]"
                    : "border border-[var(--c-border)]"
                }`}
                style={{ height: compact ? 64 : 84 }}
              >
                <span
                  className="absolute inset-x-0 bottom-0 block transition-[height] duration-500 ease-out"
                  style={{ height: `${pct}%`, background: c.tint }}
                />
              </div>
              {/* The count in figures, because a proportional fill alone cannot
                  distinguish "one of eleven" from "none". */}
              <p
                className={`mt-1.5 text-center font-mono text-[11px] tabular-nums ${
                  c.held ? "text-[var(--c-ink)]" : "text-[var(--c-ink-3)]"
                }`}
              >
                {c.held}
              </p>
              {/* Which domain this actually is. Eight coloured tracks and a
                  count told the reader THAT something was empty and never
                  which thing. */}
              <p
                className={`mt-0.5 text-center font-mono text-[9px] uppercase tracking-[0.06em] ${
                  isGap ? "text-[var(--c-ink)]" : "text-[var(--c-ink-3)]"
                }`}
              >
                {shortForCategory(c.category)}
              </p>
            </li>
          );
        })}
      </ul>

      {/* The same information as text, which is what a screen reader gets. */}
      <p className="sr-only">
        {d.coverage.map((c) => `${c.category}: ${c.held} of ${c.total} picked.`).join(" ")}
      </p>

      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)]">
        domain coverage
      </p>

      {!empty && (
        <p className={`mt-5 font-mono text-[12px] tabular-nums text-[var(--c-ink-2)] ${compact ? "hidden sm:block" : ""}`}>
          {d.levels.beginner} beginner · {d.levels.intermediate} intermediate ·{" "}
          {d.levels.advanced} advanced
        </p>
      )}

      {/* ── The gap. The single most useful thing the page can say. ── */}
      {d.gap && (
        <div
          className={`mt-7 border-t border-[var(--c-border)] pt-6 ${
            compact ? "hidden sm:block" : ""
          }`}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)]">
            {empty ? "rising fastest right now" : "your biggest gap"}
          </p>
          <p className="mt-3 flex items-center gap-3">
            <TechLogo slug={d.gap.slug} emoji={d.gap.icon} size={26} brand />
            <span
              className={`font-medium tracking-[-0.02em] text-[var(--c-ink)] ${
                compact ? "text-[20px]" : "text-[26px]"
              }`}
            >
              {d.gap.name}
            </span>
            <span className="font-mono text-[14px] tabular-nums text-[var(--c-ink-2)]">
              {d.gap.score.toFixed(1)}
            </span>
          </p>
          <p className="mt-2 max-w-[38ch] text-[14px] font-medium leading-relaxed text-[var(--c-ink-2)]">
            {empty
              ? `The strongest thing on the board, in ${d.gap.category}.`
              : `You hold nothing in ${d.gap.category}, and this is the strongest thing in it.`}
          </p>

          {d.nextRoadmap && (
            <Link
              href={`/roadmap/${d.nextRoadmap}`}
              className="mt-4 inline-block text-[15px] font-medium text-[var(--c-ink)] underline decoration-[#FF705D] decoration-2 underline-offset-4 transition-colors hover:text-[var(--accent-2)]"
            >
              Open the {d.gap.category} roadmap
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
