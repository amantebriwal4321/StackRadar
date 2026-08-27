import Link from "next/link";
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
      <div className="mx-auto w-full max-w-[1400px] px-6 py-[18vh] md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2
            id="ch-order-h"
            className="max-w-[16ch] text-[clamp(2rem,4.6vw,3.35rem)] font-medium leading-[1.15] tracking-[-0.04em] text-[var(--c-ink)]"
            data-sc-in
            data-sc-reveal="up"
          >
            Then learn them in an order that holds up.
          </h2>
          <p className="max-w-[34ch] text-[16px] font-medium leading-relaxed text-[var(--c-ink-2)]" data-sc-in>
            <span
              className="font-mono tabular-nums text-[var(--c-ink)]"
              data-sc-count={`0 ${totalSteps}`}
              data-sc-count-at="0.1 0.5"
            >
              {totalSteps}
            </span>{" "}
            steps across {roadmaps.length} paths, each one tied to the tools
            that are actually moving.
          </p>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r, i) => (
            <li key={r.slug} data-sc-in style={{ transitionDelay: `${i * 55}ms` }}>
              <Link
                href={`/roadmap/${r.slug}`}
                className="block h-full rounded-[50px] p-7 transition-transform duration-300 hover:-translate-y-1"
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

        <div className="mt-16 grid gap-6 lg:grid-cols-2" data-sc-in>
          <AssetSlot
            label="Beta-user quotes"
            what="Two or three real lines from your feedback form or waitlist, with a first name and what they were learning. This becomes a quoted testimonial row. Nothing is written here until you supply them: inventing a testimonial is a hard rule against."
            path="frontend/src/data/testimonials.ts"
            ratio="16 / 7"
          />
          <AssetSlot
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
