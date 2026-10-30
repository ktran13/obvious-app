import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/auth/app-header";
import { SaveButtonContainer } from "@/components/events/save-button-container";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { listSavedCommunities, listSavedEvents } from "@/lib/saves/queries";

export const dynamic = "force-dynamic";

/**
 * The signed-in member view: account identity plus saved events and
 * communities. The only page that redirects to sign-in — everywhere else the
 * browse surface stays anonymous-first.
 */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?next=/profile");

  const userId = session.user.id;
  const db = getDb();
  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [savedEvents, savedCommunities] = await Promise.all([
    listSavedEvents(db, userId),
    listSavedCommunities(db, userId),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <section className="mt-4 rounded-xl border border-border bg-card p-4" data-slot="identity">
          <p className="text-base font-medium">{account?.name ?? session.user.name}</p>
          <p className="text-sm text-muted-foreground">{account?.email ?? session.user.email}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Saved events</h2>
          {savedEvents.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Nothing saved yet — browse the events list and hit Save.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {savedEvents.map((event) => (
                <li
                  key={event.eventId}
                  data-slot="saved-event"
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.venue ?? ""} ·{" "}
                      <a
                        href={event.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        View at source ↗
                      </a>
                    </p>
                  </div>
                  <SaveButtonContainer
                    targetType="event"
                    targetId={event.eventId}
                    initialSaved
                    signedIn
                    nextPath="/profile"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Saved communities</h2>
          {savedCommunities.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No saved communities yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {savedCommunities.map((community) => (
                <li
                  key={community.communityId}
                  data-slot="saved-community"
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{community.name}</p>
                    {community.description ? (
                      <p className="text-sm text-muted-foreground">{community.description}</p>
                    ) : null}
                  </div>
                  <SaveButtonContainer
                    targetType="community"
                    targetId={community.communityId}
                    initialSaved
                    signedIn
                    nextPath="/profile"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
