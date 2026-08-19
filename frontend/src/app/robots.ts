import { MetadataRoute } from "next";
import { SITE_URL as baseUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/watchlist"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
