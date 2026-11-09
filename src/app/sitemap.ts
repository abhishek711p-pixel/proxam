import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "weekly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    { ...page("/", 1), alternates: { languages: { "en-IN": `${SITE_URL}/`, "hi-IN": `${SITE_URL}/hi` } } },
    { ...page("/hi", 0.9), alternates: { languages: { "en-IN": `${SITE_URL}/`, "hi-IN": `${SITE_URL}/hi` } } },
    ...GUIDES.map((g) => page(`/${g.slug}`, 0.9)),
    page("/batch", 0.8),
    page("/masterclass", 0.7),
    page("/privacy", 0.2, "monthly"),
  ];
}
