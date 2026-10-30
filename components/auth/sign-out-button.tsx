"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      data-slot="sign-out"
      onClick={() => signOut()}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
    >
      Sign out
    </button>
  );
}
