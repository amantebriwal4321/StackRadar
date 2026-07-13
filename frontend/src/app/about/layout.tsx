import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — StackRadar",
  description:
    "StackRadar is the Bloomberg Terminal for your tech stack — a live 0–100 momentum score for every major developer technology, scored from GitHub, Hacker News, Reddit, Dev.to and tech RSS, then wired straight into a learning roadmap.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
