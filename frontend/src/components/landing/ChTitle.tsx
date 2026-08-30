import ChapterArt from "@/components/landing/ChapterArt";
import Link from "next/link";
import TechLogo from "@/components/ui/TechLogo";
import type { Overview, Tool } from "@/data/trends";

/* CHAPTER 1 — Title page. Feeling: invitation.
 *
 * Chaptered editorial opens on a title page: type on the paper ground, no
 * media above the fold. Copy is anchored lead, never centred.
 *
 * On the grid now. The headline holds columns 1–9 so it has a real right
 * margin instead of running to the container edge, and the CTA sits in 10–12
 * where it is anchored to a column rather than floating.
 *
 * The four-colour band that used to sit here is gone. It was a stripe that
 * encoded nothing. In its place is the SPEC ROW: real figures, set in mono and
 * aligned to their columns, which is what a page about a ranking should open
 * with. A scoreboard line rather than decoration.
 */
export default function ChTitle({
  overview,
  tools,
}: {
  overview: Overview | null;
  tools: Tool[];
}) {
  const tracked = overview?.tools_tracked ?? tools.length;
  const wall = tools.slice(0, 12);

  const updated = overview?.last_updated
    ? new Date(overview.last_updated).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Every figure real, from /overview.
  const spec: { label: string; value: string }[] = [
    { label: "tracked", value: String(tracked) },
    { label: "sources", value: String(overview?.source_count ?? 5) },
    { label: "stars indexed", value: (overview?.total_stars ?? 0).toLocaleString("en-US") },
    { label: "last reading", value: updated ?? "—" },
  ];

  return (
    <section className="ch-cream" data-sc-act="flow" aria-labelledby="ch-title-h">
      <ChapterArt variant="sweep" />

      <div className="ed-page pb-24 pt-[24vh]">
        <div className="ed-grid">
          <p
            className="col-span-4 md:col-span-9"
            data-sc-in
          >
            <span className="inline-block rounded-full bg-[#FF705D] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[#2C2E2A]">
              Momentum intelligence for developers
            </span>
          </p>

          <h1
            id="ch-title-h"
            className="col-span-4 mt-6 text-[clamp(2.75rem,7.4vw,7.5rem)] font-medium leading-[0.95] tracking-[-0.06em] text-[var(--c-ink)] md:col-span-9"
            data-sc-in
          >
            Stop guessing what to learn next.
          </h1>

          <p
            className="col-span-4 mt-8 text-[18px] font-medium leading-relaxed text-[var(--c-ink-2)] md:col-span-5 md:mt-10"
            data-sc-in
          >
            StackRadar scores {tracked} technologies against each other every
            day, from five public sources, then hands you the order to learn
            them in.
          </p>

          {/* Two paths, not one. The hero previously offered a single CTA, which
              assumes every reader wants to start by picking — a reader who
              arrived to look at the data had nothing to click. The secondary is
              the same pill in outline, so the pair reads as one control. */}
          <div
            className="col-span-4 mt-8 flex flex-wrap items-start gap-3 md:col-span-5 md:col-start-8 md:mt-10 md:justify-end"
            data-sc-in
          >
            <Link href="#build" className="btn-primary">
              Build my stack
            </Link>
            <Link href="/explore" className="btn-secondary">
              Open the console
            </Link>
          </div>
        </div>

        {/* ── The spec row. ──
            A ruled line of measured figures, right-aligned in their columns.
            This is the page's subject stated as the subject states itself. */}
        <dl className="ed-grid ed-rule mt-24 pt-5" data-sc-in>
          {spec.map((s) => (
            <div key={s.label} className="col-span-2 md:col-span-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--c-ink-3)]">
                {s.label}
              </dt>
              <dd className="ed-fig mt-1.5 text-[clamp(1.1rem,1.7vw,1.6rem)] font-medium text-[var(--c-ink)]">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* The catalog we actually track, so the wall is a claim we can support. */}
        <div className="ed-grid ed-rule mt-14 pt-6" data-sc-in>
          <ul className="col-span-4 flex flex-wrap items-center gap-x-8 gap-y-5 md:col-span-12">
            {wall.map((t) => (
              <li key={t.slug} className="group flex items-center gap-2.5" title={t.name}>
                <span className="text-[var(--c-ink)] opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                  <TechLogo slug={t.slug} emoji={t.icon} size={26} />
                </span>
                <span className="hidden text-[14px] font-medium text-[var(--c-ink-2)] xl:inline">
                  {t.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
