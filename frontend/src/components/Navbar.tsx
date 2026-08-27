"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sun, Moon, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { fetchOverview, type Overview } from "@/data/trends";

/* App chrome, not a marketing bar.
 *
 * The landing runs the "Live surface" grammar, which forbids the
 * wordmark-plus-CTA header outright: it is the single element that most makes
 * a product page read as a template. What replaces it is the chrome the real
 * instrument would have — a tab strip over the surfaces, and a status line
 * carrying what the scraper is actually doing right now.
 *
 * The status figures come from /overview and are real. If they cannot be
 * fetched the line simply does not render; it never shows a placeholder.
 *
 * Dala still governs the look: no fill, no border, no backdrop blur at any
 * scroll position. */

const navLinks = [
  { href: "/", label: "home" },
  { href: "/#five-minute-plan", label: "my plan" },
  { href: "/roadmaps", label: "roadmaps" },
  { href: "/explore", label: "what to learn" },
  { href: "/trends", label: "what's rising" },
  { href: "/compare", label: "compare" },
  { href: "/about", label: "about" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn, isLoaded } = useUser();
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    setMounted(true);
    // Light-first: only an explicit "dark" choice opts in. This must agree
    // with the pre-paint script in layout.tsx, which is the other half of the
    // same decision; when they disagreed, this one silently won and the whole
    // app stayed dark after the palette was flipped.
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Real telemetry for the status line. A failure is silent on purpose: the
  // chrome degrades to just the tabs rather than showing an error or a zero.
  useEffect(() => {
    let cancelled = false;
    fetchOverview()
      .then((o) => {
        if (!cancelled) setOverview(o);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll → drive the reading-progress bar. The nav itself never gains a
  // surface in Dala, so there is no `scrolled` fill state.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(y / max, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    if (mobileOpen) {
      gsap.fromTo(
        ".mobile-nav-link",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "power3.out", delay: 0.2 }
      );
    }
  }, [mobileOpen]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full">
      <div className="relative flex h-16 items-center justify-between px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* ─── Mark ───
            Kept from Dala: flat geometric primitives on a grid, gradient-filled,
            no container badge. The quarter-circles are radar sweeps and the
            square is the stack. The wordmark stays monochrome so the mark
            carries all the colour. */}
        <Link href="/" className="flex items-center gap-3 group" aria-label="StackRadar home">
          <svg viewBox="0 0 39 48" className="h-7 w-[22px] shrink-0 overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="sr-sweep" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8ED462" />
                <stop offset="52%" stopColor="#2C2E2A" />
                <stop offset="100%" stopColor="#80827F" />
              </linearGradient>
              <linearGradient id="sr-blip" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2C2E2A" />
                <stop offset="100%" stopColor="#FF705D" />
              </linearGradient>
              <linearGradient id="sr-stack" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1A3300" />
                <stop offset="100%" stopColor="#2C2E2A" />
              </linearGradient>
            </defs>
            <path d="M15 0 A24 24 0 0 1 39 24 L15 24 Z" fill="url(#sr-sweep)" />
            <rect x="0" y="24" width="15" height="15" fill="url(#sr-stack)" />
            <path d="M15 36 L33 36 A18 18 0 0 1 15 48 Z" fill="url(#sr-blip)" />
          </svg>

          <span className="text-[19px] font-normal -tracking-[0.03em] font-display hidden sm:inline text-[var(--c-ink)] leading-none select-none">
            StackRadar
          </span>
        </Link>

        {/* ─── Tab strip ───
            Plain labels. The bracket-and-monospace styling was monospace worn
            as a costume for "technical"; mono is kept for data and figures. */}
        <nav className="hidden md:flex items-center gap-1" role="navigation">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className={`group/nav relative px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-300 select-none ${
                  isActive
                    ? "text-[var(--c-ink)]"
                    : "text-[var(--c-ink-3)] hover:text-[var(--c-ink)]"
                }`}
              >
                {link.label}
                {!isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-px w-0 group-hover/nav:w-[calc(100%-1.5rem)] bg-[var(--c-ink-3)] transition-[width] duration-300" />
                )}
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-1 left-3 right-3 h-[2px] bg-[var(--accent-1)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ─── Right: status line + session ─── */}
        <div className="flex items-center gap-4">
          {/* Real state, in the surface's own idiom. */}
          {overview && (
            <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)] tabular-nums">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                {overview.is_scraping && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-1)] opacity-60" />
                )}
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{
                    background: overview.is_scraping
                      ? "var(--accent-1)"
                      : "var(--color-score-high)",
                  }}
                />
              </span>
              <span>{overview.is_scraping ? "collecting" : "idle"}</span>
              <span aria-hidden="true" className="text-[var(--c-border)]">/</span>
              <span>{overview.tools_tracked} tracked</span>
              <span aria-hidden="true" className="text-[var(--c-border)]">/</span>
              <span>{overview.signals_24h} signals 24h</span>
            </div>
          )}

          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/watchlist"
                className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition-colors duration-300"
              >
                <Bookmark className="w-3.5 h-3.5" />
                watchlist
              </Link>
              <UserButton />
            </>
          ) : isLoaded ? (
            <SignInButton mode="modal">
              <button className="hidden sm:inline text-[13px] font-medium text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition-colors duration-300 cursor-pointer select-none">
                sign in
              </button>
            </SignInButton>
          ) : null}

          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition-colors duration-300 cursor-pointer select-none"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-full text-[var(--c-ink-3)] cursor-pointer select-none"
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Reading progress across the bottom of the chrome. */}
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <div
          className="h-full bg-[var(--accent-1)] transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* ─── Mobile overlay ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 top-16 z-40 bg-[var(--c-ground)] flex flex-col justify-between p-6 md:hidden"
          >
            <div className="flex flex-col space-y-6 pt-8">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="mobile-nav-link text-3xl font-normal font-display tracking-[-0.04em] text-left flex items-center"
                  >
                    <span
                      className={`transition-colors duration-300 ${
                        isActive ? "text-[var(--c-ink)]" : "text-[var(--c-ink-3)]"
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="space-y-4 pb-12">
              {isLoaded && isSignedIn && (
                <Link
                  href="/watchlist"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-[var(--c-ink)] font-medium text-sm"
                >
                  <Bookmark className="w-4 h-4" />
                  My Watchlist
                </Link>
              )}
              {overview && (
                <div className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--c-ink-3)] tabular-nums">
                  {overview.tools_tracked} tracked / {overview.signals_24h} signals 24h
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
