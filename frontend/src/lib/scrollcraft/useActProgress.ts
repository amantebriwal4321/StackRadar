"use client";

import { useEffect, type RefObject } from "react";

/* Read an act's --sc-p without re-rendering.
 *
 * The engine publishes each act's normalised progress as a CSS custom property
 * on the act element. Anything bespoke reads it from there — that is the
 * documented seam for page-specific behaviour, and the reason the engine itself
 * is never edited.
 *
 * The callback runs on a frame, so it must write to the DOM directly and must
 * NOT call setState. A per-frame setState in this app previously re-rendered
 * the entire subtree every frame (see providers/SmoothScroll.tsx) and was
 * removed for exactly that reason.
 *
 * One rAF loop is shared by every subscriber rather than one per act. */

type Sub = { el: Element; cb: (p: number) => void; last: number };

const subs = new Set<Sub>();
let frame = 0;

function tick() {
  frame = 0;
  for (const s of subs) {
    const raw = getComputedStyle(s.el).getPropertyValue("--sc-p");
    const p = raw ? parseFloat(raw) : NaN;
    if (Number.isNaN(p)) continue;
    // Deadband: below this the visual change is under a pixel, and calling
    // through costs a layout read per act per frame for nothing.
    if (Math.abs(p - s.last) < 0.0005) continue;
    s.last = p;
    s.cb(p);
  }
  if (subs.size) frame = requestAnimationFrame(tick);
}

function start() {
  if (!frame && subs.size) frame = requestAnimationFrame(tick);
}

export function useActProgress(
  ref: RefObject<HTMLElement | null>,
  cb: (p: number) => void
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fail-safe resting state: if the loop never runs (a backgrounded tab
    // never fires rAF), the act must already be readable. Every consumer is
    // called once here with the value the engine has right now, and each one
    // treats its resting state as the legible one.
    const raw = getComputedStyle(el).getPropertyValue("--sc-p");
    const initial = raw ? parseFloat(raw) : 0;
    cb(Number.isNaN(initial) ? 0 : initial);

    const sub: Sub = { el, cb, last: -1 };
    subs.add(sub);
    start();

    return () => {
      subs.delete(sub);
      if (!subs.size && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    // cb is expected to be stable (useCallback at the call site) or cheap to
    // re-subscribe; ref identity never changes.
  }, [ref, cb]);
}
