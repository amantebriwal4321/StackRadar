import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import SmoothScrollProvider from "@/components/providers/SmoothScroll";
import Preloader from "@/components/ui/Preloader";
import CustomCursor from "@/components/ui/CustomCursor";
import BackendWaking from "@/components/BackendWaking";
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
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Light-first: the warm editorial system is the default look,
                // and dark is the opt-in. Runs before paint so there's no flash.
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
            <BackendWaking />
            <FeedbackButton />
            <CustomCursor />
            <div className="noise-overlay" aria-hidden="true" />
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
