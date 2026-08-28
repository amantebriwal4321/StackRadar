import ChapterArt from "@/components/landing/ChapterArt";
import Link from "next/link";
import TechLogo from "@/components/ui/TechLogo";
import type { Overview, Tool } from "@/data/trends";

/* CHAPTER 1 — Title page. Feeling: invitation.
 *
 * Chaptered editorial opens on a title page: type on the paper ground, no
 * media above the fold. The media starts in chapter two. Copy is anchored
 * lead, never centred, which the grammar forbids.
 */
export default function ChTitle({
  overview,
  tools,
}: {
  overview: Overview | null;
  tools: Tool[];
}) {
  const tracked = overview?.tools_tracked ?? tools.length;
  const stars = (overview?.total_stars ?? 0).toLocaleString("en-US");
  const wall = tools.slice(0, 14);

  return (
    <section className="ch-cream" data-sc-act="flow" aria-labelledby="ch-title-h">
      <ChapterArt variant="sweep" />
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-24 pt-[26vh] md:px-10 lg:px-16">
        <p
          className="inline-block rounded-full bg-[#FF705D] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[#2C2E2A]"
          data-sc-in
        >
          Momentum intelligence for developers
        </p>

        <h1
          id="ch-title-h"
          className="mt-6 max-w-[13ch] text-[clamp(2.75rem,8vw,8.75rem)] font-medium leading-[0.95] tracking-[-0.06em] text-[var(--c-ink)]"
          data-sc-in
        >
          Stop guessing what to learn next.
        </h1>

        <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between" data-sc-in>
          <p className="max-w-[46ch] text-[18px] font-medium leading-relaxed text-[var(--c-ink-2)]">
            StackRadar scores {tracked} technologies against each other every
            day, from five public sources, then hands you the order to learn
            them in.
          </p>

          <Link href="#build" className="btn-primary shrink-0">
            Build my stack
          </Link>
        </div>

        {/* The logo wall the reference uses for client brands. Ours is the
            catalog we actually track, so it is a claim we can support. */}
        <div className="mt-20 pt-8" data-sc-in>
          <span aria-hidden="true" className="mb-8 block h-1.5 w-full rounded-full bg-[linear-gradient(90deg,#8ED462_0_25%,#FF705D_25%_50%,#F5E211_50%_75%,#2BA0FF_75%_100%)]" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--c-ink-3)]">
            tracking {tracked} technologies · {stars} stars indexed
          </p>
          {/* Sized to be READ, not decorated with. At 26px monochrome these
              were an unrecognisable row of glyphs; the reference's logo wall
              works because each mark is identifiable at a glance. */}
          <ul className="mt-7 flex flex-wrap items-center gap-x-10 gap-y-7">
            {wall.map((t) => (
              <li key={t.slug} className="group flex items-center gap-2.5" title={t.name}>
                <span className="text-[var(--c-ink)] opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                  <TechLogo slug={t.slug} emoji={t.icon} size={34} />
                </span>
                <span className="hidden text-[14px] font-medium text-[var(--c-ink-2)] transition-colors duration-300 group-hover:text-[var(--c-ink)] xl:inline">
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
