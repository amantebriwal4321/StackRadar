"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";

interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollProgress: number;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollProgress: 0,
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard expo easing
      smoothWheel: true,
    });

    setLenis(lenisInstance);

    // Sync Lenis with GSAP ticker loop
    const update = (time: number) => {
      lenisInstance.raf(time * 1000);
    };

    gsap.ticker.add(update);

    // Track scroll progress
    lenisInstance.on("scroll", (e) => {
      setScrollProgress(e.progress);
    });

    return () => {
      lenisInstance.destroy();
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={{ lenis, scrollProgress }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
