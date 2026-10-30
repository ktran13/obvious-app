/**
 * Link-out policy for monetization (Blueprint Rev 2.3):
 *
 * - Every rendered link-out to an event listing goes through the tracked
 *   `/go/[id]` redirect. The redirect target is the event's affiliate URL
 *   when one exists, otherwise its canonical URL.
 * - Anchors that lead to an affiliate destination carry `rel="sponsored"`
 *   (plus the standard noopener/noreferrer pair); canonical links do not.
 * - v1 logs no clicks to any third party — the redirect is our only
 *   measurement surface, and even it performs no logging yet.
 */

export type LinkOutEvent = {
  affiliateUrl: string | null | undefined;
  canonicalUrl: string;
};

/**
 * Where a tracked `/go` redirect should send the visitor: the affiliate
 * URL when present (whitespace-only counts as absent), otherwise the
 * canonical listing URL.
 */
export function resolveRedirectTarget(event: LinkOutEvent): string {
  const affiliate = event.affiliateUrl?.trim();
  return affiliate ? affiliate : event.canonicalUrl;
}

/**
 * The `rel` attribute for a rendered link-out anchor. Affiliate
 * destinations add `sponsored` on top of the safety pair.
 */
export function linkOutRel(affiliateUrl: string | null | undefined): string {
  return affiliateUrl
    ? "sponsored noopener noreferrer"
    : "noopener noreferrer";
}
