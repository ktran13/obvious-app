/**
 * Luma iCal source adapter ("luma-nyc").
 *
 * Transport: fetchRaw pulls a Luma calendar's iCal export (the calendar
 * subscribable at lu.ma/… via the calendar's "Add to calendar" URL) and
 * splits it into VEVENT blocks. Mapping: one VEVENT → one ParsedEventInput.
 * Luma exports concrete instances (no RRULE), so recurrence is not handled.
 */
import { parseVEvent, splitVEvents, type VEvent } from "./ical-text";
import type { ParsedEventInput, SourceAdapter } from "../types";

/** Cap stored descriptions — parsedEventSchema rejects strings over 5000. */
const MAX_DESCRIPTION_LENGTH = 5000;

export const LUMA_SOURCE_SLUG = "luma-nyc";

/** Luma event UIDs look like "evt_XXXXXXXXXXXX@lu.ma". */
const LUMA_UID = /^evt_[A-Za-z0-9]+@lu\.ma$/;

export interface LumaAdapterOptions {
  /** iCal export URL; defaults to LUMA_CALENDAR_URL. */
  calendarUrl?: string;
  /** Injectable transport for tests. */
  fetchImpl?: typeof fetch;
}

export function lumaVEventToParsedEvent(vevent: VEvent): ParsedEventInput {
  const uid = vevent.uid?.trim();
  let canonicalUrl = vevent.url?.trim();
  if (!canonicalUrl && uid && LUMA_UID.test(uid)) {
    // Luma public event URLs drop the "evt_" prefix of the iCal UID.
    canonicalUrl = `https://lu.ma/${uid.split("@")[0].replace(/^evt_/, "")}`;
  }

  const startsAt = vevent.dtstart?.date;
  let endsAt = vevent.dtend?.date;
  // All-day DTEND is exclusive per RFC 5545 — already the day after; when
  // absent, treat an all-day event as spanning exactly its start day.
  if (startsAt && !endsAt && vevent.dtstart?.isAllDay) {
    endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
  }

  const description = vevent.description?.trim();
  return {
    sourceSlug: LUMA_SOURCE_SLUG,
    externalId: uid ?? "",
    canonicalUrl: canonicalUrl ?? "",
    title: vevent.summary?.trim() ?? "",
    description: description ? description.slice(0, MAX_DESCRIPTION_LENGTH) : undefined,
    startsAt: startsAt ?? "",
    endsAt,
    venue: vevent.location?.trim() || undefined,
    priceType: "unknown",
    tags: [],
  };
}

export class LumaIcalAdapter implements SourceAdapter<string> {
  readonly sourceSlug = LUMA_SOURCE_SLUG;

  constructor(private readonly options: LumaAdapterOptions = {}) {}

  private calendarUrl(): string | undefined {
    return this.options.calendarUrl ?? process.env["LUMA_CALENDAR_URL"];
  }

  async fetchRaw(): Promise<string[]> {
    const url = this.calendarUrl();
    if (!url) {
      throw new Error("Luma adapter needs a calendarUrl option or LUMA_CALENDAR_URL env");
    }
    const doFetch = this.options.fetchImpl ?? fetch;
    const response = await doFetch(url);
    if (!response.ok) {
      throw new Error(`Luma iCal fetch failed: HTTP ${response.status} for ${url}`);
    }
    return splitVEvents(await response.text());
  }

  normalize(rawBlock: string): ParsedEventInput {
    return lumaVEventToParsedEvent(parseVEvent(rawBlock));
  }
}
