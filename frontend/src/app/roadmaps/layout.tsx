import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Roadmaps — StackRadar",
  description:
    "Step-by-step learning roadmaps for AI/ML, Web Development, DevOps, Cybersecurity, and more. Curated curricula from beginner to advanced.",
};

export default function RoadmapsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
