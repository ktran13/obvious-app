import type { MetadataRoute } from "next";

import { getDb } from "@/lib/db";
import { getSitemapPaths } from "@/lib/seo/queries";
import { siteUrlFor, SITE_URL } from "@/lib/seo/site";

// Events churn constantly (listings expire and drop out of the directory),
// so the sitemap must be computed per request, never baked at build time.
export const dynamic = "force-dynamic";

/**
 * /sitemap.xml — static discovery routes plus every live event detail page
 * and community page. Only listings the directory would still render appear
 * here (see lib/seo/queries.getSitemapPaths); expired events are excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();
  const { eventIds, communitySlugs } = await getSitemapPaths(db);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrlFor("/") },
    { url: siteUrlFor("/events") },
    { url: siteUrlFor("/communities") },
    { url: siteUrlFor("/jobs") },
  ];

  return [
    ...staticEntries,
    ...eventIds.map((id) => ({ url: `${SITE_URL}/events/${id}` })),
    ...communitySlugs.map((slug) => ({ url: `${SITE_URL}/communities/${slug}` })),
  ];
}
