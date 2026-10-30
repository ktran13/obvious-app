import { describe, expect, it } from "vitest";

import { linkOutRel, resolveRedirectTarget } from "./redirect-target";

describe("resolveRedirectTarget", () => {
  it("returns the affiliate URL when one is present", () => {
    expect(
      resolveRedirectTarget({
        affiliateUrl: "https://partner.example.com/event?aff=us",
        canonicalUrl: "https://luma.example.com/event",
      }),
    ).toBe("https://partner.example.com/event?aff=us");
  });

  it("returns the canonical URL when there is no affiliate URL", () => {
    expect(
      resolveRedirectTarget({
        affiliateUrl: null,
        canonicalUrl: "https://luma.example.com/event",
      }),
    ).toBe("https://luma.example.com/event");
  });

  it("treats an empty or whitespace affiliate URL as absent", () => {
    for (const affiliateUrl of ["", "   "]) {
      expect(
        resolveRedirectTarget({
          affiliateUrl,
          canonicalUrl: "https://luma.example.com/event",
        }),
      ).toBe("https://luma.example.com/event");
    }
  });
});

describe("linkOutRel", () => {
  it("adds sponsored to the rel of affiliate anchors", () => {
    expect(linkOutRel("https://partner.example.com/event?aff=us")).toBe(
      "sponsored noopener noreferrer",
    );
  });

  it("keeps only the safety pair on canonical anchors", () => {
    expect(linkOutRel(null)).toBe("noopener noreferrer");
    expect(linkOutRel(undefined)).toBe("noopener noreferrer");
  });
});
