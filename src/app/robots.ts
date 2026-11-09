import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private pages (logged-in areas, tests, results, admin) stay out of Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/dashboard", "/test", "/result/", "/onboarding", "/notifications", "/book-call", "/login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
