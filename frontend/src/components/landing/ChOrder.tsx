import Link from "next/link";
import ChapterHead from "@/components/landing/ChapterHead";
import AssetSlot from "@/components/ui/AssetSlot";
import TechLogo from "@/components/ui/TechLogo";
import { ROADMAP_BY_CATEGORY } from "@/data/goals";
import { tintForSlug } from "@/lib/stack/domainColour";
import type { Roadmap, Tool } from "@/data/trends";

/* CHAPTER 5 — The order. Feeling: momentum.
 *
 * Hard cut back to white. This is the chapter where the reference runs its
 * case studies; ours holds the roadmaps plus a slot for real beta quotes,
 * which stays empty until they exist. Fabricating a testimonial is a
 * ship-blocker, and an obviously empty slot is more honest than a plausible
 * invention.
 *
 * The cards now carry their DOMAIN's colour rather than the next one off a
 * cycling array, so a roadmap is the same colour here as its segment is in
 * the coverage bar two chapters up.
 *
 * The 01/02/03 markers are gone. Numbering earns its place when the content
 * is genuinely a sequence; these eight roadmaps are parallel alternatives and
 * numbering them implied an order that does not exist. The eyebrow now says
 * how many tracked tools sit in that domain, which is both true and the thing
 * a reader choosing between them actually wants.
 */
export default function ChOrder({
  roadmaps,
  tools,
}: {
  roadmaps: Roadmap[];
  tools: Tool[];
}) {
  const shown = roadmaps.slice(0, 6);

  /* Which tracked tools belong to each roadmap, strongest first. A roadmap
     card that names nothing is asking for trust; one that shows the tools is
     making a checkable claim. */
  const toolsBySlug = new Map<string, Tool[]>();
  for (const t of tools) {
    const slug = t.category ? ROADMAP_BY_CATEGORY[t.category] : undefined;
    if (!slug) continue;
    const list = toolsBySlug.get(slug);
    if (list) list.push(t);
    else toolsBySlug.set(slug, [t]);
  }
  for (const list of toolsBySlug.values()) list.sort((a, b) => b.score - a.score);

  return (
    <section className="ch-white" data-sc-act="flow" aria-labelledby="ch-order-h">
      <div className="ed-page py-[14vh]">
        <ChapterHead
          n={5}
          id="ch-order-h"
          title="Then learn them in order."
          thesis="Every step tied to the tools that are actually moving."
        />

        <ul className="ed-grid mt-16">
          {shown.map((r, i) => {
            const inDomain = toolsBySlug.get(r.slug) ?? [];
            return (
              <li
                key={r.slug}
                className="col-span-4"
                data-sc-in
                style={{ transitionDelay: `${i * 55}ms` }}
              >
                <Link
                  href={`/roadmap/${r.slug}`}
                  className="on-accent flex h-full flex-col rounded-[50px] p-7 transition-transform duration-300 hover:-translate-y-1"
                  style={{ background: tintForSlug(r.slug) }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] tabular-nums text-[#2C2E2A]/70">
                    {inDomain.length} tracked
                  </p>
                  <h3 className="mt-4 text-[21px] font-medium tracking-[-0.02em] text-[#2C2E2A]">
                    {r.title ?? r.slug}
                  </h3>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#2C2E2A]/80">
                    {r.step_count ?? 0} steps
                    {r.estimated_weeks ? ` · about ${r.estimated_weeks} weeks` : ""}
                  </p>

                  {/* What is actually in it. mt-auto pins this to the bottom so
                      the row of cards shares one footer baseline despite the
                      titles wrapping to different heights. */}
                  {inDomain.length > 0 && (
                    <ul className="mt-auto flex flex-wrap items-center gap-2 pt-7">
                      {inDomain.slice(0, 5).map((t) => (
                        <li
                          key={t.slug}
                          title={`${t.name} · ${t.score.toFixed(1)}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFFFF]/55"
                        >
                          <TechLogo slug={t.slug} emoji={t.icon} size={17} />
                        </li>
                      ))}
                      {inDomain.length > 5 && (
                        <li className="font-mono text-[12px] tabular-nums text-[#2C2E2A]/70">
                          +{inDomain.length - 5}
                        </li>
                      )}
                    </ul>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ed-grid mt-16" data-sc-in>
          <AssetSlot
            className="col-span-4 md:col-span-6"
            label="Beta-user quotes"
            what="Two or three real lines from your feedback form or waitlist, with a first name and what they were learning. This becomes a quoted testimonial row. Nothing is written here until you supply them: inventing a testimonial is a hard rule against."
            path="frontend/src/data/testimonials.ts"
            ratio="16 / 7"
          />
          <AssetSlot
            className="col-span-4 md:col-span-6"
            label="Roadmap walkthrough"
            what="Optional. A short capture of you checking off steps on a roadmap page. It would sit beside the quotes and show the progress loop that the copy currently only claims."
            path="frontend/public/media/roadmap.mp4"
            ratio="16 / 7"
          />
        </div>
      </div>
    </section>
  );
}
