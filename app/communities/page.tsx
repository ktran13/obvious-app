import Link from "next/link";

import { AppHeader } from "@/components/auth/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listCommunities } from "@/lib/communities/queries";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Organizer directory — anonymous-first like every browse surface. Each
 * entry aggregates its upcoming listings so the directory answers "who
 * runs what right now" at a glance.
 */
export default async function CommunitiesPage() {
  const items = await listCommunities(getDb());

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Communities &amp; organizers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          External organizers listing events here. Sign in only if you want to save one.
        </p>
        {items.length === 0 ? (
          <p className="border-border text-muted-foreground mt-8 rounded-xl border border-dashed p-8 text-center text-sm">
            No communities yet. Run <code>pnpm db:seed</code> to load demo organizers.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {items.map((community) => (
              <li key={community.id}>
                <Link
                  href={`/communities/${community.slug}`}
                  data-slot="community-card"
                  className="block"
                >
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 data-slot="community-name" className="text-base font-semibold">
                          {community.name}
                        </h2>
                        {community.description ? (
                          <p className="text-muted-foreground mt-0.5 text-sm">
                            {community.description}
                          </p>
                        ) : null}
                      </div>
                      <p
                        data-slot="community-upcoming"
                        className="text-muted-foreground shrink-0 text-sm font-medium"
                      >
                        {community.upcomingEventCount === 0
                          ? "No upcoming events"
                          : `${community.upcomingEventCount} upcoming event${community.upcomingEventCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    {community.interests.length > 0 || community.neighborhoods.length > 0 ? (
                      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                        {community.interests.map((interest) => (
                          <Badge key={interest} variant="outline">
                            {interest}
                          </Badge>
                        ))}
                        {community.neighborhoods.slice(0, 3).map((neighborhood) => (
                          <span key={neighborhood} className="px-1">
                            {neighborhood}
                          </span>
                        ))}
                        {community.neighborhoods.length > 3 ? (
                          <span className="px-1">+{community.neighborhoods.length - 3} more</span>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
