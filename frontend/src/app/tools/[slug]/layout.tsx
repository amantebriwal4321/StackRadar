import type { Metadata } from "next";
import { fetchToolDetail } from "@/data/trends";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const tool = await fetchToolDetail(slug);
    return {
      title: `${tool.name} — Score ${tool.score}/100 | StackRadar`,
      description: `${tool.name} has a real-time momentum score of ${tool.score}/100 based on GitHub activity, developer community sentiment, and tech news. Track ${tool.name}'s trend across GitHub, HackerNews, Dev.to, and Reddit.`,
      openGraph: {
        title: `${tool.name} — ${tool.score}/100 on StackRadar`,
        description: `Track ${tool.name}'s real-time trend across GitHub, HackerNews, Dev.to, and Reddit.`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${tool.name} — ${tool.score}/100 on StackRadar`,
        description: `${tool.name} momentum: ${tool.score}/100. ${tool.stage} stage. ${tool.stars.toLocaleString()} GitHub stars.`,
      },
    };
  } catch {
    return {
      title: "Tool Details | StackRadar",
      description: "Detailed analytics and trend data for developer tools.",
    };
  }
}

export default function ToolLayout({ children }: Props) {
  return <>{children}</>;
}
