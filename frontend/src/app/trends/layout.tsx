import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trends Overview — StackRadar",
  description:
    "Compare tool intelligence scores across all tracked technologies. Interactive bar charts and top performer cards.",
};

export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
