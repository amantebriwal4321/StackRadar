import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Tools — StackRadar",
  description:
    "Compare developer tools side-by-side. View scores, GitHub stars, community sentiment, and historical trend data for 2-5 tools at once.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
