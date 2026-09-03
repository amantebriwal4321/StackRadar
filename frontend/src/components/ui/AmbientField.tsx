"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* The ambient background, and the one that travels with you.
 *
 * WHAT IT REPLACES. The data routes' background was three pieces of the
 * RETIRED dark system left behind by the palette flip: `.ambient-orb-*`, dead
 * at display:none; `.ambient-particles`, still painting #8052ff indigo,
 * #ffb829 saffron and #15846e teal at 0.16 opacity — three colours that do not
 * exist in the warm editorial system; and `.cursor-spotlight`, whose accent is
 * now charcoal, so it drew a grey smudge on cream. CLAUDE.md warns that some
 * colours a token swap cannot reach must be hand-edited. These were missed.
 *
 * WHAT IT IS. StackRadar reads five sources every day and keeps the history,
 * so the honest ambient figure is the thing a reading is plotted ON: a chart's
 * baseline grid. Scrolling moves you through it. Three layers, each on its own
 * parallax rate, so the field has depth without any of it being loud:
 *
 *   rules     horizontal hairlines, the measured field           0.18x, wrapped
 *   contacts  a handful of readings sitting on it                bounded drift
 *   sweep     one soft band tracking progress through the page   1.00x
 *
 * It also reads VELOCITY, not just position. A field that only parallaxes is
 * still a static image being moved; reacting to how fast you are travelling is
 * what makes it feel like a surface rather than a texture. Fast scrolling
 * brightens the sweep and stretches the contacts very slightly along the axis
 * of travel, and both decay back to rest within about a second of stopping.
 * Capped hard: this is meant to be noticed only once, and never diagnosed.
 *
 * It reads DIRECTION too. Velocity alone is unsigned, so travelling up and
 * travelling down produced an identical field — which is the tell that it is
 * an effect rather than a place. --af-dir carries the sign, and the contacts
 * lean against travel the way anything loose in a moving vehicle does.
 *
 * TWO THINGS THAT HAD TO BE BOUNDED, both caught by driving the variables to
 * their extremes rather than by looking at the top of the page:
 *
 * The rules are a repeating gradient inside a layer with 120px of overscan. A
 * raw 0.18x translate reaches -583px on a 4141px route, which slides the
 * pattern clean off the bottom of its own layer and leaves the lower half of
 * the viewport empty. Because the pattern repeats every 96px, translating by
 * the REMAINDER is visually identical and never exceeds one tile — so the
 * offset is taken modulo the tile here, and the layer keeps its cheap
 * compositor transform.
 *
 * The contacts had the worse version of the same bug: at 0.42x they reach
 * -1361px, which is a screen and a half above the viewport, so after about two
 * screens of scrolling there were simply no contacts left. They now drift off
 * PROGRESS rather than raw offset — a bounded +/-60px across the whole page,
 * which still parallaxes against the rules but cannot leave.
 *
 * COST. Two CSS custom properties written from ONE passive rAF-throttled
 * listener. No canvas, no per-frame React state, no layout reads in the
 * handler beyond scrollY. Everything else is CSS, so the compositor does it.
 *
 * NOT ON `/`. The landing runs the scrollcraft engine, which owns scrolling
 * there, and its six chapters paint opaque grounds that would occlude this
 * anyway — mounting it would be a listener doing nothing but competing.
 * ChapterArt is the landing's equivalent, per chapter and by design.
 */
export default function AmbientField() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const enabled = pathname !== "/";

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    // Reduced motion keeps the field — it is part of the page's surface, not an
    // effect — but stops it responding to scroll. The CSS also drops the pulse.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Must match the rules' repeat interval in globals.css.
    const TILE = 96;
    // Pixels-per-frame that counts as "full tilt". Roughly a fast trackpad
    // flick; anything above this is clamped so the effect has a ceiling.
    const FULL_TILT = 55;

    let frame = 0;
    let decay = 0;
    let stopped = false;
    let lastY = window.scrollY;
    let energy = 0;

    const paint = () => {
      el.style.setProperty("--af-v", energy.toFixed(3));
    };

    // Ease back to rest after the scrolling stops. Without this the field
    // freezes mid-stretch the instant you let go, which reads as a stutter.
    const settle = () => {
      if (stopped) return;
      energy *= 0.88;
      if (energy < 0.01) {
        energy = 0;
        decay = 0;
        paint();
        return;
      }
      paint();
      decay = requestAnimationFrame(settle);
    };

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Wrapped to one tile — see the note above. JS rather than CSS mod(),
      // whose support is still uneven.
      el.style.setProperty("--af-rules", `${-((y * 0.18) % TILE)}`);
      el.style.setProperty("--af-p", max > 0 ? String(Math.min(y / max, 1)) : "0");

      const dy = y - lastY;
      const v = Math.min(Math.abs(dy) / FULL_TILT, 1);
      // Ignore sub-pixel jitter, or the sign flips constantly at rest.
      if (Math.abs(dy) > 1) el.style.setProperty("--af-dir", dy > 0 ? "1" : "-1");
      lastY = y;
      // Rise fast, fall slow: energy takes the higher of the new reading and a
      // decayed previous one, so a burst does not flicker between frames.
      energy = Math.max(v, energy * 0.7);
      paint();

      if (decay) cancelAnimationFrame(decay);
      decay = requestAnimationFrame(settle);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    read();
    /* `stopped` matters: settle() reschedules itself, so a frame already in
       flight when the route changes would queue another one after cleanup had
       already cancelled the last. It ran on a detached node until the energy
       decayed — harmless but genuinely leaked frames on every navigation. */
    return () => {
      stopped = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      if (decay) cancelAnimationFrame(decay);
    };
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <div ref={ref} className="ambient-field" aria-hidden="true">
      <div className="af-rules" />
      <div className="af-sweep" />

      {/* The contacts. Positioned in vw/vh so they spread with the viewport
          rather than clustering, and each given its own delay so they do not
          pulse in unison — a field of readings, not a metronome. */}
      <svg className="af-contacts" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[
          { x: 12, y: 18, r: 0.5, c: "#8ED462", d: "0s" },
          { x: 84, y: 26, r: 0.42, c: "#FF705D", d: "-2.1s" },
          { x: 68, y: 62, r: 0.55, c: "#2BA0FF", d: "-4.3s" },
          { x: 26, y: 74, r: 0.38, c: "#C3AEFF", d: "-1.2s" },
          { x: 92, y: 84, r: 0.46, c: "#F5E211", d: "-3.4s" },
          { x: 46, y: 38, r: 0.34, c: "#7FD8D8", d: "-5.6s" },
        ].map((p) => (
          <circle
            key={`${p.x}-${p.y}`}
            className="af-contact"
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill={p.c}
            style={{ animationDelay: p.d }}
          />
        ))}
      </svg>
    </div>
  );
}
