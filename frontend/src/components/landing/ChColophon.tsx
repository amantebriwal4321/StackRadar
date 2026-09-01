"use client";

import ChapterArt from "@/components/landing/ChapterArt";
import ChapterHead from "@/components/landing/ChapterHead";
import Link from "next/link";
import TechLogo from "@/components/ui/TechLogo";
import AssetSlot from "@/components/ui/AssetSlot";
import StackDiagnosis from "@/components/landing/StackDiagnosis";
import { diagnose } from "@/lib/stack/diagnose";
import type { Tool } from "@/data/trends";

/* CHAPTER 6 — Colophon. Feeling: resolve.
 *
 * Chaptered editorial closes on a colophon plate: small type, the CTA as a
 * line of running text rather than a button island.
 *
 * This is where the signature move pays off, and it renders from the SAME
 * diagnose() the catalog uses. Previously each chapter did its own arithmetic,
 * which is how the two ended up feeling unrelated to each other.
 *
 * The empty state is a demonstration rather than a shrug. It used to read "You
 * did not pick anything up. That is allowed." and stop, which is a dead end at
 * the exact moment the page should be most useful. It now runs the same
 * read-out over the three fastest-rising tools, labelled plainly as an example,
 * so a reader who picked nothing still sees what the mechanic does.
 */
export default function ChColophon({
  picked,
  tools,
  onRemove,
}: {
  picked: string[];
  tools: Tool[];
  onRemove: (slug: string) => void;
}) {
  const empty = picked.length === 0;

  // The worked example is the three fastest risers: real, and it changes with
  // the data rather than being a hand-picked demo set.
  const exampleSlugs = [...tools]
    .sort((a, b) => b.growth_pct - a.growth_pct)
    .slice(0, 3)
    .map((t) => t.slug);

  const d = diagnose(empty ? exampleSlugs : picked, tools);
  const bySlug = new Map(tools.map((t) => [t.slug, t]));

  return (
    <section
      className="ch-cream"
      data-sc-act="flow"
      aria-labelledby="ch-colophon-h"
      id="read-out"
    >
      <ChapterArt variant="quiet" />
      <div className="ed-page py-[14vh]">
        <ChapterHead
          n={6}
          id="ch-colophon-h"
          title={empty ? "Here is what that reads like." : "This is what you are holding."}
          thesis="Nothing was typed into a form. This is only what you chose while reading."
        />

        <div className="ed-grid mt-16 items-start">
          <div className="col-span-4 md:col-span-7">

            <div className="mt-8" data-sc-in>
              <StackDiagnosis
                d={d}
                exampleOf={empty ? "example · the three fastest risers" : null}
              />
            </div>

            {/* The picks themselves, removable. An editable list is the
                difference between a summary and a tool. */}
            {!empty && (
              <ul className="mt-8 flex flex-wrap gap-2" data-sc-in>
                {picked.map((slug) => {
                  const t = bySlug.get(slug);
                  if (!t) return null;
                  return (
                    <li key={slug}>
                      <button
                        onClick={() => onRemove(slug)}
                        aria-label={`Remove ${t.name} from your stack`}
                        className="flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-2 transition-colors hover:border-[color-mix(in_srgb,var(--c-ink)_35%,transparent)]"
                      >
                        <TechLogo slug={t.slug} emoji={t.icon} size={17} brand />
                        <span className="text-[14px] font-medium text-[var(--c-ink)]">
                          {t.name}
                        </span>
                        <span aria-hidden="true" className="text-[13px] text-[var(--c-ink-3)]">
                          ×
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <p
              className="mt-10 max-w-[46ch] text-[17px] font-medium leading-relaxed text-[var(--c-ink-2)]"
              data-sc-in
            >
              {empty ? (
                <>
                  <Link
                    href="#build"
                    className="text-[var(--c-ink)] underline decoration-[#FF705D] decoration-2 underline-offset-4"
                  >
                    Pick your own
                  </Link>{" "}
                  and this recomputes from what you actually use. Or{" "}
                  <Link
                    href="/explore"
                    className="underline decoration-[var(--c-ink-3)] underline-offset-4 hover:text-[var(--c-ink)]"
                  >
                    open the console
                  </Link>{" "}
                  to see all {tools.length} ranked.
                </>
              ) : (
                <>
                  <Link
                    href="#build"
                    className="text-[var(--c-ink)] underline decoration-[#FF705D] decoration-2 underline-offset-4"
                  >
                    Change your picks
                  </Link>{" "}
                  and everything above recomputes. Nothing was typed into a
                  form: this is only what you chose while reading.
                </>
              )}
            </p>
          </div>

          <div className="col-span-4 md:col-span-4 md:col-start-9" data-sc-in>
            <AssetSlot
              n={3}
              label="Your photo, or a short clip"
              spec={[
                ["Either", "a headshot, or ~10s of you to camera"],
                ["Saying", "what StackRadar is for, in your own words"],
                ["Crop", "portrait, 4:5"],
                ["Format", ".jpg — or .mp4 for the clip"],
              ]}
              changes="Becomes the byline on this closing plate, so the page ends on a person rather than a paragraph."
              how="A phone photo in even light is genuinely fine. The reference site's whole pitch is real humans, and a beta gains more from a face than a mature product does."
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
