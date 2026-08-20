"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sun, Moon, Bookmark, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";

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
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Scroll → condense the navbar into a floating island + drive the progress bar
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
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
      {/* Soft readability scrim — NOT a box: a full-width gradient that fades to
          transparent (no border, no edges), so links stay legible over scrolled
          content. Fades in only once you scroll; invisible at the top. */}
      <div className={`absolute inset-0 bg-gradient-to-b from-[var(--c-ground)] via-[var(--c-ground)]/70 to-transparent pointer-events-none transition-opacity duration-500 ${scrolled ? "opacity-95" : "opacity-0"}`} />
      <div className="relative flex h-16 items-center justify-between px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* ─── Logo ───
            A solid wine radar badge with a hand-drawn radar mark (rings + sweep
            + ping) — deliberately not the gradient rounded-square + stock icon
            that reads as generic. The sweep spins on hover for a live "radar"
            feel. */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Squircle badge + a clean radar TARGET (concentric rings + an
              off-centre blip). Deliberately no centre-to-top needle — with the
              inner ring that read as a power-button ⏻. A gentle sweep fans out
              on hover. */}
          <div className="relative w-9 h-9 rounded-[11px] bg-[var(--accent-1)] flex items-center justify-center shadow-sm shadow-[var(--accent-1)]/20 ring-1 ring-inset ring-white/10 group-hover:shadow-md group-hover:shadow-[var(--accent-2)]/35 transition-all duration-300 overflow-hidden">
            {/* radar sweep — invisible at rest, fans + spins on hover */}
            <span className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_68%,rgba(255,255,255,0.34)_90%,transparent)] opacity-0 group-hover:opacity-100 group-hover:animate-[spin_2.6s_linear_infinite] transition-opacity duration-300" />
            <svg viewBox="0 0 24 24" fill="none" className="relative w-[20px] h-[20px]" aria-hidden="true">
              <circle cx="12" cy="12" r="8.2" stroke="white" strokeWidth="1.5" strokeOpacity="0.38" />
              <circle cx="12" cy="12" r="4.3" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
              <circle cx="12" cy="12" r="1.5" fill="white" />
              <circle cx="16.9" cy="7.5" r="1.9" fill="white" />
            </svg>
          </div>
          <span className="text-[17px] font-extrabold -tracking-[0.03em] font-display hidden sm:inline text-text-primary leading-none select-none">
            Stack<span className="text-accent-primary">Radar</span>
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
                <span className={`mr-1 font-light transition-all duration-300 ${isActive ? "text-accent-primary opacity-70" : "opacity-40 group-hover/nav:opacity-90 group-hover/nav:text-accent-primary"}`}>[</span>
                <span>{link.label}</span>
                <span className={`ml-1 font-light transition-all duration-300 ${isActive ? "text-accent-primary opacity-70" : "opacity-40 group-hover/nav:opacity-90 group-hover/nav:text-accent-primary"}`}>]</span>
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
              <button className="btn-primary text-xs py-1.5 px-4 hidden sm:flex items-center gap-1.5 cursor-pointer select-none">
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
                    className="mobile-nav-link text-3xl font-bold font-display tracking-tight text-left flex items-center"
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
