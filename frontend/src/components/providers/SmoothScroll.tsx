"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface SmoothScrollContextType {
  lenis: Lenis | null;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({ lenis: null });

export const useSmoothScroll = () => useContext(SmoothScrollContext);

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<((time: number) => void) | null>(null);
  // Stable context object with a live getter: consumers read the current
  // instance without this provider ever calling setState (which would re-render
  // the whole app subtree just to hand out a reference).
  const ctxRef = useRef<SmoothScrollContextType>({
    get lenis() {
      return lenisRef.current;
    },
  });

  useEffect(() => {
    // Respect the OS setting: smooth-scroll hijacking is exactly the kind of
    // motion reduced-motion users are asking us not to do. Native scrolling
    // still works, so skipping Lenis degrades cleanly.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard expo easing
      smoothWheel: true,
    });
    lenisRef.current = lenisInstance;

    // Lenis drives the scroll position, so ScrollTrigger has to be told when it
    // moves. Without this line triggers ran off native scroll events while the
    // page was actually being moved by Lenis, so reveals fired at the wrong
    // point (or late) on a fast flick.
    lenisInstance.on("scroll", ScrollTrigger.update);

    const update = (time: number) => lenisInstance.raf(time * 1000);
    rafRef.current = update;
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenisInstance.off("scroll", ScrollTrigger.update);
      lenisInstance.destroy();
      if (rafRef.current) gsap.ticker.remove(rafRef.current);
      lenisRef.current = null;
    };
  }, []);

  // NOTE: this provider used to hold a `scrollProgress` state updated on every
  // Lenis scroll event, which re-rendered the ENTIRE app subtree each frame —
  // for a value that had zero consumers. The navbar computes its own progress
  // from a passive listener. Dropped.
  return (
    <SmoothScrollContext.Provider value={ctxRef.current}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
