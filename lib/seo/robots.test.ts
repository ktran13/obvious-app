import { describe, expect, it } from "vitest";

import { buildRobotsRules } from "./robots";

/** Next types `rules` as a single rule or an array; tests always see an array. */
function asArray(rules: ReturnType<typeof buildRobotsRules>["rules"]) {
  return Array.isArray(rules) ? rules : [rules];
}

describe("buildRobotsRules", () => {
  it("allows crawlers on public pages by default", () => {
    const rules = asArray(buildRobotsRules({ siteUrl: "https://example.com" }).rules);
    expect(rules).toHaveLength(1);
    const [rule] = rules;
    expect(rule).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("excludes /profile and the auth surfaces from crawling", () => {
    const [rule] = asArray(buildRobotsRules({ siteUrl: "https://example.com" }).rules);
    expect(rule.disallow).toContain("/profile");
    expect(rule.disallow).toContain("/signin");
    // API routes include the Auth.js endpoints.
    expect(rule.disallow).toContain("/api/");
  });

  it("never indexes tracked /go redirects", () => {
    const [rule] = asArray(buildRobotsRules({ siteUrl: "https://example.com" }).rules);
    expect(rule.disallow).toContain("/go/");
  });

  it("points at the sitemap for the given site origin", () => {
    const rules = buildRobotsRules({ siteUrl: "https://example.com" });
    expect(rules.sitemap).toBe("https://example.com/sitemap.xml");
  });
});
