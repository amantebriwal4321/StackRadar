"use client";

import Link from "next/link";
import TechLogo from "@/components/ui/TechLogo";
import AssetSlot from "@/components/ui/AssetSlot";
import type { Tool } from "@/data/trends";

/* CHAPTER 6 — Colophon. Feeling: resolve.
 *
 * Chaptered editorial closes on a colophon plate: small type, the CTA set as a
 * line of running text rather than a button island, and no magnetic button.
 *
 * This is also where the signature move pays off. Everything here is computed
 * from what the reader picked up in chapter 4, from real scores. If they
 * picked nothing, the plate says so plainly rather than inventing a stack.
 */
export default function ChColophon({
  picked,
  tools,
}: {
  picked: string[];
  tools: Tool[];
}) {
  const bySlug = new Map(tools.map((t) => [t.slug, t]));
  const chosen = picked.map((s) => bySlug.get(s)).filter(Boolean) as Tool[];

  const avg =
    chosen.length > 0
      ? chosen.reduce((n, t) => n + t.score, 0) / chosen.length
      : null;

  // The strongest thing they did NOT pick, so the suggestion is a real gap
  // rather than a generic upsell.
  const missing = [...tools]
    .filter((t) => !picked.includes(t.slug))
    .sort((a, b) => b.score - a.score)[0];

  const goal = chosen[0]?.category;

  return (
    <section className="ch-cream" data-sc-act="flow" aria-labelledby="ch-colophon-h">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-[18vh] md:px-8">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--c-ink-3)]">
              your stack
            </p>

            {chosen.length === 0 ? (
              <>
                <h2
                  id="ch-colophon-h"
                  className="mt-6 max-w-[18ch] text-[clamp(2rem,4.4vw,3.28rem)] font-medium leading-[1.04] tracking-[-0.04em] text-[var(--c-ink)]"
                  data-sc-in
                >
                  You did not pick anything up. That is allowed.
                </h2>
                <p className="mt-6 max-w-[46ch] text-[17px] font-medium leading-relaxed text-[var(--c-ink-2)]" data-sc-in>
                  Scroll back to the catalog and choose two or three things you
                  already use. Or skip it and{" "}
                  <Link href="/explore" className="underline decoration-[var(--accent-coral)] decoration-2 underline-offset-4 hover:text-[var(--c-ink)]">
                    open the console
                  </Link>{" "}
                  to see all {tools.length} ranked.
                </p>
              </>
            ) : (
              <>
                <h2
                  id="ch-colophon-h"
                  className="mt-6 max-w-[20ch] text-[clamp(2rem,4.4vw,3.28rem)] font-medium leading-[1.04] tracking-[-0.04em] text-[var(--c-ink)]"
                  data-sc-in
                >
                  {chosen.length} picked, averaging {avg!.toFixed(1)} momentum.
                </h2>

                <ul className="mt-8 flex flex-wrap gap-2" data-sc-in>
                  {chosen.map((t) => (
                    <li
                      key={t.slug}
                      className="flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-2"
                    >
                      <TechLogo slug={t.slug} emoji={t.icon} size={17} brand />
                      <span className="text-[14px] font-medium text-[var(--c-ink)]">
                        {t.name}
                      </span>
                      <span className="font-mono text-[12px] tabular-nums text-[var(--c-ink-3)]">
                        {t.score.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-10 max-w-[46ch] text-[17px] font-medium leading-relaxed text-[var(--c-ink-2)]" data-sc-in>
                  The strongest thing you left out is{" "}
                  <span className="text-[var(--c-ink)]">{missing?.name}</span> at{" "}
                  <span className="font-mono tabular-nums text-[var(--c-ink)]">
                    {missing?.score.toFixed(1)}
                  </span>
                  . When you are ready for the order to learn these in,{" "}
                  <Link
                    href={goal ? `/explore?domain=${encodeURIComponent(goal)}` : "/roadmaps"}
                    className="underline decoration-[var(--accent-coral)] decoration-2 underline-offset-4 hover:text-[var(--c-ink)]"
                  >
                    build my stack
                  </Link>
                  .
                </p>
              </>
            )}
          </div>

          <div data-sc-in>
            <AssetSlot
              label="Your photo or a short clip"
              what="A headshot or a 10 second clip of you saying what StackRadar is for. The reference site's whole pitch is real humans, and a beta product gains more from a face than a mature one does. This becomes the byline on this plate."
              path="frontend/public/media/founder.jpg"
              ratio="4 / 5"
            />
            <p className="mt-4 text-[13px] font-medium leading-relaxed text-[var(--c-ink-2)]">
              Built and maintained by one developer. StackRadar reads five
              public sources every day and keeps the history, so the ranking is
              a measurement rather than an opinion.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
