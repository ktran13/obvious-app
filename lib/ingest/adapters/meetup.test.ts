/**
 * Meetup adapter tests — the flag defaults OFF and disabled mode makes no
 * network calls; the enabled path is exercised with an injected fetch.
 */
import { describe, expect, it, vi } from "vitest";

import { ingestSource } from "../validate";
import {
  MeetupAdapter,
  isMeetupEnabled,
  meetupNodeToParsedEvent,
  type MeetupEventNode,
  type MeetupGroupPayload,
} from "./meetup";

const node = (overrides: Partial<MeetupEventNode> = {}): MeetupEventNode => ({
  id: "m_1",
  title: "Astoria Board Game Night",
  description: "Weekly open-play session; beginners welcome.",
  eventUrl: "https://www.meetup.com/astoria-games/events/m_1/",
  dateTime: "2026-12-03T19:00:00-05:00",
  endTime: "2026-12-03T22:00:00-05:00",
  venue: { name: "The Queens Kickshaw" },
  ...overrides,
});

const payloadWith = (nodes: ReturnType<typeof node>[]): MeetupGroupPayload => ({
  data: { events: { edges: nodes.map((n) => ({ node: n })) } },
});

describe("isMeetupEnabled", () => {
  it("defaults to disabled and only enables on explicit truthy flags", () => {
    expect(isMeetupEnabled({})).toBe(false);
    expect(isMeetupEnabled({ MEETUP_ENABLED: "false" })).toBe(false);
    expect(isMeetupEnabled({ MEETUP_ENABLED: "" })).toBe(false);
    expect(isMeetupEnabled({ MEETUP_ENABLED: "  TRUE " })).toBe(true);
    expect(isMeetupEnabled({ MEETUP_ENABLED: "1" })).toBe(true);
    expect(isMeetupEnabled({ MEETUP_ENABLED: "yes" })).toBe(true);
    expect(isMeetupEnabled({ MEETUP_ENABLED: "on" })).toBe(false);
  });
});

describe("MeetupAdapter — disabled (default)", () => {
  it("is skipped by the pipeline before fetchRaw: zero network calls", async () => {
    const fetchImpl = vi.fn();
    const adapter = new MeetupAdapter({ groups: ["nyc-tech"], fetchImpl });
    // Adapter flag would read the real env — make the disabled state explicit.
    expect(adapter.isEnabled()).toBe(false);

    const result = await ingestSource(adapter);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.fetched).toBe(0);
    expect(result.accepted).toEqual([]);
  });
});

describe("MeetupAdapter — enabled with injected transport", () => {
  it("maps GraphQL nodes through the Zod gate", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(payloadWith([node(), node({ id: "m_2", title: "", eventUrl: undefined })])),
    );
    const adapter = new MeetupAdapter({
      groups: ["astoria-games"],
      endpoint: "https://graphql.test/gql2",
      fetchImpl,
      isEnabledImpl: () => true,
    });

    const result = await ingestSource(adapter);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.skipped).toBe(false);
    expect(result.fetched).toBe(2);
    expect(result.accepted).toHaveLength(1); // node with empty title rejected
    expect(result.rejected).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({
      sourceSlug: "meetup",
      externalId: "m_1",
      canonicalUrl: "https://www.meetup.com/astoria-games/events/m_1/",
      title: "Astoria Board Game Night",
      venue: "The Queens Kickshaw",
      priceType: "unknown",
    });
    expect(result.accepted[0].startsAt).toEqual(new Date("2026-12-03T19:00:00-05:00"));
  });

  it("requires a group list", async () => {
    const adapter = new MeetupAdapter({
      groups: [],
      fetchImpl: vi.fn(),
      isEnabledImpl: () => true,
    });
    await expect(adapter.fetchRaw()).rejects.toThrow(/groups/);
  });
});

describe("meetupNodeToParsedEvent", () => {
  it("treats missing venue/endTime as absent rather than empty strings", () => {
    const candidate = meetupNodeToParsedEvent(node({ venue: null, endTime: null }));
    expect(candidate.venue).toBeUndefined();
    expect(candidate.endsAt).toBeUndefined();
  });
});
