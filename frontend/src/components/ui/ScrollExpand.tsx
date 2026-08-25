"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A framed stage that opens up as you scroll through it.
 *
 * The frame starts inset with a large radius and expands toward full-bleed as
 * its section crosses the viewport, counter-zooming the media so the subject
 * holds still while the window around it grows.
 *
 * Two rules this follows deliberately:
 *
 *  1. **No React state per scroll frame.** One passive, rAF-throttled listener
 *     writes a CSS custom property. A `scrollProgress` state in SmoothScroll was
 *     removed earlier for re-rendering the entire app subtree every frame; this
 *     must not reintroduce that.
 *
 *  2. **The resting state is OPEN.** `--expand` defaults to 1, and the listener
 *     only animates *toward* that. If the animation never runs — a backgrounded
 *     tab never fires rAF, and reduced-motion skips the binding entirely — the
 *     frame renders fully open and readable rather than stuck shut. Same
 *     fail-safe rule as SplitReveal, the accordion and `.slide-up`.
 */
export default function ScrollExpand({
  src,
  alt = "",
  title,
  scrollHint,
  useWindowScroll = false,
  mediaZoom = 1.2,
  media,
  children,
  className = "",
  fit = "media",
}: {
  /** Image source. Ignored when `media` is supplied. */
  src?: string;
  alt?: string;
  title?: string;
  /** Small cue shown until the frame starts opening, e.g. "Scroll". */
  scrollHint?: string;
  /** Drive from window scroll rather than the nearest scrollable ancestor. */
  useWindowScroll?: boolean;
  /** How far the media is zoomed in while the frame is closed. */
  mediaZoom?: number;
  /** Arbitrary node to frame (takes precedence over `src`). */
  media?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** "media" frames a 16:9 stage; "content" wraps existing markup and only
   *  applies the expand + zoom, with no forced aspect ratio or overlays. */
  fit?: "media" | "content";
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scroller: HTMLElement | Window = useWindowScroll
      ? window
      : (() => {
          let n = el.parentElement;
          while (n) {
            const oy = getComputedStyle(n).overflowY;
            if (oy === "auto" || oy === "scroll") return n;
            n = n.parentElement;
          }
          return window;
        })();

    let frame = 0;
    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 while the section is still below the fold, 1 once it has risen into
      // place. Squared-off so most of the travel happens on approach.
      const raw = 1 - (rect.top - vh * 0.15) / (vh * 0.85);
      const p = Math.min(Math.max(raw, 0), 1);
      el.style.setProperty("--expand", p.toFixed(4));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      // hand it back to the open resting state
      el.style.removeProperty("--expand");
    };
  }, [useWindowScroll]);

  if (fit === "content") {
    return (
      <section ref={sectionRef} className={`scroll-expand scroll-expand--content ${className}`}>
        <div className="scroll-expand__frame">
          <div className="scroll-expand__media" style={{ ["--media-zoom" as string]: mediaZoom }}>
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={`scroll-expand ${className}`}>
      <div className="scroll-expand__frame">
        <div className="scroll-expand__media" style={{ ["--media-zoom" as string]: mediaZoom }}>
          {media ?? (src ? <img src={src} alt={alt} /> : null)}
        </div>

        {title && <p className="scroll-expand__title">{title}</p>}

        {scrollHint && (
          <span className="scroll-expand__hint" aria-hidden="true">
            {scrollHint}
          </span>
        )}
      </div>

      {children && <div className="scroll-expand__body">{children}</div>}
    </section>
  );
}
