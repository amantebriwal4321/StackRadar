import Image from "next/image";
import type { Tool } from "@/data/trends";

/* CHAPTER 2 — The guess. Feeling: recognition.
 *
 * Hard cut to white: chapters land on their own ground and stay there. The
 * grammar puts media in its own column with a caption rather than bleeding it
 * under the type, so the screenshot sits beside the argument, not behind it.
 *
 * `reveal` at the chapter boundary is the device; the media column takes a
 * gentle parallax.
 */
export default function ChGuess({ tools }: { tools: Tool[] }) {
  // A real disagreement from live data: what a beginner is usually told to
  // learn, against what is actually moving fastest right now.
  const fastest = [...tools].sort((a, b) => b.growth_pct - a.growth_pct)[0];

  return (
    <section className="ch-white" data-sc-act="flow" aria-labelledby="ch-guess-h">
      <div className="mx-auto grid w-full max-w-[1400px] gap-14 px-6 py-[18vh] md:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-center">
        <div data-sc-reveal="up" data-sc-in>
          <h2
            id="ch-guess-h"
            className="max-w-[16ch] text-[clamp(2rem,4.4vw,3.28rem)] font-medium leading-[1.04] tracking-[-0.04em] text-[var(--c-ink)]"
          >
            Everyone is guessing. Including the people telling you what to
            learn.
          </h2>

          <div className="mt-8 max-w-[48ch] space-y-5 text-[17px] font-medium leading-relaxed text-[var(--c-ink-2)]">
            <p>
              Roadmaps go stale the month they are published. Course catalogues
              rank by what sells. The loudest framework on your timeline is
              usually the one with the biggest marketing budget, not the one
              gaining ground.
            </p>
            <p className="text-[var(--c-ink)]">
              Meanwhile{" "}
              <span className="rounded bg-[color-mix(in_srgb,var(--accent-yellow)_55%,transparent)] px-1.5 py-0.5">
                {fastest?.name}
              </span>{" "}
              moved {fastest?.growth_pct >= 0 ? "up" : "down"}{" "}
              {Math.abs(fastest?.growth_pct ?? 0).toFixed(1)}% in the last seven
              days and nobody sent you a memo.
            </p>
          </div>
        </div>

        {/* Media column, captioned, in its own space. */}
        <figure className="media-frame" data-sc-parallax="-0.06" data-sc-in>
          <Image
            src="/media/shot-trends.png"
            alt="The StackRadar trends board, ranking technologies by momentum"
            width={1440}
            height={900}
            className="h-auto w-full"
            priority={false}
          />
          <figcaption className="border-t border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-3 text-[13px] font-medium text-[var(--c-ink-2)]">
            The trends board, updated daily from live readings.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
