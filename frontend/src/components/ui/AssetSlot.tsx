import type { ReactNode } from "react";

/* A slot for an asset the site does not have yet.
 *
 * The owner asked for these to be visible and self-explaining: "add normal
 * images those are relatable to the website till I get them, also write there
 * in the website where these two things are there that to be add and what is
 * be changes."
 *
 * So this is deliberately not a grey box. It names the asset, says exactly
 * where the file goes, and states what changes once it lands. When `children`
 * are passed they render as the stand-in content and the label sits over them
 * as a caption; without children the slot is the content.
 *
 * Nothing here is fabricated to fill the gap. The build rules forbid invented
 * testimonials, and an honest empty slot beats a fake quote.
 *
 * To remove a slot once the real asset arrives: drop the file at `path`, then
 * replace <AssetSlot> with the real element. The checklist is in ASSETS-TODO.md.
 */
export default function AssetSlot({
  label,
  what,
  path,
  ratio = "16 / 9",
  children,
  className = "",
}: {
  /** Short name, e.g. "Screen recording". */
  label: string;
  /** One line on what to supply and what changes when it lands. */
  what: string;
  /** Exact repo path to drop the file at. */
  path: string;
  ratio?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`asset-slot relative ${className}`} style={{ aspectRatio: children ? undefined : ratio }}>
      {children}

      <figcaption
        className={
          children
            ? "absolute inset-x-0 bottom-0 p-4"
            : "flex h-full flex-col items-start justify-center gap-2 p-6 sm:p-8"
        }
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--c-ink)] px-3 py-1 text-[11px] font-medium text-[var(--c-ground)]">
          <span aria-hidden="true">＋</span>
          {label} goes here
        </span>
        <p className="mt-1 max-w-[46ch] text-[14px] font-medium leading-snug text-[var(--c-ink)]">
          {what}
        </p>
        <code className="mt-1 rounded bg-[var(--c-surface)] px-2 py-1 text-[12px] text-[var(--c-ink-2)]">
          {path}
        </code>
      </figcaption>
    </figure>
  );
}
