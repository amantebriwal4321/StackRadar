import AssetSlot from "@/components/ui/AssetSlot";
import type { Overview, Tool } from "@/data/trends";

/* CHAPTER 3 — The measurement. Feeling: reassurance.
 *
 * The reference's stacking number cards, rebuilt: sticky siblings that pile up
 * as you scroll, each resting slightly below the last so the whole stack stays
 * readable. Every figure is summed from the tools' own per-source counts, so
 * there is no counter here without a measured number behind it.
 *
 * Deliberately the quietest chapter, and quieter than the catalog that follows.
 */
export default function ChMeasure({
  tools,
  overview,
}: {
  tools: Tool[];
  overview: Overview | null;
}) {
  const sum = (pick: (t: Tool) => number) =>
    tools.reduce((n, t) => n + (pick(t) || 0), 0);

  const sources = [
    {
      name: "GitHub",
      detail: "Stars, forks and release cadence for every tracked repository.",
      figure: (overview?.total_stars ?? 0).toLocaleString("en-US"),
      unit: "stars indexed",
      tint: "#8ED462",
    },
    {
      name: "Hacker News",
      detail: "Front page and new, matched against the catalog.",
      figure: sum((t) => t.hn_count).toLocaleString("en-US"),
      unit: "mentions",
      tint: "#FF705D",
    },
    {
      name: "Reddit",
      detail: "Developer subreddits, read as RSS with no account attached.",
      figure: sum((t) => t.reddit_count).toLocaleString("en-US"),
      unit: "mentions",
      tint: "#2BA0FF",
    },
    {
      name: "Dev.to",
      detail: "Posts, tags and descriptions across the whole feed.",
      figure: sum((t) => t.devto_count).toLocaleString("en-US"),
      unit: "mentions",
      tint: "#F5E211",
    },
    {
      name: "Tech press",
      detail: "RSS across the trade publications that cover releases.",
      figure: sum((t) => t.news_count).toLocaleString("en-US"),
      unit: "mentions",
      tint: "#C3AEFF",
    },
  ];

  return (
    <section className="ch-cream" data-sc-act="flow" aria-labelledby="ch-measure-h">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-[16vh] md:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <h2
              id="ch-measure-h"
              className="max-w-[15ch] text-[clamp(2rem,4.4vw,3.28rem)] font-medium leading-[1.04] tracking-[-0.04em] text-[var(--c-ink)]"
              data-sc-in
            >
              So we measure it instead.
            </h2>
            <p
              className="mt-6 max-w-[42ch] text-[17px] font-medium leading-relaxed text-[var(--c-ink-2)]"
              data-sc-in
            >
              Five public sources, read every day and scored against each other.
              A tool does not rise because it got louder. It rises because it
              got louder than the others.
            </p>

            <div className="mt-10" data-sc-in>
              <AssetSlot
                label="Screen recording"
                what="A 5 to 10 second screen capture of you scrolling the console and opening a tool. This replaces the static frame above and makes the whole chapter show the product working instead of describing it."
                path="frontend/public/media/console.mp4"
                ratio="16 / 10"
              />
            </div>
          </div>

          {/* The stack. --i offsets each card's resting position. */}
          <ol className="space-y-6">
            {sources.map((s, i) => (
              <li
                key={s.name}
                className="stack-card p-7 md:p-9"
                style={{ ["--i" as string]: i, background: s.tint, borderColor: "transparent" }}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2C2E2A]/70">
                  source {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-[26px] font-medium tracking-[-0.02em] text-[#2C2E2A]">
                  {s.name}
                </h3>
                <p className="mt-2 max-w-[38ch] text-[15px] font-medium leading-relaxed text-[#2C2E2A]/80">
                  {s.detail}
                </p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span
                    className="font-mono text-[clamp(2rem,3.4vw,3rem)] font-medium tabular-nums tracking-[-0.03em] text-[#2C2E2A]"
                    data-sc-count={`0 ${s.figure}`}
                    data-sc-count-at="0.1 0.5"
                  >
                    {s.figure}
                  </span>
                  <span className="text-[13px] font-medium text-[#2C2E2A]/70">
                    {s.unit}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
