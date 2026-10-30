import { devMockEnabled, googleOauthConfigured, auth } from "@/lib/auth";
import { signInWithDevMock, signInWithGoogle } from "./actions";
import { SignOutButton } from "@/components/auth/sign-out-button";

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

/** Only redirect target paths — never an arbitrary absolute URL. */
function safeNextPath(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-muted-foreground">
        Browsing never needs an account — signing in only lets you save events
        and communities.
      </p>

      {session?.user ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm">
            Signed in as <strong>{session.user.name ?? session.user.email}</strong>
          </p>
          <SignOutButton />
        </div>
      ) : devMockEnabled ? (
        <form
          action={signInWithDevMock.bind(null, nextPath)}
          className="flex flex-col gap-2"
        >
          <button
            type="submit"
            data-slot="dev-sign-in"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Continue with Google (dev mock)
          </button>
          <p className="text-xs text-muted-foreground">
            Dev-only mock provider (AUTH_DEV_MOCK=true) — signs in a fixed test
            user with no Google round-trip.
          </p>
        </form>
      ) : googleOauthConfigured ? (
        <form action={signInWithGoogle.bind(null, nextPath)} className="flex flex-col gap-2">
          <button
            type="submit"
            data-slot="google-sign-in"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Continue with Google
          </button>
        </form>
      ) : (
        <p className="rounded-lg border border-border bg-muted p-4 text-sm">
          Sign-in is not configured. Set GOOGLE_CLIENT_ID and
          GOOGLE_CLIENT_SECRET (or AUTH_DEV_MOCK=true outside production) to
          enable it.
        </p>
      )}
    </main>
  );
}
