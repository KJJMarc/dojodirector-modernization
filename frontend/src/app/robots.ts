import type { MetadataRoute } from "next";
import {
  CANONICAL_SITEMAP_URL,
  getRobotsDisallowPaths,
} from "@/lib/seo-public-routes.shared";

/**
 * Production robots.txt for Dojo Director.
 * Declares the canonical sitemap and blocks non-public product areas from crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: getRobotsDisallowPaths(),
      },
    ],
    sitemap: CANONICAL_SITEMAP_URL,
    host: "www.dojodirector.com",
  };
}
