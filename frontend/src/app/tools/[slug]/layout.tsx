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
      // What the score is actually built from: stars and forks, plus developer
      // conversation. Sentiment is displayed but is NOT an input, and "real-time"
      // is a 30-minute loop. When hiring demand has been measured it is the most
      // useful sentence in the snippet, so lead with it, with its denominator.
      description:
        `${tool.name} scores ${tool.score}/100 on momentum, built from GitHub stars and forks plus developer conversation on Hacker News, Reddit, Dev.to and tech news.` +
        (tool.jobs_sample && tool.jobs_mentions
          ? ` ${tool.jobs_mentions} of ${tool.jobs_sample.toLocaleString("en-US")} recent "Who is hiring?" posts name it.`
          : ""),
      openGraph: {
        title: `${tool.name} — ${tool.score}/100 on StackRadar`,
        description: `Track ${tool.name}'s momentum across GitHub, Hacker News, Reddit and Dev.to.`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${tool.name} — ${tool.score}/100 on StackRadar`,
        description: `${tool.name} momentum: ${tool.score}/100. ${tool.stage} stage. ${tool.stars.toLocaleString('en-US')} GitHub stars.`,
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
