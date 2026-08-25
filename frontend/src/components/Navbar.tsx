"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sun, Moon, Bookmark, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import SplitReveal from "@/components/ui/SplitReveal";

// Roadmaps is the product's main attraction, so it sits first after the
// console; the momentum surfaces (explore/trends/compare) follow as the
// intelligence that powers those roadmaps.
// Student-first labels: a first-time visitor should know where a link goes
// without learning our vocabulary ("console", "explore" were insider words).
const navLinks = [
  { href: "/", label: "home" },
  // The conversion front door — an anchor into the goal chooser on the landing
  // page, reachable from anywhere. Never matches the active-state check, which
  // is fine: it's an action, not a place.
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Dark-first: only an explicit "light" choice opts out.
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Scroll → drive the reading-progress bar. The nav itself never gains a
  // surface in Dala, so there is no `scrolled` fill state any more.
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

  // Stagger links entrance on mobile menu open
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
      {/* DALA: "Transparent background sitting directly on black canvas.
          No border, no backdrop blur on the nav itself." The frosted fill that
          Mercury called for is deliberately gone — the nav never gains a
          surface, at any scroll position. */}
      <div className="relative flex h-16 items-center justify-between px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* ─── Logo ───
            Built on Dala's construction: an abstract letterform assembled from
            flat geometric primitives on a grid — a large quarter-circle, a solid
            square, a smaller quarter-circle — gradient-filled across the brand
            spectrum, with NO container badge (the mark floats on the void).
            Ours makes those primitives mean something: the quarter-circles are
            radar sweeps, the square is the stack. The wordmark stays monochrome
            white so the mark carries all the colour, exactly as Dala does. */}
        <Link href="/" className="flex items-center gap-3 group" aria-label="StackRadar home">
          <svg
            viewBox="0 0 39 48"
            className="h-7 w-[22px] shrink-0 overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sr-sweep" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#15846e" />
                <stop offset="52%" stopColor="#8052ff" />
                <stop offset="100%" stopColor="#c9a6ff" />
              </linearGradient>
              <linearGradient id="sr-blip" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8052ff" />
                <stop offset="100%" stopColor="#ffb829" />
              </linearGradient>
              <linearGradient id="sr-stack" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6a3fd6" />
                <stop offset="100%" stopColor="#8052ff" />
              </linearGradient>
            </defs>

            {/* outer radar sweep — the wide quarter arc */}
            <path d="M15 0 A24 24 0 0 1 39 24 L15 24 Z" fill="url(#sr-sweep)" />
            {/* the stack — solid block held in the negative space */}
            <rect x="0" y="24" width="15" height="15" fill="url(#sr-stack)" />
            {/* inner sweep / signal returning */}
            <path d="M15 36 L33 36 A18 18 0 0 1 15 48 Z" fill="url(#sr-blip)" />
          </svg>

          <span className="text-[19px] font-normal -tracking-[0.03em] font-display hidden sm:inline text-[var(--c-ink)] leading-none select-none">
            StackRadar
          </span>
        </Link>

        {/* ─── Desktop Navigation ─── */}
        <nav className="hidden md:flex items-center gap-3" role="navigation">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className={`group/nav relative px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 font-mono select-none ${
                  isActive
                    ? "text-accent-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-[var(--c-surface)]/70"
                }`}
              >
                <span className={`mr-1 font-extralight transition-all duration-300 ${isActive ? "text-accent-primary opacity-70" : "opacity-40 group-hover/nav:opacity-90 group-hover/nav:text-accent-primary"}`}>[</span>
                <SplitReveal text={link.label} by="char" stagger={18} delay={60} />
                <span className={`ml-1 font-extralight transition-all duration-300 ${isActive ? "text-accent-primary opacity-70" : "opacity-40 group-hover/nav:opacity-90 group-hover/nav:text-accent-primary"}`}>]</span>
                {/* hover underline for inactive links — grows from the centre */}
                {!isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover/nav:w-[calc(100%-1.5rem)] bg-accent-primary/60 rounded-full transition-[width] duration-300" />
                )}
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-1 left-3 right-3 h-[2px] bg-accent-primary shadow-[0_0_8px_var(--accent-2)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ─── Right Actions ─── */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold text-text-secondary border border-border-subtle bg-[var(--c-surface)]/50 font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            active
          </div>

          {/* Auth buttons */}
          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/watchlist"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-accent-primary bg-accent-primary/10 border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors duration-300 font-mono"
              >
                <Bookmark className="w-3.5 h-3.5" />
                watchlist
              </Link>
              <UserButton />
            </>
          ) : isLoaded ? (
            <SignInButton mode="modal">
              <button className="btn-primary hidden sm:flex items-center gap-1.5 cursor-pointer select-none">
                <Sparkles className="w-3.5 h-3.5" />
                start console
              </button>
            </SignInButton>
          ) : null}

          {/* Theme switcher */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-border-subtle bg-[var(--c-surface)]/50 hover:bg-indigo-600/10 transition-colors duration-300 text-text-secondary hover:text-text-primary cursor-pointer select-none"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Moon className="w-3.5 h-3.5 text-accent-glow" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-full border border-border-subtle bg-[var(--c-surface)]/50 text-text-secondary cursor-pointer select-none"
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Scroll-progress bar — the loading line that fills across the bottom of
          the navbar as you move down the page. */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--accent-1)] via-[var(--accent-2)] to-[var(--accent-1)] shadow-[0_0_8px_var(--accent-2)] transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* ─── Mobile Fullscreen Overlay ─── */}
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
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="mobile-nav-link text-3xl font-bold font-display tracking-[-0.04em] text-left flex items-center"
                  >
                    <span className={`transition-colors duration-300 ${
                      isActive ? "text-accent-primary" : "text-text-secondary hover:text-text-primary"
                    }`}>
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
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-bold text-sm"
                >
                  <Bookmark className="w-4 h-4" />
                  My Watchlist
                </Link>
              )}
              <div className="text-center text-xs text-text-secondary font-mono">
                stackradar v2.0 • live stats
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
