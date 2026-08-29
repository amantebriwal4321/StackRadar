import Image from "next/image";
import ChapterHead from "@/components/landing/ChapterHead";
import type { Tool } from "@/data/trends";

/* CHAPTER 2 — The guess. Feeling: recognition.
 *
 * Hard cut to white. Media sits in its own column with a caption rather than
 * bleeding under the type, which is what the grammar asks for.
 *
 * RHYTHM: text left (1–5), media right (6–12). Chapter 3 reverses it. Every
 * chapter used to be laid out identically, which is most of why the page read
 * as one block repeated six times.
 */
export default function ChGuess({ tools }: { tools: Tool[] }) {
  // A real disagreement from live data: what a beginner is usually told to
  // learn, against what is actually moving fastest right now.
  const fastest = [...tools].sort((a, b) => b.growth_pct - a.growth_pct)[0];

  return (
    <section className="ch-white" data-sc-act="flow" aria-labelledby="ch-guess-h">
      <div className="ed-page py-[14vh]">
        <ChapterHead
          n={2}
          id="ch-guess-h"
          title="Everyone is guessing."
          thesis="Including the people telling you what to learn."
        />

        <div className="ed-grid mt-16">
          <div className="col-span-4 md:col-span-5" data-sc-reveal="up" data-sc-in>
            <div className="space-y-5 text-[17px] font-medium leading-relaxed text-[var(--c-ink-2)]">
              <p>
                Roadmaps go stale the month they are published. Course
                catalogues rank by what sells. The loudest framework on your
                timeline is usually the one with the biggest marketing budget,
                not the one gaining ground.
              </p>
              <p className="text-[var(--c-ink)]">
                Meanwhile{" "}
                <span className="on-accent rounded bg-[#F5E211] px-1.5 py-0.5">
                  {fastest?.name}
                </span>{" "}
                moved {fastest?.growth_pct >= 0 ? "up" : "down"}{" "}
                <span className="ed-fig">
                  {Math.abs(fastest?.growth_pct ?? 0).toFixed(1)}%
                </span>{" "}
                in the last seven days and nobody sent you a memo.
              </p>
            </div>
          </div>

          <figure
            className="media-frame col-span-4 md:col-span-6 md:col-start-7"
            data-sc-parallax="-0.06"
            data-sc-in
          >
            <Image
              src="/media/shot-trends.png"
              alt="The StackRadar trends board, ranking technologies by momentum"
              width={1440}
              height={900}
              className="h-auto w-full"
            />
            <figcaption className="on-accent bg-[#2BA0FF] px-5 py-3 text-[13px] font-medium">
              The trends board, updated daily from live readings.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
