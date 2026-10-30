import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fixtureEvents } from "@/lib/fixtures/events";

import { DayGroup } from "./day-group";
import { EventCard } from "./event-card";

describe("DayGroup", () => {
  it("renders the day heading and its EventCard children", () => {
    const [a, b] = fixtureEvents;
    const { container } = render(
      <DayGroup heading="Saturday, Nov 7">
        <EventCard event={a!} />
        <EventCard event={b!} />
      </DayGroup>,
    );

    expect(screen.getByRole("heading", { name: "Saturday, Nov 7" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot='event-card']")).toHaveLength(2);
  });

  it("renders an empty group without cards", () => {
    render(<DayGroup heading="Sunday, Nov 8" />);
    expect(screen.getByRole("heading", { name: "Sunday, Nov 8" })).toBeInTheDocument();
    expect(screen.queryByTestId("card")).not.toBeInTheDocument();
  });
});
