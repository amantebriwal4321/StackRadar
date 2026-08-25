"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Word-by-word masked split-text reveal (the motion.dev "text split reveal"
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
}: {
  text: string;
  className?: string;
  /** Delay before the first word rises, in ms. */
  delay?: number;
  /** Gap between consecutive words, in ms. */
  stagger?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
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

  const words = text.split(" ");

  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={`split-reveal ${armed ? "is-armed" : ""} ${className}`}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="split-reveal-word">
          <span style={{ animationDelay: `${delay + i * stagger}ms` }}>{word}</span>
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </Tag>
  );
}
