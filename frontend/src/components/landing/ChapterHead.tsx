/* The device that makes six chapters read as one system.
 *
 * Before this, every chapter opened with a headline flush at the same left
 * margin and nothing else. Six near-identical blocks, no structure. Every
 * chapter now opens on the same three-part header, sharing one baseline:
 *
 *   ─────────────────────────────────────────────────────────  rule, 12 cols
 *   02          The guess              Roadmaps go stale the month
 *   cols 1–2    cols 3–8               cols 9–12, right-aligned
 *
 * The number reports position in a real sequence — this page is an argument in
 * order — rather than decorating. The thesis is the chapter's claim in one
 * line, so a reader skimming only the headers still gets the whole argument.
 */
export default function ChapterHead({
  n,
  title,
  thesis,
  id,
  cue,
}: {
  /** 1-indexed chapter number. */
  n: number;
  title: string;
  /** The chapter's claim, in one line. */
  thesis: string;
  /** id for the section's aria-labelledby. */
  id: string;
  /** Cue window, for pinned acts. Flow acts use data-sc-in instead. */
  cue?: string;
}) {
  return (
    <header className="ed-grid ed-rule pt-6" data-sc-cue={cue}>
      <p className="ed-fig col-span-1 text-[13px] text-[var(--c-ink-3)] md:col-span-2">
        {String(n).padStart(2, "0")}
      </p>

      <h2
        id={id}
        className="col-span-3 text-[clamp(1.6rem,2.6vw,2.1rem)] font-medium leading-[1.15] tracking-[-0.03em] text-[var(--c-ink)] md:col-span-6"
      >
        {title}
      </h2>

      <p className="col-span-4 text-[15px] font-medium leading-relaxed text-[var(--c-ink-2)] md:col-span-4 md:text-right">
        {thesis}
      </p>
    </header>
  );
}
