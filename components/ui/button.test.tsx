import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "./button";

// Contrast lock (spec L3): primary button text is ink-black #141414 on riso
// magenta #FF48B0 — never white. Relative luminance: magenta L ≈ 0.2903,
// ink-black L ≈ 0.0070 → (0.2903 + 0.05) / (0.0070 + 0.05) ≈ 5.97:1, which
// passes WCAG 2.1 AA for normal text (≥ 4.5:1). White on the same magenta is
// ~2.9:1 and fails — this suite pins the classes that guarantee it.

describe("Button primary variant (riso)", () => {
  it("uses ink-black text and a 2px ink-black border", () => {
    const classes = buttonVariants({ variant: "default" });

    expect(classes).toContain("text-ink-black");
    expect(classes).toContain("border-2");
    expect(classes).toContain("border-ink-black");
    // Contrast lock: no white foreground anywhere in the variant.
    expect(classes).not.toMatch(/text-white|primary-foreground/);
  });

  it("carries the riso-blue hard offset shadow with misregistration hover and flatten-on-press", () => {
    const classes = buttonVariants({ variant: "default" });

    expect(classes).toContain("bg-ink-magenta");
    expect(classes).toContain("shadow-[2px_2px_0_0_var(--color-ink-blue)]");
    expect(classes).toContain("hover:shadow-[3px_3px_0_0_var(--color-ink-blue)]");
    expect(classes).toContain("active:shadow-none");
  });

  it("renders on the button element with the classes applied", () => {
    render(<Button>Save event</Button>);

    const button = screen.getByRole("button", { name: "Save event" });
    expect(button.className).toContain("text-ink-black");
    expect(button.className).toContain("border-ink-black");
    expect(button.className).toContain("bg-ink-magenta");
  });

  it("keeps the secondary variant free of color-mix (last non-token color removed)", () => {
    const classes = buttonVariants({ variant: "secondary" });
    expect(classes).not.toContain("color-mix");
  });
});
