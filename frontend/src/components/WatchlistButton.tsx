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
}

interface WatchlistButtonProps {
  toolSlug: string;
  className?: string;
}

export default function WatchlistButton({ toolSlug, className = "" }: WatchlistButtonProps) {
  const { user, isSignedIn } = useUser();
  const [isWatched, setIsWatched] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const userId = user?.id || "";

  useEffect(() => {
    if (userId) {
      setIsWatched(getWatchlist(userId).includes(toolSlug));
    }
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
      setShowToast("Added to watchlist ⭐");
    }

    // Auto-dismiss toast
    setTimeout(() => setShowToast(null), 1500);
  };

  // If not signed in, wrap in sign-in trigger
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className={`relative z-20 p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-primary ${className}`}
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
        className={`relative z-20 p-1.5 rounded-lg transition-all ${
          isWatched
            ? "text-primary bg-primary/10 hover:bg-primary/20"
            : "text-muted-foreground hover:text-primary hover:bg-muted/60"
        } ${className}`}
        aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      >
        {isWatched ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
      </button>

      {/* Micro toast */}
      {showToast && (
        <span className="absolute top-0 right-0 z-50 px-2 py-1 rounded bg-card border border-border text-[10px] font-semibold text-foreground shadow-lg animate-bounce whitespace-nowrap">
          {showToast}
        </span>
      )}
    </>
  );
}
