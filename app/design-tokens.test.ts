import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Token smoke test for the Downtown Riso Zine foundation (deliverable 1).
 *
 * jsdom cannot resolve the compiled Tailwind cascade, so getComputedStyle
 * here would assert nothing; instead we read the source-of-truth files and
 * assert the token declarations and the font wiring directly. Rendered
 * output is verified separately in the browser against the built app.
 */

const readRepo = (...segments: string[]) =>
  readFileSync(path.resolve(__dirname, ...segments), "utf8");

const css = readRepo("..", "app", "globals.css");
const layout = readRepo("..", "app", "layout.tsx");

const themeBlock = css.match(/@theme inline \{([\s\S]*?)\n\}/)?.[1] ?? "";
const rootBlock = css.match(/^:root \{([\s\S]*?)\n\}/m)?.[1] ?? "";
const darkBlock = css.match(/^\.dark \{([\s\S]*?)\n\}/m)?.[1] ?? "";

const decl = (block: string, name: string) =>
  block.match(new RegExp(`^[ \\t]*${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}:\\s*([^;]+);`, "m"))?.[1]?.trim();

describe("riso ink tokens (@theme inline)", () => {
  it.each([
    ["--color-ink-magenta", "#FF48B0"],
    ["--color-ink-blue", "#0078BF"],
    ["--color-ink-yellow", "#FFE800"],
    ["--color-ink-orange", "#EE7623"],
    ["--color-ink-green", "#00933C"],
    ["--color-ink-red", "#EE352E"],
    ["--color-paper", "#F7F2E7"],
    ["--color-ink-black", "#141414"],
  ])("declares %s as %s", (name, value) => {
    expect(decl(themeBlock, name)).toBe(value);
  });

  it("maps one ink per category", () => {
    expect(decl(themeBlock, "--color-ink-events")).toBe("#FF48B0");
    expect(decl(themeBlock, "--color-ink-communities")).toBe("#0078BF");
    expect(decl(themeBlock, "--color-ink-jobs")).toBe("#00933C");
    expect(decl(themeBlock, "--color-ink-civic")).toBe("#EE7623");
  });
});

describe("palette values (:root / .dark)", () => {
  it("light is paper cream on ink black", () => {
    expect(decl(rootBlock, "--background")).toBe("#F7F2E7");
    expect(decl(rootBlock, "--foreground")).toBe("#141414");
    // Contrast lock: text on magenta is ink black, never white.
    expect(decl(rootBlock, "--primary")).toBe("#FF48B0");
    expect(decl(rootBlock, "--primary-foreground")).toBe("#141414");
  });

  it("dark is photocopy night: inverted paper with glow-ink ring", () => {
    expect(decl(darkBlock, "--background")).toBe("#141414");
    expect(decl(darkBlock, "--foreground")).toBe("#F7F2E7");
    expect(decl(darkBlock, "--ring")).toBe("#33A6DD");
  });

  it("grain opacity is token-driven (0.06 light, 0.04 dark)", () => {
    expect(decl(rootBlock, "--grain-opacity")).toBe("0.06");
    expect(decl(darkBlock, "--grain-opacity")).toBe("0.04");
  });

  it("cards carry the 8px radius and 1.5px ink border tokens", () => {
    expect(decl(rootBlock, "--radius-card")).toBe("8px");
    expect(decl(rootBlock, "--card-border")).toBe("1.5px solid var(--color-ink-black)");
  });
});

describe("font wiring", () => {
  it("maps theme fonts to next/font variables with no self-reference", () => {
    expect(css).not.toMatch(/--font-sans:\s*var\(--font-sans\)/);
    expect(decl(themeBlock, "--font-sans")).toBe("var(--font-inter)");
    expect(decl(themeBlock, "--font-display")).toBe("var(--font-fraunces)");
    expect(decl(themeBlock, "--font-hand")).toBe("var(--font-caveat)");
    expect(decl(themeBlock, "--font-mono")).toBe("var(--font-geist-mono)");
  });

  it("layout loads Inter/Fraunces/Caveat/Geist Mono and retires Geist sans", () => {
    expect(layout).toContain('Inter({\n  variable: "--font-inter"');
    expect(layout).toContain('Fraunces({\n  variable: "--font-fraunces"');
    expect(layout).toContain('Caveat({\n  variable: "--font-caveat"');
    expect(layout).toContain('Geist_Mono({\n  variable: "--font-geist-mono"');
    expect(layout).not.toContain("Geist({");
    expect(layout).not.toContain("--font-geist-sans");
  });
});
