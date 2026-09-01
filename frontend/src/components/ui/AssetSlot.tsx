import type { ReactNode } from "react";

/* A slot for an asset the site does not have yet.
 *
 * The owner asked for these to be visible and self-explaining: "add normal
 * images those are relatable to the website till I get them, also write there
 * in the website where these two things are there that to be add and what is
 * be changes."
 *
 * The first version said the right things in the wrong shape: one label, one
 * sentence of prose and a file path, so the actual answerable questions — how
 * long, what format, how wide, does it need audio, is this the one worth doing
 * first — were either buried in the sentence or absent. You cannot act on a
 * paragraph; you can act on a spec.
 *
 * So it now reads as a work order: a number and a priority, a spec table of
 * every constraint that would otherwise be a follow-up question, exactly what
 * changes on the page once it lands, and where the file goes. Everything a
 * person needs to go and make the thing without asking anything back.
 *
 * Nothing here is fabricated to fill the gap. The build rules forbid invented
 * testimonials, and an honest empty slot beats a plausible fake.
 *
 * To retire a slot: drop the file at `path`, then replace <AssetSlot> with the
 * real element. The same list lives in ASSETS-TODO.md at the repo root.
 *
 * Server component: no hooks, no client bundle cost.
 */
export default function AssetSlot({
  n,
  label,
  priority,
  spec,
  changes,
  how,
  path,
  ratio = "16 / 9",
  children,
  className = "",
}: {
  /** Slot number, matching ASSETS-TODO.md so the two can be cross-referenced. */
  n: number;
  /** Short name, e.g. "Screen recording". */
  label: string;
  /** Why this one matters relative to the others. Omit for the optional ones. */
  priority?: string;
  /** The constraints, as label/value pairs. Every entry here is a question
   *  that would otherwise have to be asked before the asset could be made. */
  spec: [string, string][];
  /** What visibly changes on this page once the file lands. */
  changes: string;
  /** Optional: how to actually produce it. */
  how?: string;
  /** Exact repo path to drop the file at. */
  path: string;
  ratio?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={`asset-slot relative ${className}`}
      style={{ aspectRatio: children ? undefined : ratio }}
    >
      {children}

      <figcaption
        className={
          children
            ? "absolute inset-0 flex flex-col justify-end p-5"
            : "flex h-full flex-col justify-center gap-3 p-6 sm:p-7"
        }
      >
        {/* Identity: which slot this is, and whether it is the one to do first. */}
        <p className="flex flex-wrap items-center gap-2">
          <span className="on-ink inline-flex items-center gap-2 rounded-full bg-[var(--c-ink)] px-3 py-1 text-[11px] font-medium">
            <span aria-hidden="true">＋</span>
            Asset {String(n).padStart(2, "0")} · {label}
          </span>
          {priority && (
            <span className="on-accent rounded-full bg-[#F5E211] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
              {priority}
            </span>
          )}
        </p>

        {/* The spec. A dl rather than prose, because these are answers to
            questions and a reader should be able to scan for the one they
            have rather than parse a sentence to find it. */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px] leading-relaxed">
          {spec.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="uppercase tracking-[0.14em] text-[var(--c-ink-3)]">{k}</dt>
              <dd className="text-[var(--c-ink)]">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="max-w-[52ch] text-[13px] font-medium leading-snug text-[var(--c-ink-2)]">
          <span className="text-[var(--c-ink)]">When it lands: </span>
          {changes}
        </p>

        {how && (
          <p className="max-w-[52ch] text-[13px] font-medium leading-snug text-[var(--c-ink-2)]">
            <span className="text-[var(--c-ink)]">How: </span>
            {how}
          </p>
        )}

        <code className="w-fit max-w-full overflow-x-auto rounded bg-[var(--c-surface)] px-2 py-1 text-[11px] text-[var(--c-ink-2)]">
          {path}
        </code>
      </figcaption>
    </figure>
  );
}
