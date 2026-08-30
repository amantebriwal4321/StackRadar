"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/* Scroll reveal for the data routes.
 *
 * The landing has had entrance animation since it was rebuilt on scrollcraft;
 * every other route has had none, so clicking through from `/` went from a page
 * that moves to five that do not. globals.css did carry a `.reveal-up` and a
 * `.reveal-scale`, both setting opacity:0 and waiting for a `.revealed` class —
 * but nothing in the app has ever added that class, and nothing used the
 * classes either. They were dead in both directions.
 *
 * ONE OBSERVER FOR THE WHOLE APP. /trends alone reveals 31 rows; a per-instance
 * IntersectionObserver would mean 31 observers on one route. Elements register
 * with the shared one below and unregister on unmount.
 *
 * FAIL-SAFE, which is the part that matters. This starts VISIBLE and only hides
 * once the effect has confirmed it can un-hide it: an observer exists, motion is
 * allowed, and the document is not hidden (rAF and IO callbacks are throttled or
 * suspended in a background tab, which is exactly how content gets stranded at
 * opacity 0). If any of that fails the content simply paints. The same rule
 * already governs MobileHome and FiveMinutePlan — an animation that does not run
 * must never be able to take the page down with it.
 */

type Registered = { el: Element; show: () => void };

let observer: IntersectionObserver | null = null;
const registry = new Map<Element, Registered>();

function ensureObserver(): IntersectionObserver | null {
  if (observer) return observer;
  if (typeof IntersectionObserver === "undefined") return null;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        registry.get(entry.target)?.show();
        // One-shot: re-hiding on the way out makes a page flicker when the
        // reader scrolls back up, which reads as a bug rather than an effect.
        observer?.unobserve(entry.target);
        registry.delete(entry.target);
      }
    },
    // Fires a little before the element's top edge arrives, so the movement is
    // finishing as it reaches comfortable reading position rather than starting
    // there. 0.01 rather than 0 so tall sections still trigger.
    { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
  );
  return observer;
}

export default function Reveal({
  children,
  as = "div",
  delay = 0,
  className = "",
  ...rest
}: {
  children: ReactNode;
  /** Element to render. Use "li"/"tr" where the parent demands it. */
  as?: ElementType;
  /** Stagger, in ms. Keep sequences short — past ~6 the tail feels broken. */
  delay?: number;
  className?: string;
} & Record<string, unknown>) {
  /* Cast to one concrete intrinsic tag so ref/className/style typecheck. A
     polymorphic `as` resolves to ElementType, whose props union collapses to
     `never` and rejects every one of them. At runtime React renders whatever
     string was passed, so this is a type-level narrowing only. */
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.visibilityState === "hidden") return;
    const io = ensureObserver();
    if (!io) return;

    // Only now is it safe to start hidden.
    setArmed(true);

    // Already on screen at mount (above the fold): show on the next frame so
    // the transition still runs rather than snapping.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const f = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(f);
    }

    registry.set(el, { el, show: () => setShown(true) });
    io.observe(el);
    return () => {
      io.unobserve(el);
      registry.delete(el);
    };
  }, []);

  const state = !armed || shown ? "sr-in" : "sr-out";

  return (
    <Tag
      ref={ref}
      className={`sr-reveal ${state} ${className}`.trim()}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
