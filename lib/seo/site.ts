/**
 * Canonical origin for SEO surfaces (JSON-LD urls, sitemap entries, the
 * robots.txt sitemap pointer). NEXT_PUBLIC_SITE_URL must be set in any
 * deployed environment; the localhost default keeps local dev and tests
 * self-contained.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/** Absolute URL for an in-app path ("/events" → "http://host/events"). */
export function siteUrlFor(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
