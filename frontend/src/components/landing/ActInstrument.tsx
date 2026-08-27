"use client";

import Link from "next/link";
import type { Overview, Tool } from "@/data/trends";

/* ACT 1 — Recognition. Feeling: unease.
 *
 * Live surface opens on the surface already in a state, not on a title card.
 * Nobody is greeted: the instrument has been running, and the visitor has
 * walked in on it. Every figure here is real and comes from /overview.
 *
 * Devices: pin + count. The h1 is deliberately NOT display-scale — a 6rem
 * marketing headline is the fastest way to break this grammar. */
export default function ActInstrument({
  overview,
  tools,
}: {
  overview: Overview | null;
  tools: Tool[];
}) {
  const stars = overview?.total_stars ?? 0;
  const tracked = overview?.tools_tracked ?? tools.length;
  const signals = overview?.signals_24h ?? 0;
  const momentum = overview?.momentum_index ?? 0;

  const updated = overview?.last_updated
    ? new Date(overview.last_updated).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <section data-sc-act="pin" data-sc-span="1.6" aria-labelledby="act-instrument-h">
      <div data-sc-stage className="flex min-h-screen w-full items-center">
        <div className="mx-auto w-full max-w-[1400px] px-6 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p
                className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--c-ink-3)] tabular-nums"
                data-sc-cue="0 1 0 0.12"
              >
                {overview?.is_scraping ? "collecting" : "idle"}
                {updated ? ` · last reading ${updated}` : ""}
              </p>

              <h1
                id="act-instrument-h"
                className="mt-6 max-w-[18ch] font-display text-[clamp(2.4rem,5vw,4rem)] font-normal leading-[1.06] tracking-[-0.04em] text-[var(--c-ink)]"
                data-sc-cue="0 1 0 0.12"
              >
                Momentum, measured hourly, across the whole stack.
              </h1>

              <p
                className="measure mt-6 text-[17px] font-extralight leading-relaxed text-[var(--c-ink-2)]"
                data-sc-cue="0 1 0 0.12"
              >
                {tracked} technologies, scored against each other from five
                public sources. Scroll to move the readings through time.
              </p>
            </div>

            {/* Readouts, not a hero-metric template: these are the instrument's
                own dials, sized as labels, and they carry real values. */}
            <dl
              className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4 lg:grid-cols-2"
              data-sc-cue="0 1 0 0.12"
            >
              <Readout label="tracked" value={tracked} />
              <Readout label="stars indexed" value={stars} />
              <Readout label="signals / 24h" value={signals} />
              <Readout label="momentum index" value={momentum} decimals={1} />
            </dl>
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3" data-sc-cue="0 1 0 0.12">
            <Link
              href="/explore"
              className="text-sm font-semibold text-[var(--c-ink)] underline decoration-[var(--accent-1)] decoration-2 underline-offset-[6px] transition-colors hover:text-[var(--accent-1)]"
            >
              Open the console
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--c-ink-3)]">
              {overview?.sources?.join(" · ") ?? ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Readout({
  label,
  value,
  decimals = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
}) {
  /* The engine infers formatting from how the TARGET is written: decimal
     places from the target's own, thousands separators from its commas. So the
     rendered string and the count target are the same string, built once.
     Locale is pinned to en-US on purpose: a bare toLocaleString() renders
     2,799,641 as 27,99,641 on an en-IN machine, which is how this bug shipped
     once already. */
  const rendered = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--c-ink-3)]">
        {label}
      </dt>
      {/* NO count device here, deliberately.
          This act is the landing view, and a counter blooms from its "from"
          value, so at p = 0 all four dials read 0 — the one screen every
          visitor sees would show an instrument reporting nothing. It is the
          same failure the greet rule exists to prevent, and the harness cannot
          catch it because the cue itself is at full opacity. The count device
          moved to act 4, where the figures arrive mid-page and the bloom is
          the first time the reader meets them. */}
      <dd className="mt-1 font-mono text-[clamp(1.4rem,2.6vw,2.1rem)] font-light tabular-nums tracking-[-0.02em] text-[var(--c-ink)]">
        {rendered}
      </dd>
    </div>
  );
}
