/**
 * robots.txt policy — pure builder so the content is unit-testable;
 * app/robots.ts is a thin MetadataRoute wrapper over this.
 *
 * Public discovery pages stay crawlable; private and plumbing routes are
 * excluded: the signed-in profile, the sign-in surface, the API (including
 * auth endpoints), and the tracked /go redirects (never index a redirect).
 */
import type { MetadataRoute } from "next";

export interface RobotsInput {
  siteUrl: string;
}

export function buildRobotsRules({ siteUrl }: RobotsInput): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/profile", "/signin", "/api/", "/go/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
