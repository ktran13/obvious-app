import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { resolveRedirectTarget } from "@/lib/linkout/redirect-target";

// Postgres would throw on a non-UUID cast; short-circuit to 404 instead.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): NextResponse {
  return new NextResponse("Not found", { status: 404 });
}

/**
 * Tracked link-out redirect: 302 to the event's affiliate URL when one
 * exists, otherwise to its canonical listing URL. v1 policy — no click is
 * logged to any third party here (or anywhere else yet); the redirect
 * itself is our only future measurement surface.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return notFound();
  }

  const rows = await getDb()
    .select({
      affiliateUrl: events.affiliateUrl,
      canonicalUrl: events.canonicalUrl,
    })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  const event = rows[0];
  if (!event) {
    return notFound();
  }

  return NextResponse.redirect(resolveRedirectTarget(event), 302);
}
