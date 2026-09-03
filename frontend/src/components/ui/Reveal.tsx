"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

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
 * ANIMATION, NOT TRANSITION. The first version set a `transition` shorthand on
 * the host element, which replaced the host's OWN transition — every revealed
 * element also carries `transition-all duration-200` for its hover state, and
 * measured on /trends all 31 rows had silently lost their hover fade. animation
 * and transition are separate properties and compose cleanly.
 *
 * NO REACT STATE. The hidden/shown flip is a class written straight to the
 * node through the ref. Holding it in state meant a setState in an effect body
 * — the cascading-render rule this repo already enforces — and 31 rows on
 * /trends would have been 31 extra render passes for something the compositor
 * does from one class. An effect writing to the DOM is what effects are for.
 *
 * There is no flash: an element BELOW the fold is off-screen at the moment the
 * effect hides it, and an element already on screen is never hidden at all.
 *
 * FAIL-SAFE, which is the part that matters. This starts VISIBLE and only hides
 * once the effect has confirmed it can un-hide it: an observer exists, motion is
 * allowed, and the document is not hidden (rAF and IO callbacks are throttled or
 * suspended in a background tab, which is exactly how content gets stranded at
 * opacity 0). If any of that fails the content simply paints. The same rule
 * already governs MobileHome and FiveMinutePlan — an animation that does not run
 * must never be able to take the page down with it.
 */

type Registered = {
  el: Element;
  show: (skipAnimation?: boolean, fromAbove?: boolean, batchDelay?: number) => void;
};

let observer: IntersectionObserver | null = null;
const registry = new Map<Element, Registered>();

/* FLICK DETECTION.
 *
 * On a hard scroll flick a dozen elements cross the threshold inside a couple
 * of frames, and every one of them starts a 0.7s animation the reader has
 * already scrolled past — so they arrive as a wall of movement in the wrong
 * place, which is the single thing that makes scroll animation feel cheap.
 *
 * When the page is moving faster than this, elements are marked shown with no
 * animation at all. They were never actually seen arriving; the honest thing
 * is to have them simply be there. Normal reading scroll is nowhere near
 * this — it is roughly a full viewport per second. */
const FLICK_PX_PER_SEC = 2600;
let lastSampleY = 0;
let lastSampleT = 0;
let scrollSpeed = 0;
/* Which way the reader is travelling. Everything used to rise regardless, so
   scrolling back UP the page made content climb toward the reader — the
   opposite of how a physical page behaves, and the reason upward scrolling
   felt subtly wrong even though nothing was visibly broken. `up` variants
   mirror the travel so content always enters from the edge it came from. */
let scrollUp = false;

function trackSpeed() {
  const now = performance.now();
  const y = window.scrollY;
  const dt = now - lastSampleT;
  // Ignore samples closer than a frame; dt near zero makes the ratio explode.
  if (dt > 12) {
    const dy = y - lastSampleY;
    if (Math.abs(dy) > 2) scrollUp = dy < 0;
    scrollSpeed = (Math.abs(dy) / dt) * 1000;
    lastSampleY = y;
    lastSampleT = now;
  }
}

function teardown() {
  observer?.disconnect();
  observer = null;
  window.removeEventListener("scroll", trackSpeed);
}

function ensureObserver(): IntersectionObserver | null {
  if (observer) return observer;
  if (typeof IntersectionObserver === "undefined") return null;
  lastSampleY = window.scrollY;
  lastSampleT = performance.now();
  window.addEventListener("scroll", trackSpeed, { passive: true });

  observer = new IntersectionObserver(
    (entries) => {
      const flicking = scrollSpeed > FLICK_PX_PER_SEC;
      /* Stagger is assigned HERE, by position within the batch that actually
         crossed together, rather than by each element's index in its list.
         An index-based delay is wrong the moment a list is entered anywhere
         but the top: row 18 of /trends scrolled into view alone would still
         serve itself row 18's delay. Callers keep a `delay` for a deliberate
         offset; this adds the part only the observer can know.

         Entries arrive in document order within a callback, which is the
         order the reader's eye travels — except when scrolling up, where the
         lowest element is reached first. */
      const arriving = entries.filter((e) => e.isIntersecting);
      if (scrollUp) arriving.reverse();

      arriving.forEach((entry, i) => {
        registry.get(entry.target)?.show(flicking, scrollUp, Math.min(i, 5) * 45);
        // One-shot: re-hiding on the way out makes a page flicker when the
        // reader scrolls back up, which reads as a bug rather than an effect.
        observer?.unobserve(entry.target);
        registry.delete(entry.target);
      });

      // Nothing left to watch: surrender the observer and its scroll listener
      // rather than leaving both attached for the life of the tab. The next
      // Reveal to mount builds a fresh one.
      if (registry.size === 0) teardown();
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
  variant = "rise",
  delay = 0,
  className = "",
  ...rest
}: {
  children: ReactNode;
  /** Element to render. Use "li"/"tr" where the parent demands it. */
  as?: ElementType;
  /** How it arrives. See the .sr-v-* block in globals.css for distances.
   *  `fade` is the safe choice for anything that carries its own transform. */
  variant?: "rise" | "lift" | "left" | "right" | "settle" | "fade";
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.visibilityState === "hidden") return;
    const io = ensureObserver();
    if (!io) return;

    const show = (skipAnimation = false, fromAbove = false, batchDelay = 0) => {
      // Passed at speed: just be there. See FLICK_PX_PER_SEC above.
      if (skipAnimation) {
        el.classList.remove("sr-out");
        return;
      }
      // animation-delay, not transition-delay: the latter stays on the element
      // afterwards and would delay every later hover transition by the stagger.
      const total = delay + batchDelay;
      if (total) el.style.animationDelay = `${total}ms`;
      // Promote for the duration only. A blanket `will-change` in the
      // stylesheet would hold a compositor layer for all 31 rows of /trends for
      // the life of the page, which is the documented way to make a page slower
      // by trying to make it faster. Granted on arm, surrendered on the way out.
      el.style.willChange = "opacity, transform";
      el.classList.remove("sr-out");
      /* Mirror the vertical variants when travelling upward: an element
         entering from the top of the viewport should arrive from the top. The
         horizontal and non-directional variants are unaffected. */
      const v =
        fromAbove && (variant === "rise" || variant === "lift")
          ? `${variant}-down`
          : variant;
      el.classList.add("sr-run", `sr-v-${v}`);
      el.addEventListener(
        "animationend",
        () => {
          el.style.willChange = "";
          el.style.animationDelay = "";
        },
        { once: true },
      );
    };

    // Already on screen at mount: leave it visible. Hiding it here is what
    // produces a flash, and an above-the-fold element has nothing to reveal.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    // Off-screen, so hiding it now is invisible to the reader.
    el.classList.add("sr-out");

    registry.set(el, { el, show });
    io.observe(el);
    return () => {
      io.unobserve(el);
      registry.delete(el);
    };
  }, [delay, variant]);

  return (
    <Tag ref={ref} className={`sr-reveal ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
