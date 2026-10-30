import { expect, test } from "@playwright/test";

/**
 * Reduced-motion e2e (deliverable 6, accessibility lock L3). With
 * prefers-reduced-motion: reduce, every signature paper-craft motion
 * collapses to an opacity fade: no transform on hover (card tilt, button
 * misregistration offsets) and no transform keyframes (sticker wiggle,
 * day-group fade-slide). Resting decorative transforms (the homepage
 * stickers' rotate-12) are layout, not motion — they must survive.
 */

test.use({ reducedMotion: "reduce" });

// Mount fades are still opacity transitions (~350ms); let them settle so
// computed styles reflect the resting state before asserting.
const SETTLE_MS = 500;

test("card hover applies no transform under reduced motion", async ({ page }) => {
  await page.goto("/events");
  // EventCard overrides Card's data-slot with "event-card" — the tilt
  // utilities live on that same element.
  const card = page.locator('[data-slot="event-card"]').first();
  await expect(card).toBeVisible();
  await page.waitForTimeout(SETTLE_MS);

  const read = () =>
    card.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        rotate: cs.rotate,
        translate: cs.translate,
        transform: cs.transform,
        transitionProperty: cs.transitionProperty,
      };
    });

  const before = await read();
  await card.hover();
  const after = await read();

  // The 1-degree tilt must not run: in normal mode hover:rotate-1 sets
  // rotate: 1deg, so rotate staying "none" across hover is the assertion
  // that matters. The remaining transition is the opacity-only collapse.
  expect(before.rotate).toBe("none");
  expect(after.rotate).toBe("none");
  expect(after.translate).toBe("none");
  expect(after.transform).toBe("none");
  expect(after.transitionProperty).toContain("opacity");
});

test("day-group mount animation is the opacity-only fade under reduced motion", async ({
  page,
}) => {
  await page.goto("/events");
  const group = page.locator('[data-slot="day-group"]').first();
  await expect(group).toBeVisible();
  await page.waitForTimeout(SETTLE_MS);

  const { animationName, animationDuration } = await group.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { animationName: cs.animationName, animationDuration: cs.animationDuration };
  });

  // Rebound from riso-fade-slide to the opacity-only riso-fade keyframe —
  // the 6px translateY slide must not survive reduced motion.
  expect(animationName).toBe("riso-fade");
  expect(animationDuration).toBe("0.2s");
});

test("starburst wiggle collapses to an opacity fade and keeps its resting tilt", async ({
  page,
}) => {
  await page.goto("/");
  const sticker = page.locator('[data-slot="badge"].riso-wiggle').first();
  await expect(sticker).toBeVisible();
  await page.waitForTimeout(SETTLE_MS);

  const read = () =>
    sticker.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        animationName: cs.animationName,
        transform: cs.transform,
        rotate: cs.rotate,
      };
    });

  const before = await read();
  await sticker.hover();
  const after = await read();

  // Hover binds an animation, but under reduce it is the opacity-only fade,
  // never the rotate wiggle — and the resting rotate-12 tilt is unchanged.
  expect(before.animationName).toBe("none");
  expect(after.animationName).toBe("riso-fade");
  expect(after.transform).toBe("none");
  expect(after.rotate).toBe(before.rotate);
  expect(after.rotate).not.toBe("none");
});
