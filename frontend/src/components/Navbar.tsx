"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Menu, X, Sun, Moon, Bookmark, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";

const navLinks = [
  { href: "/", label: "console" },
  { href: "/explore", label: "explore" },
  { href: "/trends", label: "trends" },
  { href: "/compare", label: "compare" },
  { href: "/roadmaps", label: "roadmaps" },
  { href: "/about", label: "about" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn, isLoaded } = useUser();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Handle scroll trigger background classes
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
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
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 border-b ${
        scrolled
          ? "backdrop-blur-xl bg-[#EDEFF5]/80 border-border-subtle shadow-[0_4px_30px_rgba(37,64,255,0.10)]"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* ─── Logo ─── */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-1)] via-[var(--accent-2)] to-[var(--accent-1)] flex items-center justify-center shadow-lg shadow-[var(--accent-1)]/25 group-hover:scale-105 transition-transform duration-300">
            <Radar className="w-[18px] h-[18px] text-white" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-1)] to-indigo-400 blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
          </div>
          <span className="text-lg font-bold tracking-tight font-display hidden sm:inline text-text-primary">
            stack<span className="text-accent-primary">radar</span>
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
                className={`relative px-3 py-1.5 text-xs font-semibold tracking-wider transition-colors duration-300 font-mono select-none ${
                  isActive ? "text-accent-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <span className="opacity-40 mr-1 font-light">[</span>
                <span>{link.label}</span>
                <span className="opacity-40 ml-1 font-light">]</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent-primary shadow-[0_0_8px_var(--accent-2)]"
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
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold text-text-secondary border border-border-subtle bg-[#FFFFFF]/50 font-mono">
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
              className="p-2 rounded-full border border-border-subtle bg-[#FFFFFF]/50 hover:bg-indigo-600/10 transition-colors duration-300 text-text-secondary hover:text-text-primary cursor-pointer select-none"
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
            className="md:hidden p-2 rounded-full border border-border-subtle bg-[#FFFFFF]/50 text-text-secondary cursor-pointer select-none"
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── Mobile Fullscreen Overlay ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 top-16 z-40 bg-[#EDEFF5] flex flex-col justify-between p-6 md:hidden"
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
