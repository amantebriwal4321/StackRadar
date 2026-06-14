"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hasPlus, setHasPlus] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  const mousePos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Check if device supports fine pointer (mouse)
    const mediaQuery = window.matchMedia("(pointer: fine)");
    setIsTouchDevice(!mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsTouchDevice(!e.matches);
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;

    // Enable custom global cursor
    document.body.classList.add("cursor-none-global");

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      if (!isVisible) setIsVisible(true);
    };

    const onMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    // Hover state detection using event delegation
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closestInteractive = target.closest("a, button, [role='button'], .glow-hover");
      const isToolCard = target.closest(".tool-score-card");

      if (closestInteractive) {
        ringRef.current?.classList.add("ring-hover");
      } else {
        ringRef.current?.classList.remove("ring-hover");
      }

      if (isToolCard) {
        setHasPlus(true);
      } else {
        setHasPlus(false);
      }
    };

    document.addEventListener("mouseover", onMouseOver);

    // Render loop for ring interpolation (lerp)
    let animationFrameId: number;
    const render = () => {
      // Small dot follows mouse exactly
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      // Ring follows mouse with delay interpolation
      const lerpFactor = 0.12;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * lerpFactor;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * lerpFactor;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseover", onMouseOver);
      cancelAnimationFrame(animationFrameId);
      document.body.classList.remove("cursor-none-global");
    };
  }, [isTouchDevice, isVisible]);

  if (isTouchDevice) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .cursor-none-global, .cursor-none-global * {
            cursor: none !important;
          }
        `
      }} />
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2.5 h-2.5 -ml-1.25 -mt-1.25 bg-[#C4B5FD] rounded-full pointer-events-none z-[99999] transition-opacity duration-300"
        style={{
          opacity: isVisible ? 1 : 0,
          mixBlendMode: "difference"
        }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-10 h-10 -ml-5 -mt-5 border border-[#C4B5FD]/60 rounded-full pointer-events-none z-[99998] transition-[width,height,background-color,border-color,opacity] duration-300 flex items-center justify-center"
        style={{
          opacity: isVisible ? 1 : 0,
        }}
      >
        {hasPlus && (
          <span className="text-[10px] text-[#FAFAFA] font-mono font-bold leading-none animate-fade-in">+</span>
        )}
      </div>
    </>
  );
}
