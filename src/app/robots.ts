import type { MetadataRoute } from "next";
import { ALLOW_INDEXING, SITE_URL } from "@/lib/site";

/**
 * Crawling is deliberately allowed even while the site is set to noindex.
 *
 * A `Disallow: /` would stop crawlers fetching the pages at all, so they would
 * never read the noindex directive, and a URL someone shared could still be
 * indexed with no content. Letting them crawl and telling them not to index is
 * what actually keeps it out of results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(ALLOW_INDEXING ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
