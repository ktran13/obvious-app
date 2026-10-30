import { expect, test, type BrowserContext, type Request } from "@playwright/test";

// Fixed UUIDs from scripts/seed.mjs (pnpm db:seed).
const AFFILIATE_EVENT_ID = "11111111-1111-4111-8111-111111111111";
const CANONICAL_EVENT_ID = "22222222-2222-4222-8222-222222222222";
const AFFILIATE_TARGET = "https://partner.example.com/rooftop-film-night?ref=nycdiscover";
const CANONICAL_TARGET = "https://nycparks.example.com/events/prospect-park-cleanup";

test.describe("/go tracked redirect", () => {
  test("302s to the affiliate URL when the event has one", async ({ request }) => {
    const res = await request.get(`/go/${AFFILIATE_EVENT_ID}`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe(AFFILIATE_TARGET);
  });

  test("302s to the canonical URL when there is no affiliate URL", async ({ request }) => {
    const res = await request.get(`/go/${CANONICAL_EVENT_ID}`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe(CANONICAL_TARGET);
  });

  test("404s for an unknown event id", async ({ request }) => {
    const res = await request.get("/go/00000000-0000-4000-8000-000000000000", {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(404);
  });

  test("404s for a non-UUID id", async ({ request }) => {
    const res = await request.get("/go/not-a-uuid", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });
});

// The card link-out opens a new tab (target=_blank). The destination host is
// never reachable from the test browser, so instead of loading it we assert
// the browser-observed redirect chain: the click must produce a document
// request to /go/[id] that the server 302s to the expected destination.

/**
 * Context-level request waiter — the redirected document request belongs to
 * the popup page, so page.waitForRequest() would never see it.
 */
function waitForContextRequest(context: BrowserContext, url: string): Promise<Request> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for request to ${url}`));
    }, 10_000);
    function cleanup() {
      clearTimeout(timeout);
      context.off("request", listener);
    }
    function listener(req: Request) {
      if (req.url() === url && req.redirectedFrom() !== null) {
        cleanup();
        resolve(req);
      }
    }
    context.on("request", listener);
  });
}

test.describe("event card link-out integrity", () => {
  test("affiliate event card routes through /go to the affiliate destination", async ({
    page,
    baseURL,
  }) => {
    const destinationPromise = waitForContextRequest(page.context(), AFFILIATE_TARGET);

    await page.goto("/");
    const card = page
      .locator("[data-slot='event-card']")
      .filter({ hasText: "Rooftop Film Night" })
      .first();
    await expect(card).toBeVisible();

    const link = card.getByRole("link", { name: /View at/ });
    await expect(link).toHaveAttribute("href", `/go/${AFFILIATE_EVENT_ID}`);
    await expect(link).toHaveAttribute("rel", /sponsored/);

    await Promise.all([page.waitForEvent("popup"), link.click()]);
    const destination = await destinationPromise;

    expect(destination.redirectedFrom()?.url()).toBe(`${baseURL}/go/${AFFILIATE_EVENT_ID}`);
  });

  test("canonical event card carries no sponsored marker and lands on the canonical URL", async ({
    page,
    baseURL,
  }) => {
    const destinationPromise = waitForContextRequest(page.context(), CANONICAL_TARGET);

    await page.goto("/");
    const card = page
      .locator("[data-slot='event-card']")
      .filter({ hasText: "Prospect Park Volunteer Cleanup" })
      .first();
    await expect(card).toBeVisible();

    const link = card.getByRole("link", { name: /View at/ });
    await expect(link).toHaveAttribute("href", `/go/${CANONICAL_EVENT_ID}`);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");

    await Promise.all([page.waitForEvent("popup"), link.click()]);
    const destination = await destinationPromise;

    expect(destination.redirectedFrom()?.url()).toBe(`${baseURL}/go/${CANONICAL_EVENT_ID}`);
  });
});
