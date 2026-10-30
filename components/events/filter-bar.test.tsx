import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { fixtureFilterOptions } from "@/lib/fixtures/events";

import { FilterBar } from "./filter-bar";
import type { EventFilters } from "./types";

const selected: EventFilters = {
  interests: ["Tech"],
  persona: "Newcomer",
  when: "weekend",
  day: "Saturday",
  freeOnly: true,
  neighborhoods: ["Bushwick"],
};

describe("FilterBar", () => {
  it("renders the selected filters from props", () => {
    render(
      <FilterBar filters={selected} options={fixtureFilterOptions} />,
    );

    expect(
      (screen.getByLabelText("Interest") as HTMLSelectElement).value,
    ).toBe("Tech");
    expect(
      (screen.getByLabelText("Persona") as HTMLSelectElement).value,
    ).toBe("Newcomer");
    expect(
      (screen.getByLabelText("When") as HTMLSelectElement).value,
    ).toBe("weekend");
    expect(
      (screen.getByLabelText("Day") as HTMLSelectElement).value,
    ).toBe("Saturday");
    expect(
      (screen.getByLabelText("Neighborhood") as HTMLSelectElement).value,
    ).toBe("Bushwick");
    expect(screen.getByLabelText("Free only")).toBeChecked();
  });

  it("renders empty selections when nothing is filtered", () => {
    const empty: EventFilters = {
      interests: [],
      persona: null,
      when: null,
      day: null,
      freeOnly: false,
      neighborhoods: [],
    };
    render(<FilterBar filters={empty} options={fixtureFilterOptions} />);

    expect(
      (screen.getByLabelText("Interest") as HTMLSelectElement).value,
    ).toBe("");
    expect(screen.getByLabelText("Free only")).not.toBeChecked();
  });

  it("reports interest changes upward via onChange", () => {
    const onChange = vi.fn();
    render(
      <FilterBar
        filters={selected}
        options={fixtureFilterOptions}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Interest"), {
      target: { value: "Music" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...selected,
      interests: ["Music"],
    });
  });

  it("reports the free checkbox toggle upward via onChange", () => {
    const onChange = vi.fn();
    render(
      <FilterBar
        filters={{ ...selected, freeOnly: false }}
        options={fixtureFilterOptions}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("Free only"));
    expect(onChange).toHaveBeenCalledWith({ ...selected, freeOnly: true });
  });
});
