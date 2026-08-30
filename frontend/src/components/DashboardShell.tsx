"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Hide the sidebar and use full-width layout */
  fullWidth?: boolean;
  /** Drop horizontal padding so the child controls all x-spacing (edge-to-edge
      mobile layouts / full-bleed carousels). Top padding (navbar clearance) stays. */
  flushX?: boolean;
  /** Per-page accent theme: "teal" | "graphite" | "clay" | "wine" (comparison mode) */
  theme?: "teal" | "graphite" | "clay" | "wine";
}

/** Routes whose content is dense/tabular enough to need row separation.
 *  Dala forbids card borders, but 31 rows of scores on pure black are
 *  unreadable without them, so these routes get a hairline (no fill, no
 *  shadow). Everything else floats in the void as the spec intends. */
const DATA_ROUTES = /^\/(explore|trends|compare|tools|roadmap|roadmaps|watchlist)(\/|$)/;

export default function DashboardShell({ children, fullWidth = false, flushX = false, theme }: DashboardShellProps) {
  const pathname = usePathname();
  const isDataRoute = DATA_ROUTES.test(pathname || "");


  // overflow-x-clip (not hidden): clips ambient orbs/decorations that spill past
  // the right edge WITHOUT creating a scroll container — `overflow:hidden` here
  // would break position:sticky on descendants (the hero constellation, which
  // would otherwise scroll away and leave the column empty).
  return (
    <div className={`flex flex-col min-h-screen bg-background relative overflow-x-clip${isDataRoute ? " route-data" : ""}${theme ? ` theme-${theme}` : ""}`}>
      {/* The retired dark system's ambient layer used to sit here: a second
          copy of the noise overlay (the root layout already mounts one, and
          this made three in the tree at once), a cursor spotlight whose accent
          is charcoal now so it drew a grey smudge, and four orb/particle
          divs — three of them dead at display:none and the fourth painting
          indigo, saffron and teal from the old palette. AmbientField, mounted
          once in the root layout, is what carries ambience now. */}

      {/* ─── Navigation ─── */}
      <Navbar />

      {/* ─── Main Content ─── */}
      <main className="flex-1 relative">
        <div className="bg-dot-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
        {/* pt clears the fixed 65px navbar. Without it every page's first element
            renders UNDERNEATH the header — most pages hid this behind large hero
            padding, but any page whose first element sits high (e.g. the roadmap
            back-link) collided with the nav links. */}
        <div className={`relative z-10 mx-auto ${fullWidth ? 'max-w-[1280px]' : 'max-w-6xl'} ${flushX ? 'px-0' : 'px-4 md:px-6 lg:px-8'} pt-[5.5rem] md:pt-24 pb-6 md:pb-8`}>
          {children}
        </div>
      </main>
    </div>
  );
}
