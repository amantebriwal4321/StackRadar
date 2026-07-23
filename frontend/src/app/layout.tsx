import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import SmoothScrollProvider from "@/components/providers/SmoothScroll";
import Preloader from "@/components/ui/Preloader";
import CustomCursor from "@/components/ui/CustomCursor";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
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
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              `,
            }}
          />
        </head>
        <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-primary text-text-primary transition-colors duration-300`}>
          <SmoothScrollProvider>
            <Preloader />
            <CustomCursor />
            <div className="noise-overlay" aria-hidden="true" />
            {children}
          </SmoothScrollProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
