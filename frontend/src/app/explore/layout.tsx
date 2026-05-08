import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Paths — StackRadar",
  description:
    "Guided learning paths organized by domain. Start with beginner tools and progress to advanced — powered by real-time trend data.",
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
