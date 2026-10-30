/**
 * Meetup GraphQL source adapter ("meetup") — gated, off by default.
 *
 * `MEETUP_ENABLED` must be truthy ("1"/"true", case-insensitive) for the
 * adapter to run. When disabled, ingestSource skips the adapter before
 * fetchRaw — no network calls happen at all. When enabled, fetchRaw posts
 * the GraphQL query per group and yields raw edge nodes; a MEETUP_TOKEN
 * env (if present) is sent as a bearer token.
 */
import type { ParsedEventInput, SourceAdapter } from "../types";

export const MEETUP_SOURCE_SLUG = "meetup";

/** Luma-style cap — parsedEventSchema rejects descriptions over 5000 chars. */
const MAX_DESCRIPTION_LENGTH = 5000;

/** Reads the runtime flag. Default: disabled. */
export function isMeetupEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  const flag = env["MEETUP_ENABLED"]?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/** GraphQL query for one group's upcoming events. Endpoint: POST /gql2. */
export const MEETUP_UPCOMING_EVENTS_QUERY = `
query GroupUpcomingEvents($urlname: String!, $first: Int, $after: String) {
  events(first: $first, after: $after, filter: { groupUrlname: $urlname }) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        title
        description
        eventUrl
        dateTime
        endTime
        venue { name }
      }
    }
  }
}`;

export interface MeetupEventNode {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  eventUrl?: string | null;
  dateTime?: string | null;
  endTime?: string | null;
  venue?: { name?: string | null } | null;
}

export interface MeetupEdge {
  node?: MeetupEventNode | null;
}

export interface MeetupGroupPayload {
  data?: { events?: { edges?: MeetupEdge[] | null } | null };
}

export interface MeetupAdapterOptions {
  /** Group urlnames to pull upcoming events from (required when enabled). */
  groups?: string[];
  /** GraphQL endpoint; defaults to Meetup's public API. */
  endpoint?: string;
  fetchImpl?: typeof fetch;
  /** Injectable flag reader (tests). */
  isEnabledImpl?: () => boolean;
}

/** Map one GraphQL event node to a ParsedEventInput; Zod validates downstream. */
export function meetupNodeToParsedEvent(node: MeetupEventNode): ParsedEventInput {
  const description = node.description ?? undefined;
  return {
    sourceSlug: MEETUP_SOURCE_SLUG,
    externalId: node.id ?? "",
    canonicalUrl: node.eventUrl ?? "",
    title: node.title ?? "",
    description: description ? description.slice(0, MAX_DESCRIPTION_LENGTH) : undefined,
    startsAt: node.dateTime ?? "",
    endsAt: node.endTime ?? undefined,
    venue: node.venue?.name ?? undefined,
    priceType: "unknown",
    tags: [],
  };
}

export class MeetupAdapter implements SourceAdapter<MeetupEventNode> {
  readonly sourceSlug = MEETUP_SOURCE_SLUG;

  constructor(private readonly options: MeetupAdapterOptions = {}) {}

  isEnabled(): boolean {
    return this.options.isEnabledImpl ? this.options.isEnabledImpl() : isMeetupEnabled();
  }

  async fetchRaw(): Promise<MeetupEventNode[]> {
    const groups =
      this.options.groups ??
      (process.env["MEETUP_GROUPS"] ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
    if (groups.length === 0) {
      throw new Error(
        "Meetup adapter needs groups option or MEETUP_GROUPS env (comma-separated urlnames)",
      );
    }
    const endpoint = this.options.endpoint ?? "https://api.meetup.com/gql2";
    const doFetch = this.options.fetchImpl ?? fetch;
    const token = process.env["MEETUP_TOKEN"];

    const nodes: MeetupEventNode[] = [];
    for (const urlname of groups) {
      const response = await doFetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: MEETUP_UPCOMING_EVENTS_QUERY,
          variables: { urlname, first: 50 },
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Meetup GraphQL request failed: HTTP ${response.status} for group ${urlname}`,
        );
      }
      const payload = (await response.json()) as MeetupGroupPayload;
      const edges = payload.data?.events?.edges ?? [];
      for (const edge of edges) {
        if (edge?.node) nodes.push(edge.node);
      }
    }
    return nodes;
  }

  normalize(raw: MeetupEventNode): ParsedEventInput {
    return meetupNodeToParsedEvent(raw);
  }
}
