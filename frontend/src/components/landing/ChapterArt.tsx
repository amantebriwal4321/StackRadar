/* Background graphics for a chapter.
 *
 * The reference decorates its cream canvas with flat SVG props — a clock, a
 * folder, a paper plane — and, tellingly, "-trace" files: the dotted flight
 * path a thrown object leaves behind. Pinned and parallaxed on scroll, they
 * are what stops a flat cream page reading as static.
 *
 * We have no illustrator, so ours come from StackRadar's own vocabulary rather
 * than borrowed characters: a radar sweep, a signal trace, a quiet ring.
 *
 * RESTRAINT IS THE POINT. The reference measures 0.031 colourfulness — it is
 * ~97% neutral and the props punctuate a mostly empty canvas. A first pass
 * here put big saturated dots across the headline and read as confetti. Each
 * variant is now ONE prop, held to the outer edge, clear of the text column.
 *
 * Mechanics:
 *  - `data-sc-parallax` is the engine's own device, so the scroll response
 *    costs no extra listener and stops when the engine does.
 *  - The drift is a CSS keyframe, so it runs where rAF never fires and the
 *    resting state is a composed frame rather than a blank one.
 *  - Server component, aria-hidden, pointer-events-none: atmosphere only.
 */
export default function ChapterArt({
  variant,
}: {
  variant: "sweep" | "traces" | "quiet";
}) {
  return (
    <div
      aria-hidden="true"
      className="ch-art pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {variant === "sweep" && (
        /* Radar rings, mostly off the right edge. The type owns the left two
           thirds, so the sweep never crosses a line of copy. */
        <svg
          data-sc-parallax="-0.14"
          className="absolute -right-[9vw] top-[16vh] hidden h-[68vh] w-[68vh] lg:block"
          viewBox="0 0 400 400"
          fill="none"
        >
          {[92, 140, 186].map((r, i) => (
            <circle
              key={r}
              cx="200"
              cy="200"
              r={r}
              stroke="var(--c-ink)"
              strokeOpacity={0.16 - i * 0.03}
              strokeWidth="1"
              strokeDasharray={i === 1 ? "3 9" : undefined}
            />
          ))}
          <path d="M200 200 L200 14" stroke="#8ED462" strokeWidth="5" strokeLinecap="round" />
          <circle cx="200" cy="200" r="9" fill="#8ED462" />
          <circle cx="316" cy="126" r="13" fill="#FF705D" />
        </svg>
      )}

      {variant === "traces" && (
        /* The "-trace" idea in our terms: one dotted signal path arcing along
           the bottom edge, well below the copy. */
        <svg
          data-sc-parallax="-0.1"
          className="absolute -left-[3vw] bottom-[-2vh] hidden h-[42vh] w-[52vw] lg:block"
          viewBox="0 0 600 300"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M10 250 C 150 250, 210 120, 340 110 S 500 60, 596 20"
            stroke="var(--c-ink)"
            strokeOpacity="0.3"
            strokeWidth="2.5"
            strokeDasharray="1 16"
            strokeLinecap="round"
          />
          <circle cx="340" cy="110" r="11" fill="#2BA0FF" />
        </svg>
      )}

      {variant === "quiet" && (
        <svg
          data-sc-parallax="-0.08"
          className="absolute -left-[9vw] bottom-[-6vh] hidden h-[52vh] w-[52vh] lg:block"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle cx="200" cy="200" r="150" stroke="var(--c-ink)" strokeOpacity="0.14" strokeWidth="1" />
          <circle cx="200" cy="200" r="96" stroke="var(--c-ink)" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 9" />
          <circle cx="200" cy="200" r="12" fill="#C3AEFF" />
        </svg>
      )}
    </div>
  );
}
