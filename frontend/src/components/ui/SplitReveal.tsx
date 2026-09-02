"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Masked split-text reveal, per word or per character (the motion.dev "text split reveal"
 * treatment): each word sits in an overflow-hidden box and rises into place on a
 * stagger, so the line assembles itself rather than fading in as a block.
 *
 * FAIL-SAFE BY DEFAULT — this is the important part. The words render plain and
 * fully visible; the animation is only *armed* by an effect once we've confirmed
 * the tab is visible and reduced-motion is off. A masked reveal hides its text
 * by clipping, so an animation that never runs (backgrounded tab, frozen clock,
 * JS error) would otherwise leave the headline permanently invisible — which is
 * exactly the failure this codebase has hit three times (MobileHome entrance,
 * the feedback FAB, the accordion). Here the resting state IS the readable one.
 */
export default function SplitReveal({
  text,
  className = "",
  delay = 0,
  stagger = 70,
  as: Tag = "span",
  by = "word",
}: {
  text: string;
  className?: string;
  /** Delay before the first unit rises, in ms. */
  delay?: number;
  /** Gap between consecutive units, in ms. */
  stagger?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  /** Dala splits nav labels per CHARACTER (charWipeUpIn) and headings per line;
   *  "word" stays the default for body copy. */
  by?: "word" | "char";
}) {
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.visibilityState !== "visible") return;
    // Next frame, so the browser paints the resting state first and the
    // animation has a start point to run from.
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* `by` was accepted, documented and then never read: the component always
     split on spaces, so a caller asking for "char" silently got words. Either
     the prop had to go or it had to work, and per-character is the treatment
     the design system actually calls for on short labels.

     Units carry their own separator rather than relying on whitespace between
     inline-blocks, which collapses. */
  const units = by === "char" ? Array.from(text) : text.split(" ");

  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={`split-reveal ${armed ? "is-armed" : ""} ${className}`}
    >
      {units.map((unit, i) => (
        <span key={`${unit}-${i}`} className="split-reveal-word">
          <span style={{ animationDelay: `${delay + i * stagger}ms` }}>
            {unit === " " ? "\u00A0" : unit}
          </span>
          {by === "word" && i < units.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </Tag>
  );
}
