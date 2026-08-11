import type { MetadataRoute } from "next";
import {
  absoluteCanonicalUrl,
  getPublicSitemapEntries,
} from "@/lib/seo-public-routes.shared";

/**
 * Production sitemap. Uses the canonical www origin for every entry so staging
 * hosts never appear in Google Search Console submissions.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return getPublicSitemapEntries().map((entry) => ({
    url: absoluteCanonicalUrl(entry.path),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
