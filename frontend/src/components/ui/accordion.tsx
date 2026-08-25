"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

/**
 * Animated accordion — a port of the motion.dev accordion treatment: springy
 * height-morph panels whose copy blurs in as they fold open.
 *
 * Three deliberate choices:
 *
 *  1. **The animation is CSS, not framer-motion.** A JS animation library only
 *     writes the final value if its clock is running, and that clock stalls on
 *     a backgrounded tab — which would leave a panel stuck at height 0 with its
 *     content permanently unreachable. Here the open state is declared in the
 *     style itself: if the transition never runs, the panel simply snaps open.
 *     Fail-safe by construction (the same lesson as the MobileHome entrance and
 *     the cold-start curtain). The fold uses the grid `0fr -> 1fr` technique so
 *     it animates to the content's natural height with no measuring.
 *
 *  2. **The panel content is ALWAYS mounted**, collapsed rather than unmounted.
 *     The /learn pages are server-rendered SEO surfaces whose FAQPage JSON-LD
 *     promises the answer text is on the page; unmounting closed answers would
 *     strip them from the SSR HTML and put the rich result at risk.
 *
 *  3. **Hand-rolled instead of radix-ui's Accordion** (which the repo has), so
 *     the open/close animation is ours rather than Radix's data-state + height
 *     CSS vars. ARIA is wired manually below: a real <button> trigger with
 *     aria-expanded/aria-controls, and a labelled region for the panel.
 */

/** Decisive ease-out for the fold. */
const FOLD_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Gentle overshoot on the copy — where the "springy" character comes from. */
const SPRING_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type AccordionContextValue = {
  openIds: string[];
  toggle: (id: string) => void;
  animate: boolean;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("<AccordionItem> must be used inside <Accordion>");
  return ctx;
}

export function Accordion({
  children,
  defaultOpen,
  allowMultiple = false,
  className = "",
}: {
  children: ReactNode;
  /** Item id (or ids) open on first render. */
  defaultOpen?: string | string[] | null;
  /** Let several panels stay open at once. Default: single-open. */
  allowMultiple?: boolean;
  className?: string;
}) {
  const [openIds, setOpenIds] = useState<string[]>(() => {
    if (!defaultOpen) return [];
    return Array.isArray(defaultOpen) ? defaultOpen : [defaultOpen];
  });

  // Defaults to animating; only prefers-reduced-motion turns it off. If this
  // effect never runs the transitions simply play, which is harmless — the
  // open/closed state itself never depends on it.
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimate(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (allowMultiple) {
        return isOpen ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return isOpen ? [] : [id];
    });

  return (
    <AccordionContext.Provider value={{ openIds, toggle, animate }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  id,
  header,
  children,
  className = "",
  headerClassName = "",
  panelClassName = "",
  icon = "plus",
}: {
  /** Stable id used for open state + ARIA wiring. */
  id: string;
  /** Trigger content — arbitrary JSX, so callers can put badges in the header. */
  header: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  panelClassName?: string;
  /** "plus" rotates 45° into an ×; "chevron" rotates 180°. */
  icon?: "plus" | "chevron" | "none";
}) {
  const { openIds, toggle, animate } = useAccordion();
  const isOpen = openIds.includes(id);
  const uid = useId().replace(/:/g, "");
  const panelId = `acc-panel-${uid}`;
  const triggerId = `acc-trigger-${uid}`;

  return (
    <div className={className}>
      <button
        type="button"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => toggle(id)}
        className={`w-full text-left flex items-center justify-between gap-4 cursor-pointer select-none ${headerClassName}`}
      >
        <div className="min-w-0 flex-1">{header}</div>
        {icon !== "none" && (
          <span
            aria-hidden="true"
            className="shrink-0 text-indigo-600 leading-none"
            style={{
              display: "inline-flex",
              transform: `rotate(${isOpen ? (icon === "plus" ? 45 : 180) : 0}deg)`,
              transition: animate ? `transform 320ms ${FOLD_EASE}` : "none",
            }}
          >
            {icon === "plus" ? (
              <span className="text-xl leading-none">+</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        )}
      </button>

      {/* Fold: grid 0fr -> 1fr animates to the content's natural height. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: animate ? `grid-template-rows 400ms ${FOLD_EASE}` : "none",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          {/* The copy resolves out of a blur just behind the fold — the detail
              that gives the motion.dev version its character. */}
          <div
            className={panelClassName}
            style={{
              opacity: isOpen ? 1 : 0,
              filter: isOpen ? "blur(0px)" : "blur(6px)",
              transform: isOpen ? "translateY(0)" : "translateY(-6px)",
              transition: animate
                ? `opacity 280ms ${FOLD_EASE} ${isOpen ? "60ms" : "0ms"}, filter 300ms ${FOLD_EASE} ${isOpen ? "60ms" : "0ms"}, transform 380ms ${SPRING_EASE} ${isOpen ? "60ms" : "0ms"}`
                : "none",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
