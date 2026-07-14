"use client";

import { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";

function getWatchlist(userId: string): string[] {
  try {
    const data = localStorage.getItem(`watchlist_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setWatchlist(userId: string, slugs: string[]) {
  localStorage.setItem(`watchlist_${userId}`, JSON.stringify(slugs));
  // Let other WatchlistButtons / the watchlist page react instantly.
  window.dispatchEvent(new CustomEvent("watchlist:changed"));
}

interface WatchlistButtonProps {
  toolSlug: string;
  /** Render a labelled pill (for prominent placements like the tool page) instead of the bare icon. */
  showLabel?: boolean;
  className?: string;
}

export default function WatchlistButton({ toolSlug, showLabel = false, className = "" }: WatchlistButtonProps) {
  const { user, isSignedIn } = useUser();
  const [isWatched, setIsWatched] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const userId = user?.id || "";

  useEffect(() => {
    if (!userId) return;
    const sync = () => setIsWatched(getWatchlist(userId).includes(toolSlug));
    sync();
    window.addEventListener("watchlist:changed", sync);
    return () => window.removeEventListener("watchlist:changed", sync);
  }, [userId, toolSlug]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) return; // SignInButton wrapper handles this

    const current = getWatchlist(userId);
    if (current.includes(toolSlug)) {
      setWatchlist(userId, current.filter((s) => s !== toolSlug));
      setIsWatched(false);
      setShowToast("Removed from watchlist");
    } else {
      setWatchlist(userId, [...current, toolSlug]);
      setIsWatched(true);
      setShowToast("Added to watchlist");
    }
    setTimeout(() => setShowToast(null), 1500);
  };

  // ── Labelled pill variant ──
  if (showLabel) {
    const pill = `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
      isWatched
        ? "bg-primary/10 border-primary/40 text-primary"
        : "bg-card border-border-subtle text-text-secondary hover:text-text-primary hover:border-primary/50"
    } ${className}`;

    if (!isSignedIn) {
      return (
        <SignInButton mode="modal">
          <button className={pill} aria-label="Sign in to save" title="Sign in to save">
            <Bookmark className="w-4 h-4" /> Save to watchlist
          </button>
        </SignInButton>
      );
    }
    return (
      <div className="relative">
        <button onClick={handleToggle} className={pill} aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}>
          {isWatched ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {isWatched ? "Saved" : "Save to watchlist"}
        </button>
        {showToast && (
          <span className="absolute -bottom-8 right-0 z-50 px-2.5 py-1 rounded-lg bg-card border border-border-subtle text-[10px] font-semibold text-foreground shadow-lg whitespace-nowrap animate-fade-in">
            {showToast}
          </span>
        )}
      </div>
    );
  }

  // ── Bare icon variant (for cards / rows) ──
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className={`relative z-20 p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-primary cursor-pointer ${className}`}
          aria-label="Sign in to bookmark"
          title="Sign in to bookmark"
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </SignInButton>
    );
  }

  return (
    <>
      <button
        onClick={handleToggle}
        className={`relative z-20 p-1.5 rounded-lg transition-all cursor-pointer ${
          isWatched
            ? "text-primary bg-primary/10 hover:bg-primary/20"
            : "text-muted-foreground hover:text-primary hover:bg-muted/60"
        } ${className}`}
        aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      >
        {isWatched ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      </button>
      {showToast && (
        <span className="absolute top-0 right-0 z-50 px-2 py-1 rounded bg-card border border-border text-[10px] font-semibold text-foreground shadow-lg whitespace-nowrap">
          {showToast}
        </span>
      )}
    </>
  );
}
