// Display labels for known source slugs (see sources.slug in the schema).
// Used where only the slug is stored/selected but attribution renders a
// friendly name — e.g. the homepage featured-events query.
const SOURCE_LABELS: Record<string, string> = {
  luma: "Luma",
  meetup: "Meetup",
  eventbrite: "Eventbrite",
  freenyc: "FreeNYC",
  curated: "Curated",
};

/** Friendly display label for a source slug; falls back to the slug itself. */
export function sourceLabel(slug: string): string {
  return SOURCE_LABELS[slug] ?? slug;
}
