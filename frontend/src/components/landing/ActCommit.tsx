"use client";

import FiveMinutePlan from "@/components/FiveMinutePlan";

/* ACT 5 — Commitment. Feeling: agency.
 *
 * Live surface closes on an actual input, never on a magnetic button: a
 * magnetic CTA is the wrong ending for a page that spent its whole length
 * being a tool. FiveMinutePlan already IS a real input, so the close is the
 * product's own first step rather than a marketing plate wrapped around it.
 *
 * The close resolves and holds. It does not fade out, and it does not become
 * a footer. */
export default function ActCommit() {
  return (
    <section
      id="five-minute-plan"
      data-sc-act="pin"
      data-sc-span="2.3"
      className="scroll-mt-24"
      aria-labelledby="act-commit-h"
    >
      <div data-sc-stage className="flex min-h-screen w-full items-center">
        <div className="mx-auto w-full max-w-[1400px] px-6 md:px-8">
          <h2
            id="act-commit-h"
            className="max-w-[22ch] font-display text-[clamp(1.9rem,3.6vw,3rem)] font-normal leading-[1.06] tracking-[-0.04em] text-[var(--c-ink)]"
            data-sc-cue="0 1 0 0"
          >
            So tell it what you are aiming at.
          </h2>

          <div className="mt-10" data-sc-cue="0.12">
            <FiveMinutePlan />
          </div>
        </div>
      </div>
    </section>
  );
}
