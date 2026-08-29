import Link from "next/link";
import ChapterHead from "@/components/landing/ChapterHead";
import AssetSlot from "@/components/ui/AssetSlot";
import type { Roadmap } from "@/data/trends";

/* CHAPTER 5 — The order. Feeling: momentum.
 *
 * Hard cut back to white. This is the chapter where the reference runs its
 * case studies; ours holds the roadmaps plus a slot for real beta quotes,
 * which stays empty until they exist. Fabricating a testimonial is a
 * ship-blocker, and an obviously empty slot is more honest than a plausible
 * invention.
 */
const CARD_TINTS = ["#8ED462", "#FF705D", "#F5E211", "#2BA0FF", "#C3AEFF", "#A8E5E5"];

export default function ChOrder({ roadmaps }: { roadmaps: Roadmap[] }) {
  const shown = roadmaps.slice(0, 6);
  const totalSteps = roadmaps.reduce((n, r) => n + (r.step_count ?? 0), 0);

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
          {shown.map((r, i) => (
            <li key={r.slug} className="col-span-4" data-sc-in style={{ transitionDelay: `${i * 55}ms` }}>
              <Link
                href={`/roadmap/${r.slug}`}
                className="on-accent block h-full rounded-[50px] p-7 transition-transform duration-300 hover:-translate-y-1"
                style={{ background: CARD_TINTS[i % CARD_TINTS.length] }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2C2E2A]/70 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-[21px] font-medium tracking-[-0.02em] text-[#2C2E2A]">
                  {r.title ?? r.slug}
                </h3>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#2C2E2A]/80">
                  {r.step_count ?? 0} steps
                  {r.estimated_weeks ? ` · about ${r.estimated_weeks} weeks` : ""}
                </p>
              </Link>
            </li>
          ))}
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
