import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdSlot } from "./ad-slot";

describe("AdSlot", () => {
  it("renders a clearly labeled placeholder", () => {
    render(<AdSlot />);

    expect(screen.getByRole("complementary", { name: "Ad slot" }))
      .toBeInTheDocument();
    expect(screen.getByText("Placeholder — no ad network is wired up."))
      .toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<AdSlot label="Sponsored slot" />);
    expect(
      screen.getByRole("complementary", { name: "Sponsored slot" }),
    ).toBeInTheDocument();
  });

  it("renders no script or iframe", () => {
    const { container } = render(<AdSlot />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});
