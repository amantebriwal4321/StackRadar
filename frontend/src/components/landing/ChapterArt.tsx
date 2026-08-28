/* Background graphics for a chapter.
 *
 * The reference decorates its cream canvas with flat SVG props — a clock, a
 * folder, a paper plane — and, tellingly, "-trace" files: the dotted flight
 * path a thrown object leaves behind. Pinned and parallaxed on scroll, they
 * are what stops a flat cream page reading as static.
 *
 * We have no illustrator, so ours come from StackRadar's own vocabulary rather
 * than borrowed characters: a radar sweep, a signal trace, a ping.
 *
 * TWO LAYERS OF MOTION, and neither costs a listener:
 *  - Continuous, in CSS keyframes — the sweep rotates, contacts pulse, dashes
 *    flow. This runs even where rAF never fires, so the resting state of the
 *    page is composed rather than blank.
 *  - Scroll-driven, straight from `--sc-p`. The engine publishes each act's
 *    progress on the act element and custom properties inherit, so CSS reads
 *    it directly: the sweep gains travel and the reading rides the trace.
 *
 * RESTRAINT IS STILL THE POINT. The reference measures 0.031 colourfulness —
 * ~97% neutral, props punctuating a mostly empty canvas. An earlier pass put
 * big saturated dots across the headline and read as confetti. Each variant is
 * ONE prop, held to the outer margin, clear of the text column.
 *
 * Server component, aria-hidden, pointer-events-none: atmosphere only.
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

          {/* A ping expanding out of the centre. */}
          <circle className="art-ping" cx="200" cy="200" r="140" stroke="#8ED462" strokeOpacity="0.5" strokeWidth="1.5" />
          <circle className="art-ping art-ping-2" cx="200" cy="200" r="140" stroke="#8ED462" strokeOpacity="0.4" strokeWidth="1.5" />

          {/* Scroll rotation wraps the idle rotation: a CSS animation and a
              static transform cannot live on the same element. */}
          <g className="art-scroll-rot">
            <g className="art-spin">
              <path d="M200 200 L200 14" stroke="#8ED462" strokeWidth="5" strokeLinecap="round" />
            </g>
          </g>

          <circle cx="200" cy="200" r="9" fill="#8ED462" />
          <circle className="art-pulse" cx="316" cy="126" r="13" fill="#FF705D" />
          <circle className="art-pulse art-pulse-2" cx="92" cy="286" r="8" fill="#2BA0FF" />
        </svg>
      )}

      {variant === "traces" && (
        <svg
          data-sc-parallax="-0.1"
          className="absolute -left-[3vw] bottom-[-2vh] hidden h-[42vh] w-[52vw] lg:block"
          viewBox="0 0 600 300"
          fill="none"
        >
          <path
            className="art-flow"
            d="M10 250 C 150 250, 210 120, 340 110 S 500 60, 596 20"
            stroke="var(--c-ink)"
            strokeOpacity="0.3"
            strokeWidth="2.5"
            strokeDasharray="1 16"
            strokeLinecap="round"
          />
          {/* The reading itself, riding the trace as the chapter scrolls. */}
          <circle className="art-travel" cx="0" cy="0" r="11" fill="#2BA0FF" />
          <circle className="art-pulse" cx="340" cy="110" r="7" fill="#8ED462" />
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
          <circle className="art-ping" cx="200" cy="200" r="150" stroke="#C3AEFF" strokeOpacity="0.45" strokeWidth="1.5" />
          <circle className="art-pulse" cx="200" cy="200" r="12" fill="#C3AEFF" />
        </svg>
      )}
    </div>
  );
}
