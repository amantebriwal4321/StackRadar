"use client";

import TechLogo from "@/components/ui/TechLogo";
import type { Tool } from "@/data/trends";

/* The margin folio, and the carrier of the signature move.
 *
 * Chaptered editorial requires a folio rather than a fixed bar: chapter number
 * and title in the margin, updating as chapters pass. This one does that job
 * AND holds what the reader has picked up while reading, so the nav and the
 * mechanic are the same object instead of two competing pieces of chrome.
 *
 * It starts empty on purpose. Nothing is pre-selected, so whatever is in it by
 * the colophon was genuinely chosen.
 *
 * TWO FORMS, because the margin only exists on very wide screens. The aside
 * needs 13rem of clear margin, so it was gated to 2xl (1536px) and simply did
 * not exist on a 1280 or 1440 laptop — which is most readers. The mechanic's
 * only persistent feedback was invisible to them. Below 2xl the same state
 * renders as a docked pill instead.
 *
 * The dock appears only once something is picked. Empty persistent chrome at
 * those widths is noise; arriving on the first pick makes it a consequence of
 * the reader's own action, which is the whole point of the mechanic.
 */
export default function StackFolio({
  chapter,
  chapterTitle,
  picked,
  tools,
  onRemove,
}: {
  chapter: number;
  chapterTitle: string;
  picked: string[];
  tools: Tool[];
  onRemove: (slug: string) => void;
}) {
  const bySlug = new Map(tools.map((t) => [t.slug, t]));

  /* ── 2xl and up: the margin folio. ── */
  const margin = (
    <aside
      className="pointer-events-none fixed left-0 top-0 z-40 hidden h-screen w-[13rem] flex-col justify-between py-28 pl-6 2xl:flex"
      aria-label="Reading position and your stack"
    >
      <div className="pointer-events-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--c-ink-3)] tabular-nums">
          {String(chapter).padStart(2, "0")}
        </p>
        <p className="mt-1 max-w-[11ch] text-[13px] font-medium leading-tight text-[var(--c-ink-2)]">
          {chapterTitle}
        </p>
      </div>

      <div className="pointer-events-auto">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--c-ink-3)]">
          your stack
        </p>

        {picked.length === 0 ? (
          <p className="mt-2 max-w-[13ch] text-[12px] leading-snug text-[var(--c-ink-3)]">
            Empty. Pick something up as you read.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {picked.map((slug) => {
              const t = bySlug.get(slug);
              return (
                <li key={slug}>
                  <button
                    onClick={() => onRemove(slug)}
                    title={`Remove ${t?.name ?? slug}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink)] transition-transform duration-200 hover:scale-110"
                  >
                    <TechLogo slug={slug} emoji={t?.icon} size={17} brand />
                    <span className="sr-only">Remove {t?.name ?? slug}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );

  /* ── Below 2xl: the same state, docked. ──
     Bottom LEFT, because the feedback pill already owns bottom right. */
  const dock = picked.length > 0 && (
    <div
      className="fixed bottom-5 left-4 z-40 flex max-w-[calc(100vw-6rem)] items-center gap-3 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] py-2 pl-4 pr-2 2xl:hidden"
      aria-label="Your stack"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums text-[var(--c-ink-3)]">
        stack {String(picked.length).padStart(2, "0")}
      </p>

      <ul className="flex items-center -space-x-1.5">
        {picked.slice(-6).map((slug) => {
          const t = bySlug.get(slug);
          return (
            <li
              key={slug}
              title={t?.name ?? slug}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--c-ground)]"
            >
              <TechLogo slug={slug} emoji={t?.icon} size={15} brand />
            </li>
          );
        })}
      </ul>

      <a
        href="#read-out"
        className="on-ink rounded-full bg-[var(--accent-1)] px-3.5 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-85"
      >
        Read-out
      </a>
    </div>
  );

  return (
    <>
      {margin}
      {dock}
    </>
  );
}
