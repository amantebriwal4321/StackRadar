"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, X, ExternalLink, Loader2 } from "lucide-react";

/**
 * In-app feedback loop (Phase-1 beta).
 *
 * A floating, on-brand button on every page opens a Neon-Noir modal with the
 * Google Form embedded — so people give feedback WITHOUT leaving the app, which
 * gets far more responses than a link buried in a caption. Falls back to an
 * "open in a new tab" link for anyone whose browser blocks the embed.
 *
 * Purely client-side: no backend, no new tables. Responses land in the owner's
 * Google Form → Sheet.
 */

const FORM_ID =
  "1FAIpQLSdepOmzCc32gDfoEmk2B3yrhiv-AiTGe70JSxR2SkQIecN7mQ";
const FORM_EMBED = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?embedded=true`;
const FORM_PUBLIC = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* ─── Floating trigger ───
          Seated above the mobile home's sticky action bar (z-40, bottom-0) on
          phones; a compact corner button on desktop. Pill on md+, icon-only on
          mobile to stay out of the way. */}
      <motion.button
        onClick={() => {
          setIframeLoaded(false);
          setOpen(true);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Send feedback"
        className="group animate-fab-in fixed bottom-20 right-4 z-[90] flex items-center gap-2 rounded-full bg-[var(--accent-1)] px-3.5 py-3 text-white shadow-lg shadow-[var(--accent-1)]/30 transition-shadow duration-300 hover:shadow-[var(--accent-2)]/45 md:bottom-6 md:right-6 md:px-4"
      >
        {/* soft magenta sweep on hover, echoing the logo */}
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_72%,var(--accent-2))] opacity-0 transition-opacity duration-300 group-hover:opacity-40" />
        <MessageSquarePlus className="relative h-5 w-5 shrink-0" />
        <span className="relative hidden text-sm font-bold md:inline">Feedback</span>
      </motion.button>

      {/* ─── Modal ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Feedback form"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-2xl sm:h-[86vh] sm:rounded-3xl"
            >
              {/* header */}
              <div className="relative flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-5 py-4">
                {/* wine wash behind the header */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, color-mix(in srgb, var(--accent-1) 10%, transparent), transparent 60%)",
                  }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent-1)]">
                    beta · 45 seconds
                  </p>
                  <h2 className="mt-0.5 font-display text-lg font-extrabold -tracking-[0.02em] text-[var(--c-ink)]">
                    Shape StackRadar 🛰️
                  </h2>
                </div>
                <div className="relative flex items-center gap-1">
                  <a
                    href={FORM_PUBLIC}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in a new tab"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close feedback"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* body — embedded form with a loading shim */}
              <div className="relative flex-1 bg-white">
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--c-surface)]">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-1)]" />
                    <p className="font-mono text-xs text-[var(--c-ink-2)]">
                      loading the form…
                    </p>
                  </div>
                )}
                <iframe
                  src={FORM_EMBED}
                  title="StackRadar feedback form"
                  className="h-full w-full"
                  onLoad={() => setIframeLoaded(true)}
                >
                  Loading…
                </iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
