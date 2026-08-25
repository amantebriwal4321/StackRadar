"use client";

import { useEffect } from "react";

/**
 * Scroll-driven canvas colour.
 *
 * Eases the page canvas between the two theme-scoped endpoints (--canvas-a and
 * --canvas-b) as you move down the landing page: onyx through the hero, into
 * graphite across the middle, back to onyx by the footer. It reads as depth
 * rather than as banding, and it only ever moves between Mercury's OWN two
 * surface values — never a third hue.
 *
 * Implementation notes that matter:
 *
 *  - **No React state.** This writes the CSS variable imperatively on a
 *    rAF-throttled passive listener. A `scrollProgress` state in SmoothScroll
 *    was removed precisely because it re-rendered the whole app subtree on
 *    every scroll frame; this must not reintroduce that.
 *
 *  - **Fail-safe.** It only ever overrides a token that already holds a correct
 *    static value. If this never mounts, the listener never fires, or the user
 *    prefers reduced motion, the page just renders the normal canvas.
 *
 *  - Endpoints are re-read when the theme class changes, so toggling light/dark
 *    mid-scroll can't strand an onyx value on a light page.
 */

type RGB = [number, number, number];

function parseColor(value: string): RGB | null {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = v.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const p = rgb[1].split(/[\s,/]+/).map(Number).filter((x) => !Number.isNaN(x));
    if (p.length >= 3) return [p[0], p[1], p[2]];
  }
  return null;
}

export default function ScrollCanvas() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let a: RGB | null = null;
    let b: RGB | null = null;
    let frame = 0;

    const readEndpoints = () => {
      // Clear our own override first, or we'd read back the value we wrote.
      root.style.removeProperty("--c-ground");
      const cs = getComputedStyle(root);
      a = parseColor(cs.getPropertyValue("--canvas-a"));
      b = parseColor(cs.getPropertyValue("--canvas-b"));
    };

    const clear = () => root.style.removeProperty("--c-ground");

    const apply = () => {
      frame = 0;
      if (!a || !b) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return clear();

      const p = Math.min(Math.max(window.scrollY / max, 0), 1);
      // There-and-back: 0 at the top, 1 across the middle, 0 again at the foot,
      // so the page opens and closes on the canvas value.
      const t = Math.sin(Math.PI * p);
      const eased = t * t * (3 - 2 * t); // smoothstep

      const mix = a.map((ch, i) => Math.round(ch + (b![i] - ch) * eased));
      root.style.setProperty("--c-ground", `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    const start = () => {
      if (reduce.matches) {
        clear();
        return;
      }
      readEndpoints();
      apply();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
    };

    const stop = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clear();
    };

    // Theme toggling swaps --canvas-a/b, so re-read and repaint.
    const themeObserver = new MutationObserver(() => {
      if (reduce.matches) return;
      readEndpoints();
      apply();
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    const onReduceChange = () => {
      stop();
      start();
    };
    reduce.addEventListener("change", onReduceChange);

    start();

    return () => {
      themeObserver.disconnect();
      reduce.removeEventListener("change", onReduceChange);
      stop();
    };
  }, []);

  return null;
}
