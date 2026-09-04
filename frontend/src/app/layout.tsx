import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
// (Clerk dark theme import removed with the retired design system.)
import SmoothScrollProvider from "@/components/providers/SmoothScroll";
import Preloader from "@/components/ui/Preloader";
import CustomCursor from "@/components/ui/CustomCursor";
import AmbientField from "@/components/ui/AmbientField";
import FeedbackButton from "@/components/FeedbackButton";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  // Absolute base so page-level OG image paths (/api/og?...) resolve when a link
  // is unfurled off-site. Override via NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(SITE_URL),
  title: "StackRadar — Learn the right tech, in the right order",
  description:
    "Free, sequenced learning roadmaps ranked by live momentum data — the right tools in the right order, each with the single best free video. Pick your career goal and get your 5-minute plan.",
  keywords: ["tech trends", "AI", "machine learning", "cybersecurity", "cloud native", "roadmap", "developer tools", "learn to code", "career roadmap"],
  openGraph: {
    title: "Learn the right tech, in the right order",
    description: "Free learning roadmaps ranked by live data — the best free video for every step. Get your 5-minute career plan.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn the right tech, in the right order",
    description: "Free learning roadmaps ranked by live data — the best free video for every step.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Clerk's own modal follows the site, not the retired dark design: its
  // baseTheme was pinned to `dark`, which opened a black sign-in sheet on top
  // of a cream page.
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2C2E2A",
          colorText: "#2C2E2A",
          colorBackground: "#FFFFFF",
          borderRadius: "10px",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Light-first: the warm editorial system is the default look,
                // and dark is the opt-in. Runs before paint so there's no flash.
                //
                // One-time migration: a stored 'dark' from before 2026-08-27
                // refers to the RETIRED pure-black design, not a preference for
                // this one, and it left returning visitors staring at a dark
                // page after the system was rebuilt around cream. The stale
                // value is cleared once; anything chosen after that sticks.
                try {
                  if (!localStorage.getItem('theme-v2')) {
                    localStorage.removeItem('theme');
                    localStorage.setItem('theme-v2', '1');
                  }
                } catch (_) {}
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) { document.documentElement.classList.remove('dark'); }
                // Decide the first-visit loader BEFORE first paint so the home
                // page never flashes in ahead of it. Returning (same-session)
                // visitors get no class, so the loader stays hidden.
                try {
                  if (!sessionStorage.getItem('stackradar_visited')) {
                    document.documentElement.classList.add('sr-preloading');
                  }
                } catch (_) {}
              `,
            }}
          />
        </head>
        <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-primary text-text-primary transition-colors duration-300`}>
          <SmoothScrollProvider>
            <Preloader />
            {/* <BackendWaking /> was mounted here: a full-screen curtain shown
                while the free-tier backend woke. It is gone because the reason
                for it is gone — the data pages are server-rendered with ISR
                now, so a visitor gets cached HTML with real numbers whether or
                not the backend happens to be awake.

                It also had a failure mode worse than the problem it solved: if
                the health probe never returned 200, the curtain never lifted
                and the ENTIRE site was unreachable behind it. That is what a
                stopped local backend looked like — a working frontend showing
                nothing but a loading screen forever. A blocking overlay that
                can strand the whole app is not an acceptable trade for hiding
                a cold start. */}
            <FeedbackButton />
            <CustomCursor />
            <div className="noise-overlay" aria-hidden="true" />
            {/* Mounted here, above the route, so it survives navigation: the
                field does not restart or re-fade when you move between pages,
                which is the whole point of a background that stays. It renders
                nothing on `/`. */}
            <AmbientField />
            {children}
          </SmoothScrollProvider>
          {/* Vercel Web Analytics — pageviews + custom events. No-ops in local
              dev; only reports once deployed on Vercel. */}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
