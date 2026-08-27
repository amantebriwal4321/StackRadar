"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ScrollcraftApi = {
  layout: () => void;
  acts: unknown[];
  worlds: unknown[];
  clips: unknown[];
};

declare global {
  interface Window {
    ScrollCraft?: {
      mount: (root: Element | string) => ScrollcraftApi;
      reduce: boolean;
      instances: ScrollcraftApi[];
    };
  }
}

/* One instance per root element.
 *
 * Two things force this guard. React StrictMode invokes effects twice in dev,
 * and the engine exposes no destroy(): mount() pushes onto ScrollCraft.instances
 * and its rAF loop reschedules unconditionally with no detached-DOM bail. So a
 * naive effect would leave a second loop driving the same nodes. */
const mounted = new WeakMap<Element, ScrollcraftApi>();

const ENGINE_SRC = "/scrollcraft/scrollcraft.js";
let enginePromise: Promise<void> | null = null;

/** Inject the engine script once per document, however many roots ask for it. */
function loadEngine(): Promise<void> {
  if (window.ScrollCraft) return Promise.resolve();
  if (enginePromise) return enginePromise;

  enginePromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${ENGINE_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("engine failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = ENGINE_SRC;
    s.async = true;
    s.addEventListener("load", () => resolve(), { once: true });
    s.addEventListener("error", () => {
      // Let a later mount retry rather than caching the failure forever.
      enginePromise = null;
      reject(new Error("engine failed"));
    }, { once: true });
    document.head.appendChild(s);
  });

  return enginePromise;
}

export default function ScrollcraftRoot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let api: ScrollcraftApi | null = null;
    let cancelled = false;

    /* Loaded as a classic script from /public rather than bundled.
     *
     * The engine is an IIFE ending in `})(window)` with no exports, so it is
     * not an ES module: a static import crashes server rendering with
     * "window is not defined" (a "use client" component is still rendered on
     * the server for the initial HTML), and a dynamic import of it does not
     * typecheck. A <script> tag is what the file actually is. It stays
     * vendored byte-identical from the skill; bespoke behaviour belongs in the
     * page, driven off --sc-p and our own data-sc-* attributes.
     *
     * Its stylesheet is a normal module and is still bundled, imported at the
     * top of globals.css. */
    loadEngine().then(() => {
      if (cancelled) return;
      const SC = window.ScrollCraft;
      if (!SC) return;

      const existing = mounted.get(root);
      if (existing) {
        // Same DOM, second effect run (StrictMode). Re-measure, don't remount.
        existing.layout();
        api = existing;
        return;
      }

      api = SC.mount(root);
      mounted.set(root, api);
    }).catch(() => {
      /* The page is authored so its resting state is the readable one: every
       * act lays out and reads correctly with no engine at all. Losing the
       * script costs the motion, not the content. */
    });

    return () => {
      cancelled = true;
      const SC = window.ScrollCraft;
      if (!api || !SC) return;
      /* The engine cannot be torn down, so the loop that outlives this
       * component is emptied of work instead. acts/worlds/clips are the very
       * arrays tick() walks, handed to us on the public api object, so
       * truncating them leaves the surviving rAF a no-op over DOM that is
       * about to be detached. Not as clean as a destroy(), but it is done
       * through the engine's own surface rather than by patching it. */
      api.acts.length = 0;
      api.worlds.length = 0;
      api.clips.length = 0;
      mounted.delete(root);
      const i = SC.instances.indexOf(api);
      if (i !== -1) SC.instances.splice(i, 1);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
