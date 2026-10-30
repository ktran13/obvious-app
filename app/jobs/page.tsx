import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { AdSlot } from "@/components/events/ad-slot";
import { getDb } from "@/lib/db";
import { jobPostings, type JobPosting } from "@/lib/db/schema";
import { formatPostedDate } from "@/lib/jobs/display";

// Monetization surface: reflects seeded postings and the ?interest= param
// per request, never prerendered at build time.
export const dynamic = "force-dynamic";

type JobsPageProps = {
  searchParams: Promise<{ interest?: string | string[] }>;
};

function JobCard({ posting }: { posting: JobPosting }) {
  return (
    <article
      data-slot="job-posting"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{posting.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {posting.company}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {posting.interestSlug}
        </span>
      </div>
      {posting.description ? (
        <p className="mt-2 text-sm">{posting.description}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Posted {formatPostedDate(posting.postedAt)}
        </span>
        <a
          href={posting.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Apply <span aria-hidden>↗</span>
        </a>
      </div>
    </article>
  );
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const raw = params.interest;
  const interest = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  const db = getDb();
  const [postings, interestRows] = await Promise.all([
    db
      .select()
      .from(jobPostings)
      .where(interest ? eq(jobPostings.interestSlug, interest) : undefined)
      .orderBy(desc(jobPostings.postedAt)),
    db
      .selectDistinct({ slug: jobPostings.interestSlug })
      .from(jobPostings),
  ]);
  const interests = interestRows.map((row) => row.slug).sort();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-6 font-sans">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <p className="text-lg font-semibold">
          <Link href="/">NYC Discovery</Link>
        </p>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link className="hover:underline" href="/">
            Events
          </Link>
          <Link className="hover:underline" href="/jobs">
            Jobs
          </Link>
        </nav>
      </header>

      <main className="py-8">
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="mt-2 text-muted-foreground">
          Openings at NYC community organizations and local shops — apply at
          the source.
        </p>

        <nav
          aria-label="Filter by interest"
          className="mt-6 flex flex-wrap gap-2"
        >
          <Link
            href="/jobs"
            aria-current={interest === null ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              interest === null
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            All
          </Link>
          {interests.map((slug) => (
            <Link
              key={slug}
              href={`/jobs?interest=${encodeURIComponent(slug)}`}
              aria-current={interest === slug ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                interest === slug
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              {slug}
            </Link>
          ))}
        </nav>

        {postings.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {postings.map((posting) => (
              <JobCard key={posting.id} posting={posting} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            No postings for this interest yet — check back soon.
          </p>
        )}

        <AdSlot label="Sponsored" className="mt-10" />
      </main>
    </div>
  );
}
