import Link from "next/link";

import { auth } from "@/lib/auth";

/** Session-aware nav. Presence of the sign-in link is the anonymous default —
 * browsing never requires an account. */
export async function AppHeader() {
  const session = await auth();

  return (
    <header className="border-border border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        {/* Logo misregistration: magenta/blue duotone offset (deliverable 4). */}
        <Link href="/" className="riso-misregister font-display text-base font-semibold">
          NYC Discovery
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/communities"
            data-slot="nav-communities"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Communities
          </Link>
          {session?.user ? (
            <span className="flex items-center gap-3">
              <span data-slot="nav-user">{session.user.name ?? session.user.email}</span>
              <Link
                href="/profile"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Profile
              </Link>
            </span>
          ) : (
            <Link
              href="/signin"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
