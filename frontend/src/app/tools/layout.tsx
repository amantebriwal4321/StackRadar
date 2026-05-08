import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tool Intelligence — StackRadar",
  description:
    "Detailed tech intelligence, decision recommendations, and score history for developer tools and frameworks.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
