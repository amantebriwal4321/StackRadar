import { MetadataRoute } from "next";
import { fetchTools, fetchRoadmaps } from "@/data/trends";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stackradar.dev";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/trends`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/roadmaps`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  // SEO guide + roadmap + shareable-plan pages, one per roadmap. The /learn
  // guides are the pages built to rank on "how to learn X", so they get top
  // priority among the dynamic set.
  let roadmapPages: MetadataRoute.Sitemap = [];
  try {
    const roadmaps = await fetchRoadmaps();
    roadmapPages = roadmaps.flatMap((r) => [
      { url: `${baseUrl}/learn/${r.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
      { url: `${baseUrl}/roadmap/${r.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
      { url: `${baseUrl}/plan/${r.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
    ]);
  } catch {
    // API down — fall through with just the static + tool pages
  }

  // Dynamic tool pages
  let toolPages: MetadataRoute.Sitemap = [];
  try {
    const tools = await fetchTools();
    toolPages = tools.map((tool) => ({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: tool.updated_at ? new Date(tool.updated_at) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // If API is down, return only static pages
  }

  return [...staticPages, ...roadmapPages, ...toolPages];
}
