"use client";

import type { Overview, Tool } from "@/data/trends";

/* ACT 4 — Substance. Feeling: trust.
 *
 * Deliberately the quietest act on the page and the only one that is not
 * pinned: after the lock, a fourth pinned stage would read as the page
 * refusing to let go. `flow` + `in` breaks the rhythm and lets the sources
 * arrive as fact rather than spectacle.
 *
 * Counts are summed from the tools' own per-source figures, so every number
 * here is measured. No source gets a number it has not earned. */
export default function ActSources({
  tools,
  overview,
}: {
  tools: Tool[];
  overview: Overview | null;
}) {
  const sum = (pick: (t: Tool) => number) =>
    tools.reduce((n, t) => n + (pick(t) || 0), 0);

  const sources = [
    { name: "GitHub", detail: "stars, forks, release cadence", count: overview?.total_stars ?? 0, unit: "stars indexed" },
    { name: "Hacker News", detail: "front page and new", count: sum((t) => t.hn_count), unit: "mentions" },
    { name: "Reddit", detail: "developer subreddits", count: sum((t) => t.reddit_count), unit: "mentions" },
    { name: "Dev.to", detail: "posts and tags", count: sum((t) => t.devto_count), unit: "mentions" },
    { name: "Tech news", detail: "RSS across the trade press", count: sum((t) => t.news_count), unit: "mentions" },
  ];

  return (
    <section className="sc-section" data-sc-act="flow" aria-labelledby="act-sources-h">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-[96px] md:px-8 md:py-[120px]">
        <h2
          id="act-sources-h"
          className="max-w-[24ch] font-display text-[clamp(1.8rem,3.4vw,2.8rem)] font-normal leading-[1.1] tracking-[-0.04em] text-[var(--c-ink)]"
          data-sc-in
        >
          The score is not an opinion. Here is where it comes from.
        </h2>

        <ul className="mt-14 divide-y divide-[var(--c-border)] border-y border-[var(--c-border)]">
          {sources.map((s, i) => (
            <li
              key={s.name}
              data-sc-in
              data-sc-reveal="up"
              style={{ transitionDelay: `${i * 60}ms` }}
              className="grid grid-cols-1 gap-2 py-6 sm:grid-cols-[14rem_1fr_auto] sm:items-baseline sm:gap-8"
            >
              <span className="text-[19px] font-light text-[var(--c-ink)]">{s.name}</span>
              <span className="text-[15px] font-extralight text-[var(--c-ink-2)]">{s.detail}</span>
              {/* The count device lives here rather than on the landing view:
                  these figures are met for the first time at this point in the
                  page, so blooming them is a reveal instead of a screen full
                  of zeros. The engine reads formatting off the target, so the
                  target string and the rendered string are the same one. */}
              <span className="font-mono text-[15px] tabular-nums text-[var(--c-ink)]">
                <span
                  data-sc-count={`0 ${s.count.toLocaleString("en-US")}`}
                  data-sc-count-at="0.15 0.55"
                >
                  {s.count.toLocaleString("en-US")}
                </span>{" "}
                <span className="text-[var(--c-ink-3)]">{s.unit}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="measure mt-10 text-[15px] font-extralight text-[var(--c-ink-2)]" data-sc-in>
          Scores are percentile ranks, recomputed across all{" "}
          {overview?.tools_tracked ?? tools.length} tools at once. A tool does
          not rise because it got louder. It rises because it got louder than
          the others.
        </p>
      </div>
    </section>
  );
}
