import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fixtureEvents } from "@/lib/fixtures/events";

import { EventCard, formatPrice } from "./event-card";

const paid = fixtureEvents.find((event) => !event.isFree)!;
const free = fixtureEvents.find((event) => event.isFree)!;

describe("EventCard", () => {
  it("renders title, NYC time, venue, neighborhood, price, and source badge", () => {
    render(<EventCard event={paid} />);

    expect(
      screen.getByRole("heading", { name: paid.title }),
    ).toBeInTheDocument();
    // Jazz fixture: 2026-11-07T02:30Z = 9:30 PM Nov 6 in New York.
    expect(screen.getByText("9:30 PM")).toBeInTheDocument();
    expect(screen.getByText(paid.venue)).toBeInTheDocument();
    expect(screen.getByText(paid.neighborhood)).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText(`via ${paid.source.label}`)).toBeInTheDocument();
  });

  it("renders the free flag for free events", () => {
    render(<EventCard event={free} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("renders the link-out anchor to the original listing", () => {
    render(<EventCard event={paid} />);
    const link = screen.getByRole("link", {
      name: new RegExp(`View at ${paid.source.label}`),
    });
    expect(link).toHaveAttribute("href", paid.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the time in a supplied timezone", () => {
    render(<EventCard event={paid} timeZone="America/Chicago" />);
    expect(screen.getByText("8:30 PM")).toBeInTheDocument();
  });

  it("routes the link through the tracked /go redirect when tracked", () => {
    render(<EventCard event={paid} tracked />);

    const link = screen.getByRole("link", {
      name: new RegExp(`View at ${paid.source.label}`),
    });
    expect(link).toHaveAttribute("href", `/go/${paid.id}`);
    // No affiliate URL → canonical destination, no sponsored marker.
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("marks affiliate link-outs with rel=sponsored", () => {
    render(
      <EventCard
        event={paid}
        tracked
        affiliateUrl="https://partner.example.com/x?aff=us"
      />,
    );

    const link = screen.getByRole("link", {
      name: new RegExp(`View at ${paid.source.label}`),
    });
    expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
  });

  it("renders a save button passed through the slot", () => {
    render(<EventCard event={free} saveButton={<button>Save</button>} />);
    expect(
      screen.getByRole("button", { name: "Save" }),
    ).toBeInTheDocument();
  });

  it("renders no save area when the slot is absent", () => {
    const { container } = render(<EventCard event={free} />);
    expect(container.querySelector("[data-slot='save-button']")).toBeNull();
  });
});

describe("formatPrice", () => {
  it("drops trailing cents for whole dollars", () => {
    expect(formatPrice(2500)).toBe("$25");
  });

  it("keeps cents for non-integer dollars", () => {
    expect(formatPrice(4250)).toBe("$42.50");
  });
});

describe("EventCard purity", () => {
  it("renders identically for identical props", () => {
    // A cheap guard against hidden global state creeping into the card:
    // two renders of the same props must produce the same markup.
    const first = render(<EventCard event={free} />).container.innerHTML;
    const second = render(<EventCard event={free} />).container.innerHTML;
    expect(first).toBe(second);
  });
});
