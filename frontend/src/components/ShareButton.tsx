"use client";

import { useState, useCallback } from "react";
import { Share2, Check, Link2 } from "lucide-react";

/**
 * The growth primitive.
 *
 * Every share is a link back with a branded preview (see the /plan pages'
 * OG image), so this button is the app's cheapest acquisition channel. Uses the
 * native share sheet on mobile — where students actually share, into WhatsApp /
 * Instagram — and falls back to copy-link on desktop.
 */
export default function ShareButton({
  path,
  title,
  text,
  label = "Share",
}: {
  path: string;      // app-relative, e.g. "/plan/ai-ml"
  title: string;
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    // Native share sheet — the mobile path that actually spreads.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user dismissed or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — nothing we can safely do */
    }
  }, [path, title, text]);

  return (
    <button
      onClick={onShare}
      className="flex items-center justify-center gap-2 text-sm font-bold font-mono uppercase tracking-wider py-3.5 px-6 rounded-xl border border-indigo-500/25 bg-[var(--c-surface)]/60 hover:bg-[var(--c-surface-2)] hover:border-indigo-400/50 text-[var(--c-ink)] transition-colors cursor-pointer"
    >
      {copied ? (
        <><Check className="w-4 h-4 text-[#12B76A]" /> Link copied</>
      ) : (
        <><Share2 className="w-4 h-4 text-indigo-600" /> {label}</>
      )}
    </button>
  );
}
