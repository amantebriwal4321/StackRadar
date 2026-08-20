"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function Template({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fade only — NO transform. A `y` (translate) leaves a lingering CSS
    // transform on this wrapper, which makes the fixed navbar anchor to this
    // element instead of the viewport, so it scrolled away instead of sticking.
    // clearProps removes the inline opacity once done so nothing lingers.
    gsap.fromTo(
      containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: "power2.out", clearProps: "opacity" }
    );
  }, []);

  return (
    <div ref={containerRef} className="min-h-full">
      {children}
    </div>
  );
}
