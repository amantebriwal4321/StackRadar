import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Roadmap — StackRadar",
  description:
    "Master a technology domain with this step-by-step learning roadmap. From fundamentals to advanced production patterns.",
};

export default function RoadmapDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
